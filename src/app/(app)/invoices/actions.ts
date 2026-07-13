"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withSerializableTx } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  ApprovalDecision,
  ApprovalTransactionType,
  InvoiceStatus,
  MovementType,
  PaymentMethod,
} from "@/generated/prisma/enums";
import { actionPermission } from "@/lib/auth/guards";
import { audit } from "@/lib/services/audit";
import {
  ApprovalError,
  createApprovalRequest,
  decideApproval,
} from "@/lib/services/approvals";
import { movingAverageCost, postMovement, toBaseQty } from "@/lib/services/inventory";
import { invoiceFormSchema } from "@/lib/validations/inventory";
import { fieldErrorsFromZod, unknownError, type FormState } from "@/lib/utils/action-state";
import { t } from "@/lib/i18n/ar";

const Decimal = Prisma.Decimal;

function parseInvoiceForm(formData: FormData) {
  let lines: unknown = [];
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    lines = [];
  }
  return invoiceFormSchema.safeParse({
    supplierId: formData.get("supplierId"),
    invoiceNumber: formData.get("invoiceNumber"),
    invoiceDate: formData.get("invoiceDate"),
    paymentMethod: formData.get("paymentMethod"),
    vat: formData.get("vat") || "0",
    notes: formData.get("notes") ?? undefined,
    lines,
  });
}

export async function saveInvoice(
  invoiceId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionPermission("invoice.manage");
  const asDraft = formData.get("asDraft") === "1";

  const parsed = parseInvoiceForm(formData);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error);
  const data = parsed.data;

  if (!Object.values(PaymentMethod).includes(data.paymentMethod as PaymentMethod)) {
    return { error: t.common.error };
  }

  // Line math: net = qty × price − discount; lineTotal = net + line tax.
  const computedLines = data.lines.map((line) => {
    const qty = new Decimal(line.quantity);
    const price = new Decimal(line.unitPrice);
    const discount = new Decimal(line.discount);
    const tax = new Decimal(line.tax);
    const net = qty.mul(price).sub(discount);
    return { ...line, qty, price, discount, tax, net, lineTotal: net.add(tax) };
  });
  const subtotal = computedLines.reduce((acc, l) => acc.add(l.net), new Decimal(0));
  const lineTaxes = computedLines.reduce((acc, l) => acc.add(l.tax), new Decimal(0));
  const vat = new Decimal(data.vat).add(lineTaxes);
  const total = subtotal.add(vat).toDecimalPlaces(2);

  let savedId: string;
  try {
    savedId = await withSerializableTx(async (tx) => {
      if (invoiceId) {
        const existing = await tx.purchaseInvoice.findUnique({ where: { id: invoiceId } });
        if (!existing || existing.status !== InvoiceStatus.DRAFT || existing.enteredById !== user.id) {
          throw new Error("not-editable");
        }
      }

      const duplicate = await tx.purchaseInvoice.findFirst({
        where: {
          supplierId: data.supplierId,
          invoiceNumber: data.invoiceNumber,
          ...(invoiceId ? { id: { not: invoiceId } } : {}),
        },
      });
      if (duplicate) throw new Error("duplicate");

      const values = {
        supplierId: data.supplierId,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: new Date(`${data.invoiceDate}T00:00:00.000Z`),
        subtotal: subtotal.toDecimalPlaces(2),
        vat: vat.toDecimalPlaces(2),
        total,
        paymentMethod: data.paymentMethod as PaymentMethod,
        notes: data.notes,
      };

      let invoice;
      if (invoiceId) {
        invoice = await tx.purchaseInvoice.update({ where: { id: invoiceId }, data: values });
        await tx.purchaseInvoiceItem.deleteMany({ where: { invoiceId } });
      } else {
        invoice = await tx.purchaseInvoice.create({
          data: { ...values, enteredById: user.id },
        });
      }

      const supplier = await tx.supplier.findFirst({
        where: { id: data.supplierId, isActive: true },
        select: { id: true },
      });
      if (!supplier) throw new Error("inactive-selection");

      // Purchase unit is taken from the item master at entry time.
      // Only ACTIVE items may appear on new invoices.
      const items = await tx.inventoryItem.findMany({
        where: { id: { in: computedLines.map((l) => l.itemId) }, isActive: true },
        select: { id: true, purchaseUnitId: true },
      });
      const unitByItem = new Map(items.map((i) => [i.id, i.purchaseUnitId]));

      for (const line of computedLines) {
        const unitId = unitByItem.get(line.itemId);
        if (!unitId) throw new Error("bad-item");
        await tx.purchaseInvoiceItem.create({
          data: {
            invoiceId: invoice.id,
            itemId: line.itemId,
            quantity: line.qty,
            unitId,
            unitPrice: line.price,
            discount: line.discount,
            tax: line.tax,
            lineTotal: line.lineTotal.toDecimalPlaces(2),
          },
        });
      }

      if (!asDraft) {
        const approval = await createApprovalRequest(tx, {
          transactionType: ApprovalTransactionType.PURCHASE_INVOICE,
          entityType: "PurchaseInvoice",
          entityId: invoice.id,
          amount: total,
          requestedById: user.id,
          requesterRole: user.role,
        });
        await tx.purchaseInvoice.update({
          where: { id: invoice.id },
          data: {
            status: approval.autoApproved ? InvoiceStatus.APPROVED : InvoiceStatus.SUBMITTED,
          },
        });
      }
      return invoice.id;
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "duplicate") return { fieldErrors: { invoiceNumber: t.invoices.duplicateNumber } };
    if (message === "not-editable") return { error: t.income.onlyDraftEditable };
    if (message === "bad-item" || message === "inactive-selection") {
      return { error: t.common.inactiveSelection };
    }
    throw error;
  }

  await audit({
    userId: user.id,
    action: asDraft ? "invoice.save_draft" : "invoice.submit",
    entityType: "PurchaseInvoice",
    entityId: savedId,
    metadata: { supplierId: data.supplierId, invoiceNumber: data.invoiceNumber, total: total.toString() },
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${savedId}`);
}

export async function decideInvoice(
  invoiceId: string,
  decision: "APPROVED" | "REJECTED",
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionPermission("invoice.approve");

  const comment = String(formData.get("comment") ?? "").trim() || null;
  if (decision === "REJECTED" && !comment) {
    return { fieldErrors: { comment: t.common.required } };
  }

  try {
    await withSerializableTx(async (tx) => {
      const invoice = await tx.purchaseInvoice.findUnique({ where: { id: invoiceId } });
      if (!invoice || invoice.status !== InvoiceStatus.SUBMITTED) {
        throw new ApprovalError(t.common.error);
      }
      await decideApproval(tx, {
        entityType: "PurchaseInvoice",
        entityId: invoiceId,
        decision: ApprovalDecision[decision],
        comment,
        userId: user.id,
        userRole: user.role,
      });
      await tx.purchaseInvoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus[decision],
          rejectionReason: decision === "REJECTED" ? comment : null,
        },
      });
    });
  } catch (error) {
    if (error instanceof ApprovalError) return { error: error.message };
    return unknownError();
  }

  await audit({
    userId: user.id,
    action: `invoice.${decision.toLowerCase()}`,
    entityType: "PurchaseInvoice",
    entityId: invoiceId,
    metadata: comment ? { comment } : undefined,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/approvals");
  return { success: true };
}

/**
 * Receives an APPROVED invoice into the main warehouse: posts one
 * PURCHASE_RECEIPT ledger movement per line (in base units) and updates
 * each item's moving-average cost and current purchase price.
 */
export async function receiveInvoice(invoiceId: string): Promise<FormState> {
  const user = await actionPermission("warehouse.manage");

  try {
    await withSerializableTx(async (tx) => {
      const invoice = await tx.purchaseInvoice.findUnique({
        where: { id: invoiceId },
        include: { items: { include: { item: { include: { balances: true } } } } },
      });
      if (!invoice || invoice.status !== InvoiceStatus.APPROVED) throw new Error("bad-status");

      const warehouse = await tx.inventoryLocation.findUnique({
        where: { code: "MAIN_WAREHOUSE" },
      });
      if (!warehouse) throw new Error("no-warehouse");

      for (const line of invoice.items) {
        const baseQty = toBaseQty(line.quantity, line.item.conversionFactor);
        // Cost basis excludes line tax: (qty × price − discount) / base qty.
        const net = line.quantity.mul(line.unitPrice).sub(line.discount);
        const costPerBase = baseQty.gt(0) ? net.div(baseQty).toDecimalPlaces(4) : new Decimal(0);
        const onHand = line.item.balances.reduce(
          (acc, b) => acc.add(b.quantity),
          new Decimal(0),
        );

        await postMovement(tx, {
          itemId: line.itemId,
          quantity: baseQty,
          type: MovementType.PURCHASE_RECEIPT,
          destLocationId: warehouse.id,
          refType: "PurchaseInvoice",
          refId: invoice.id,
          userId: user.id,
        });

        await tx.inventoryItem.update({
          where: { id: line.itemId },
          data: {
            averageCost: movingAverageCost(onHand, line.item.averageCost, baseQty, costPerBase),
            currentPrice: line.unitPrice,
          },
        });
      }

      await tx.purchaseInvoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.RECEIVED, receivedById: user.id, receivedAt: new Date() },
      });
    });
  } catch {
    return unknownError();
  }

  await audit({
    userId: user.id,
    action: "invoice.receive",
    entityType: "PurchaseInvoice",
    entityId: invoiceId,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/inventory");
  return { success: true };
}

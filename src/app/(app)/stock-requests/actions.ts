"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, withSerializableTx } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  AttachmentEntityType,
  MovementType,
  StockRequestStatus,
} from "@/generated/prisma/enums";
import { AttachmentError, saveAttachments } from "@/lib/services/attachments";
import { actionPermission } from "@/lib/auth/guards";
import { canAccessDepartment } from "@/lib/auth/permissions";
import { audit } from "@/lib/services/audit";
import { InsufficientStockError, postMovement } from "@/lib/services/inventory";
import { stockRequestFormSchema } from "@/lib/validations/stock-requests";
import { fieldErrorsFromZod, unknownError, type FormState } from "@/lib/utils/action-state";
import { t } from "@/lib/i18n/ar";

const Decimal = Prisma.Decimal;

function qtyInputs(formData: FormData, prefix: string): Map<string, Prisma.Decimal> {
  const map = new Map<string, Prisma.Decimal>();
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith(prefix) || typeof value !== "string") continue;
    const raw = value.trim();
    if (!/^\d{1,10}(\.\d{1,3})?$/.test(raw)) continue;
    map.set(key.slice(prefix.length), new Decimal(raw));
  }
  return map;
}

export async function createStockRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionPermission("stock.request");

  let lines: unknown = [];
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    lines = [];
  }
  const parsed = stockRequestFormSchema.safeParse({
    departmentId: formData.get("departmentId"),
    requiredDate: formData.get("requiredDate"),
    priority: formData.get("priority"),
    notes: formData.get("notes") ?? undefined,
    lines,
  });
  if (!parsed.success) return fieldErrorsFromZod(parsed.error);
  const data = parsed.data;

  if (!canAccessDepartment(user, data.departmentId)) {
    return { error: t.income.cannotSubmitForOtherDept };
  }

  // Only active items may be requested.
  const activeItems = await prisma.inventoryItem.count({
    where: { id: { in: data.lines.map((l) => l.itemId) }, isActive: true },
  });
  if (activeItems !== new Set(data.lines.map((l) => l.itemId)).size) {
    return { error: t.common.inactiveSelection };
  }

  const request = await prisma.stockRequest.create({
    data: {
      departmentId: data.departmentId,
      requestedById: user.id,
      requiredDate: new Date(`${data.requiredDate}T00:00:00.000Z`),
      priority: data.priority,
      status: StockRequestStatus.SUBMITTED,
      notes: data.notes,
      items: {
        create: data.lines.map((l) => ({
          itemId: l.itemId,
          requestedQty: new Decimal(l.requestedQty),
        })),
      },
    },
  });

  await audit({
    userId: user.id,
    action: "stock_request.create",
    entityType: "StockRequest",
    entityId: request.id,
    metadata: { departmentId: data.departmentId, items: data.lines.length },
  });

  revalidatePath("/stock-requests");
  redirect(`/stock-requests/${request.id}`);
}

export async function decideStockRequest(
  requestId: string,
  decision: "APPROVE" | "PARTIAL" | "REJECT",
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionPermission("warehouse.manage");
  const warehouseNotes = String(formData.get("warehouseNotes") ?? "").trim() || null;
  if (decision === "REJECT" && !warehouseNotes) {
    return { fieldErrors: { warehouseNotes: t.common.required } };
  }
  const approvedInputs = qtyInputs(formData, "approved_");

  try {
    await withSerializableTx(async (tx) => {
      const request = await tx.stockRequest.findUnique({
        where: { id: requestId },
        include: { items: true },
      });
      if (!request || request.status !== StockRequestStatus.SUBMITTED) throw new Error("bad-status");

      if (decision === "REJECT") {
        await tx.stockRequest.update({
          where: { id: requestId },
          data: { status: StockRequestStatus.REJECTED, warehouseNotes },
        });
        return;
      }

      let partial = false;
      for (const item of request.items) {
        const approved =
          decision === "APPROVE"
            ? item.requestedQty
            : approvedInputs.get(item.itemId) ?? new Decimal(0);
        if (!approved.eq(item.requestedQty)) partial = true;
        await tx.stockRequestItem.update({
          where: { id: item.id },
          data: { approvedQty: approved },
        });
      }
      await tx.stockRequest.update({
        where: { id: requestId },
        data: {
          status: partial
            ? StockRequestStatus.PARTIALLY_APPROVED
            : StockRequestStatus.APPROVED,
          warehouseNotes,
        },
      });
    });
  } catch {
    return unknownError();
  }

  await audit({
    userId: user.id,
    action: `stock_request.${decision.toLowerCase()}`,
    entityType: "StockRequest",
    entityId: requestId,
  });

  revalidatePath("/stock-requests");
  revalidatePath(`/stock-requests/${requestId}`);
  return { success: true };
}

/** Warehouse-side stage transitions: PREPARING → READY → DELIVERED. */
export async function advanceStockRequest(
  requestId: string,
  stage: "PREPARING" | "READY" | "DELIVERED",
): Promise<FormState> {
  const user = await actionPermission("warehouse.manage");

  const allowedFrom: Record<string, StockRequestStatus[]> = {
    PREPARING: [StockRequestStatus.APPROVED, StockRequestStatus.PARTIALLY_APPROVED],
    READY: [StockRequestStatus.PREPARING],
    DELIVERED: [StockRequestStatus.READY],
  };

  try {
    await withSerializableTx(async (tx) => {
      const request = await tx.stockRequest.findUnique({
        where: { id: requestId },
        include: { items: true, transfers: true, department: { include: { location: true } } },
      });
      if (!request || !allowedFrom[stage].includes(request.status)) throw new Error("bad-status");

      if (stage === "PREPARING" && request.transfers.length === 0) {
        const warehouse = await tx.inventoryLocation.findUnique({
          where: { code: "MAIN_WAREHOUSE" },
        });
        const destLocation = request.department.location;
        if (!warehouse || !destLocation) throw new Error("no-location");

        await tx.stockTransfer.create({
          data: {
            requestId,
            fromLocationId: warehouse.id,
            toLocationId: destLocation.id,
            preparedById: user.id,
            items: {
              create: request.items
                .filter((i) => (i.approvedQty ?? i.requestedQty).gt(0))
                .map((i) => ({
                  itemId: i.itemId,
                  preparedQty: i.approvedQty ?? i.requestedQty,
                })),
            },
          },
        });
      }

      await tx.stockRequest.update({
        where: { id: requestId },
        data: { status: StockRequestStatus[stage] },
      });
      if (stage === "DELIVERED") {
        await tx.stockTransfer.updateMany({
          where: { requestId },
          data: { deliveredAt: new Date() },
        });
      }
    });
  } catch {
    return unknownError();
  }

  await audit({
    userId: user.id,
    action: `stock_request.${stage.toLowerCase()}`,
    entityType: "StockRequest",
    entityId: requestId,
  });

  revalidatePath("/stock-requests");
  revalidatePath(`/stock-requests/${requestId}`);
  return { success: true };
}

/**
 * Department-side confirmation. Posts the ledger movements — the transfer is
 * only "real" in inventory once both sides have confirmed:
 *   TRANSFER_OUT (warehouse, prepared) · TRANSFER_IN (department, received+damaged)
 *   DAMAGE (department, damaged in transit) · missing ⇒ DISPUTED for review.
 */
export async function confirmStockReceipt(
  requestId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionPermission("stock.confirmReceipt");
  const receiptNotes = String(formData.get("receiptNotes") ?? "").trim() || null;
  const received = qtyInputs(formData, "received_");
  const damaged = qtyInputs(formData, "damaged_");

  let confirmedTransferId: string;
  try {
    confirmedTransferId = await withSerializableTx(async (tx) => {
      const request = await tx.stockRequest.findUnique({
        where: { id: requestId },
        include: { transfers: { include: { items: true } } },
      });
      if (!request || request.status !== StockRequestStatus.DELIVERED) throw new Error("bad-status");
      if (!canAccessDepartment(user, request.departmentId)) throw new Error("forbidden");

      const transfer = request.transfers[0];
      if (!transfer) throw new Error("no-transfer");

      let anyMissing = false;
      for (const line of transfer.items) {
        const receivedQty = received.get(line.itemId) ?? line.preparedQty;
        const damagedQty = damaged.get(line.itemId) ?? new Decimal(0);
        const accounted = receivedQty.add(damagedQty);
        if (accounted.gt(line.preparedQty)) throw new Error("over-received");
        const missingQty = line.preparedQty.sub(accounted);
        if (missingQty.gt(0)) anyMissing = true;

        await tx.stockTransferItem.update({
          where: { id: line.id },
          data: { receivedQty, missingQty, damagedQty },
        });

        // Ledger: out the full prepared qty; in what physically arrived intact
        // plus damaged (which is then written off at the department).
        if (line.preparedQty.gt(0)) {
          await postMovement(tx, {
            itemId: line.itemId,
            quantity: line.preparedQty,
            type: MovementType.TRANSFER_OUT,
            sourceLocationId: transfer.fromLocationId,
            refType: "StockTransfer",
            refId: transfer.id,
            userId: user.id,
          });
        }
        const arrived = receivedQty.add(damagedQty);
        if (arrived.gt(0)) {
          await postMovement(tx, {
            itemId: line.itemId,
            quantity: arrived,
            type: MovementType.TRANSFER_IN,
            destLocationId: transfer.toLocationId,
            refType: "StockTransfer",
            refId: transfer.id,
            userId: user.id,
          });
        }
        if (damagedQty.gt(0)) {
          await postMovement(tx, {
            itemId: line.itemId,
            quantity: damagedQty,
            type: MovementType.DAMAGE,
            sourceLocationId: transfer.toLocationId,
            refType: "StockTransfer",
            refId: transfer.id,
            userId: user.id,
            reason: t.stockRequests.transitDamageReason,
          });
        }
      }

      await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: { receivedById: user.id, receivedAt: new Date(), completedAt: new Date(), notes: receiptNotes },
      });
      await tx.stockRequest.update({
        where: { id: requestId },
        data: {
          status: anyMissing ? StockRequestStatus.DISPUTED : StockRequestStatus.COMPLETED,
        },
      });
      return transfer.id;
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "over-received") return { error: t.stockRequests.overReceived };
    if (error instanceof InsufficientStockError) {
      return { error: t.stockRequests.insufficientStock };
    }
    return unknownError();
  }

  // Receiving evidence photos attach to the transfer itself.
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File);
  try {
    await saveAttachments(files, AttachmentEntityType.STOCK_TRANSFER, confirmedTransferId, user.id);
  } catch (error) {
    if (error instanceof AttachmentError) return { error: error.message };
    throw error;
  }

  await audit({
    userId: user.id,
    action: "stock_request.confirm_receipt",
    entityType: "StockRequest",
    entityId: requestId,
  });

  revalidatePath("/stock-requests");
  revalidatePath(`/stock-requests/${requestId}`);
  revalidatePath("/inventory");
  return { success: true };
}

export async function cancelStockRequest(requestId: string): Promise<FormState> {
  const user = await actionPermission("stock.request");

  try {
    await withSerializableTx(async (tx) => {
      const request = await tx.stockRequest.findUnique({ where: { id: requestId } });
      if (!request || request.status !== StockRequestStatus.SUBMITTED) throw new Error("bad-status");
      if (request.requestedById !== user.id && !canAccessDepartment(user, request.departmentId)) {
        throw new Error("forbidden");
      }
      await tx.stockRequest.update({
        where: { id: requestId },
        data: { status: StockRequestStatus.CANCELLED },
      });
    });
  } catch {
    return unknownError();
  }

  await audit({
    userId: user.id,
    action: "stock_request.cancel",
    entityType: "StockRequest",
    entityId: requestId,
  });

  revalidatePath("/stock-requests");
  revalidatePath(`/stock-requests/${requestId}`);
  return { success: true };
}

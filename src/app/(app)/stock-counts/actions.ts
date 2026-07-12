"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, withSerializableTx } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  ApprovalDecision,
  ApprovalTransactionType,
  MovementType,
  StockCountStatus,
  StockCountType,
} from "@/generated/prisma/enums";
import { actionPermission } from "@/lib/auth/guards";
import { audit } from "@/lib/services/audit";
import {
  ApprovalError,
  createApprovalRequest,
  decideApproval,
} from "@/lib/services/approvals";
import { postMovement } from "@/lib/services/inventory";
import { unknownError, type FormState } from "@/lib/utils/action-state";
import { t } from "@/lib/i18n/ar";

const Decimal = Prisma.Decimal;

/** Whether the user may count this location (warehouse: all; dept: own). */
async function canCountLocation(
  user: { role: string; departmentId: string | null },
  locationId: string,
): Promise<boolean> {
  if (user.role === "OWNER" || user.role === "WAREHOUSE_MANAGER") return true;
  const location = await prisma.inventoryLocation.findUnique({ where: { id: locationId } });
  return location?.departmentId !== null && location?.departmentId === user.departmentId;
}

/** Posts COUNT_ADJUSTMENT movements for every non-zero difference. */
async function postCountAdjustments(
  tx: Prisma.TransactionClient,
  countId: string,
  userId: string,
): Promise<void> {
  const count = await tx.stockCount.findUniqueOrThrow({
    where: { id: countId },
    include: { items: true },
  });
  for (const item of count.items) {
    if (item.difference.isZero()) continue;
    await postMovement(tx, {
      itemId: item.itemId,
      quantity: item.difference.abs(),
      type: MovementType.COUNT_ADJUSTMENT,
      // Shortage leaves the location; surplus enters it.
      sourceLocationId: item.difference.isNegative() ? count.locationId : null,
      destLocationId: item.difference.isNegative() ? null : count.locationId,
      refType: "StockCount",
      refId: countId,
      userId,
      reason: item.reason,
    });
  }
  await tx.stockCount.update({
    where: { id: countId },
    data: { status: StockCountStatus.POSTED, postedAt: new Date() },
  });
}

export async function createStockCount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionPermission("count.perform");

  const locationId = String(formData.get("locationId") ?? "");
  const countDate = String(formData.get("countDate") ?? "");
  const countType = String(formData.get("countType") ?? "ADHOC") as StockCountType;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!locationId || !/^\d{4}-\d{2}-\d{2}$/.test(countDate)) {
    return { error: t.common.required };
  }
  if (!(await canCountLocation(user, locationId))) {
    return { error: t.income.cannotSubmitForOtherDept };
  }

  // actual_<itemId> inputs; reason_<itemId> optional per-item reasons.
  const actuals = new Map<string, Prisma.Decimal>();
  const reasons = new Map<string, string>();
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (key.startsWith("actual_")) {
      const raw = value.trim();
      if (raw === "" || !/^\d{1,10}(\.\d{1,3})?$/.test(raw)) continue;
      actuals.set(key.slice("actual_".length), new Decimal(raw));
    } else if (key.startsWith("reason_") && value.trim()) {
      reasons.set(key.slice("reason_".length), value.trim().slice(0, 500));
    }
  }
  if (actuals.size === 0) return { error: t.stockCounts.noItems };

  let result: { countId: string; autoApproved: boolean };
  try {
    result = await withSerializableTx(async (tx) => {
      const balances = await tx.inventoryBalance.findMany({
        where: { locationId, itemId: { in: [...actuals.keys()] } },
      });
      const balanceByItem = new Map(balances.map((b) => [b.itemId, b.quantity]));
      const items = await tx.inventoryItem.findMany({
        where: { id: { in: [...actuals.keys()] } },
        select: { id: true, averageCost: true },
      });
      const costByItem = new Map(items.map((i) => [i.id, i.averageCost]));

      let totalAbsValue = new Decimal(0);
      const itemRows = [...actuals.entries()].map(([itemId, actualQty]) => {
        const systemQty = balanceByItem.get(itemId) ?? new Decimal(0);
        const difference = actualQty.sub(systemQty);
        const unitCost = costByItem.get(itemId) ?? new Decimal(0);
        const differenceValue = difference.mul(unitCost).toDecimalPlaces(2);
        totalAbsValue = totalAbsValue.add(differenceValue.abs());
        return { itemId, systemQty, actualQty, difference, unitCost, differenceValue };
      });

      const count = await tx.stockCount.create({
        data: {
          locationId,
          countDate: new Date(`${countDate}T00:00:00.000Z`),
          type: countType,
          assignedToId: user.id,
          status: StockCountStatus.SUBMITTED,
          notes,
          items: {
            create: itemRows.map((row) => ({ ...row, reason: reasons.get(row.itemId) ?? null })),
          },
        },
      });

      const location = await tx.inventoryLocation.findUnique({ where: { id: locationId } });
      const approval = await createApprovalRequest(tx, {
        transactionType: ApprovalTransactionType.STOCK_ADJUSTMENT,
        entityType: "StockCount",
        entityId: count.id,
        amount: totalAbsValue,
        departmentId: location?.departmentId,
        requestedById: user.id,
        requesterRole: user.role,
      });

      if (approval.autoApproved) {
        await postCountAdjustments(tx, count.id, user.id);
      }
      return { countId: count.id, autoApproved: approval.autoApproved };
    });
  } catch {
    return unknownError();
  }

  await audit({
    userId: user.id,
    action: "stock_count.create",
    entityType: "StockCount",
    entityId: result.countId,
    metadata: { locationId, autoApproved: result.autoApproved },
  });

  revalidatePath("/stock-counts");
  revalidatePath("/inventory");
  redirect(`/stock-counts/${result.countId}`);
}

export async function decideStockCount(
  countId: string,
  decision: "APPROVED" | "REJECTED",
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionPermission("count.approve");

  const comment = String(formData.get("comment") ?? "").trim() || null;
  if (decision === "REJECTED" && !comment) {
    return { fieldErrors: { comment: t.common.required } };
  }

  try {
    await withSerializableTx(async (tx) => {
      const count = await tx.stockCount.findUnique({ where: { id: countId } });
      if (!count || count.status !== StockCountStatus.SUBMITTED) {
        throw new ApprovalError(t.common.error);
      }
      await decideApproval(tx, {
        entityType: "StockCount",
        entityId: countId,
        decision: ApprovalDecision[decision],
        comment,
        userId: user.id,
        userRole: user.role,
      });
      if (decision === "APPROVED") {
        await postCountAdjustments(tx, countId, user.id);
      } else {
        await tx.stockCount.update({
          where: { id: countId },
          data: { status: StockCountStatus.REJECTED },
        });
      }
    });
  } catch (error) {
    if (error instanceof ApprovalError) return { error: error.message };
    return unknownError();
  }

  await audit({
    userId: user.id,
    action: `stock_count.${decision.toLowerCase()}`,
    entityType: "StockCount",
    entityId: countId,
    metadata: comment ? { comment } : undefined,
  });

  revalidatePath("/stock-counts");
  revalidatePath(`/stock-counts/${countId}`);
  revalidatePath("/inventory");
  revalidatePath("/approvals");
  return { success: true };
}

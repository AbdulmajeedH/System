"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, withSerializableTx } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  AdjustmentKind,
  ApprovalDecision,
  ApprovalStatus,
  ApprovalTransactionType,
  MovementType,
} from "@/generated/prisma/enums";
import { actionPermission } from "@/lib/auth/guards";
import { audit } from "@/lib/services/audit";
import {
  ApprovalError,
  createApprovalRequest,
  decideApproval,
} from "@/lib/services/approvals";
import { InsufficientStockError, postMovement } from "@/lib/services/inventory";
import { unknownError, type FormState } from "@/lib/utils/action-state";
import { t } from "@/lib/i18n/ar";

const Decimal = Prisma.Decimal;

/** Which side of the ledger each adjustment kind touches when posted. */
function movementFor(
  kind: AdjustmentKind,
  locationId: string,
): { type: MovementType; sourceLocationId?: string; destLocationId?: string } {
  switch (kind) {
    case AdjustmentKind.OPENING_BALANCE:
      return { type: MovementType.OPENING_BALANCE, destLocationId: locationId };
    case AdjustmentKind.MANUAL_INCREASE:
      return { type: MovementType.MANUAL_ADJUSTMENT, destLocationId: locationId };
    case AdjustmentKind.MANUAL_DECREASE:
      return { type: MovementType.MANUAL_ADJUSTMENT, sourceLocationId: locationId };
  }
}

async function postAdjustment(
  tx: Prisma.TransactionClient,
  adjustmentId: string,
  userId: string,
): Promise<void> {
  const adjustment = await tx.inventoryAdjustment.findUniqueOrThrow({
    where: { id: adjustmentId },
  });
  await postMovement(tx, {
    itemId: adjustment.itemId,
    quantity: adjustment.quantity,
    ...movementFor(adjustment.kind, adjustment.locationId),
    refType: "InventoryAdjustment",
    refId: adjustmentId,
    userId,
    reason: adjustment.reason,
  });
  await tx.inventoryAdjustment.update({
    where: { id: adjustmentId },
    data: { status: ApprovalStatus.APPROVED, postedAt: new Date() },
  });
}

export async function createAdjustment(_prev: FormState, formData: FormData): Promise<FormState> {
  // Adjustments are a warehouse/owner operation, like manual stock control.
  const user = await actionPermission("inventory.manageItems");

  const itemId = String(formData.get("itemId") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  const kind = String(formData.get("kind") ?? "") as AdjustmentKind;
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!itemId || !locationId || !reason) return { error: t.common.required };
  if (!Object.values(AdjustmentKind).includes(kind)) return { error: t.common.error };
  if (!/^\d{1,10}(\.\d{1,3})?$/.test(quantityRaw) || Number(quantityRaw) <= 0) {
    return { fieldErrors: { quantity: t.income.invalidAmount } };
  }
  const quantity = new Decimal(quantityRaw);

  let result: { adjustmentId: string; autoApproved: boolean };
  try {
    result = await withSerializableTx(async (tx) => {
      const [item, location] = await Promise.all([
        tx.inventoryItem.findFirst({ where: { id: itemId, isActive: true } }),
        tx.inventoryLocation.findFirst({ where: { id: locationId, isActive: true } }),
      ]);
      if (!item || !location) throw new Error("inactive-selection");

      const estimatedValue = quantity.mul(item.averageCost).toDecimalPlaces(2);
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          itemId,
          locationId,
          kind,
          quantity,
          reason,
          estimatedValue,
          requestedById: user.id,
        },
      });

      const approval = await createApprovalRequest(tx, {
        transactionType: ApprovalTransactionType.STOCK_ADJUSTMENT,
        entityType: "InventoryAdjustment",
        entityId: adjustment.id,
        amount: estimatedValue,
        departmentId: location.departmentId,
        requestedById: user.id,
        requesterRole: user.role,
      });

      if (approval.autoApproved) {
        await postAdjustment(tx, adjustment.id, user.id);
      }
      return { adjustmentId: adjustment.id, autoApproved: approval.autoApproved };
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "inactive-selection") return { error: t.common.inactiveSelection };
    if (error instanceof InsufficientStockError) {
      return { fieldErrors: { quantity: t.stockRequests.insufficientStock } };
    }
    return unknownError();
  }

  await audit({
    userId: user.id,
    action: "inventory.adjustment_create",
    entityType: "InventoryAdjustment",
    entityId: result.adjustmentId,
    metadata: { itemId, locationId, kind, quantity: quantityRaw, autoApproved: result.autoApproved },
  });

  revalidatePath("/inventory/adjustments");
  revalidatePath("/inventory");
  redirect("/inventory/adjustments");
}

export async function decideAdjustment(
  adjustmentId: string,
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
      const adjustment = await tx.inventoryAdjustment.findUnique({ where: { id: adjustmentId } });
      if (!adjustment || adjustment.status !== ApprovalStatus.PENDING) {
        throw new ApprovalError(t.common.error);
      }
      await decideApproval(tx, {
        entityType: "InventoryAdjustment",
        entityId: adjustmentId,
        decision: ApprovalDecision[decision],
        comment,
        userId: user.id,
        userRole: user.role,
      });
      if (decision === "APPROVED") {
        await postAdjustment(tx, adjustmentId, user.id);
      } else {
        await tx.inventoryAdjustment.update({
          where: { id: adjustmentId },
          data: { status: ApprovalStatus.REJECTED },
        });
      }
    });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { error: t.stockRequests.insufficientStock };
    }
    if (error instanceof ApprovalError) return { error: error.message };
    return unknownError();
  }

  await audit({
    userId: user.id,
    action: `inventory.adjustment_${decision.toLowerCase()}`,
    entityType: "InventoryAdjustment",
    entityId: adjustmentId,
    metadata: comment ? { comment } : undefined,
  });

  revalidatePath("/inventory/adjustments");
  revalidatePath("/inventory");
  revalidatePath("/approvals");
  return { success: true };
}

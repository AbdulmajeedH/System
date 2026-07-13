"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, withSerializableTx } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  ApprovalDecision,
  ApprovalStatus,
  ApprovalTransactionType,
  AttachmentEntityType,
  DamageType,
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
import { AttachmentError, saveAttachments } from "@/lib/services/attachments";
import { unknownError, type FormState } from "@/lib/utils/action-state";
import { t } from "@/lib/i18n/ar";

const Decimal = Prisma.Decimal;

async function postDamageMovement(
  tx: Prisma.TransactionClient,
  damageId: string,
  userId: string,
): Promise<void> {
  const damage = await tx.damageRecord.findUniqueOrThrow({ where: { id: damageId } });
  await postMovement(tx, {
    itemId: damage.itemId,
    quantity: damage.quantity,
    type: damage.type === DamageType.EXPIRED ? MovementType.EXPIRY : MovementType.DAMAGE,
    sourceLocationId: damage.locationId,
    refType: "DamageRecord",
    refId: damageId,
    userId,
    reason: damage.reason,
  });
  await tx.damageRecord.update({
    where: { id: damageId },
    data: { status: ApprovalStatus.APPROVED, postedAt: new Date() },
  });
}

export async function createDamage(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionPermission("damage.record");

  const itemId = String(formData.get("itemId") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const type = String(formData.get("type") ?? "") as DamageType;
  const reason = String(formData.get("reason") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File);

  if (!itemId || !locationId || !reason || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: t.common.required };
  }
  if (!/^\d{1,10}(\.\d{1,3})?$/.test(quantityRaw) || Number(quantityRaw) <= 0) {
    return { fieldErrors: { quantity: t.income.invalidAmount } };
  }
  if (!Object.values(DamageType).includes(type)) return { error: t.common.error };

  // Location scoping: warehouse/owner anywhere, department users their own.
  if (user.role !== "OWNER" && user.role !== "WAREHOUSE_MANAGER") {
    const location = await prisma.inventoryLocation.findUnique({ where: { id: locationId } });
    if (!location || location.departmentId !== user.departmentId) {
      return { error: t.income.cannotSubmitForOtherDept };
    }
  }

  const quantity = new Decimal(quantityRaw);

  let result: { damageId: string; autoApproved: boolean };
  try {
    result = await withSerializableTx(async (tx) => {
      const item = await tx.inventoryItem.findFirstOrThrow({
        where: { id: itemId, isActive: true },
      });
      const estimatedCost = quantity.mul(item.averageCost).toDecimalPlaces(2);
      const location = await tx.inventoryLocation.findUniqueOrThrow({ where: { id: locationId } });

      const damage = await tx.damageRecord.create({
        data: {
          itemId,
          locationId,
          quantity,
          type,
          reason,
          date: new Date(`${date}T00:00:00.000Z`),
          reportedById: user.id,
          estimatedCost,
          notes,
        },
      });

      const approval = await createApprovalRequest(tx, {
        transactionType: ApprovalTransactionType.DAMAGE,
        entityType: "DamageRecord",
        entityId: damage.id,
        amount: estimatedCost,
        departmentId: location.departmentId,
        requestedById: user.id,
        requesterRole: user.role,
      });

      if (approval.autoApproved) {
        await postDamageMovement(tx, damage.id, user.id);
      }
      return { damageId: damage.id, autoApproved: approval.autoApproved };
    });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { fieldErrors: { quantity: t.stockRequests.insufficientStock } };
    }
    return unknownError();
  }

  try {
    await saveAttachments(files, AttachmentEntityType.DAMAGE_RECORD, result.damageId, user.id);
  } catch (error) {
    if (error instanceof AttachmentError) return { error: error.message };
    throw error;
  }

  await audit({
    userId: user.id,
    action: "damage.create",
    entityType: "DamageRecord",
    entityId: result.damageId,
    metadata: { itemId, locationId, quantity: quantity.toString(), autoApproved: result.autoApproved },
  });

  revalidatePath("/damages");
  revalidatePath("/inventory");
  redirect(`/damages/${result.damageId}`);
}

export async function decideDamage(
  damageId: string,
  decision: "APPROVED" | "REJECTED",
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionPermission("damage.approve");

  const comment = String(formData.get("comment") ?? "").trim() || null;
  if (decision === "REJECTED" && !comment) {
    return { fieldErrors: { comment: t.common.required } };
  }

  try {
    await withSerializableTx(async (tx) => {
      const damage = await tx.damageRecord.findUnique({ where: { id: damageId } });
      if (!damage || damage.status !== ApprovalStatus.PENDING) {
        throw new ApprovalError(t.common.error);
      }
      await decideApproval(tx, {
        entityType: "DamageRecord",
        entityId: damageId,
        decision: ApprovalDecision[decision],
        comment,
        userId: user.id,
        userRole: user.role,
      });
      if (decision === "APPROVED") {
        await postDamageMovement(tx, damageId, user.id);
      } else {
        await tx.damageRecord.update({
          where: { id: damageId },
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
    action: `damage.${decision.toLowerCase()}`,
    entityType: "DamageRecord",
    entityId: damageId,
    metadata: comment ? { comment } : undefined,
  });

  revalidatePath("/damages");
  revalidatePath(`/damages/${damageId}`);
  revalidatePath("/inventory");
  revalidatePath("/approvals");
  return { success: true };
}

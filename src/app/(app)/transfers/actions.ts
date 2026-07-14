"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, withSerializableTx } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { AttachmentEntityType, MovementType, Role } from "@/generated/prisma/enums";
import type { SessionUser } from "@/lib/auth/session";
import { actionUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { audit } from "@/lib/services/audit";
import { InsufficientStockError, postMovement } from "@/lib/services/inventory";
import { AttachmentError, saveAttachments } from "@/lib/services/attachments";
import { notifyRoles } from "@/lib/services/notifications";
import { unknownError, type FormState } from "@/lib/utils/action-state";
import { t } from "@/lib/i18n/ar";

const Decimal = Prisma.Decimal;

type LocationLite = { id: string; code: string; departmentId: string | null };

/**
 * Who may CREATE a standalone transfer between two locations:
 * warehouse/owner anywhere; a department manager only from their own
 * location back to the main warehouse (the return-to-warehouse flow).
 */
function mayCreate(user: SessionUser, from: LocationLite, to: LocationLite): boolean {
  if (user.role === Role.OWNER || can(user, "warehouse.manage")) return true;
  return (
    from.departmentId !== null &&
    from.departmentId === user.departmentId &&
    to.code === "MAIN_WAREHOUSE"
  );
}

/** Who may CONFIRM receipt: the receiving side. */
function mayConfirm(user: SessionUser, to: LocationLite): boolean {
  if (user.role === Role.OWNER) return true;
  if (to.code === "MAIN_WAREHOUSE" || to.departmentId === null) {
    return can(user, "warehouse.manage");
  }
  return to.departmentId === user.departmentId && can(user, "stock.confirmReceipt");
}

export async function createStandaloneTransfer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionUser();

  const fromLocationId = String(formData.get("fromLocationId") ?? "");
  const toLocationId = String(formData.get("toLocationId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  let lines: Array<{ itemId: string; quantity: string }> = [];
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    lines = [];
  }
  lines = lines.filter(
    (l) =>
      typeof l.itemId === "string" &&
      l.itemId &&
      /^\d{1,10}(\.\d{1,3})?$/.test(String(l.quantity)) &&
      Number(l.quantity) > 0,
  );
  if (!fromLocationId || !toLocationId || lines.length === 0) {
    return { error: t.stockRequests.needsOneItem };
  }
  if (fromLocationId === toLocationId) return { error: t.transfers.sameLocation };

  const [from, to] = await Promise.all([
    prisma.inventoryLocation.findFirst({
      where: { id: fromLocationId, isActive: true },
      select: { id: true, code: true, departmentId: true },
    }),
    prisma.inventoryLocation.findFirst({
      where: { id: toLocationId, isActive: true },
      select: { id: true, code: true, departmentId: true },
    }),
  ]);
  if (!from || !to) return { error: t.common.inactiveSelection };
  if (!mayCreate(user, from, to)) return { error: t.income.cannotSubmitForOtherDept };

  const activeItems = await prisma.inventoryItem.count({
    where: { id: { in: lines.map((l) => l.itemId) }, isActive: true },
  });
  if (activeItems !== new Set(lines.map((l) => l.itemId)).size) {
    return { error: t.common.inactiveSelection };
  }

  const transfer = await prisma.stockTransfer.create({
    data: {
      fromLocationId,
      toLocationId,
      preparedById: user.id,
      deliveredAt: new Date(),
      notes,
      items: {
        create: lines.map((l) => ({ itemId: l.itemId, preparedQty: new Decimal(l.quantity) })),
      },
    },
  });

  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File);
  try {
    await saveAttachments(files, AttachmentEntityType.STOCK_TRANSFER, transfer.id, user.id);
  } catch (error) {
    if (error instanceof AttachmentError) return { error: error.message };
    throw error;
  }

  // Tell the receiving side a transfer awaits their confirmation.
  if (to.code === "MAIN_WAREHOUSE" || to.departmentId === null) {
    await notifyRoles(prisma, [Role.WAREHOUSE_MANAGER, Role.OWNER], {
      type: "transfer.awaiting",
      title: t.notifications.titles.transferAwaiting,
      entityType: "StockTransfer",
      entityId: transfer.id,
      excludeUserId: user.id,
    });
  } else {
    await notifyRoles(prisma, [Role.DEPARTMENT_MANAGER], {
      type: "transfer.awaiting",
      title: t.notifications.titles.transferAwaiting,
      entityType: "StockTransfer",
      entityId: transfer.id,
      departmentId: to.departmentId,
      excludeUserId: user.id,
    });
  }

  await audit({
    userId: user.id,
    action: "transfer.create",
    entityType: "StockTransfer",
    entityId: transfer.id,
    metadata: { fromLocationId, toLocationId, items: lines.length },
  });

  revalidatePath("/transfers");
  redirect("/transfers");
}

/**
 * Receiving-side confirmation posts the ledger movements:
 * department → warehouse uses a single RETURN_TO_WAREHOUSE movement;
 * anything else posts TRANSFER_OUT + TRANSFER_IN pairs.
 */
export async function confirmStandaloneTransfer(
  transferId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionUser();

  try {
    await withSerializableTx(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: { items: true, fromLocation: true, toLocation: true },
      });
      if (!transfer || transfer.requestId !== null || transfer.completedAt !== null) {
        throw new Error("bad-status");
      }
      if (!mayConfirm(user, transfer.toLocation)) throw new Error("forbidden");

      const isReturn =
        transfer.fromLocation.departmentId !== null &&
        transfer.toLocation.code === "MAIN_WAREHOUSE";

      for (const line of transfer.items) {
        if (isReturn) {
          await postMovement(tx, {
            itemId: line.itemId,
            quantity: line.preparedQty,
            type: MovementType.RETURN_TO_WAREHOUSE,
            sourceLocationId: transfer.fromLocationId,
            destLocationId: transfer.toLocationId,
            refType: "StockTransfer",
            refId: transfer.id,
            userId: user.id,
          });
        } else {
          await postMovement(tx, {
            itemId: line.itemId,
            quantity: line.preparedQty,
            type: MovementType.TRANSFER_OUT,
            sourceLocationId: transfer.fromLocationId,
            refType: "StockTransfer",
            refId: transfer.id,
            userId: user.id,
          });
          await postMovement(tx, {
            itemId: line.itemId,
            quantity: line.preparedQty,
            type: MovementType.TRANSFER_IN,
            destLocationId: transfer.toLocationId,
            refType: "StockTransfer",
            refId: transfer.id,
            userId: user.id,
          });
        }
        await tx.stockTransferItem.update({
          where: { id: line.id },
          data: { receivedQty: line.preparedQty },
        });
      }

      await tx.stockTransfer.update({
        where: { id: transferId },
        data: { receivedById: user.id, receivedAt: new Date(), completedAt: new Date() },
      });
    });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { error: t.stockRequests.insufficientStock };
    }
    if ((error as Error).message === "forbidden") {
      return { error: t.income.cannotSubmitForOtherDept };
    }
    return unknownError();
  }

  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File);
  try {
    await saveAttachments(files, AttachmentEntityType.STOCK_TRANSFER, transferId, user.id);
  } catch (error) {
    if (error instanceof AttachmentError) return { error: error.message };
    throw error;
  }

  await audit({
    userId: user.id,
    action: "transfer.confirm",
    entityType: "StockTransfer",
    entityId: transferId,
  });

  revalidatePath("/transfers");
  revalidatePath("/inventory");
  return { success: true };
}

// Entity-specific attachment authorization. Relative imports and an
// injected Prisma client keep this testable against the test database.
import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import { AttachmentEntityType, Role } from "../../generated/prisma/enums";
import { can, canAccessDepartment } from "../auth/permissions";
import type { SessionUser } from "../auth/session";

type Db = PrismaClient | Prisma.TransactionClient;

export type AttachmentRef = {
  entityType: AttachmentEntityType;
  entityId: string;
  uploadedById: string;
};

/**
 * Whether `user` may read the file attached to the given entity. Access is
 * derived from the RELATED RECORD (its department/location and the user's
 * permissions over it) — not from who uploaded the file. The uploader keeps
 * access to their own upload.
 */
export async function canViewAttachment(
  db: Db,
  user: SessionUser,
  ref: AttachmentRef,
): Promise<boolean> {
  if (user.role === Role.OWNER || user.role === Role.GENERAL_MANAGER) return true;
  if (ref.uploadedById === user.id) return true;

  switch (ref.entityType) {
    case AttachmentEntityType.DAILY_INCOME: {
      if (!can(user, "income.submit") && !can(user, "income.review") && !can(user, "income.viewAll")) {
        return false;
      }
      const submission = await db.dailyIncomeSubmission.findUnique({
        where: { id: ref.entityId },
        select: { departmentId: true },
      });
      return submission !== null && canAccessDepartment(user, submission.departmentId);
    }

    case AttachmentEntityType.EXPENSE: {
      if (!can(user, "expense.submit") && !can(user, "expense.review")) return false;
      const expense = await db.expense.findUnique({
        where: { id: ref.entityId },
        select: { departmentId: true, submittedById: true },
      });
      if (!expense) return false;
      if (expense.submittedById === user.id) return true;
      if (expense.departmentId === null) return can(user, "expense.review");
      return canAccessDepartment(user, expense.departmentId);
    }

    case AttachmentEntityType.PURCHASE_INVOICE:
      return (
        can(user, "invoice.manage") || can(user, "invoice.approve") || can(user, "warehouse.manage")
      );

    case AttachmentEntityType.DAMAGE_RECORD: {
      if (can(user, "damage.approve") || can(user, "warehouse.manage")) return true;
      if (!can(user, "damage.record")) return false;
      const damage = await db.damageRecord.findUnique({
        where: { id: ref.entityId },
        select: { location: { select: { departmentId: true } } },
      });
      return (
        damage?.location.departmentId !== null &&
        damage?.location.departmentId === user.departmentId
      );
    }

    case AttachmentEntityType.STOCK_COUNT: {
      if (can(user, "count.approve") || can(user, "warehouse.manage")) return true;
      if (!can(user, "count.perform")) return false;
      const count = await db.stockCount.findUnique({
        where: { id: ref.entityId },
        select: { location: { select: { departmentId: true } } },
      });
      return (
        count?.location.departmentId !== null && count?.location.departmentId === user.departmentId
      );
    }

    case AttachmentEntityType.STOCK_TRANSFER: {
      if (can(user, "warehouse.manage")) return true;
      if (!can(user, "stock.request") && !can(user, "stock.confirmReceipt")) return false;
      const transfer = await db.stockTransfer.findUnique({
        where: { id: ref.entityId },
        select: {
          fromLocation: { select: { departmentId: true } },
          toLocation: { select: { departmentId: true } },
        },
      });
      if (!transfer) return false;
      const departments = [
        transfer.fromLocation.departmentId,
        transfer.toLocation.departmentId,
      ].filter((d): d is string => d !== null);
      return departments.some((d) => d === user.departmentId);
    }

    case AttachmentEntityType.ATTENDANCE_EVENT: {
      const event = await db.attendanceEvent.findUnique({
        where: { id: ref.entityId },
        select: { userId: true, departmentId: true },
      });
      if (!event) return false;
      if (event.userId === user.id) return true;
      if (can(user, "attendance.viewAll")) return true;
      return (
        can(user, "attendance.viewDept") &&
        event.departmentId !== null &&
        event.departmentId === user.departmentId
      );
    }

    case AttachmentEntityType.INVENTORY_ITEM:
      return can(user, "inventory.view");

    default:
      return false;
  }
}

// In-app notification service. Channel-agnostic by design: `deliver` is the
// single funnel, so Telegram/WhatsApp senders can be added later behind the
// same call without touching the trigger sites. Relative imports + injected
// client keep it testable.
import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import { Role } from "../../generated/prisma/enums";
import { roleSatisfies } from "./roles";

type Db = PrismaClient | Prisma.TransactionClient;

/** Known notification types (also drives the preferences screen). */
export const NOTIFICATION_TYPES = [
  "approval.pending",
  "submission.rejected",
  "income.cash_difference",
  "stock.low",
  "stock.request_new",
  "stock.request_ready",
  "transfer.awaiting",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationInput = {
  type: NotificationType;
  title: string;
  body?: string | null;
  entityType?: string;
  entityId?: string;
};

/** Roles whose holders satisfy the given approval role (incl. seniors). */
export function rolesSatisfying(required: Role): Role[] {
  return Object.values(Role).filter((role) => roleSatisfies(role, required));
}

async function disabledFor(db: Db, userIds: string[], type: string): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const prefs = await db.notificationPreference.findMany({
    where: { userId: { in: userIds }, type, enabled: false },
    select: { userId: true },
  });
  return new Set(prefs.map((p) => p.userId));
}

async function deliver(db: Db, userIds: string[], input: NotificationInput): Promise<void> {
  const disabled = await disabledFor(db, userIds, input.type);
  const targets = [...new Set(userIds)].filter((id) => !disabled.has(id));
  if (targets.length === 0) return;
  await db.notification.createMany({
    data: targets.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
    })),
  });
}

export async function notifyUser(db: Db, userId: string, input: NotificationInput): Promise<void> {
  await deliver(db, [userId], input);
}

/** Notify every active holder of the given roles (optionally dept-scoped). */
export async function notifyRoles(
  db: Db,
  roles: Role[],
  input: NotificationInput & { departmentId?: string | null; excludeUserId?: string },
): Promise<void> {
  const users = await db.user.findMany({
    where: {
      isActive: true,
      role: { in: roles },
      ...(input.departmentId
        ? {
            OR: [
              { departmentId: input.departmentId },
              // Non-department roles (owner/GM/warehouse) always included.
              { role: { in: [Role.OWNER, Role.GENERAL_MANAGER, Role.WAREHOUSE_MANAGER] } },
            ],
          }
        : {}),
    },
    select: { id: true },
  });
  await deliver(
    db,
    users.map((u) => u.id).filter((id) => id !== input.excludeUserId),
    input,
  );
}

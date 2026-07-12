import "server-only";
import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth/session";
import type { Prisma } from "@/generated/prisma/client";

type AuditInput = {
  userId?: string | null;
  action: string; // dot-notation, e.g. "auth.login", "income.submit"
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Writes an audit trail entry. Call from server actions after (or inside) the
 * mutation transaction. Pass `tx` to make the audit row atomic with the change.
 */
export async function audit(input: AuditInput, tx?: Prisma.TransactionClient): Promise<void> {
  const { ip } = await requestMeta();
  const client = tx ?? prisma;
  await client.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      ip,
    },
  });
}

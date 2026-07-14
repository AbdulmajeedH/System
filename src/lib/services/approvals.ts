// Relative imports so tests and seeds can load this without alias resolution.
import { Prisma } from "../../generated/prisma/client";
import {
  ApprovalDecision,
  ApprovalStatus,
  ApprovalTransactionType,
  Role,
} from "../../generated/prisma/enums";
import { notifyRoles, notifyUser, rolesSatisfying } from "./notifications";
import { t } from "../i18n/ar";

const Decimal = Prisma.Decimal;

type RuleLike = {
  minAmount: Prisma.Decimal | null;
  maxAmount: Prisma.Decimal | null;
  departmentId: string | null;
  requiredRole: Role;
  level: number;
};

/**
 * Picks the approval rule for an amount: bounds are [min, max) — a null min
 * is an open lower bound, a null max an open upper bound. Department-specific
 * rules beat global ones.
 */
export function matchRule<T extends RuleLike>(
  rules: T[],
  amount: Prisma.Decimal,
  departmentId?: string | null,
): T | null {
  const inBand = (r: RuleLike) =>
    (r.minAmount === null || amount.gte(r.minAmount)) &&
    (r.maxAmount === null || amount.lt(r.maxAmount));

  const departmental = rules.filter((r) => r.departmentId && r.departmentId === departmentId);
  const global = rules.filter((r) => r.departmentId === null);

  return departmental.find(inBand) ?? global.find(inBand) ?? null;
}

import { roleSatisfies } from "./roles";
export { roleSatisfies };

export type CreateApprovalInput = {
  transactionType: ApprovalTransactionType;
  entityType: string;
  entityId: string;
  amount: Prisma.Decimal | string | number;
  departmentId?: string | null;
  requestedById: string;
  requesterRole: Role;
};

export type CreateApprovalResult =
  | { autoApproved: true }
  | { autoApproved: false; requestId: string; requiredRole: Role };

/**
 * Resolves the rule for the transaction and either auto-approves (when the
 * requester's role already satisfies the required approver role) or creates
 * a PENDING ApprovalRequest. One pending request per entity is enforced here.
 */
export async function createApprovalRequest(
  tx: Prisma.TransactionClient,
  input: CreateApprovalInput,
): Promise<CreateApprovalResult> {
  const amount = new Decimal(input.amount);
  const rules = await tx.approvalRule.findMany({
    where: { transactionType: input.transactionType, isActive: true },
    orderBy: { level: "asc" },
  });
  const rule = matchRule(rules, amount, input.departmentId);

  // No configured rule → treat as requiring the owner (safest default).
  const requiredRole = rule?.requiredRole ?? Role.OWNER;

  if (roleSatisfies(input.requesterRole, requiredRole)) {
    return { autoApproved: true };
  }

  const existing = await tx.approvalRequest.findFirst({
    where: {
      entityType: input.entityType,
      entityId: input.entityId,
      status: ApprovalStatus.PENDING,
    },
  });
  if (existing) {
    return { autoApproved: false, requestId: existing.id, requiredRole: existing.requiredRole };
  }

  const request = await tx.approvalRequest.create({
    data: {
      transactionType: input.transactionType,
      entityType: input.entityType,
      entityId: input.entityId,
      amount,
      departmentId: input.departmentId ?? null,
      requestedById: input.requestedById,
      requiredRole,
      status: ApprovalStatus.PENDING,
    },
  });

  await notifyRoles(tx, rolesSatisfying(requiredRole), {
    type: "approval.pending",
    title: t.notifications.titles.approvalPending,
    entityType: input.entityType,
    entityId: input.entityId,
    excludeUserId: input.requestedById,
  });

  return { autoApproved: false, requestId: request.id, requiredRole };
}

export type DecideApprovalInput = {
  entityType: string;
  entityId: string;
  decision: ApprovalDecision;
  comment?: string | null;
  userId: string;
  userRole: Role;
};

export class ApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalError";
  }
}

/**
 * Records a decision on the entity's PENDING approval request. Caller is
 * responsible for applying the entity-side effect (status change, posting
 * movements, …) in the same transaction.
 */
export async function decideApproval(
  tx: Prisma.TransactionClient,
  input: DecideApprovalInput,
): Promise<{ requestId: string }> {
  const request = await tx.approvalRequest.findFirst({
    where: {
      entityType: input.entityType,
      entityId: input.entityId,
      status: ApprovalStatus.PENDING,
    },
  });
  if (!request) throw new ApprovalError("لا يوجد طلب موافقة معلق لهذا السجل");
  if (!roleSatisfies(input.userRole, request.requiredRole)) {
    throw new ApprovalError("هذه الموافقة تتطلب صلاحية أعلى");
  }

  const newStatus =
    input.decision === ApprovalDecision.APPROVED ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;

  await tx.approvalRequest.update({
    where: { id: request.id },
    data: { status: newStatus },
  });
  await tx.approvalAction.create({
    data: {
      requestId: request.id,
      userId: input.userId,
      decision: input.decision,
      comment: input.comment ?? null,
      previousStatus: ApprovalStatus.PENDING,
      newStatus,
    },
  });

  if (input.decision === ApprovalDecision.REJECTED) {
    await notifyUser(tx, request.requestedById, {
      type: "submission.rejected",
      title: t.notifications.titles.rejected,
      body: input.comment ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  }

  return { requestId: request.id };
}

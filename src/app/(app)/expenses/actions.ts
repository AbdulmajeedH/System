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
} from "@/generated/prisma/enums";
import { actionPermission } from "@/lib/auth/guards";
import { canAccessDepartment } from "@/lib/auth/permissions";
import { audit } from "@/lib/services/audit";
import {
  ApprovalError,
  createApprovalRequest,
  decideApproval,
} from "@/lib/services/approvals";
import { AttachmentError, saveAttachments } from "@/lib/services/attachments";
import { expenseFormSchema } from "@/lib/validations/expenses";
import { fieldErrorsFromZod, unknownError, type FormState } from "@/lib/utils/action-state";
import { t } from "@/lib/i18n/ar";

export async function createExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionPermission("expense.submit");

  const parsed = expenseFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fieldErrorsFromZod(parsed.error);
  const data = parsed.data;

  if (data.departmentId && !canAccessDepartment(user, data.departmentId)) {
    return { error: t.income.cannotSubmitForOtherDept };
  }
  // Department-scoped users always record against their own department.
  const departmentId = user.departmentId ?? data.departmentId;

  // Related rows must exist AND still be active.
  const [category, supplier] = await Promise.all([
    prisma.expenseCategory.findFirst({ where: { id: data.categoryId, isActive: true } }),
    data.supplierId
      ? prisma.supplier.findFirst({ where: { id: data.supplierId, isActive: true } })
      : Promise.resolve(undefined),
  ]);
  if (!category || (data.supplierId && !supplier)) {
    return { error: t.common.inactiveSelection };
  }

  const amount = new Prisma.Decimal(data.amount);
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File);

  const { expenseId, autoApproved } = await withSerializableTx(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        date: new Date(`${data.date}T00:00:00.000Z`),
        departmentId,
        categoryId: data.categoryId,
        amount,
        paymentMethod: data.paymentMethod,
        description: data.description,
        supplierId: data.supplierId,
        submittedById: user.id,
        notes: data.notes,
      },
    });

    const approval = await createApprovalRequest(tx, {
      transactionType: ApprovalTransactionType.EXPENSE,
      entityType: "Expense",
      entityId: expense.id,
      amount,
      departmentId,
      requestedById: user.id,
      requesterRole: user.role,
    });

    if (approval.autoApproved) {
      await tx.expense.update({
        where: { id: expense.id },
        data: { status: ApprovalStatus.APPROVED },
      });
    }
    return { expenseId: expense.id, autoApproved: approval.autoApproved };
  });

  try {
    await saveAttachments(files, AttachmentEntityType.EXPENSE, expenseId, user.id);
  } catch (error) {
    if (error instanceof AttachmentError) return { error: error.message };
    throw error;
  }

  await audit({
    userId: user.id,
    action: "expense.create",
    entityType: "Expense",
    entityId: expenseId,
    metadata: { amount: amount.toString(), departmentId, autoApproved },
  });

  revalidatePath("/expenses");
  redirect(`/expenses/${expenseId}`);
}

export async function decideExpense(
  expenseId: string,
  decision: "APPROVED" | "REJECTED",
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionPermission("expense.review");

  const comment = String(formData.get("comment") ?? "").trim() || null;
  if (decision === "REJECTED" && !comment) {
    return { fieldErrors: { comment: t.common.required } };
  }

  try {
    await withSerializableTx(async (tx) => {
      const expense = await tx.expense.findUnique({ where: { id: expenseId } });
      if (!expense || expense.status !== ApprovalStatus.PENDING) {
        throw new ApprovalError(t.common.error);
      }

      await decideApproval(tx, {
        entityType: "Expense",
        entityId: expenseId,
        decision: ApprovalDecision[decision],
        comment,
        userId: user.id,
        userRole: user.role,
      });

      await tx.expense.update({
        where: { id: expenseId },
        data: {
          status: ApprovalStatus[decision],
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
    action: `expense.${decision.toLowerCase()}`,
    entityType: "Expense",
    entityId: expenseId,
    metadata: comment ? { comment } : undefined,
  });

  revalidatePath("/expenses");
  revalidatePath(`/expenses/${expenseId}`);
  revalidatePath("/approvals");
  return { success: true };
}

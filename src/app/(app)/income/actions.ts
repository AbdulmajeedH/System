"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, withSerializableTx } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { AttachmentEntityType, Role, SubmissionStatus } from "@/generated/prisma/enums";
import { notifyRoles } from "@/lib/services/notifications";
import { actionPermission } from "@/lib/auth/guards";
import { canAccessDepartment } from "@/lib/auth/permissions";
import { audit } from "@/lib/services/audit";
import { computeIncomeTotals } from "@/lib/services/income";
import { AttachmentError, saveAttachments } from "@/lib/services/attachments";
import { incomeFormSchema } from "@/lib/validations/income";
import { fieldErrorsFromZod, unknownError, type FormState } from "@/lib/utils/action-state";
import { t } from "@/lib/i18n/ar";

function collectProductCounts(formData: FormData): Array<{ productId: string; quantity: string }> {
  const counts: Array<{ productId: string; quantity: string }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("product_") || typeof value !== "string") continue;
    const quantity = value.trim();
    if (!quantity || Number(quantity) === 0) continue;
    if (!/^\d{1,7}(\.\d{1,3})?$/.test(quantity)) continue;
    counts.push({ productId: key.slice("product_".length), quantity });
  }
  return counts;
}

export async function saveIncome(
  submissionId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionPermission("income.submit");
  const options = { submissionId, asDraft: formData.get("asDraft") === "1" };

  const parsed = incomeFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fieldErrorsFromZod(parsed.error);
  const data = parsed.data;

  // Department managers may only submit for their own department.
  if (!canAccessDepartment(user, data.departmentId)) {
    return { error: t.income.cannotSubmitForOtherDept };
  }
  // Duplicate exceptions need manager authority; ignore the flag otherwise.
  const isException = data.isException && (user.role === "OWNER" || user.role === "GENERAL_MANAGER");

  const totals = computeIncomeTotals(data);
  if (!totals.cashDifference.isZero() && !data.differenceReason && !options.asDraft) {
    return { fieldErrors: { differenceReason: t.income.differenceReasonRequired } };
  }

  const date = new Date(`${data.date}T00:00:00.000Z`);
  const status = options.asDraft ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED;
  const productCounts = collectProductCounts(formData);
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File);

  let savedId: string;
  try {
    savedId = await withSerializableTx(async (tx) => {
      if (options.submissionId) {
        const existing = await tx.dailyIncomeSubmission.findUnique({
          where: { id: options.submissionId },
        });
        if (!existing) throw new Error("not-found");
        if (existing.status !== SubmissionStatus.DRAFT || existing.submittedById !== user.id) {
          throw new Error("not-editable");
        }
      }

      // Duplicate prevention: one non-rejected submission per dept/date/shift.
      const duplicate = await tx.dailyIncomeSubmission.findFirst({
        where: {
          departmentId: data.departmentId,
          date,
          shiftType: data.shiftType,
          status: { not: SubmissionStatus.REJECTED },
          ...(options.submissionId ? { id: { not: options.submissionId } } : {}),
        },
      });
      if (duplicate && !isException) throw new Error("duplicate");

      const values = {
        departmentId: data.departmentId,
        date,
        shiftType: data.shiftType,
        cashIncome: new Prisma.Decimal(data.cashIncome),
        cardIncome: new Prisma.Decimal(data.cardIncome),
        bankTransferIncome: new Prisma.Decimal(data.bankTransferIncome),
        deliveryAppsIncome: new Prisma.Decimal(data.deliveryAppsIncome),
        otherIncome: new Prisma.Decimal(data.otherIncome),
        cashExpenses: new Prisma.Decimal(data.cashExpenses),
        cashRefunds: new Prisma.Decimal(data.cashRefunds),
        actualDelivered: new Prisma.Decimal(data.actualDelivered),
        totalIncome: totals.totalIncome,
        netIncome: totals.netIncome,
        expectedCash: totals.expectedCash,
        cashDifference: totals.cashDifference,
        differenceReason: data.differenceReason,
        notes: data.notes,
        isException,
        status,
        submittedAt: options.asDraft ? null : new Date(),
      };

      const submission = options.submissionId
        ? await tx.dailyIncomeSubmission.update({
            where: { id: options.submissionId },
            data: values,
          })
        : await tx.dailyIncomeSubmission.create({
            data: { ...values, submittedById: user.id },
          });

      // Replace important-product counts with the submitted set.
      await tx.importantProductDailyCount.deleteMany({ where: { submissionId: submission.id } });
      if (productCounts.length > 0) {
        await tx.importantProductDailyCount.createMany({
          data: productCounts.map((c) => ({
            submissionId: submission.id,
            productId: c.productId,
            quantity: new Prisma.Decimal(c.quantity),
          })),
        });
      }
      return submission.id;
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "duplicate") return { error: t.income.duplicateSubmission };
    if (message === "not-editable") return { error: t.income.onlyDraftEditable };
    if (message === "not-found") return { error: t.common.error };
    throw error;
  }

  try {
    await saveAttachments(files, AttachmentEntityType.DAILY_INCOME, savedId, user.id);
  } catch (error) {
    if (error instanceof AttachmentError) {
      // The submission itself succeeded; surface the attachment problem.
      return { error: error.message };
    }
    throw error;
  }

  if (!options.asDraft && !totals.cashDifference.isZero()) {
    await notifyRoles(prisma, [Role.GENERAL_MANAGER, Role.OWNER], {
      type: "income.cash_difference",
      title: t.notifications.titles.cashDifference,
      body: `${totals.cashDifference.toString()} ${t.app.currency}`,
      entityType: "DailyIncomeSubmission",
      entityId: savedId,
      excludeUserId: user.id,
    });
  }

  await audit({
    userId: user.id,
    action: options.asDraft ? "income.save_draft" : "income.submit",
    entityType: "DailyIncomeSubmission",
    entityId: savedId,
    metadata: {
      departmentId: data.departmentId,
      date: data.date,
      shiftType: data.shiftType,
      totalIncome: totals.totalIncome.toString(),
      cashDifference: totals.cashDifference.toString(),
    },
  });

  revalidatePath("/income");
  redirect(`/income/${savedId}`);
}

export async function reviewIncome(
  submissionId: string,
  decision: "REVIEWED" | "APPROVED" | "REJECTED",
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionPermission("income.review");

  const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();
  if (decision === "REJECTED" && !rejectionReason) {
    return { fieldErrors: { rejectionReason: t.common.required } };
  }

  const submission = await prisma.dailyIncomeSubmission.findUnique({
    where: { id: submissionId },
  });
  if (!submission) return unknownError();

  const allowedTransitions: Record<string, SubmissionStatus[]> = {
    REVIEWED: [SubmissionStatus.SUBMITTED],
    APPROVED: [SubmissionStatus.SUBMITTED, SubmissionStatus.REVIEWED],
    REJECTED: [SubmissionStatus.SUBMITTED, SubmissionStatus.REVIEWED],
  };
  if (!allowedTransitions[decision].includes(submission.status)) {
    return unknownError();
  }

  await prisma.dailyIncomeSubmission.update({
    where: { id: submissionId },
    data: {
      status: SubmissionStatus[decision],
      reviewedById: user.id,
      reviewedAt: new Date(),
      rejectionReason: decision === "REJECTED" ? rejectionReason : null,
    },
  });
  await audit({
    userId: user.id,
    action: `income.${decision.toLowerCase()}`,
    entityType: "DailyIncomeSubmission",
    entityId: submissionId,
    metadata: decision === "REJECTED" ? { rejectionReason } : undefined,
  });

  revalidatePath("/income");
  revalidatePath(`/income/${submissionId}`);
  return { success: true };
}

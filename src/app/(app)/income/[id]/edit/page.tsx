import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { SubmissionStatus } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { toDateInputValue } from "@/lib/utils/format";
import { PageHeader } from "@/components/ui";
import { saveIncome } from "../../actions";
import { IncomeForm } from "../../income-form";

export const metadata = { title: t.income.submission };

export default async function EditIncomePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("income.submit");
  const { id } = await params;

  const submission = await prisma.dailyIncomeSubmission.findUnique({
    where: { id },
    include: { productCounts: true },
  });
  if (!submission) notFound();
  if (submission.status !== SubmissionStatus.DRAFT || submission.submittedById !== user.id) {
    redirect(`/income/${id}`);
  }

  const [departments, products] = await Promise.all([
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true },
      orderBy: { nameAr: "asc" },
    }),
    prisma.importantProduct.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true, departmentId: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const isManager = user.role === "OWNER" || user.role === "GENERAL_MANAGER";
  const productCounts: Record<string, string> = {};
  for (const c of submission.productCounts) {
    productCounts[c.productId] = c.quantity.toString();
  }

  return (
    <div>
      <PageHeader title={`${t.common.edit}: ${t.income.submission}`} />
      <IncomeForm
        action={saveIncome.bind(null, id)}
        departments={departments}
        lockedDepartmentId={isManager ? null : user.departmentId}
        products={products}
        allowException={isManager}
        initial={{
          date: toDateInputValue(submission.date),
          shiftType: submission.shiftType,
          departmentId: submission.departmentId,
          cashIncome: submission.cashIncome.toString(),
          cardIncome: submission.cardIncome.toString(),
          bankTransferIncome: submission.bankTransferIncome.toString(),
          deliveryAppsIncome: submission.deliveryAppsIncome.toString(),
          otherIncome: submission.otherIncome.toString(),
          cashExpenses: submission.cashExpenses.toString(),
          cashRefunds: submission.cashRefunds.toString(),
          actualDelivered: submission.actualDelivered.toString(),
          differenceReason: submission.differenceReason ?? "",
          notes: submission.notes ?? "",
          productCounts,
        }}
      />
    </div>
  );
}

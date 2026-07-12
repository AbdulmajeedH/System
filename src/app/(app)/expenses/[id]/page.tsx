import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can, canAccessDepartment } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { ApprovalStatus, AttachmentEntityType } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { DecideButtons } from "./decide-buttons";

export const metadata = { title: t.expenses.title };

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      department: { select: { nameAr: true } },
      category: { select: { nameAr: true } },
      supplier: { select: { nameAr: true } },
      submittedBy: { select: { name: true } },
    },
  });
  if (!expense) notFound();
  if (expense.departmentId && !canAccessDepartment(user, expense.departmentId)) {
    redirect("/expenses");
  }

  const attachments = await prisma.fileAttachment.findMany({
    where: { entityType: AttachmentEntityType.EXPENSE, entityId: id },
  });

  const canDecide = can(user, "expense.review") && expense.status === ApprovalStatus.PENDING;

  return (
    <div className="space-y-4 max-w-xl">
      <PageHeader title={`${t.expenses.title}: ${expense.category.nameAr}`} />

      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <StatusBadge status={expense.status} label={t.statuses[expense.status]} />
          <span className="text-sm text-muted">{formatDate(expense.date)}</span>
        </div>
        <p className="text-2xl font-bold dir-ltr text-start">
          {formatMoney(expense.amount.toString())} {t.app.currency}
        </p>
        <div className="text-sm space-y-1">
          <p>
            <span className="text-muted">{t.expenses.description}: </span>
            {expense.description}
          </p>
          <p>
            <span className="text-muted">{t.expenses.paymentMethod}: </span>
            {t.paymentMethods[expense.paymentMethod]}
          </p>
          {expense.department ? (
            <p>
              <span className="text-muted">{t.common.department}: </span>
              {expense.department.nameAr}
            </p>
          ) : null}
          {expense.supplier ? (
            <p>
              <span className="text-muted">{t.expenses.supplier}: </span>
              {expense.supplier.nameAr}
            </p>
          ) : null}
          <p>
            <span className="text-muted">{t.expenses.submittedBy}: </span>
            {expense.submittedBy.name}
          </p>
          {expense.rejectionReason ? (
            <p className="text-danger">
              {t.income.rejectionReason}: {expense.rejectionReason}
            </p>
          ) : null}
          {expense.notes ? (
            <p>
              <span className="text-muted">{t.common.notes}: </span>
              {expense.notes}
            </p>
          ) : null}
        </div>
      </Card>

      {attachments.length > 0 ? (
        <Card>
          <h2 className="font-bold mb-2">{t.common.attachments}</h2>
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={`/api/files/${a.storageKey}`}
                  target="_blank"
                  className="text-primary text-sm font-medium underline"
                >
                  {a.fileName}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {canDecide ? <DecideButtons expenseId={id} /> : null}
    </div>
  );
}

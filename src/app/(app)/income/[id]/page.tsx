import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can, canAccessDepartment } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { AttachmentEntityType, SubmissionStatus } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { formatDate, formatDateTime, formatMoney, formatQty } from "@/lib/utils/format";
import { Badge, Button, Card, PageHeader, StatusBadge } from "@/components/ui";
import { ReviewButtons } from "./review-buttons";

export const metadata = { title: t.income.submission };

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-1.5">
      <span className="text-muted">{label}</span>
      <span className={`dir-ltr ${strong ? "font-bold" : "font-medium"}`}>{value}</span>
    </div>
  );
}

export default async function IncomeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const submission = await prisma.dailyIncomeSubmission.findUnique({
    where: { id },
    include: {
      department: true,
      submittedBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      productCounts: { include: { product: true } },
    },
  });
  if (!submission) notFound();
  if (!canAccessDepartment(user, submission.departmentId)) redirect("/income");

  const attachments = await prisma.fileAttachment.findMany({
    where: { entityType: AttachmentEntityType.DAILY_INCOME, entityId: id },
  });

  const money = (v: { toString(): string }) => `${formatMoney(v.toString())} ${t.app.currency}`;
  const canReview =
    can(user, "income.review") &&
    (submission.status === SubmissionStatus.SUBMITTED ||
      submission.status === SubmissionStatus.REVIEWED);
  const canEdit =
    submission.status === SubmissionStatus.DRAFT && submission.submittedById === user.id;

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader
        title={`${t.income.submission} — ${submission.department.nameAr}`}
        action={
          canEdit ? (
            <Link href={`/income/${id}/edit`}>
              <Button variant="secondary">{t.common.edit}</Button>
            </Link>
          ) : undefined
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={submission.status} label={t.statuses[submission.status]} />
            {submission.isException ? <Badge tone="amber">{t.common.confirm}</Badge> : null}
          </div>
          <span className="text-sm text-muted">
            {formatDate(submission.date)} · {t.shifts[submission.shiftType]}
          </span>
        </div>
        <Row label={t.income.submittedBy} value={submission.submittedBy.name} />
        {submission.reviewedBy ? (
          <Row label={t.income.reviewedBy} value={submission.reviewedBy.name} />
        ) : null}
        {submission.submittedAt ? (
          <Row label={t.common.createdAt} value={formatDateTime(submission.submittedAt)} />
        ) : null}
        {submission.rejectionReason ? (
          <p className="text-sm text-danger mt-2">
            {t.income.rejectionReason}: {submission.rejectionReason}
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="font-bold mb-2">{t.income.incomeSection}</h2>
        <Row label={t.income.cashIncome} value={money(submission.cashIncome)} />
        <Row label={t.income.cardIncome} value={money(submission.cardIncome)} />
        <Row label={t.income.bankTransferIncome} value={money(submission.bankTransferIncome)} />
        <Row label={t.income.deliveryAppsIncome} value={money(submission.deliveryAppsIncome)} />
        <Row label={t.income.otherIncome} value={money(submission.otherIncome)} />
        <div className="border-t border-border mt-2 pt-2">
          <Row label={t.income.totalIncome} value={money(submission.totalIncome)} strong />
        </div>
      </Card>

      <Card>
        <h2 className="font-bold mb-2">{t.income.cashSection}</h2>
        <Row label={t.income.cashExpenses} value={money(submission.cashExpenses)} />
        <Row label={t.income.cashRefunds} value={money(submission.cashRefunds)} />
        <Row label={t.income.expectedCash} value={money(submission.expectedCash)} />
        <Row label={t.income.actualDelivered} value={money(submission.actualDelivered)} />
        <div className="border-t border-border mt-2 pt-2">
          <Row label={t.income.netIncome} value={money(submission.netIncome)} strong />
          <div className="flex justify-between text-sm py-1.5">
            <span className="text-muted">{t.income.cashDifference}</span>
            <span
              className={`dir-ltr font-bold ${submission.cashDifference.isZero() ? "text-success" : "text-danger"}`}
            >
              {money(submission.cashDifference)}
            </span>
          </div>
        </div>
        {submission.differenceReason ? (
          <p className="text-sm mt-2">
            <span className="text-muted">{t.income.differenceReason}: </span>
            {submission.differenceReason}
          </p>
        ) : null}
      </Card>

      {submission.productCounts.length > 0 ? (
        <Card>
          <h2 className="font-bold mb-2">{t.income.importantProducts}</h2>
          {submission.productCounts.map((c) => (
            <Row
              key={c.id}
              label={c.product.nameAr}
              value={formatQty(c.quantity.toString())}
            />
          ))}
        </Card>
      ) : null}

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

      {submission.notes ? (
        <Card>
          <h2 className="font-bold mb-1">{t.common.notes}</h2>
          <p className="text-sm">{submission.notes}</p>
        </Card>
      ) : null}

      {canReview ? (
        <ReviewButtons
          submissionId={id}
          canMarkReviewed={submission.status === SubmissionStatus.SUBMITTED}
        />
      ) : null}
    </div>
  );
}

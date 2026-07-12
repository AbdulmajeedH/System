import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can, departmentScope } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { Badge, Button, Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: t.income.title };

export default async function IncomeListPage() {
  const user = await requireUser();
  if (!can(user, "income.submit") && !can(user, "income.viewAll")) redirect("/");

  const scope = departmentScope(user);
  const submissions = await prisma.dailyIncomeSubmission.findMany({
    where: scope ? { departmentId: scope } : {},
    include: { department: true, submittedBy: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 60,
  });

  return (
    <div>
      <PageHeader
        title={t.income.title}
        action={
          can(user, "income.submit") ? (
            <Link href="/income/new">
              <Button>{t.income.newSubmission}</Button>
            </Link>
          ) : undefined
        }
      />
      <div className="space-y-3">
        {submissions.length === 0 ? (
          <Card>
            <EmptyState message={t.common.noResults} />
          </Card>
        ) : (
          submissions.map((s) => (
            <Link key={s.id} href={`/income/${s.id}`} className="block">
              <Card className="hover:border-primary transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {s.department.nameAr} · {t.shifts[s.shiftType]}
                    </p>
                    <p className="text-sm text-muted">
                      {formatDate(s.date)} · {s.submittedBy.name}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold dir-ltr">
                      {formatMoney(s.totalIncome.toString())} {t.app.currency}
                    </p>
                    <div className="flex items-center gap-2 justify-end mt-1">
                      {!s.cashDifference.isZero() ? (
                        <Badge tone="red">
                          {t.income.cashDifference}: {formatMoney(s.cashDifference.toString())}
                        </Badge>
                      ) : null}
                      <StatusBadge status={s.status} label={t.statuses[s.status]} />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

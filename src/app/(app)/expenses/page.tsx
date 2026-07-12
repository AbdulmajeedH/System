import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can, departmentScope } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { Button, Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: t.expenses.title };

export default async function ExpensesPage() {
  const user = await requireUser();
  if (!can(user, "expense.submit") && !can(user, "expense.review")) redirect("/");

  const scope = departmentScope(user);
  const expenses = await prisma.expense.findMany({
    where: scope ? { departmentId: scope } : {},
    include: {
      department: { select: { nameAr: true } },
      category: { select: { nameAr: true } },
      submittedBy: { select: { name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 60,
  });

  return (
    <div>
      <PageHeader
        title={t.expenses.title}
        action={
          can(user, "expense.submit") ? (
            <Link href="/expenses/new">
              <Button>{t.expenses.newExpense}</Button>
            </Link>
          ) : undefined
        }
      />
      <div className="space-y-3">
        {expenses.length === 0 ? (
          <Card>
            <EmptyState message={t.common.noResults} />
          </Card>
        ) : (
          expenses.map((e) => (
            <Link key={e.id} href={`/expenses/${e.id}`} className="block">
              <Card className="hover:border-primary transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{e.category.nameAr}</p>
                    <p className="text-sm text-muted">
                      {formatDate(e.date)}
                      {e.department ? ` · ${e.department.nameAr}` : ""} · {e.submittedBy.name}
                    </p>
                    <p className="text-sm mt-1 line-clamp-1">{e.description}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold dir-ltr">
                      {formatMoney(e.amount.toString())} {t.app.currency}
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={e.status} label={t.statuses[e.status]} />
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

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { Button, Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: t.stockCounts.title };

export default async function StockCountsPage() {
  const user = await requireUser();
  if (!can(user, "count.perform") && !can(user, "count.approve")) redirect("/");

  const seesAll =
    can(user, "count.approve") || user.role === "OWNER" || user.role === "WAREHOUSE_MANAGER";

  const counts = await prisma.stockCount.findMany({
    where: seesAll ? {} : { location: { departmentId: user.departmentId ?? "-" } },
    include: {
      location: { select: { nameAr: true } },
      assignedTo: { select: { name: true } },
      items: { select: { differenceValue: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div>
      <PageHeader
        title={t.stockCounts.title}
        action={
          can(user, "count.perform") ? (
            <Link href="/stock-counts/new">
              <Button>{t.stockCounts.newCount}</Button>
            </Link>
          ) : undefined
        }
      />
      <div className="space-y-3">
        {counts.length === 0 ? (
          <Card>
            <EmptyState message={t.common.noResults} />
          </Card>
        ) : (
          counts.map((count) => {
            const totalAbs = count.items.reduce(
              (acc, i) => acc + Math.abs(Number(i.differenceValue)),
              0,
            );
            return (
              <Link key={count.id} href={`/stock-counts/${count.id}`} className="block">
                <Card className="hover:border-primary transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {count.location.nameAr} · {t.stockCounts.types[count.type]}
                      </p>
                      <p className="text-sm text-muted">
                        {formatDate(count.countDate)} · {count.assignedTo.name}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-sm dir-ltr">
                        {formatMoney(totalAbs)} {t.app.currency}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={count.status} label={t.statuses[count.status]} />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { formatDate, formatMoney, formatQty } from "@/lib/utils/format";
import { Badge, Button, Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: t.damages.title };

export default async function DamagesPage() {
  const user = await requireUser();
  if (!can(user, "damage.record") && !can(user, "damage.approve")) redirect("/");

  const seesAll =
    can(user, "damage.approve") || user.role === "OWNER" || user.role === "WAREHOUSE_MANAGER";

  const damages = await prisma.damageRecord.findMany({
    where: seesAll ? {} : { location: { departmentId: user.departmentId ?? "-" } },
    include: {
      item: { select: { nameAr: true } },
      location: { select: { nameAr: true } },
      reportedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div>
      <PageHeader
        title={t.damages.title}
        action={
          can(user, "damage.record") ? (
            <Link href="/damages/new">
              <Button>{t.damages.newDamage}</Button>
            </Link>
          ) : undefined
        }
      />
      <div className="space-y-3">
        {damages.length === 0 ? (
          <Card>
            <EmptyState message={t.common.noResults} />
          </Card>
        ) : (
          damages.map((d) => (
            <Link key={d.id} href={`/damages/${d.id}`} className="block">
              <Card className="hover:border-primary transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {d.item.nameAr} · <span className="dir-ltr">{formatQty(d.quantity.toString())}</span>
                    </p>
                    <p className="text-sm text-muted">
                      {d.location.nameAr} · {formatDate(d.date)} · {d.reportedBy.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="amber">{t.damages.types[d.type]}</Badge>
                    <span className="text-sm dir-ltr">
                      {formatMoney(d.estimatedCost.toString())} {t.app.currency}
                    </span>
                    <StatusBadge status={d.status} label={t.statuses[d.status]} />
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

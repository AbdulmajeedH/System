import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can, departmentScope } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { formatDate } from "@/lib/utils/format";
import { Badge, Button, Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: t.stockRequests.title };

export default async function StockRequestsPage() {
  const user = await requireUser();
  const allowed =
    can(user, "stock.request") || can(user, "warehouse.manage") || can(user, "inventory.viewAll");
  if (!allowed) redirect("/");

  const scope = departmentScope(user);
  // Warehouse manager has no department but must see all requests.
  const where = can(user, "warehouse.manage") || !scope ? {} : { departmentId: scope };

  const requests = await prisma.stockRequest.findMany({
    where,
    include: {
      department: { select: { nameAr: true } },
      requestedBy: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div>
      <PageHeader
        title={t.stockRequests.title}
        action={
          can(user, "stock.request") ? (
            <Link href="/stock-requests/new">
              <Button>{t.stockRequests.newRequest}</Button>
            </Link>
          ) : undefined
        }
      />
      <div className="space-y-3">
        {requests.length === 0 ? (
          <Card>
            <EmptyState message={t.common.noResults} />
          </Card>
        ) : (
          requests.map((r) => (
            <Link key={r.id} href={`/stock-requests/${r.id}`} className="block">
              <Card className="hover:border-primary transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.department.nameAr}</p>
                    <p className="text-sm text-muted">
                      {t.stockRequests.requiredDate}: {formatDate(r.requiredDate)} · {r.requestedBy.name}
                      {" · "}
                      {r._count.items} {t.inventory.items}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.priority !== "NORMAL" ? (
                      <Badge tone={r.priority === "URGENT" ? "red" : "amber"}>
                        {t.stockRequests.priorities[r.priority]}
                      </Badge>
                    ) : null}
                    <StatusBadge status={r.status} label={t.statuses[r.status]} />
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

import Link from "next/link";
import { requirePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { ApprovalStatus } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { formatDateTime, formatMoney, formatQty } from "@/lib/utils/format";
import { Badge, Button, Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { DecideAdjustmentButtons } from "./decide-buttons";

export const metadata = { title: t.adjustments.title };

export default async function AdjustmentsPage() {
  const user = await requirePermission("inventory.manageItems");

  const adjustments = await prisma.inventoryAdjustment.findMany({
    include: {
      item: { select: { nameAr: true } },
      location: { select: { nameAr: true } },
      requestedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const canDecide = can(user, "count.approve");

  return (
    <div className="space-y-3 max-w-2xl">
      <PageHeader
        title={t.adjustments.title}
        action={
          <Link href="/inventory/adjustments/new">
            <Button>{t.adjustments.newAdjustment}</Button>
          </Link>
        }
      />
      {adjustments.length === 0 ? (
        <Card>
          <EmptyState message={t.common.noResults} />
        </Card>
      ) : (
        adjustments.map((adj) => (
          <Card key={adj.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">
                  {adj.item.nameAr} · <span className="dir-ltr">{formatQty(adj.quantity.toString())}</span>
                </p>
                <p className="text-xs text-muted">
                  {adj.location.nameAr} · {adj.requestedBy.name} ·{" "}
                  <span className="dir-ltr">{formatDateTime(adj.createdAt)}</span>
                </p>
                <p className="text-xs mt-1">{adj.reason}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2">
                  <Badge tone="blue">{t.adjustments.kinds[adj.kind]}</Badge>
                  <StatusBadge status={adj.status} label={t.statuses[adj.status]} />
                </div>
                <span className="text-xs dir-ltr text-muted">
                  {formatMoney(adj.estimatedValue.toString())} {t.app.currency}
                </span>
              </div>
            </div>
            {canDecide && adj.status === ApprovalStatus.PENDING ? (
              <DecideAdjustmentButtons adjustmentId={adj.id} />
            ) : null}
          </Card>
        ))
      )}
    </div>
  );
}

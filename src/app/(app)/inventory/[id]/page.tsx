import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { formatDateTime, formatMoney, formatQty } from "@/lib/utils/format";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: t.inventory.title };

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("inventory.view");
  const { id } = await params;
  const viewAll = can(user, "inventory.viewAll");

  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      baseUnit: true,
      purchaseUnit: true,
      category: true,
      preferredSupplier: { select: { nameAr: true } },
      balances: { include: { location: true } },
    },
  });
  if (!item) notFound();

  // Department users only see their own location's balance and movements.
  const visibleBalances = viewAll
    ? item.balances
    : item.balances.filter((b) => b.location.departmentId === user.departmentId);

  const movements = await prisma.inventoryMovement.findMany({
    where: {
      itemId: id,
      ...(viewAll
        ? {}
        : {
            OR: [
              { sourceLocation: { departmentId: user.departmentId ?? "-" } },
              { destLocation: { departmentId: user.departmentId ?? "-" } },
            ],
          }),
    },
    include: {
      sourceLocation: { select: { nameAr: true } },
      destLocation: { select: { nameAr: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader
        title={item.nameAr}
        action={
          can(user, "inventory.manageItems") ? (
            <Link href={`/inventory/${id}/edit`}>
              <Button variant="secondary">{t.common.edit}</Button>
            </Link>
          ) : undefined
        }
      />

      <Card className="text-sm space-y-1.5">
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge tone="blue">{item.sku}</Badge>
          {item.category ? <Badge tone="teal">{item.category.nameAr}</Badge> : null}
          {!item.isActive ? <Badge tone="red">{t.common.inactive}</Badge> : null}
        </div>
        <p>
          <span className="text-muted">{t.inventory.baseUnit}: </span>
          {item.baseUnit.nameAr}
          <span className="text-muted"> · {t.inventory.purchaseUnit}: </span>
          {item.purchaseUnit.nameAr}
          <span className="text-muted"> ×</span> <span className="dir-ltr">{formatQty(item.conversionFactor.toString())}</span>
        </p>
        <p>
          <span className="text-muted">{t.inventory.currentPrice}: </span>
          <span className="dir-ltr">{formatMoney(item.currentPrice.toString())}</span> {t.app.currency}
          <span className="text-muted"> · {t.inventory.averageCost}: </span>
          <span className="dir-ltr">{formatMoney(item.averageCost.toString())}</span> {t.app.currency}
        </p>
        <p>
          <span className="text-muted">{t.inventory.minStock}: </span>
          <span className="dir-ltr">{formatQty(item.minStock.toString())}</span>
          <span className="text-muted"> · {t.inventory.reorderLevel}: </span>
          <span className="dir-ltr">{formatQty(item.reorderLevel.toString())}</span>
        </p>
        {item.preferredSupplier ? (
          <p>
            <span className="text-muted">{t.inventory.preferredSupplier}: </span>
            {item.preferredSupplier.nameAr}
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="font-bold mb-2">{t.inventory.balances}</h2>
        {visibleBalances.length === 0 ? (
          <EmptyState message={t.inventory.noBalance} />
        ) : (
          <ul className="divide-y divide-border">
            {visibleBalances.map((b) => (
              <li key={b.id} className="flex justify-between py-2 text-sm">
                <span>{b.location.nameAr}</span>
                <span className="font-bold dir-ltr">
                  {formatQty(b.quantity.toString())} {item.baseUnit.nameAr}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-bold mb-2">{t.inventory.movements}</h2>
        {movements.length === 0 ? (
          <EmptyState message={t.common.noResults} />
        ) : (
          <ul className="divide-y divide-border">
            {movements.map((m) => (
              <li key={m.id} className="py-2.5 text-sm space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="blue">{t.movementTypes[m.type]}</Badge>
                  <span className="font-bold dir-ltr">
                    {formatQty(m.quantity.toString())} {item.baseUnit.nameAr}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {m.sourceLocation ? `${t.common.from} ${m.sourceLocation.nameAr}` : ""}
                  {m.sourceLocation && m.destLocation ? " ← " : ""}
                  {m.destLocation ? `${t.common.to} ${m.destLocation.nameAr}` : ""}
                  {" · "}
                  {m.user.name} · <span className="dir-ltr">{formatDateTime(m.createdAt)}</span>
                </p>
                {m.reason ? <p className="text-xs text-muted">{m.reason}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

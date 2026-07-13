import Link from "next/link";
import { requirePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { t } from "@/lib/i18n/ar";
import { formatQty } from "@/lib/utils/format";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: t.inventory.title };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; location?: string }>;
}) {
  const user = await requirePermission("inventory.view");
  const { q, location } = await searchParams;

  const viewAll = can(user, "inventory.viewAll");
  const locations = await prisma.inventoryLocation.findMany({
    where: viewAll ? { isActive: true } : { departmentId: user.departmentId ?? "-" },
    orderBy: { code: "asc" },
  });
  // Department users are always pinned to their own location; if they have
  // none, they must see no balances at all — never the global totals.
  const selectedLocation = viewAll
    ? locations.find((l) => l.id === location) ?? null
    : locations[0] ?? null;

  const items = await prisma.inventoryItem.findMany({
    where: {
      isActive: true,
      ...(q ? { OR: [{ nameAr: { contains: q } }, { sku: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: {
      baseUnit: true,
      balances: selectedLocation
        ? { where: { locationId: selectedLocation.id } }
        : viewAll
          ? true
          : { where: { locationId: "-" } },
    },
    orderBy: { nameAr: "asc" },
    take: 200,
  });

  const zero = new Prisma.Decimal(0);
  const rows = items.map((item) => {
    const total = item.balances.reduce((acc, b) => acc.add(b.quantity), zero);
    return { item, total, low: total.lte(item.minStock) };
  });

  return (
    <div>
      <PageHeader
        title={t.inventory.title}
        action={
          can(user, "inventory.manageItems") ? (
            <div className="flex gap-2">
              <Link href="/inventory/categories">
                <Button variant="secondary">{t.inventory.categories}</Button>
              </Link>
              <Link href="/inventory/new">
                <Button>{t.inventory.newItem}</Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      <form className="mb-4 flex flex-wrap gap-2" action="/inventory">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder={t.common.search}
          className="flex-1 min-w-40 rounded-xl border border-border bg-card px-4 py-2.5"
        />
        {viewAll ? (
          <select
            name="location"
            defaultValue={selectedLocation?.id ?? ""}
            className="rounded-xl border border-border bg-card px-4 py-2.5"
          >
            <option value="">{t.common.all}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nameAr}
              </option>
            ))}
          </select>
        ) : null}
        <Button type="submit" variant="secondary">
          {t.common.search}
        </Button>
      </form>

      {selectedLocation ? (
        <p className="text-sm text-muted mb-3">
          {t.inventory.location}: {selectedLocation.nameAr}
        </p>
      ) : null}

      <div className="space-y-2">
        {rows.length === 0 ? (
          <Card>
            <EmptyState message={t.common.noResults} />
          </Card>
        ) : (
          rows.map(({ item, total, low }) => (
            <Link key={item.id} href={`/inventory/${item.id}`} className="block">
              <Card className="hover:border-primary transition-colors !p-3 sm:!p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{item.nameAr}</p>
                    <p className="text-xs text-muted dir-ltr text-start">{item.sku}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold dir-ltr">
                      {formatQty(total.toString())}{" "}
                      <span className="text-xs font-normal">{item.baseUnit.nameAr}</span>
                    </p>
                    {low ? <Badge tone="red">{t.inventory.lowStock}</Badge> : null}
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

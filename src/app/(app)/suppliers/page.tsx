import Link from "next/link";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: t.suppliers.title };

export default async function SuppliersPage() {
  await requirePermission("supplier.manage");

  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { invoices: true } } },
    orderBy: [{ isActive: "desc" }, { nameAr: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title={t.suppliers.title}
        action={
          <Link href="/suppliers/new">
            <Button>{t.suppliers.newSupplier}</Button>
          </Link>
        }
      />
      <div className="space-y-3">
        {suppliers.length === 0 ? (
          <Card>
            <EmptyState message={t.common.noResults} />
          </Card>
        ) : (
          suppliers.map((s) => (
            <Link key={s.id} href={`/suppliers/${s.id}/edit`} className="block">
              <Card className="hover:border-primary transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{s.nameAr}</p>
                    <p className="text-sm text-muted">
                      {s.contactPerson ?? ""}
                      {s.phone ? ` · ${s.phone}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="blue">
                      {t.invoices.title}: {s._count.invoices}
                    </Badge>
                    <Badge tone={s.isActive ? "green" : "red"}>
                      {s.isActive ? t.common.active : t.common.inactive}
                    </Badge>
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

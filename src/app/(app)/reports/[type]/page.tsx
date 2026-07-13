import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { REPORTS, type ReportFilters } from "@/lib/reports/definitions";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("reports.view");
  const { type } = await params;
  const definition = REPORTS[type];
  if (!definition) notFound();

  const raw = await searchParams;
  const filters: ReportFilters = {};
  for (const key of definition.filters) {
    if (raw[key]) filters[key] = raw[key];
  }

  const [rows, departments, suppliers, locations, users, items] = await Promise.all([
    definition.query(filters),
    definition.filters.includes("departmentId")
      ? prisma.department.findMany({ where: { isActive: true }, orderBy: { nameAr: "asc" } })
      : Promise.resolve([]),
    definition.filters.includes("supplierId")
      ? prisma.supplier.findMany({ orderBy: { nameAr: "asc" } })
      : Promise.resolve([]),
    definition.filters.includes("locationId")
      ? prisma.inventoryLocation.findMany({ orderBy: { code: "asc" } })
      : Promise.resolve([]),
    definition.filters.includes("userId")
      ? prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
    definition.filters.includes("itemId")
      ? prisma.inventoryItem.findMany({
          orderBy: { nameAr: "asc" },
          select: { id: true, nameAr: true },
        })
      : Promise.resolve([]),
  ]);

  const exportQuery = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v) as Array<[string, string]>,
  ).toString();

  const select = (
    name: string,
    options: Array<{ id: string; label: string }>,
  ) => (
    <select
      key={name}
      name={name}
      defaultValue={filters[name as keyof ReportFilters] ?? ""}
      className="rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-10"
    >
      <option value="">{t.common.all}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={t.reports.types[type] ?? type}
        action={
          rows.length > 0 ? (
            <a href={`/api/reports/${type}?${exportQuery}`}>
              <Button variant="secondary">
                <Download className="size-4" aria-hidden /> {t.reports.exportExcel}
              </Button>
            </a>
          ) : undefined
        }
      />

      <form className="flex flex-wrap items-center gap-2" action={`/reports/${type}`}>
        {definition.filters.includes("from") ? (
          <input
            type="date"
            name="from"
            defaultValue={filters.from ?? ""}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-10"
          />
        ) : null}
        {definition.filters.includes("to") ? (
          <input
            type="date"
            name="to"
            defaultValue={filters.to ?? ""}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-10"
          />
        ) : null}
        {definition.filters.includes("departmentId")
          ? select("departmentId", departments.map((x) => ({ id: x.id, label: x.nameAr })))
          : null}
        {definition.filters.includes("supplierId")
          ? select("supplierId", suppliers.map((x) => ({ id: x.id, label: x.nameAr })))
          : null}
        {definition.filters.includes("locationId")
          ? select("locationId", locations.map((x) => ({ id: x.id, label: x.nameAr })))
          : null}
        {definition.filters.includes("userId")
          ? select("userId", users.map((x) => ({ id: x.id, label: x.name })))
          : null}
        {definition.filters.includes("itemId")
          ? select("itemId", items.map((x) => ({ id: x.id, label: x.nameAr })))
          : null}
        <Button type="submit" variant="secondary" className="!py-2 !min-h-10 text-sm">
          {t.reports.run}
        </Button>
      </form>

      <Card className="!p-0 overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState message={t.common.noResults} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-xs text-muted">
                  {definition.columns.map((col) => (
                    <th key={col.key} className="px-3 py-2.5 text-start font-semibold whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-background/60">
                    {definition.columns.map((col) => (
                      <td key={col.key} className="px-3 py-2 whitespace-nowrap">
                        {row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-xs text-muted">
        {t.reports.rows}: <span className="dir-ltr">{rows.length}</span>
      </p>
    </div>
  );
}

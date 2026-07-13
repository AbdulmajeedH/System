import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { REPORTS } from "@/lib/reports/definitions";

export const metadata = { title: t.reports.title };

export default async function ReportsPage() {
  await requirePermission("reports.view");

  return (
    <div>
      <PageHeader title={t.reports.title} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.keys(REPORTS).map((type) => (
          <Link
            key={type}
            href={`/reports/${type}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors duration-150 hover:border-primary"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <FileSpreadsheet className="size-5" strokeWidth={1.8} />
            </span>
            <span className="text-sm font-semibold">{t.reports.types[type] ?? type}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { BadgeCheck, ListChecks, Receipt, Ruler } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { GeneralSettingsForm } from "./general-form";

export const metadata = { title: t.settings.title };

const SECTIONS = [
  { href: "/settings/approval-rules", label: t.settings.approvalRules, hint: t.settings.approvalRulesHint, Icon: BadgeCheck },
  { href: "/settings/expense-categories", label: t.settings.expenseCategories, hint: t.settings.expenseCategoriesHint, Icon: Receipt },
  { href: "/settings/important-products", label: t.settings.importantProducts, hint: t.settings.importantProductsHint, Icon: ListChecks },
  { href: "/settings/units", label: t.settings.units, hint: t.settings.unitsHint, Icon: Ruler },
];

export default async function SettingsPage() {
  await requirePermission("settings.manage");

  const rows = await prisma.systemSetting.findMany();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title={t.settings.title} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECTIONS.map(({ href, label, hint, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors duration-150 hover:border-primary"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Icon className="size-5" strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-xs text-muted mt-0.5">{hint}</span>
            </span>
          </Link>
        ))}
      </div>

      <GeneralSettingsForm
        initial={{
          workdayStart: settings["attendance.workday_start"] ?? "08:00",
          lateAfterMinutes: settings["attendance.late_after_minutes"] ?? "15",
          maxBreakMinutes: settings["attendance.max_break_minutes"] ?? "60",
          lowStockAlerts: settings["inventory.low_stock_alerts"] ?? "1",
        }}
      />
    </div>
  );
}

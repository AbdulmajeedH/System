import { t } from "@/lib/i18n/ar";
import { can, type Permission } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";

export type NavItem = {
  href: string;
  label: string;
  icon: string; // key into NAV_ICONS (nav-icons.tsx)
  permissions: Permission[] | null; // any-of; null = any authenticated user
};

/** Order defines mobile bottom-nav priority. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: t.nav.dashboard, icon: "dashboard", permissions: ["dashboard.view"] },
  { href: "/income", label: t.nav.income, icon: "income", permissions: ["income.submit", "income.viewAll"] },
  { href: "/expenses", label: t.nav.expenses, icon: "expenses", permissions: ["expense.submit", "expense.review"] },
  { href: "/invoices", label: t.nav.invoices, icon: "invoices", permissions: ["invoice.manage", "invoice.approve", "warehouse.manage"] },
  { href: "/inventory", label: t.nav.inventory, icon: "inventory", permissions: ["inventory.view"] },
  { href: "/stock-requests", label: t.nav.stockRequests, icon: "stockRequests", permissions: ["stock.request", "warehouse.manage", "inventory.viewAll"] },
  { href: "/transfers", label: t.nav.transfers, icon: "transfersNav", permissions: ["stock.request", "warehouse.manage"] },
  { href: "/stock-counts", label: t.nav.stockCounts, icon: "stockCounts", permissions: ["count.perform", "count.approve"] },
  { href: "/damages", label: t.nav.damages, icon: "damages", permissions: ["damage.record", "damage.approve"] },
  { href: "/approvals", label: t.nav.approvals, icon: "approvals", permissions: ["approvals.act"] },
  { href: "/attendance", label: t.nav.attendance, icon: "attendance", permissions: ["attendance.own"] },
  { href: "/suppliers", label: t.nav.suppliers, icon: "suppliers", permissions: ["supplier.manage"] },
  { href: "/users", label: t.nav.users, icon: "users", permissions: ["users.manage"] },
  { href: "/reports", label: t.nav.reports, icon: "reports", permissions: ["reports.view"] },
  { href: "/audit-log", label: t.nav.auditLog, icon: "auditLog", permissions: ["audit.view"] },
  { href: "/settings", label: t.nav.settings, icon: "settings", permissions: ["settings.manage"] },
];

export function navItemsFor(user: SessionUser): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.permissions === null || item.permissions.some((p) => can(user, p)),
  );
}

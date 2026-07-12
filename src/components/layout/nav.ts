import { t } from "@/lib/i18n/ar";
import { can, type Permission } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";

export type NavItem = {
  href: string;
  label: string;
  icon: string; // emoji keeps the kit dependency-free; swap for an icon set later
  permissions: Permission[] | null; // any-of; null = any authenticated user
};

/** Grows as modules land. Order defines mobile bottom-nav priority. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: t.nav.dashboard, icon: "🏠", permissions: ["dashboard.view"] },
  { href: "/income", label: t.nav.income, icon: "💰", permissions: ["income.submit", "income.viewAll"] },
  { href: "/expenses", label: t.nav.expenses, icon: "🧾", permissions: ["expense.submit", "expense.review"] },
  { href: "/invoices", label: t.nav.invoices, icon: "📄", permissions: ["invoice.manage", "invoice.approve", "warehouse.manage"] },
  { href: "/inventory", label: t.nav.inventory, icon: "📦", permissions: ["inventory.view"] },
  { href: "/stock-requests", label: t.nav.stockRequests, icon: "🔄", permissions: ["stock.request", "warehouse.manage", "inventory.viewAll"] },
  { href: "/suppliers", label: t.nav.suppliers, icon: "🚚", permissions: ["supplier.manage"] },
  { href: "/users", label: t.nav.users, icon: "👥", permissions: ["users.manage"] },
  { href: "/audit-log", label: t.nav.auditLog, icon: "📋", permissions: ["audit.view"] },
];

export function navItemsFor(user: SessionUser): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.permissions === null || item.permissions.some((p) => can(user, p)),
  );
}

import { t } from "@/lib/i18n/ar";
import { can, type Permission } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";

export type NavItem = {
  href: string;
  label: string;
  icon: string; // emoji keeps the kit dependency-free; swap for an icon set later
  permission: Permission | null; // null = any authenticated user
};

/** Grows as modules land. Order defines mobile bottom-nav priority. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: t.nav.dashboard, icon: "🏠", permission: "dashboard.view" },
  { href: "/users", label: t.nav.users, icon: "👥", permission: "users.manage" },
  { href: "/audit-log", label: t.nav.auditLog, icon: "📋", permission: "audit.view" },
];

export function navItemsFor(user: SessionUser): NavItem[] {
  return NAV_ITEMS.filter((item) => item.permission === null || can(user, item.permission));
}

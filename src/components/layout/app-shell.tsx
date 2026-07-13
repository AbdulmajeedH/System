import type { ReactNode } from "react";
import { LogOut, UtensilsCrossed } from "lucide-react";
import { t } from "@/lib/i18n/ar";
import type { SessionUser } from "@/lib/auth/session";
import { logout } from "@/lib/auth/auth-actions";
import { navItemsFor } from "./nav";
import { BottomNavLink, SideNavLink } from "./nav-link";

const MOBILE_NAV_COUNT = 4;

function UserBadge({ user }: { user: SessionUser }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-bold">
        {user.name.trim().charAt(0)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="truncate text-xs text-muted">
          {t.roles[user.role]}
          {user.departmentName ? ` · ${user.departmentName}` : ""}
        </p>
      </div>
    </div>
  );
}

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const items = navItemsFor(user);
  const mobileItems = items.slice(0, MOBILE_NAV_COUNT);
  const hasMore = items.length > MOBILE_NAV_COUNT;

  return (
    <div className="flex min-h-dvh w-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-e border-border bg-card">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-5" strokeWidth={2} />
          </span>
          <p className="font-bold">{t.app.name}</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {items.map((item) => (
            <SideNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>
        <div className="border-t border-border p-3 space-y-2">
          <div className="px-2 pt-1">
            <UserBadge user={user} />
          </div>
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-danger transition-colors duration-150 hover:bg-danger-soft">
              <LogOut className="size-[18px]" strokeWidth={1.8} />
              {t.nav.logout}
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-card/95 backdrop-blur px-4 py-3">
          <UserBadge user={user} />
          <form action={logout}>
            <button
              aria-label={t.nav.logout}
              className="flex size-9 items-center justify-center rounded-lg text-danger transition-colors duration-150 hover:bg-danger-soft"
            >
              <LogOut className="size-5" strokeWidth={1.8} />
            </button>
          </form>
        </header>

        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6 max-w-6xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
          <div className="grid auto-cols-fr grid-flow-col">
            {mobileItems.map((item) => (
              <BottomNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
            ))}
            {hasMore ? <BottomNavLink href="/menu" label={t.nav.more} icon="menu" /> : null}
          </div>
        </nav>
      </div>
    </div>
  );
}

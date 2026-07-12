import Link from "next/link";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n/ar";
import type { SessionUser } from "@/lib/auth/session";
import { logout } from "@/lib/auth/auth-actions";
import { navItemsFor } from "./nav";

const MOBILE_NAV_COUNT = 4;

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const items = navItemsFor(user);
  const mobileItems = items.slice(0, MOBILE_NAV_COUNT);
  const hasMore = items.length > MOBILE_NAV_COUNT;

  return (
    <div className="flex min-h-dvh w-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-e border-border bg-card">
        <div className="p-5 border-b border-border">
          <p className="font-bold text-lg">{t.app.name}</p>
          <p className="text-xs text-muted mt-1">{user.name} · {t.roles[user.role]}</p>
          {user.departmentName ? (
            <p className="text-xs text-muted">{user.departmentName}</p>
          ) : null}
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-background"
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="p-3 border-t border-border">
          <button className="w-full text-start rounded-xl px-3 py-2.5 text-sm font-medium text-danger hover:bg-background">
            {t.nav.logout}
          </button>
        </form>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
          <div>
            <p className="font-bold">{t.app.name}</p>
            <p className="text-xs text-muted">{user.name} · {t.roles[user.role]}</p>
          </div>
          <form action={logout}>
            <button className="text-sm font-medium text-danger">{t.nav.logout}</button>
          </form>
        </header>

        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-border bg-card">
          <div className="grid auto-cols-fr grid-flow-col">
            {mobileItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted"
              >
                <span className="text-lg leading-none" aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            ))}
            {hasMore ? (
              <Link
                href="/menu"
                className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted"
              >
                <span className="text-lg leading-none" aria-hidden>☰</span>
                {t.nav.more}
              </Link>
            ) : null}
          </div>
        </nav>
      </div>
    </div>
  );
}

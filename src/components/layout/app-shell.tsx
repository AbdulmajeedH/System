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
  const initials = user.name.trim().slice(0, 1) || t.ui.brandMark.slice(0, 1);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-72 flex-col border-e border-border bg-white/94 text-foreground shadow-[0_0_40px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:flex">
        <div className="border-b border-border p-8">
          <div className="mb-6 flex size-14 items-center justify-center rounded-[1.25rem] bg-primary text-xl font-black text-primary-foreground shadow-[0_14px_30px_rgba(0,0,0,0.16)]">{t.ui.brandMark}</div>
          <p className="text-2xl font-black leading-8">{t.app.name}</p>
          <p className="mt-2 text-sm leading-5 text-muted">{t.ui.operationsLedger}</p>
          <div className="mt-6 h-2 w-28 rounded-full bg-primary" aria-hidden />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label={t.ui.mainNavigation}>
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="group flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-muted transition-colors hover:bg-canvas-soft hover:text-foreground focus-visible:bg-canvas-soft focus-visible:text-foreground">
              <span className="grid size-9 place-items-center rounded-2xl bg-canvas-soft text-base transition-colors group-hover:bg-surface-pressed" aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-4">
          <div className="mb-3 rounded-[1.5rem] bg-canvas-soft p-4">
            <p className="font-bold">{user.name}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{t.roles[user.role]}{user.departmentName ? ` · ${user.departmentName}` : ""}</p>
          </div>
          <form action={logout}>
            <button className="min-h-11 w-full rounded-full bg-primary px-4 py-2 text-start text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover">{t.nav.logout}</button>
          </form>
        </div>
      </aside>

      <div className="lg:ps-72">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-white/88 px-4 py-4 shadow-sm backdrop-blur-xl sm:px-8">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-medium leading-5">{t.ui.operationsLedger}</p>
              <p className="truncate text-xs text-muted">{user.departmentName ? user.departmentName : t.roles[user.role]}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/approvals" className="grid size-11 place-items-center rounded-full bg-canvas-soft text-lg transition-colors hover:bg-surface-pressed" aria-label={t.nav.approvals}>✓</Link>
              <div className="hidden items-center gap-3 rounded-full bg-canvas-soft py-1.5 pe-4 ps-1.5 sm:flex">
                <div className="grid size-9 place-items-center rounded-full bg-primary text-sm font-medium text-primary-foreground">{initials}</div>
                <div className="min-w-0 text-sm">
                  <p className="max-w-36 truncate font-medium">{user.name}</p>
                  <p className="text-xs text-muted">{t.roles[user.role]}</p>
                </div>
              </div>
              <form action={logout} className="hidden sm:block">
                <button className="min-h-11 rounded-full px-4 text-sm font-medium text-foreground transition-colors hover:bg-canvas-soft">{t.nav.logout}</button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100dvh-77px)] max-w-[1240px] px-4 py-6 pb-28 sm:px-8 sm:py-8 lg:pb-10">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/92 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-16px_36px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:hidden" aria-label={t.ui.mobileNavigation}>
          <div className="grid grid-flow-col auto-cols-fr gap-1">
            {mobileItems.map((item) => (
              <Link key={item.href} href={item.href} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-medium text-muted transition-colors hover:bg-canvas-soft hover:text-foreground">
                <span className="text-xl leading-none" aria-hidden>{item.icon}</span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            ))}
            {hasMore ? (
              <Link href="/menu" className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-medium text-muted transition-colors hover:bg-canvas-soft hover:text-foreground">
                <span className="text-xl leading-none" aria-hidden>☰</span>
                <span>{t.nav.more}</span>
              </Link>
            ) : null}
          </div>
        </nav>
      </div>
    </div>
  );
}

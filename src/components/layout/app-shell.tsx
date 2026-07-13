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
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-72 flex-col border-e border-neutral-900 bg-neutral-950 text-white lg:flex">
        <div className="border-b border-white/10 p-6">
          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-black">{t.ui.brandMark}</div>
          <p className="text-xl font-black tracking-tight">{t.app.name}</p>
          <p className="mt-1 text-sm leading-6 text-white/60">{t.app.tagline}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label={t.ui.mainNavigation}>
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="group flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/74 transition hover:bg-white hover:text-black focus-visible:bg-white focus-visible:text-black">
              <span className="grid size-8 place-items-center rounded-xl bg-white/8 text-base transition group-hover:bg-black/5" aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-2xl bg-white/8 p-3">
            <p className="font-bold">{user.name}</p>
            <p className="mt-1 text-xs text-white/60">{t.roles[user.role]}{user.departmentName ? ` · ${user.departmentName}` : ""}</p>
          </div>
          <form action={logout}>
            <button className="min-h-11 w-full rounded-2xl px-3 py-2 text-start text-sm font-bold text-red-200 transition hover:bg-red-500/15">{t.nav.logout}</button>
          </form>
        </div>
      </aside>

      <div className="lg:ps-72">
        <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black sm:text-base">{t.app.name}</p>
              <p className="truncate text-xs text-muted">{user.departmentName ? user.departmentName : t.roles[user.role]}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/approvals" className="grid size-11 place-items-center rounded-2xl border border-border bg-white text-lg transition hover:border-foreground" aria-label={t.nav.approvals}>✓</Link>
              <div className="hidden items-center gap-3 rounded-2xl border border-border bg-white px-3 py-2 sm:flex">
                <div className="grid size-9 place-items-center rounded-xl bg-black text-sm font-black text-white">{initials}</div>
                <div className="min-w-0 text-sm">
                  <p className="max-w-36 truncate font-bold">{user.name}</p>
                  <p className="text-xs text-muted">{t.roles[user.role]}</p>
                </div>
              </div>
              <form action={logout} className="hidden sm:block">
                <button className="min-h-11 rounded-2xl px-3 text-sm font-bold text-danger transition hover:bg-red-50">{t.nav.logout}</button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100dvh-73px)] max-w-7xl px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:pb-10">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/96 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur lg:hidden" aria-label={t.ui.mobileNavigation}>
          <div className="grid grid-flow-col auto-cols-fr gap-1">
            {mobileItems.map((item) => (
              <Link key={item.href} href={item.href} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-bold text-muted transition hover:bg-neutral-100 hover:text-foreground">
                <span className="text-xl leading-none" aria-hidden>{item.icon}</span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            ))}
            {hasMore ? (
              <Link href="/menu" className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-bold text-muted transition hover:bg-neutral-100 hover:text-foreground">
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

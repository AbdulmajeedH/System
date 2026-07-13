import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { navItemsFor } from "@/components/layout/nav";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";

export const metadata = { title: t.nav.more };

export default async function MenuPage() {
  const user = await requireUser();
  const items = navItemsFor(user);

  return (
    <div>
      <PageHeader title={t.nav.more} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2.5 rounded-xl border border-border bg-card p-5 text-sm font-medium shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors duration-150 hover:border-primary hover:text-primary-hover"
            >
              {Icon ? (
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="size-5" strokeWidth={1.8} />
                </span>
              ) : null}
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

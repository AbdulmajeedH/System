import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { navItemsFor } from "@/components/layout/nav";
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
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-sm font-medium hover:border-primary"
          >
            <span className="text-2xl" aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

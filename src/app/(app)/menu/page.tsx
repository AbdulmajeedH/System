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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl bg-canvas-soft p-6 text-sm font-medium transition-colors hover:bg-surface-pressed"
          >
            <span className="text-2xl" aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { Button, Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: t.invoices.title };

export default async function InvoicesPage() {
  const user = await requireUser();
  const allowed =
    can(user, "invoice.manage") || can(user, "invoice.approve") || can(user, "warehouse.manage");
  if (!allowed) redirect("/");

  const invoices = await prisma.purchaseInvoice.findMany({
    include: {
      supplier: { select: { nameAr: true } },
      enteredBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div>
      <PageHeader
        title={t.invoices.title}
        action={
          can(user, "invoice.manage") ? (
            <Link href="/invoices/new">
              <Button>{t.invoices.newInvoice}</Button>
            </Link>
          ) : undefined
        }
      />
      <div className="space-y-3">
        {invoices.length === 0 ? (
          <Card>
            <EmptyState message={t.common.noResults} />
          </Card>
        ) : (
          invoices.map((inv) => (
            <Link key={inv.id} href={`/invoices/${inv.id}`} className="block">
              <Card className="hover:border-primary transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{inv.supplier.nameAr}</p>
                    <p className="text-sm text-muted">
                      <span className="dir-ltr">{inv.invoiceNumber}</span> · {formatDate(inv.invoiceDate)} · {inv.enteredBy.name}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold dir-ltr">
                      {formatMoney(inv.total.toString())} {t.app.currency}
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={inv.status} label={t.statuses[inv.status]} />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

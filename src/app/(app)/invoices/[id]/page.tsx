import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { InvoiceStatus } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { formatDate, formatDateTime, formatMoney, formatQty } from "@/lib/utils/format";
import { Button, Card, PageHeader, StatusBadge } from "@/components/ui";
import { DecideInvoiceButtons, ReceiveInvoiceButton } from "./invoice-actions";

export const metadata = { title: t.invoices.invoice };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const allowed =
    can(user, "invoice.manage") || can(user, "invoice.approve") || can(user, "warehouse.manage");
  if (!allowed) redirect("/");

  const { id } = await params;
  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      supplier: { select: { nameAr: true } },
      enteredBy: { select: { name: true } },
      receivedBy: { select: { name: true } },
      items: { include: { item: { select: { nameAr: true, sku: true } }, unit: true } },
    },
  });
  if (!invoice) notFound();

  const canEdit =
    invoice.status === InvoiceStatus.DRAFT &&
    invoice.enteredById === user.id &&
    can(user, "invoice.manage");
  const canDecide = invoice.status === InvoiceStatus.SUBMITTED && can(user, "invoice.approve");
  const canReceive = invoice.status === InvoiceStatus.APPROVED && can(user, "warehouse.manage");

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader
        title={`${t.invoices.invoice}: ${invoice.supplier.nameAr}`}
        action={
          canEdit ? (
            <Link href={`/invoices/${id}/edit`}>
              <Button variant="secondary">{t.common.edit}</Button>
            </Link>
          ) : undefined
        }
      />

      <Card className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <StatusBadge status={invoice.status} label={t.statuses[invoice.status]} />
          <span className="text-muted">
            <span className="dir-ltr">{invoice.invoiceNumber}</span> · {formatDate(invoice.invoiceDate)}
          </span>
        </div>
        <p>
          <span className="text-muted">{t.invoices.enteredBy}: </span>
          {invoice.enteredBy.name}
          <span className="text-muted"> · {t.expenses.paymentMethod}: </span>
          {t.paymentMethods[invoice.paymentMethod]}
        </p>
        {invoice.receivedBy && invoice.receivedAt ? (
          <p>
            <span className="text-muted">{t.invoices.receivedBy}: </span>
            {invoice.receivedBy.name} · <span className="dir-ltr">{formatDateTime(invoice.receivedAt)}</span>
          </p>
        ) : null}
        {invoice.rejectionReason ? (
          <p className="text-danger">
            {t.income.rejectionReason}: {invoice.rejectionReason}
          </p>
        ) : null}
        {invoice.notes ? (
          <p>
            <span className="text-muted">{t.common.notes}: </span>
            {invoice.notes}
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="font-bold mb-3">{t.invoices.items}</h2>
        <ul className="divide-y divide-border">
          {invoice.items.map((line) => (
            <li key={line.id} className="py-2.5 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{line.item.nameAr}</span>
                <span className="font-bold dir-ltr">
                  {formatMoney(line.lineTotal.toString())} {t.app.currency}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                <span className="dir-ltr">{formatQty(line.quantity.toString())}</span> {line.unit.nameAr}
                {" × "}
                <span className="dir-ltr">{formatMoney(line.unitPrice.toString())}</span>
                {!line.discount.isZero() ? (
                  <>
                    {" − "}
                    {t.invoices.discount} <span className="dir-ltr">{formatMoney(line.discount.toString())}</span>
                  </>
                ) : null}
                {!line.tax.isZero() ? (
                  <>
                    {" + "}
                    {t.invoices.tax} <span className="dir-ltr">{formatMoney(line.tax.toString())}</span>
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
        <div className="border-t border-border mt-2 pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">{t.invoices.subtotal}</span>
            <span className="dir-ltr font-medium">{formatMoney(invoice.subtotal.toString())} {t.app.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t.invoices.vat}</span>
            <span className="dir-ltr font-medium">{formatMoney(invoice.vat.toString())} {t.app.currency}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="font-bold">{t.invoices.grandTotal}</span>
            <span className="dir-ltr font-bold">{formatMoney(invoice.total.toString())} {t.app.currency}</span>
          </div>
        </div>
      </Card>

      {canDecide ? <DecideInvoiceButtons invoiceId={id} /> : null}
      {canReceive ? <ReceiveInvoiceButton invoiceId={id} /> : null}
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { InvoiceStatus } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { toDateInputValue } from "@/lib/utils/format";
import { PageHeader } from "@/components/ui";
import { saveInvoice } from "../../actions";
import { InvoiceForm } from "../../invoice-form";

export const metadata = { title: t.invoices.invoice };

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("invoice.manage");
  const { id } = await params;

  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!invoice) notFound();
  if (invoice.status !== InvoiceStatus.DRAFT || invoice.enteredById !== user.id) {
    redirect(`/invoices/${id}`);
  }

  const [suppliers, items] = await Promise.all([
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true },
      orderBy: { nameAr: "asc" },
    }),
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      include: { purchaseUnit: { select: { nameAr: true } } },
      orderBy: { nameAr: "asc" },
    }),
  ]);

  // Line-level VAT is stored per line; the invoice-level VAT field holds the rest.
  const lineTaxes = invoice.items.reduce((acc, l) => acc.add(l.tax), new Prisma.Decimal(0));
  const invoiceLevelVat = invoice.vat.sub(lineTaxes);

  return (
    <div>
      <PageHeader title={`${t.common.edit}: ${t.invoices.invoice}`} />
      <InvoiceForm
        action={saveInvoice.bind(null, id)}
        suppliers={suppliers}
        items={items.map((i) => ({
          id: i.id,
          nameAr: i.nameAr,
          sku: i.sku,
          currentPrice: i.currentPrice.toString(),
          purchaseUnitName: i.purchaseUnit.nameAr,
        }))}
        initial={{
          supplierId: invoice.supplierId,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: toDateInputValue(invoice.invoiceDate),
          paymentMethod: invoice.paymentMethod,
          vat: invoiceLevelVat.toString(),
          notes: invoice.notes ?? "",
          lines: invoice.items.map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity.toString(),
            unitPrice: l.unitPrice.toString(),
            discount: l.discount.toString(),
            tax: l.tax.toString(),
          })),
        }}
      />
    </div>
  );
}

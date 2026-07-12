import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { saveInvoice } from "../actions";
import { InvoiceForm } from "../invoice-form";

export const metadata = { title: t.invoices.newInvoice };

export default async function NewInvoicePage() {
  await requirePermission("invoice.manage");

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

  return (
    <div>
      <PageHeader title={t.invoices.newInvoice} />
      <InvoiceForm
        action={saveInvoice.bind(null, null)}
        suppliers={suppliers}
        items={items.map((i) => ({
          id: i.id,
          nameAr: i.nameAr,
          sku: i.sku,
          currentPrice: i.currentPrice.toString(),
          purchaseUnitName: i.purchaseUnit.nameAr,
        }))}
      />
    </div>
  );
}

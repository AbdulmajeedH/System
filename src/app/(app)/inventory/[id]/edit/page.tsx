import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { saveItem } from "../../actions";
import { ItemForm } from "../../item-form";
import { getItemFormOptions } from "../../options";

export const metadata = { title: t.inventory.editItem };

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("inventory.manageItems");
  const { id } = await params;

  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) notFound();

  const { categories, units, suppliers } = await getItemFormOptions();

  return (
    <div>
      <PageHeader title={`${t.inventory.editItem}: ${item.nameAr}`} />
      <ItemForm
        action={saveItem.bind(null, id)}
        categories={categories}
        units={units}
        suppliers={suppliers}
        initial={{
          nameAr: item.nameAr,
          nameEn: item.nameEn ?? "",
          sku: item.sku,
          barcode: item.barcode ?? "",
          categoryId: item.categoryId ?? "",
          baseUnitId: item.baseUnitId,
          purchaseUnitId: item.purchaseUnitId,
          conversionFactor: item.conversionFactor.toString(),
          currentPrice: item.currentPrice.toString(),
          minStock: item.minStock.toString(),
          reorderLevel: item.reorderLevel.toString(),
          preferredSupplierId: item.preferredSupplierId ?? "",
          storageLocation: item.storageLocation ?? "",
          expiryTracking: item.expiryTracking,
          notes: item.notes ?? "",
        }}
      />
    </div>
  );
}

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { CountForm, type CountSheetItem } from "../count-form";

export const metadata = { title: t.stockCounts.newCount };

export default async function NewStockCountPage() {
  const user = await requirePermission("count.perform");

  const canCountAll = user.role === "OWNER" || user.role === "WAREHOUSE_MANAGER";
  // Warehouse first — it is the default selection for warehouse users.
  const locations = await prisma.inventoryLocation.findMany({
    where: canCountAll ? { isActive: true } : { departmentId: user.departmentId ?? "-" },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    include: { baseUnit: true, balances: true, category: { select: { nameAr: true } } },
    orderBy: [{ category: { nameAr: "asc" } }, { nameAr: "asc" }],
  });

  // Count sheet per location: every active item with its current system qty.
  const itemsByLocation: Record<string, CountSheetItem[]> = {};
  for (const location of locations) {
    itemsByLocation[location.id] = items.map((item) => {
      const balance = item.balances.find((b) => b.locationId === location.id);
      return {
        itemId: item.id,
        nameAr: item.nameAr,
        sku: item.sku,
        unitName: item.baseUnit.nameAr,
        categoryName: item.category?.nameAr ?? null,
        systemQty: balance?.quantity.toString() ?? "0",
        averageCost: item.averageCost.toString(),
      };
    });
  }

  return (
    <div>
      <PageHeader title={t.stockCounts.newCount} />
      <CountForm
        locations={locations.map((l) => ({ id: l.id, nameAr: l.nameAr }))}
        itemsByLocation={itemsByLocation}
      />
    </div>
  );
}

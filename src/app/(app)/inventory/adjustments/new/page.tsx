import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { AdjustmentForm } from "./adjustment-form";

export const metadata = { title: t.adjustments.newAdjustment };

export default async function NewAdjustmentPage() {
  await requirePermission("inventory.manageItems");

  const [items, locations] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true, sku: true },
      orderBy: { nameAr: "asc" },
    }),
    prisma.inventoryLocation.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    }),
  ]);

  return (
    <div>
      <PageHeader title={t.adjustments.newAdjustment} />
      <AdjustmentForm items={items} locations={locations} />
    </div>
  );
}

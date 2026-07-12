import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { DamageForm } from "../damage-form";

export const metadata = { title: t.damages.newDamage };

export default async function NewDamagePage() {
  const user = await requirePermission("damage.record");

  const seesAllLocations = user.role === "OWNER" || user.role === "WAREHOUSE_MANAGER";
  const [items, locations] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true, sku: true },
      orderBy: { nameAr: "asc" },
    }),
    prisma.inventoryLocation.findMany({
      where: seesAllLocations ? { isActive: true } : { departmentId: user.departmentId ?? "-" },
      select: { id: true, nameAr: true, code: true },
      // Warehouse first — it is the default selection for warehouse users.
      orderBy: [{ type: "asc" }, { code: "asc" }],
    }),
  ]);

  return (
    <div>
      <PageHeader title={t.damages.newDamage} />
      <DamageForm items={items} locations={locations} />
    </div>
  );
}

import { prisma } from "@/lib/db";

export async function getItemFormOptions() {
  const [categories, units, suppliers] = await Promise.all([
    prisma.inventoryCategory.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true, parentId: true },
      orderBy: { nameAr: "asc" },
    }),
    prisma.unitDef.findMany({ select: { id: true, nameAr: true }, orderBy: { code: "asc" } }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true },
      orderBy: { nameAr: "asc" },
    }),
  ]);
  return { categories, units, suppliers };
}

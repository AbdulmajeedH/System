import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { RequestForm } from "../request-form";

export const metadata = { title: t.stockRequests.newRequest };

export default async function NewStockRequestPage() {
  const user = await requirePermission("stock.request");

  const [items, departments] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      include: { baseUnit: { select: { nameAr: true } } },
      orderBy: { nameAr: "asc" },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true },
      orderBy: { nameAr: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title={t.stockRequests.newRequest} />
      <RequestForm
        items={items.map((i) => ({
          id: i.id,
          nameAr: i.nameAr,
          sku: i.sku,
          baseUnitName: i.baseUnit.nameAr,
        }))}
        departments={departments}
        lockedDepartmentId={user.departmentId}
      />
    </div>
  );
}

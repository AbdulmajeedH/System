import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Role } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { ProductsManager } from "./products-manager";

export const metadata = { title: t.settings.importantProducts };

export default async function ImportantProductsPage() {
  const user = await requireUser();
  const isAdmin = user.role === Role.OWNER || user.role === Role.GENERAL_MANAGER;
  const isDeptManager = user.role === Role.DEPARTMENT_MANAGER && user.departmentId !== null;
  if (!isAdmin && !isDeptManager) redirect("/");

  const [departments, products] = await Promise.all([
    prisma.department.findMany({
      where: {
        isActive: true,
        ...(isAdmin ? {} : { id: user.departmentId ?? "-" }),
      },
      select: { id: true, nameAr: true },
      orderBy: { nameAr: "asc" },
    }),
    prisma.importantProduct.findMany({
      where: isAdmin ? {} : { departmentId: user.departmentId ?? "-" },
      orderBy: [{ departmentId: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-4 max-w-xl">
      <PageHeader title={t.settings.importantProducts} />
      <ProductsManager
        departments={departments}
        products={products.map((p) => ({
          id: p.id,
          departmentId: p.departmentId,
          nameAr: p.nameAr,
          sortOrder: p.sortOrder,
          isActive: p.isActive,
        }))}
      />
    </div>
  );
}

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { CategoriesManager } from "./categories-manager";

export const metadata = { title: t.settings.expenseCategories };

export default async function ExpenseCategoriesPage() {
  await requirePermission("settings.manage");

  const categories = await prisma.expenseCategory.findMany({
    include: { _count: { select: { expenses: true } } },
    orderBy: [{ isActive: "desc" }, { nameAr: "asc" }],
  });

  return (
    <div className="space-y-4 max-w-xl">
      <PageHeader title={t.settings.expenseCategories} />
      <CategoriesManager
        categories={categories.map((c) => ({
          id: c.id,
          nameAr: c.nameAr,
          isActive: c.isActive,
          expenseCount: c._count.expenses,
        }))}
      />
    </div>
  );
}

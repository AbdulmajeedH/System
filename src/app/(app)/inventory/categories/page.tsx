import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { Card, PageHeader } from "@/components/ui";
import { CategoryForm } from "./category-form";

export const metadata = { title: t.inventory.categories };

export default async function CategoriesPage() {
  await requirePermission("inventory.manageItems");

  const categories = await prisma.inventoryCategory.findMany({
    where: { isActive: true },
    include: { children: { where: { isActive: true } }, _count: { select: { items: true } } },
    orderBy: { nameAr: "asc" },
  });
  const roots = categories.filter((c) => c.parentId === null);

  return (
    <div className="space-y-4 max-w-xl">
      <PageHeader title={t.inventory.categories} />
      <Card>
        <ul className="space-y-3">
          {roots.map((root) => (
            <li key={root.id}>
              <p className="font-semibold">
                {root.nameAr}{" "}
                <span className="text-xs text-muted">({root._count.items})</span>
              </p>
              {root.children.length > 0 ? (
                <ul className="ms-4 mt-1 space-y-1">
                  {root.children.map((child) => (
                    <li key={child.id} className="text-sm text-muted">
                      {child.nameAr}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      <CategoryForm parents={roots.map((r) => ({ id: r.id, nameAr: r.nameAr }))} />
    </div>
  );
}

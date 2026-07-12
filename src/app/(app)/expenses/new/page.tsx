import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { createExpense } from "../actions";
import { ExpenseForm } from "../expense-form";

export const metadata = { title: t.expenses.newExpense };

export default async function NewExpensePage() {
  const user = await requirePermission("expense.submit");

  const [categories, suppliers, departments] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true },
      orderBy: { nameAr: "asc" },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true },
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
      <PageHeader title={t.expenses.newExpense} />
      <ExpenseForm
        action={createExpense}
        categories={categories}
        suppliers={suppliers}
        departments={departments}
        lockedDepartmentId={user.departmentId}
      />
    </div>
  );
}

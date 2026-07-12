import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { saveIncome } from "../actions";
import { IncomeForm } from "../income-form";

export const metadata = { title: t.income.newSubmission };

export default async function NewIncomePage() {
  const user = await requirePermission("income.submit");

  const [departments, products] = await Promise.all([
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true },
      orderBy: { nameAr: "asc" },
    }),
    prisma.importantProduct.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true, departmentId: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const isManager = user.role === "OWNER" || user.role === "GENERAL_MANAGER";

  return (
    <div>
      <PageHeader title={t.income.newSubmission} />
      <IncomeForm
        action={saveIncome.bind(null, null)}
        departments={departments}
        lockedDepartmentId={isManager ? null : user.departmentId}
        products={products}
        allowException={isManager}
      />
    </div>
  );
}

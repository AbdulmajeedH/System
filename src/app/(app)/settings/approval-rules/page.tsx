import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { RulesManager } from "./rules-manager";

export const metadata = { title: t.settings.approvalRules };

export default async function ApprovalRulesPage() {
  await requirePermission("settings.manage");

  const [rules, departments] = await Promise.all([
    prisma.approvalRule.findMany({
      include: { department: { select: { nameAr: true } } },
      orderBy: [{ transactionType: "asc" }, { level: "asc" }, { minAmount: "asc" }],
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true },
      orderBy: { nameAr: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader title={t.settings.approvalRules} />
      <RulesManager
        departments={departments}
        rules={rules.map((r) => ({
          id: r.id,
          transactionType: r.transactionType,
          minAmount: r.minAmount?.toString() ?? "",
          maxAmount: r.maxAmount?.toString() ?? "",
          departmentId: r.departmentId ?? "",
          departmentName: r.department?.nameAr ?? null,
          requiredRole: r.requiredRole,
          level: r.level,
          isActive: r.isActive,
        }))}
      />
    </div>
  );
}

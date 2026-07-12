import { requirePermission } from "@/lib/auth/guards";
import { t } from "@/lib/i18n/ar";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: t.dashboard.title };

export default async function DashboardPage() {
  const user = await requirePermission("dashboard.view");

  return (
    <div>
      <PageHeader title={t.dashboard.title} />
      <Card>
        <p className="font-semibold">
          {t.dashboard.welcome}، {user.name} 👋
        </p>
        <p className="text-sm text-muted mt-1">
          {t.roles[user.role]}
          {user.departmentName ? ` — ${user.departmentName}` : ""}
        </p>
      </Card>
    </div>
  );
}

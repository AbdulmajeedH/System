import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { PreferencesForm } from "./preferences-form";

export const metadata = { title: t.notifications.preferences };

export default async function NotificationPreferencesPage() {
  const user = await requireUser();

  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: user.id },
  });
  const disabled = new Set(prefs.filter((p) => !p.enabled).map((p) => p.type));

  return (
    <div className="max-w-xl">
      <PageHeader title={t.notifications.preferences} />
      <PreferencesForm disabledTypes={[...disabled]} />
    </div>
  );
}

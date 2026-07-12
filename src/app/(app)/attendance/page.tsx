import Link from "next/link";
import { requirePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import {
  allowedNextEvents,
  parseAttendanceSettings,
  warningsForDay,
} from "@/lib/services/attendance";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { AttendanceButtons } from "./buttons";

export const metadata = { title: t.attendance.title };

export default async function AttendancePage() {
  const user = await requirePermission("attendance.own");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [lastEvent, todayEvents, recentEvents, settingsRows] = await Promise.all([
    prisma.attendanceEvent.findFirst({
      where: { userId: user.id },
      orderBy: { timestamp: "desc" },
    }),
    prisma.attendanceEvent.findMany({
      where: { userId: user.id, timestamp: { gte: startOfToday } },
      orderBy: { timestamp: "asc" },
    }),
    prisma.attendanceEvent.findMany({
      where: { userId: user.id, timestamp: { lt: startOfToday } },
      orderBy: { timestamp: "desc" },
      take: 20,
    }),
    prisma.systemSetting.findMany({ where: { key: { startsWith: "attendance." } } }),
  ]);

  const settings = parseAttendanceSettings(
    Object.fromEntries(settingsRows.map((s) => [s.key, s.value])),
  );
  const todayWarnings = warningsForDay(todayEvents, settings, false);
  const canViewReport = can(user, "attendance.viewAll") || can(user, "attendance.viewDept");

  return (
    <div className="space-y-4 max-w-xl">
      <PageHeader
        title={t.attendance.title}
        action={
          canViewReport ? (
            <Link href="/attendance/report">
              <Button variant="secondary">{t.attendance.report}</Button>
            </Link>
          ) : undefined
        }
      />

      <AttendanceButtons allowed={allowedNextEvents(lastEvent?.type ?? null)} />

      {todayWarnings.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {todayWarnings.map((w) => (
            <Badge key={w} tone="amber">
              {t.attendance.warnings[w]}
            </Badge>
          ))}
        </div>
      ) : null}

      <Card>
        <h2 className="font-bold mb-2">{t.attendance.todayTimeline}</h2>
        {todayEvents.length === 0 ? (
          <EmptyState message={t.common.noResults} />
        ) : (
          <ul className="divide-y divide-border">
            {todayEvents.map((event) => (
              <li key={event.id} className="flex justify-between py-2 text-sm">
                <span>{t.attendance.events[event.type]}</span>
                <span className="text-muted dir-ltr">{formatDateTime(event.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-bold mb-2">{t.attendance.history}</h2>
        {recentEvents.length === 0 ? (
          <EmptyState message={t.common.noResults} />
        ) : (
          <ul className="divide-y divide-border">
            {recentEvents.map((event) => (
              <li key={event.id} className="flex justify-between py-2 text-sm">
                <span>
                  {t.attendance.events[event.type]}
                  <span className="text-muted text-xs"> · {formatDate(event.timestamp)}</span>
                </span>
                <span className="text-muted dir-ltr">{formatDateTime(event.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

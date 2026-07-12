import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { AttendanceEventType } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import {
  parseAttendanceSettings,
  warningsForDay,
} from "@/lib/services/attendance";
import { formatDateTime } from "@/lib/utils/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: t.attendance.report };

export default async function AttendanceReportPage() {
  const user = await requireUser();
  const viewAll = can(user, "attendance.viewAll");
  if (!viewAll && !can(user, "attendance.viewDept")) redirect("/attendance");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [users, todayEvents, settingsRows] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
        ...(viewAll ? {} : { departmentId: user.departmentId ?? "-" }),
      },
      include: { department: { select: { nameAr: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.attendanceEvent.findMany({
      where: { timestamp: { gte: startOfToday } },
      orderBy: { timestamp: "asc" },
    }),
    prisma.systemSetting.findMany({ where: { key: { startsWith: "attendance." } } }),
  ]);

  const settings = parseAttendanceSettings(
    Object.fromEntries(settingsRows.map((s) => [s.key, s.value])),
  );

  const eventsByUser = new Map<string, typeof todayEvents>();
  for (const event of todayEvents) {
    const list = eventsByUser.get(event.userId) ?? [];
    list.push(event);
    eventsByUser.set(event.userId, list);
  }

  const rows = users.map((u) => {
    const events = eventsByUser.get(u.id) ?? [];
    const last = events[events.length - 1] ?? null;
    let statusLabel: string = t.attendance.absent;
    let tone: "gray" | "green" | "amber" | "red" = "gray";
    if (last) {
      if (last.type === AttendanceEventType.CHECK_OUT) {
        statusLabel = t.attendance.checkedOut;
        tone = "red";
      } else if (last.type === AttendanceEventType.BREAK_START) {
        statusLabel = t.attendance.onBreak;
        tone = "amber";
      } else {
        statusLabel = t.attendance.presentNow;
        tone = "green";
      }
    }
    return {
      user: u,
      last,
      statusLabel,
      tone,
      warnings: warningsForDay(events, settings, false),
    };
  });

  return (
    <div className="max-w-2xl">
      <PageHeader title={t.attendance.report} />
      <Card>
        {rows.length === 0 ? (
          <EmptyState message={t.common.noResults} />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.user.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{row.user.name}</p>
                  <p className="text-xs text-muted">
                    {row.user.department?.nameAr ?? t.roles[row.user.role]}
                    {row.last ? (
                      <>
                        {" · "}
                        <span className="dir-ltr">{formatDateTime(row.last.timestamp)}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {row.warnings.map((w) => (
                    <Badge key={w} tone="amber">
                      {t.attendance.warnings[w]}
                    </Badge>
                  ))}
                  <Badge tone={row.tone}>{row.statusLabel}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

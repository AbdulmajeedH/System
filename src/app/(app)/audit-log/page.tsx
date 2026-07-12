import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { formatDateTime } from "@/lib/utils/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: t.audit.title };

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission("audit.view");
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <PageHeader title={t.audit.title} />
      <Card>
        {logs.length === 0 ? (
          <EmptyState message={t.common.noResults} />
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <li key={log.id} className="py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Badge tone="blue">{log.action}</Badge>
                <span className="text-sm font-medium">{log.user?.name ?? "—"}</span>
                {log.entityType ? (
                  <span className="text-xs text-muted">
                    {log.entityType}
                    {log.entityId ? ` (${log.entityId.slice(-6)})` : ""}
                  </span>
                ) : null}
                <span className="text-xs text-muted ms-auto dir-ltr">
                  {formatDateTime(log.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-4 pt-4 text-sm">
            {page > 1 ? (
              <a className="text-primary font-medium" href={`/audit-log?page=${page - 1}`}>
                {t.common.previous}
              </a>
            ) : null}
            <span className="text-muted">
              {t.common.page} {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <a className="text-primary font-medium" href={`/audit-log?page=${page + 1}`}>
                {t.common.next}
              </a>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

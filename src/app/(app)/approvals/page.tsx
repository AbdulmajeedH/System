import Link from "next/link";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { ApprovalStatus } from "@/generated/prisma/enums";
import { roleSatisfies } from "@/lib/services/approvals";
import { t } from "@/lib/i18n/ar";
import { formatDateTime, formatMoney } from "@/lib/utils/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: t.approvals.title };

const ENTITY_ROUTES: Record<string, string> = {
  Expense: "/expenses",
  PurchaseInvoice: "/invoices",
  StockCount: "/stock-counts",
  DamageRecord: "/damages",
  DailyIncomeSubmission: "/income",
};

export default async function ApprovalsPage() {
  const user = await requirePermission("approvals.act");

  const pending = await prisma.approvalRequest.findMany({
    where: { status: ApprovalStatus.PENDING },
    include: {
      requestedBy: { select: { name: true } },
      department: { select: { nameAr: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const forMe = pending.filter((r) => roleSatisfies(user.role, r.requiredRole));
  const mine = pending.filter((r) => r.requestedById === user.id);

  const renderList = (requests: typeof pending) => (
    <ul className="space-y-3">
      {requests.map((r) => {
        const base = ENTITY_ROUTES[r.entityType];
        const href = base ? `${base}/${r.entityId}` : "#";
        return (
          <li key={r.id}>
            <Link href={href} className="block">
              <Card className="hover:border-primary transition-colors !p-3 sm:!p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="blue">{t.approvals.types[r.transactionType]}</Badge>
                    {r.department ? <Badge tone="teal">{r.department.nameAr}</Badge> : null}
                    <Badge tone="amber">{t.roles[r.requiredRole]}</Badge>
                  </div>
                  <div className="text-end text-sm">
                    {r.amount ? (
                      <p className="font-bold dir-ltr">
                        {formatMoney(r.amount.toString())} {t.app.currency}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted">
                      {r.requestedBy.name} · <span className="dir-ltr">{formatDateTime(r.createdAt)}</span>
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title={t.approvals.title} />

      <section>
        <h2 className="font-bold mb-3">{t.approvals.pendingForYou}</h2>
        {forMe.length === 0 ? (
          <Card>
            <EmptyState message={t.approvals.empty} />
          </Card>
        ) : (
          renderList(forMe)
        )}
      </section>

      {mine.length > 0 ? (
        <section>
          <h2 className="font-bold mb-3">{t.approvals.myRequests}</h2>
          {renderList(mine)}
        </section>
      ) : null}
    </div>
  );
}

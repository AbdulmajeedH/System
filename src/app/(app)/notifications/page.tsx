import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { formatDateTime } from "@/lib/utils/format";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { markAllNotificationsRead } from "./actions";
import { MarkReadButton } from "./mark-read-button";

export const metadata = { title: t.notifications.title };

const ENTITY_ROUTES: Record<string, string> = {
  Expense: "/expenses",
  PurchaseInvoice: "/invoices",
  StockCount: "/stock-counts",
  DamageRecord: "/damages",
  DailyIncomeSubmission: "/income",
  StockRequest: "/stock-requests",
  StockTransfer: "/transfers",
  InventoryItem: "/inventory",
  InventoryAdjustment: "/inventory/adjustments",
};

function hrefFor(entityType: string | null, entityId: string | null): string | null {
  if (!entityType) return null;
  const base = ENTITY_ROUTES[entityType];
  if (!base) return null;
  // List-style targets have no per-id page.
  if (entityType === "StockTransfer" || entityType === "InventoryAdjustment") return base;
  return entityId ? `${base}/${entityId}` : base;
}

export default async function NotificationsPage() {
  const user = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="space-y-4 max-w-xl">
      <PageHeader
        title={t.notifications.title}
        action={
          <div className="flex items-center gap-2">
            <Link href="/notifications/preferences">
              <Button variant="secondary" aria-label={t.notifications.preferences}>
                <SlidersHorizontal className="size-4" aria-hidden />
              </Button>
            </Link>
            {hasUnread ? (
              <form action={markAllNotificationsRead}>
                <Button variant="secondary" type="submit">
                  {t.notifications.markAllRead}
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      {notifications.length === 0 ? (
        <Card>
          <EmptyState message={t.notifications.empty} />
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const href = hrefFor(n.entityType, n.entityId);
            const content = (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-sm ${n.isRead ? "font-medium text-muted" : "font-semibold"}`}>
                    {!n.isRead ? (
                      <span className="me-2 inline-block size-2 rounded-full bg-primary align-middle" aria-hidden />
                    ) : null}
                    {n.title}
                  </p>
                  {n.body ? <p className="mt-0.5 text-xs text-muted truncate">{n.body}</p> : null}
                  <p className="mt-1 text-[11px] text-muted dir-ltr text-start">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
                {!n.isRead ? <MarkReadButton notificationId={n.id} /> : null}
              </div>
            );
            return (
              <Card key={n.id} className="!p-3.5">
                {href ? (
                  <Link href={href} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { Role } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { formatDateTime, formatQty } from "@/lib/utils/format";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { ConfirmTransferPanel } from "./confirm-panel";

export const metadata = { title: t.transfers.title };

export default async function TransfersPage() {
  const user = await requireUser();
  const isWarehouse = can(user, "warehouse.manage") || user.role === Role.OWNER;
  const isDept = user.departmentId !== null && can(user, "stock.request");
  if (!isWarehouse && !isDept && user.role !== Role.GENERAL_MANAGER) redirect("/");

  const transfers = await prisma.stockTransfer.findMany({
    where: {
      requestId: null, // standalone transfers only; request transfers live on the request page
      ...(isWarehouse || user.role === Role.GENERAL_MANAGER
        ? {}
        : {
            OR: [
              { fromLocation: { departmentId: user.departmentId ?? "-" } },
              { toLocation: { departmentId: user.departmentId ?? "-" } },
            ],
          }),
    },
    include: {
      fromLocation: true,
      toLocation: true,
      preparedBy: { select: { name: true } },
      items: { include: { item: { select: { nameAr: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  // Confirmation is allowed for the receiving side (server re-checks).
  const mayConfirm = (to: { code: string; departmentId: string | null }) => {
    if (user.role === Role.OWNER) return true;
    if (to.code === "MAIN_WAREHOUSE" || to.departmentId === null) {
      return can(user, "warehouse.manage");
    }
    return to.departmentId === user.departmentId && can(user, "stock.confirmReceipt");
  };

  return (
    <div className="space-y-3 max-w-2xl">
      <PageHeader
        title={t.transfers.title}
        action={
          <Link href="/transfers/new">
            <Button>{t.transfers.newTransfer}</Button>
          </Link>
        }
      />
      {transfers.length === 0 ? (
        <Card>
          <EmptyState message={t.common.noResults} />
        </Card>
      ) : (
        transfers.map((transfer) => (
          <Card key={transfer.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  {transfer.fromLocation.nameAr} ← {transfer.toLocation.nameAr}
                </p>
                <p className="text-xs text-muted">
                  {t.transfers.createdBy}: {transfer.preparedBy?.name ?? "—"} ·{" "}
                  <span className="dir-ltr">{formatDateTime(transfer.createdAt)}</span>
                </p>
              </div>
              <Badge tone={transfer.completedAt ? "green" : "amber"}>
                {transfer.completedAt ? t.statuses.COMPLETED : t.transfers.awaitingReceive}
              </Badge>
            </div>
            <ul className="text-xs text-muted space-y-0.5">
              {transfer.items.map((line) => (
                <li key={line.id}>
                  {line.item.nameAr} —{" "}
                  <span className="dir-ltr">{formatQty(line.preparedQty.toString())}</span>
                </li>
              ))}
            </ul>
            {!transfer.completedAt && mayConfirm(transfer.toLocation) ? (
              <ConfirmTransferPanel transferId={transfer.id} />
            ) : null}
          </Card>
        ))
      )}
    </div>
  );
}

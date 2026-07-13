import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can, canAccessDepartment } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { AttachmentEntityType, StockRequestStatus } from "@/generated/prisma/enums";
import { AttachmentsList } from "@/components/attachments-list";
import { t } from "@/lib/i18n/ar";
import { formatDate, formatQty } from "@/lib/utils/format";
import { Badge, Card, PageHeader, StatusBadge } from "@/components/ui";
import {
  CancelPanel,
  ReceiptPanel,
  StagePanel,
  WarehouseDecisionPanel,
  type PanelItem,
} from "./panels";

export const metadata = { title: t.stockRequests.request };

export default async function StockRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const request = await prisma.stockRequest.findUnique({
    where: { id },
    include: {
      department: { select: { nameAr: true } },
      requestedBy: { select: { name: true } },
      items: { include: { item: { include: { baseUnit: true } } } },
      transfers: { include: { items: true, receivedBy: { select: { name: true } } } },
    },
  });
  if (!request) notFound();

  const isWarehouse = can(user, "warehouse.manage");
  if (!isWarehouse && !canAccessDepartment(user, request.departmentId)) {
    redirect("/stock-requests");
  }

  // Warehouse availability shown while deciding on a submitted request.
  const warehouseBalances =
    isWarehouse && request.status === StockRequestStatus.SUBMITTED
      ? await prisma.inventoryBalance.findMany({
          where: {
            location: { code: "MAIN_WAREHOUSE" },
            itemId: { in: request.items.map((i) => i.itemId) },
          },
        })
      : [];
  const availableByItem = new Map(warehouseBalances.map((b) => [b.itemId, b.quantity]));

  const transfer = request.transfers[0] ?? null;
  const transferByItem = new Map(transfer?.items.map((ti) => [ti.itemId, ti]) ?? []);

  const panelItems: PanelItem[] = request.items.map((line) => ({
    itemId: line.itemId,
    nameAr: line.item.nameAr,
    unitName: line.item.baseUnit.nameAr,
    requestedQty: line.requestedQty.toString(),
    approvedQty: line.approvedQty?.toString() ?? null,
    preparedQty: transferByItem.get(line.itemId)?.preparedQty.toString() ?? null,
    availableQty: availableByItem.get(line.itemId)?.toString() ?? null,
  }));

  const isOwnDepartment = canAccessDepartment(user, request.departmentId);
  const status = request.status;

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader title={`${t.stockRequests.request} — ${request.department.nameAr}`} />

      <Card className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} label={t.statuses[status]} />
            {request.priority !== "NORMAL" ? (
              <Badge tone={request.priority === "URGENT" ? "red" : "amber"}>
                {t.stockRequests.priorities[request.priority]}
              </Badge>
            ) : null}
          </div>
          <span className="text-muted">
            {t.stockRequests.requiredDate}: {formatDate(request.requiredDate)}
          </span>
        </div>
        <p>
          <span className="text-muted">{t.stockRequests.requestedBy}: </span>
          {request.requestedBy.name}
        </p>
        {request.notes ? (
          <p>
            <span className="text-muted">{t.common.notes}: </span>
            {request.notes}
          </p>
        ) : null}
        {request.warehouseNotes ? (
          <p>
            <span className="text-muted">{t.stockRequests.warehouseNotes}: </span>
            {request.warehouseNotes}
          </p>
        ) : null}
        {status === StockRequestStatus.DISPUTED ? (
          <p className="text-danger">{t.stockRequests.disputedHint}</p>
        ) : null}
      </Card>

      <Card>
        <h2 className="font-bold mb-2">{t.inventory.items}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs">
                <th className="text-start py-2">{t.invoices.item}</th>
                <th className="text-center py-2">{t.stockRequests.requestedQty}</th>
                <th className="text-center py-2">{t.stockRequests.approvedQty}</th>
                {transfer ? (
                  <>
                    <th className="text-center py-2">{t.stockRequests.receivedQty}</th>
                    <th className="text-center py-2">{t.stockRequests.damagedQty}</th>
                    <th className="text-center py-2">{t.stockRequests.missingQty}</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {request.items.map((line) => {
                const ti = transferByItem.get(line.itemId);
                return (
                  <tr key={line.id}>
                    <td className="py-2 font-medium">
                      {line.item.nameAr}
                      <span className="text-xs text-muted"> ({line.item.baseUnit.nameAr})</span>
                    </td>
                    <td className="text-center dir-ltr">{formatQty(line.requestedQty.toString())}</td>
                    <td className="text-center dir-ltr">
                      {line.approvedQty ? formatQty(line.approvedQty.toString()) : "—"}
                    </td>
                    {transfer ? (
                      <>
                        <td className="text-center dir-ltr">
                          {ti?.receivedQty ? formatQty(ti.receivedQty.toString()) : "—"}
                        </td>
                        <td className="text-center dir-ltr">
                          {ti?.damagedQty ? formatQty(ti.damagedQty.toString()) : "—"}
                        </td>
                        <td className="text-center dir-ltr">
                          {ti?.missingQty && !ti.missingQty.isZero() ? (
                            <span className="text-danger font-bold">
                              {formatQty(ti.missingQty.toString())}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {transfer ? (
        <AttachmentsList
          entityType={AttachmentEntityType.STOCK_TRANSFER}
          entityIds={[transfer.id]}
        />
      ) : null}

      {/* Warehouse actions */}
      {isWarehouse && status === StockRequestStatus.SUBMITTED ? (
        <WarehouseDecisionPanel requestId={id} items={panelItems} />
      ) : null}
      {isWarehouse &&
      (status === StockRequestStatus.APPROVED || status === StockRequestStatus.PARTIALLY_APPROVED) ? (
        <StagePanel requestId={id} stage="PREPARING" />
      ) : null}
      {isWarehouse && status === StockRequestStatus.PREPARING ? (
        <StagePanel requestId={id} stage="READY" />
      ) : null}
      {isWarehouse && status === StockRequestStatus.READY ? (
        <StagePanel requestId={id} stage="DELIVERED" />
      ) : null}

      {/* Department actions */}
      {isOwnDepartment && can(user, "stock.confirmReceipt") && status === StockRequestStatus.DELIVERED ? (
        <ReceiptPanel requestId={id} items={panelItems} />
      ) : null}
      {isOwnDepartment && can(user, "stock.request") && status === StockRequestStatus.SUBMITTED ? (
        <CancelPanel requestId={id} />
      ) : null}
    </div>
  );
}

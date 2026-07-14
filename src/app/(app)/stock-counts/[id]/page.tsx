import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { AttachmentEntityType, StockCountStatus } from "@/generated/prisma/enums";
import { AttachmentsList } from "@/components/attachments-list";
import { t } from "@/lib/i18n/ar";
import { formatDate, formatMoney, formatQty } from "@/lib/utils/format";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { DecideCountButtons } from "./decide-buttons";

export const metadata = { title: t.stockCounts.count };

export default async function StockCountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const count = await prisma.stockCount.findUnique({
    where: { id },
    include: {
      location: true,
      assignedTo: { select: { name: true } },
      items: { include: { item: { include: { baseUnit: true } } } },
    },
  });
  if (!count) notFound();

  const seesAll =
    can(user, "count.approve") || user.role === "OWNER" || user.role === "WAREHOUSE_MANAGER";
  if (!seesAll && count.location.departmentId !== user.departmentId) {
    redirect("/stock-counts");
  }

  const totalAbs = count.items.reduce(
    (acc, i) => acc.add(i.differenceValue.abs()),
    new Prisma.Decimal(0),
  );
  const canDecide = can(user, "count.approve") && count.status === StockCountStatus.SUBMITTED;

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader title={`${t.stockCounts.count} — ${count.location.nameAr}`} />

      <Card className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <StatusBadge status={count.status} label={t.statuses[count.status]} />
          <span className="text-muted">
            {formatDate(count.countDate)} · {t.stockCounts.types[count.type]}
          </span>
        </div>
        <p>
          <span className="text-muted">{t.stockCounts.assignedTo}: </span>
          {count.assignedTo.name}
        </p>
        <p>
          <span className="text-muted">{t.stockCounts.totalDifferenceValue}: </span>
          <span className="font-bold dir-ltr">
            {formatMoney(totalAbs.toString())} {t.app.currency}
          </span>
        </p>
        {count.notes ? (
          <p>
            <span className="text-muted">{t.common.notes}: </span>
            {count.notes}
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="font-bold mb-2">{t.inventory.items}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs">
                <th className="text-start py-2">{t.invoices.item}</th>
                <th className="text-center py-2">{t.stockCounts.systemQty}</th>
                <th className="text-center py-2">{t.stockCounts.actualQty}</th>
                <th className="text-center py-2">{t.stockCounts.difference}</th>
                <th className="text-center py-2">{t.stockCounts.differenceValue}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {count.items.map((line) => (
                <tr key={line.id}>
                  <td className="py-2 font-medium">
                    {line.item.nameAr}
                    <span className="text-xs text-muted"> ({line.item.baseUnit.nameAr})</span>
                    {line.reason ? (
                      <p className="text-xs text-muted font-normal">{line.reason}</p>
                    ) : null}
                  </td>
                  <td className="text-center dir-ltr">{formatQty(line.systemQty.toString())}</td>
                  <td className="text-center dir-ltr">{formatQty(line.actualQty.toString())}</td>
                  <td
                    className={`text-center dir-ltr font-bold ${
                      line.difference.isZero()
                        ? ""
                        : line.difference.isNegative()
                          ? "text-danger"
                          : "text-warning"
                    }`}
                  >
                    {formatQty(line.difference.toString())}
                  </td>
                  <td className="text-center dir-ltr">
                    {formatMoney(line.differenceValue.toString())}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AttachmentsList entityType={AttachmentEntityType.STOCK_COUNT} entityIds={[id]} />

      {canDecide ? <DecideCountButtons countId={id} /> : null}
      {count.status === StockCountStatus.SUBMITTED && !canDecide ? (
        <p className="text-sm text-muted">{t.stockCounts.awaitingApproval}</p>
      ) : null}
    </div>
  );
}

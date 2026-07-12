import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { ApprovalStatus, AttachmentEntityType } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { formatDate, formatMoney, formatQty } from "@/lib/utils/format";
import { Badge, Card, PageHeader, StatusBadge } from "@/components/ui";
import { DecideDamageButtons } from "./decide-buttons";

export const metadata = { title: t.damages.record };

export default async function DamageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const damage = await prisma.damageRecord.findUnique({
    where: { id },
    include: {
      item: { include: { baseUnit: true } },
      location: true,
      reportedBy: { select: { name: true } },
    },
  });
  if (!damage) notFound();

  const seesAll =
    can(user, "damage.approve") || user.role === "OWNER" || user.role === "WAREHOUSE_MANAGER";
  if (!seesAll && damage.location.departmentId !== user.departmentId) {
    redirect("/damages");
  }

  const attachments = await prisma.fileAttachment.findMany({
    where: { entityType: AttachmentEntityType.DAMAGE_RECORD, entityId: id },
  });
  const canDecide = can(user, "damage.approve") && damage.status === ApprovalStatus.PENDING;

  return (
    <div className="space-y-4 max-w-xl">
      <PageHeader title={`${t.damages.record}: ${damage.item.nameAr}`} />

      <Card className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={damage.status} label={t.statuses[damage.status]} />
            <Badge tone="amber">{t.damages.types[damage.type]}</Badge>
          </div>
          <span className="text-muted">{formatDate(damage.date)}</span>
        </div>
        <p>
          <span className="text-muted">{t.common.quantity}: </span>
          <span className="dir-ltr font-bold">{formatQty(damage.quantity.toString())}</span>{" "}
          {damage.item.baseUnit.nameAr}
          <span className="text-muted"> · {t.inventory.location}: </span>
          {damage.location.nameAr}
        </p>
        <p>
          <span className="text-muted">{t.damages.estimatedCost}: </span>
          <span className="dir-ltr font-bold">
            {formatMoney(damage.estimatedCost.toString())} {t.app.currency}
          </span>
        </p>
        <p>
          <span className="text-muted">{t.common.reason}: </span>
          {damage.reason}
        </p>
        <p>
          <span className="text-muted">{t.damages.reportedBy}: </span>
          {damage.reportedBy.name}
        </p>
        {damage.notes ? (
          <p>
            <span className="text-muted">{t.common.notes}: </span>
            {damage.notes}
          </p>
        ) : null}
      </Card>

      {attachments.length > 0 ? (
        <Card>
          <h2 className="font-bold mb-2">{t.common.attachments}</h2>
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={`/api/files/${a.storageKey}`}
                  target="_blank"
                  className="text-primary text-sm font-medium underline"
                >
                  {a.fileName}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {canDecide ? <DecideDamageButtons damageId={id} /> : null}
    </div>
  );
}

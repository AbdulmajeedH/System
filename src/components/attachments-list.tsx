import { Paperclip } from "lucide-react";
import { prisma } from "@/lib/db";
import type { AttachmentEntityType } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { Card } from "@/components/ui";

/**
 * Server component: renders the attachments of one or more entities.
 * Rendering happens only on pages the caller already authorized; the file
 * route re-checks entity-specific access on download.
 */
export async function AttachmentsList({
  entityType,
  entityIds,
}: {
  entityType: AttachmentEntityType;
  entityIds: string[];
}) {
  if (entityIds.length === 0) return null;
  const attachments = await prisma.fileAttachment.findMany({
    where: { entityType, entityId: { in: entityIds } },
    orderBy: { createdAt: "asc" },
  });
  if (attachments.length === 0) return null;

  return (
    <Card>
      <h2 className="font-bold mb-2">{t.common.attachments}</h2>
      <ul className="space-y-2">
        {attachments.map((a) => (
          <li key={a.id}>
            <a
              href={`/api/files/${a.storageKey}`}
              target="_blank"
              className="inline-flex items-center gap-2 text-primary text-sm font-medium underline"
            >
              <Paperclip className="size-4" aria-hidden />
              {a.fileName}
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

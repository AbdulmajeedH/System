import { notFound } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorage } from "@/lib/services/storage";
import { isSafeStorageKey } from "@/lib/services/storage/attachment-rules";
import { canViewAttachment } from "@/lib/services/attachment-access";

/**
 * Serves stored attachments to authenticated users. Authorization is
 * entity-specific (see attachment-access.ts): access follows the related
 * record's department/location and the caller's permissions over it.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { key } = await params;
  const storageKey = key.join("/");
  if (!isSafeStorageKey(storageKey)) notFound();

  const attachment = await prisma.fileAttachment.findUnique({
    where: { storageKey },
  });
  if (!attachment) notFound();

  const allowed = await canViewAttachment(prisma, user, attachment);
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const file = await getStorage().get(storageKey);
  if (!file) notFound();

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import { notFound } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorage } from "@/lib/services/storage";

/**
 * Serves stored attachments to authenticated users. Owner/GM see everything;
 * other users see files they uploaded or files belonging to their department's
 * records (uploader in same department).
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

  const attachment = await prisma.fileAttachment.findUnique({
    where: { storageKey },
    include: { uploadedBy: { select: { departmentId: true } } },
  });
  if (!attachment) notFound();

  const isPrivileged = user.role === "OWNER" || user.role === "GENERAL_MANAGER";
  const isUploader = attachment.uploadedById === user.id;
  const sameDepartment =
    user.departmentId !== null && attachment.uploadedBy.departmentId === user.departmentId;
  if (!isPrivileged && !isUploader && !sameDepartment) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const file = await getStorage().get(storageKey);
  if (!file) notFound();

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

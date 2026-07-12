import "server-only";
import { randomBytes } from "crypto";
import path from "path";
import { prisma } from "@/lib/db";
import { getStorage } from "./storage";
import type { AttachmentEntityType } from "@/generated/prisma/enums";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export class AttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentError";
  }
}

/**
 * Validates and stores files from a form, then records FileAttachment rows.
 * Call AFTER the entity exists. Skips empty file inputs silently.
 */
export async function saveAttachments(
  files: File[],
  entityType: AttachmentEntityType,
  entityId: string,
  uploadedById: string,
): Promise<number> {
  const storage = getStorage();
  let saved = 0;

  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (file.size > MAX_FILE_BYTES) {
      throw new AttachmentError("حجم الملف يتجاوز الحد المسموح (١٠ ميجابايت)");
    }
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      throw new AttachmentError("نوع الملف غير مدعوم (المسموح: صور أو PDF)");
    }

    const now = new Date();
    const key = path.posix.join(
      entityType.toLowerCase(),
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, "0"),
      `${randomBytes(12).toString("hex")}${ext}`,
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    await storage.put(key, buffer, file.type);
    await prisma.fileAttachment.create({
      data: {
        entityType,
        entityId,
        storageKey: key,
        fileName: file.name || `attachment${ext}`,
        mimeType: file.type,
        size: file.size,
        uploadedById,
      },
    });
    saved++;
  }
  return saved;
}

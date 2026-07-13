import "server-only";
import { randomBytes } from "crypto";
import path from "path";
import { prisma } from "@/lib/db";
import { getStorage } from "./storage";
import {
  extensionFor,
  isAcceptableUpload,
  isSafeStorageKey,
} from "./storage/attachment-rules";
import type { AttachmentEntityType } from "@/generated/prisma/enums";

export class AttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentError";
  }
}

/**
 * Validates and stores files from a form, then records FileAttachment rows.
 * Call AFTER the entity exists. Skips empty file inputs silently.
 *
 * Orphan safety: the object is written first and the DB row second; if the
 * row cannot be created, the stored object is deleted again so neither an
 * orphan record nor an orphan object survives.
 */
export async function saveAttachments(
  files: File[],
  entityType: AttachmentEntityType,
  entityId: string,
  uploadedById: string,
): Promise<string[]> {
  const storage = getStorage();
  const savedKeys: string[] = [];

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const ext = extensionFor(file.type);
    if (!ext || !isAcceptableUpload(file.type, file.name ?? "", file.size)) {
      throw new AttachmentError(
        "الملف غير مقبول: المسموح صور JPEG/PNG/WebP أو PDF بحجم أقصاه ١٠ ميجابايت",
      );
    }

    const now = new Date();
    const key = path.posix.join(
      entityType.toLowerCase(),
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, "0"),
      `${randomBytes(12).toString("hex")}${ext}`,
    );
    if (!isSafeStorageKey(key)) throw new AttachmentError("مفتاح تخزين غير صالح");

    const buffer = Buffer.from(await file.arrayBuffer());
    await storage.put(key, buffer, file.type);
    try {
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
    } catch (error) {
      // Roll the object back so storage and DB stay consistent.
      await storage.delete(key).catch(() => {});
      throw error;
    }
    savedKeys.push(key);
  }
  return savedKeys;
}

import "server-only";
import { randomBytes } from "crypto";
import path from "path";
import { prisma } from "@/lib/db";
import { getStorage } from "./storage";
import type { AttachmentEntityType } from "@/generated/prisma/enums";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};
const STORED_EXTENSIONS: Record<string, string> = {
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

export function sanitizedFileName(name: string, fallbackExt: string): string {
  const base = path.basename(name || `attachment${fallbackExt}`).replace(/[\u0000-\u001f]/g, "");
  const safe = base.replace(/[/\\]/g, "").trim();
  return safe.length > 0 ? safe.slice(0, 180) : `attachment${fallbackExt}`;
}

export function extensionForUpload(file: File): string {
  const allowed = ALLOWED_TYPES[file.type];
  if (!allowed) {
    throw new AttachmentError("نوع الملف غير مدعوم (المسموح: صور أو PDF)");
  }
  const ext = path.extname(file.name || "").toLowerCase();
  if (ext && !allowed.includes(ext)) {
    throw new AttachmentError("امتداد الملف لا يطابق نوع الملف");
  }
  return STORED_EXTENSIONS[file.type];
}

export function validateAttachmentFile(file: File): string {
  if (!file || file.size === 0) throw new AttachmentError("الملف فارغ");
  if (file.size > MAX_FILE_BYTES) {
    throw new AttachmentError("حجم الملف يتجاوز الحد المسموح (١٠ ميجابايت)");
  }
  return extensionForUpload(file);
}

export function generateAttachmentKey(entityType: AttachmentEntityType, ext: string, now = new Date()): string {
  return path.posix.join(
    entityType.toLowerCase(),
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, "0"),
    `${randomBytes(16).toString("hex")}${ext}`,
  );
}

/**
 * Validates and stores files from a form, then records FileAttachment rows.
 * Call AFTER the entity exists. Skips empty file inputs silently.
 *
 * The storage object is written before the DB row because the DB references
 * the generated object key. If a DB insert or later upload fails, this helper
 * deletes any objects and DB rows it created in this call to avoid orphans.
 */
export async function saveAttachments(
  files: File[],
  entityType: AttachmentEntityType,
  entityId: string,
  uploadedById: string,
): Promise<number> {
  const storage = getStorage();
  const createdKeys: string[] = [];
  const createdAttachmentIds: string[] = [];
  let saved = 0;

  try {
    for (const file of files) {
      if (!file || file.size === 0) continue;
      const ext = validateAttachmentFile(file);
      const key = generateAttachmentKey(entityType, ext);
      const buffer = Buffer.from(await file.arrayBuffer());

      await storage.put(key, buffer, file.type);
      createdKeys.push(key);

      const attachment = await prisma.fileAttachment.create({
        data: {
          entityType,
          entityId,
          storageKey: key,
          fileName: sanitizedFileName(file.name, ext),
          mimeType: file.type,
          size: file.size,
          uploadedById,
        },
        select: { id: true },
      });
      createdAttachmentIds.push(attachment.id);
      saved++;
    }
    return saved;
  } catch (error) {
    await Promise.allSettled(createdKeys.map((key) => storage.delete(key)));
    if (createdAttachmentIds.length > 0) {
      await prisma.fileAttachment.deleteMany({ where: { id: { in: createdAttachmentIds } } });
    }
    throw error;
  }
}

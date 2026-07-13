import "server-only";
import { LocalStorageProvider } from "./local";
import { S3StorageProvider } from "./s3";

export type StoredFile = {
  buffer: Buffer;
  contentType: string;
};

/**
 * Storage abstraction: local disk in development, S3-compatible object
 * storage in production (AWS S3, Cloudflare R2, Supabase Storage, MinIO).
 * Selected with STORAGE_DRIVER=s3 | local.
 */
export interface StorageProvider {
  put(key: string, buffer: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
}

export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigError";
  }
}

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (provider) return provider;

  const driver = process.env.STORAGE_DRIVER ?? "local";

  if (driver === "s3") {
    provider = new S3StorageProvider();
    return provider;
  }

  // The Vercel/serverless filesystem is ephemeral — local storage there
  // would silently lose every uploaded file after redeploy.
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    throw new StorageConfigError(
      "Production on Vercel requires STORAGE_DRIVER=s3 with S3_BUCKET, " +
        "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY configured. Local file " +
        "storage is only supported for local development.",
    );
  }

  provider = new LocalStorageProvider(process.env.STORAGE_DIR || "uploads");
  return provider;
}

/** Test hook: reset the cached provider so env changes take effect. */
export function resetStorageForTests(): void {
  provider = null;
}

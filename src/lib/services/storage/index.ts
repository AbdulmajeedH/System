import "server-only";
import { LocalStorageProvider } from "./local";
import { S3StorageProvider } from "./s3";

export type StoredFile = {
  buffer: Buffer;
  contentType: string;
};

/**
 * Storage abstraction: local disk in development, S3-compatible object
 * storage in production (adapter to be added when deploying — implement
 * this interface and switch on an env var here).
 */
export interface StorageProvider {
  put(key: string, buffer: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
}

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!provider) {
    provider =
      process.env.STORAGE_DRIVER === "s3"
        ? new S3StorageProvider()
        : new LocalStorageProvider(process.env.STORAGE_DIR || "uploads");
  }
  return provider;
}

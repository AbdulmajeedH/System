import "server-only";
import { LocalStorageProvider } from "./local";
import { S3StorageProvider } from "./s3";

export type StoredFile = {
  buffer: Buffer;
  contentType: string;
};

export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigError";
  }
}

export type StorageDriver = "local" | "s3";

export interface S3StorageConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
}

/**
 * Storage abstraction: local disk is allowed only for local development/test.
 * Production and Vercel deployments must use private S3-compatible object
 * storage, served through authenticated application routes.
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

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

export function getStorageDriver(): StorageDriver {
  const configured = process.env.STORAGE_DRIVER?.trim().toLowerCase();
  if (configured === "s3") return configured;
  if (configured === "local") {
    if (isProductionRuntime()) {
      throw new StorageConfigError(
        "STORAGE_DRIVER=local is not allowed in production/Vercel. Configure STORAGE_DRIVER=s3.",
      );
    }
    return "local";
  }
  if (configured) {
    throw new StorageConfigError(
      `STORAGE_DRIVER must be either "s3" or "local"; received "${configured}"`,
    );
  }
  if (isProductionRuntime()) {
    throw new StorageConfigError(
      "STORAGE_DRIVER=s3 is required in production/Vercel. Local filesystem uploads are not durable.",
    );
  }
  return "local";
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new StorageConfigError(`${name} is required when STORAGE_DRIVER=s3`);
  return value;
}

export function getS3StorageConfig(): S3StorageConfig {
  return {
    bucket: requiredEnv("S3_BUCKET"),
    region: requiredEnv("S3_REGION"),
    accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
    endpoint: requiredEnv("S3_ENDPOINT"),
  };
}

/** Reject path traversal, absolute paths, Windows separators, and empty parts. */
export function assertSafeStorageKey(key: string): void {
  if (!key || key.length > 512) throw new StorageConfigError("Invalid storage key");
  if (key.startsWith("/") || key.includes("\\")) {
    throw new StorageConfigError("Invalid storage key");
  }
  const parts = key.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new StorageConfigError("Invalid storage key");
  }
}

export function resetStorageForTests(): void {
  provider = null;
}

export function getStorage(): StorageProvider {
  if (!provider) {
    const driver = getStorageDriver();
    provider =
      driver === "s3"
        ? new S3StorageProvider(getS3StorageConfig())
        : new LocalStorageProvider(process.env.STORAGE_DIR || "uploads");
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

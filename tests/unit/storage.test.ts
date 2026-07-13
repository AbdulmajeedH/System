import { describe, expect, it } from "vitest";
import { S3StorageProvider } from "../../src/lib/services/storage/s3";
import {
  isAcceptableUpload,
  isSafeStorageKey,
  MAX_FILE_BYTES,
} from "../../src/lib/services/storage/attachment-rules";

describe("S3 configuration validation", () => {
  const full = {
    S3_BUCKET: "bucket",
    S3_REGION: "auto",
    S3_ACCESS_KEY_ID: "key",
    S3_SECRET_ACCESS_KEY: "secret",
  };

  it("accepts a complete configuration", () => {
    expect(() => new S3StorageProvider(full)).not.toThrow();
  });

  it("lists every missing variable in the error", () => {
    expect(() => new S3StorageProvider({ S3_BUCKET: "b" })).toThrow(
      /S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY/,
    );
    expect(() => new S3StorageProvider({})).toThrow(/S3_BUCKET/);
  });

  it("rejects blank values, not only missing ones", () => {
    expect(() => new S3StorageProvider({ ...full, S3_SECRET_ACCESS_KEY: "  " })).toThrow(
      /S3_SECRET_ACCESS_KEY/,
    );
  });
});

describe("upload validation", () => {
  it("accepts supported types with matching extensions", () => {
    expect(isAcceptableUpload("image/jpeg", "photo.JPG", 1000)).toBe(true);
    expect(isAcceptableUpload("image/jpeg", "photo.jpeg", 1000)).toBe(true);
    expect(isAcceptableUpload("application/pdf", "فاتورة.pdf", 1000)).toBe(true);
    expect(isAcceptableUpload("image/webp", "capture", 1000)).toBe(true); // camera, no ext
  });

  it("rejects unsupported types, mismatched extensions, and oversize files", () => {
    expect(isAcceptableUpload("application/x-msdownload", "app.exe", 10)).toBe(false);
    expect(isAcceptableUpload("image/png", "script.exe", 10)).toBe(false);
    expect(isAcceptableUpload("image/png", "a.png", MAX_FILE_BYTES + 1)).toBe(false);
    expect(isAcceptableUpload("image/png", "a.png", 0)).toBe(false);
  });
});

describe("storage key safety", () => {
  it("accepts generated keys", () => {
    expect(isSafeStorageKey("expense/2026/07/abc123def456.jpg")).toBe(true);
  });

  it("rejects traversal, absolute paths, and junk", () => {
    expect(isSafeStorageKey("../../etc/passwd")).toBe(false);
    expect(isSafeStorageKey("/etc/passwd")).toBe(false);
    expect(isSafeStorageKey("a\\..\\b")).toBe(false);
    expect(isSafeStorageKey("a b?.png")).toBe(false);
    expect(isSafeStorageKey("")).toBe(false);
  });
});

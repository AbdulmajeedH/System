import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { AttachmentEntityType } from "../../src/generated/prisma/enums";
import {
  assertSafeStorageKey,
  getS3StorageConfig,
  getStorageDriver,
  resetStorageForTests,
  StorageConfigError,
} from "../../src/lib/services/storage";
import {
  extensionForUpload,
  generateAttachmentKey,
  sanitizedFileName,
  validateAttachmentFile,
} from "../../src/lib/services/attachments";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...ORIGINAL_ENV };
  resetStorageForTests();
});

describe("storage configuration", () => {
  it("requires S3 storage in production when no driver is configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STORAGE_DRIVER", "");
    expect(() => getStorageDriver()).toThrow(StorageConfigError);
    expect(() => getStorageDriver()).toThrow(/STORAGE_DRIVER=s3/);
  });

  it("allows local storage outside production but rejects it in production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STORAGE_DRIVER", "");
    expect(getStorageDriver()).toBe("local");

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STORAGE_DRIVER", "local");
    expect(() => getStorageDriver()).toThrow(/not allowed in production/);
  });

  it("validates all S3 environment variables", () => {
    vi.stubEnv("STORAGE_DRIVER", "s3");
    vi.stubEnv("S3_BUCKET", "bucket");
    vi.stubEnv("S3_REGION", "auto");
    vi.stubEnv("S3_ACCESS_KEY_ID", "access");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "secret");
    vi.stubEnv("S3_ENDPOINT", "https://example.test");

    expect(getS3StorageConfig()).toEqual({
      bucket: "bucket",
      region: "auto",
      accessKeyId: "access",
      secretAccessKey: "secret",
      endpoint: "https://example.test",
    });

    vi.stubEnv("S3_SECRET_ACCESS_KEY", "");
    expect(() => getS3StorageConfig()).toThrow(/S3_SECRET_ACCESS_KEY/);
  });

  it("rejects unsafe object keys", () => {
    expect(() => assertSafeStorageKey("daily_income/2026/07/file.pdf")).not.toThrow();
    expect(() => assertSafeStorageKey("../file.pdf")).toThrow(StorageConfigError);
    expect(() => assertSafeStorageKey("daily_income//file.pdf")).toThrow(StorageConfigError);
    expect(() => assertSafeStorageKey("daily_income\\file.pdf")).toThrow(StorageConfigError);
    expect(() => assertSafeStorageKey("/daily_income/file.pdf")).toThrow(StorageConfigError);
  });
});

describe("attachment validation", () => {
  it("accepts supported MIME types with matching extensions", () => {
    const file = new File(["data"], "receipt.pdf", { type: "application/pdf" });
    expect(validateAttachmentFile(file)).toBe(".pdf");
  });

  it("rejects mismatched extensions and unsupported MIME types", () => {
    const mismatch = new File(["data"], "receipt.exe", { type: "application/pdf" });
    expect(() => extensionForUpload(mismatch)).toThrow(/امتداد/);

    const unsupported = new File(["data"], "receipt.txt", { type: "text/plain" });
    expect(() => validateAttachmentFile(unsupported)).toThrow(/غير مدعوم/);
  });

  it("generates safe unique object keys and sanitizes original file names", () => {
    const key = generateAttachmentKey(
      AttachmentEntityType.EXPENSE,
      ".pdf",
      new Date("2026-07-14T00:00:00.000Z"),
    );
    expect(key).toMatch(/^expense\/2026\/07\/[a-f0-9]{32}\.pdf$/);
    expect(sanitizedFileName("../../receipt.pdf", ".pdf")).toBe("receipt.pdf");
  });
});

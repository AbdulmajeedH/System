// Pure attachment validation rules (unit-tested; no server-only imports).

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Allowed MIME types and the canonical extension stored for each. */
export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

/** Extensions accepted per MIME type when checking the original filename. */
const COMPATIBLE_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

export function extensionFor(mimeType: string): string | null {
  return ALLOWED_TYPES[mimeType] ?? null;
}

/**
 * Declared type must be allowed and the original filename's extension (when
 * present) must match it — rejects e.g. "report.exe" declared as image/png.
 */
export function isAcceptableUpload(mimeType: string, fileName: string, size: number): boolean {
  if (size <= 0 || size > MAX_FILE_BYTES) return false;
  const compatible = COMPATIBLE_EXTENSIONS[mimeType];
  if (!compatible) return false;
  const dot = fileName.lastIndexOf(".");
  if (dot === -1) return true; // no extension supplied (e.g. camera capture)
  return compatible.includes(fileName.slice(dot).toLowerCase());
}

/**
 * Storage keys are always generated server-side; this guards against a
 * crafted key ever reaching a provider (path traversal, absolute paths).
 */
export function isSafeStorageKey(key: string): boolean {
  return (
    key.length > 0 &&
    key.length <= 300 &&
    !key.startsWith("/") &&
    !key.includes("..") &&
    !key.includes("\\") &&
    /^[a-z0-9_\-./]+$/i.test(key)
  );
}

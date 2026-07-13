import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { StorageProvider, StoredFile } from "./index";

/**
 * S3-compatible object storage (AWS S3, Cloudflare R2, Supabase Storage,
 * MinIO, …). Objects stay private — the app serves them through the
 * authenticated /api/files route, never by public URL.
 *
 * Required env: S3_BUCKET, S3_REGION (or "auto" for R2), S3_ACCESS_KEY_ID,
 * S3_SECRET_ACCESS_KEY. Optional: S3_ENDPOINT for non-AWS providers.
 */
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(env: Record<string, string | undefined> = process.env) {
    const missing = ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"].filter(
      (key) => !env[key]?.trim(),
    );
    if (missing.length > 0) {
      throw new Error(
        `S3 storage configuration is incomplete — missing: ${missing.join(", ")}. ` +
          "Set every required variable (S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, " +
          "S3_SECRET_ACCESS_KEY, and S3_ENDPOINT for non-AWS providers).",
      );
    }
    this.bucket = env.S3_BUCKET!;
    this.client = new S3Client({
      region: env.S3_REGION?.trim() || "auto",
      endpoint: env.S3_ENDPOINT?.trim() || undefined,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }

  async put(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<StoredFile | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!result.Body) return null;
      const buffer = Buffer.from(await result.Body.transformToByteArray());
      return { buffer, contentType: result.ContentType ?? "" };
    } catch (error) {
      if ((error as { name?: string }).name === "NoSuchKey") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

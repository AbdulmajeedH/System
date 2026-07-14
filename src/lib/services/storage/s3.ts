import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  assertSafeStorageKey,
  type S3StorageConfig,
  type StorageProvider,
  type StoredFile,
} from "./index";

/**
 * S3-compatible object storage (AWS S3, Cloudflare R2, Supabase Storage,
 * MinIO, …). Objects stay private — the app serves them through the
 * authenticated /api/files route, never by public URL.
 */
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(key: string, buffer: Buffer, contentType: string): Promise<void> {
    assertSafeStorageKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: { private: "true" },
      }),
    );
  }

  async get(key: string): Promise<StoredFile | null> {
    assertSafeStorageKey(key);
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!result.Body) return null;
      const buffer = Buffer.from(await result.Body.transformToByteArray());
      return { buffer, contentType: result.ContentType ?? "" };
    } catch (error) {
      const name = (error as { name?: string; $metadata?: { httpStatusCode?: number } }).name;
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      if (name === "NoSuchKey" || name === "NotFound" || status === 404) return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    assertSafeStorageKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

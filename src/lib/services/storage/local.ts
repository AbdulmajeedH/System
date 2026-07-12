import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import type { StorageProvider, StoredFile } from "./index";

export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;

  constructor(dir: string) {
    this.root = path.resolve(process.cwd(), dir);
  }

  private resolve(key: string): string {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) {
      throw new Error("Invalid storage key");
    }
    return full;
  }

  async put(key: string, buffer: Buffer, _contentType: string): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, buffer);
  }

  async get(key: string): Promise<StoredFile | null> {
    try {
      const buffer = await readFile(this.resolve(key));
      return { buffer, contentType: "" }; // content type comes from the DB record
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

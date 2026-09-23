import fs from "node:fs/promises";
import path from "node:path";
import { safeKey, type StorageAdapter } from "./adapter";

export class LocalStorage implements StorageAdapter {
  constructor(private readonly root: string) {}

  private abs(key: string): string {
    const k = safeKey(key);
    const p = path.resolve(this.root, k);
    if (!p.startsWith(path.resolve(this.root))) throw new Error("path escape");
    return p;
  }

  async put(key: string, data: Buffer | Uint8Array): Promise<void> {
    const p = this.abs(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, data);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.abs(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.abs(key));
      return true;
    } catch {
      return false;
    }
  }

  localPath(key: string): string {
    return this.abs(key);
  }

  publicUrl(key: string): string {
    return `/api/files/${safeKey(key)}`;
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.abs(key), { force: true });
  }
}

import { safeKey, type StorageAdapter } from "./adapter";

/**
 * Cloudflare R2 저장소.
 *
 * 계정에서 R2 를 켜고 `wrangler.jsonc` 에 버킷을 바인딩하면(`MEDIA`) 자동으로 이 구현체가 쓰인다.
 * 켜기 전에는 업로드가 곧바로 fal 로 가고 결과도 fal URL 을 그대로 쓴다 — 그 경우 결과가 영구 보관되지 않는다.
 */
export class R2Storage implements StorageAdapter {
  constructor(private readonly bucket: R2Bucket) {}

  async put(key: string, data: Uint8Array, contentType?: string): Promise<void> {
    await this.bucket.put(safeKey(key), data as unknown as ArrayBuffer, {
      httpMetadata: contentType ? { contentType } : undefined,
    });
  }

  async get(key: string): Promise<Buffer> {
    const obj = await this.bucket.get(safeKey(key));
    if (!obj) throw new Error(`R2 객체가 없습니다: ${key}`);
    return Buffer.from(await obj.arrayBuffer());
  }

  /** 스트리밍 서빙용 — 파일 서빙 라우트가 바이트를 통째로 읽지 않도록 원본 객체를 그대로 준다. */
  async getObject(key: string): Promise<R2ObjectBody | null> {
    return await this.bucket.get(safeKey(key));
  }

  async exists(key: string): Promise<boolean> {
    return (await this.bucket.head(safeKey(key))) !== null;
  }

  localPath(): string | null {
    return null;
  }

  publicUrl(key: string): string {
    return `/api/files/${safeKey(key)}`;
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(safeKey(key));
  }
}

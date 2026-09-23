/**
 * 파일 저장소 경계. 로컬 MVP는 LocalStorage(fs), 이후 R2 구현체로 교체한다.
 * key 는 항상 posix 스타일 상대 경로다 (예: "uploads/ab12/photo.png").
 */
export interface StorageAdapter {
  put(key: string, data: Buffer | Uint8Array, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  /** 로컬 절대 경로(fs 구현체만). R2 구현체는 null 을 돌려준다. */
  localPath(key: string): string | null;
  /** 이 앱이 서빙하는 URL (예: /api/files/uploads/...) */
  publicUrl(key: string): string;
  delete(key: string): Promise<void>;
}

export function safeKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.split("/").some((seg) => seg === "" || seg === "." || seg === "..")) {
    throw new Error(`invalid storage key: ${key}`);
  }
  return normalized;
}

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { nodeRequire } from "@/lib/node-only";
import { hasFileSystem } from "@/lib/runtime";
import type { StorageAdapter } from "./adapter";
import { LocalStorage } from "./local";
import { R2Storage } from "./r2";

const g = globalThis as unknown as { __c2v_storage?: StorageAdapter | null };

/** 로컬 저장소 루트. env.ts 에 두면 Next 트레이서가 프로젝트 전체를 번들에 넣으려 한다. */
export function storageDir(): string {
  const path = nodeRequire<typeof import("node:path")>("node:path");
  return path.resolve(process.cwd(), process.env.STORAGE_DIR ?? "./storage");
}

/** Cloudflare 런타임이면 R2 버킷 바인딩을 돌려준다 (계정에서 R2 를 켜고 바인딩한 경우에만 존재). */
function r2Binding(): R2Bucket | undefined {
  try {
    return (getCloudflareContext().env as unknown as { MEDIA?: R2Bucket }).MEDIA;
  } catch {
    return undefined;
  }
}

/**
 * 쓸 수 있는 저장소를 돌려준다. 없으면 null.
 *
 * - 로컬: `storage/` 디렉터리
 * - Cloudflare + R2 바인딩(`MEDIA`): R2
 * - Cloudflare + R2 없음: null — 업로드는 곧바로 fal 로 가고 결과도 fal URL 을 그대로 쓴다
 */
export function tryGetStorage(): StorageAdapter | null {
  if (g.__c2v_storage !== undefined) return g.__c2v_storage;
  const bucket = r2Binding();
  if (bucket) g.__c2v_storage = new R2Storage(bucket);
  else if (hasFileSystem()) g.__c2v_storage = new LocalStorage(storageDir());
  else g.__c2v_storage = null;
  return g.__c2v_storage;
}

/** 저장소가 반드시 있어야 하는 자리에서 쓴다. */
export function getStorage(): StorageAdapter {
  const s = tryGetStorage();
  if (!s) throw new Error("이 환경에는 파일 저장소가 없습니다 (R2 를 켜고 MEDIA 로 바인딩하세요).");
  return s;
}

/** 저장소를 쓸 수 있는가 (로컬 fs 또는 R2) */
export function hasStorage(): boolean {
  return tryGetStorage() !== null;
}

export type { StorageAdapter } from "./adapter";

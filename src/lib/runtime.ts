import fs from "node:fs";
import path from "node:path";

/**
 * 이 프로세스가 프로젝트 파일을 실제로 읽을 수 있는가.
 * 로컬 Node(dev/build)에서는 true, Cloudflare Workers 에서는 false —
 * Workers 는 nodejs_compat 로 `node:fs` API 자체는 존재하지만 프로젝트 파일이 없다.
 * (그래서 예외가 아니라 "없음"으로 조용히 실패하므로 try/catch 가 아니라 이 검사를 써야 한다.)
 */
let cached: boolean | undefined;
export function hasFileSystem(): boolean {
  if (cached !== undefined) return cached;
  try {
    cached = fs.existsSync(path.resolve(process.cwd(), "public"));
  } catch {
    cached = false;
  }
  return cached;
}

/** Workers 에서 fal 에 넘길 절대 URL 을 만들기 위한 사이트 origin */
export function publicBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
}

/** `/samples/x.png` 같은 경로를 fal 이 읽을 수 있는 절대 URL 로 */
export function absolutePublicUrl(p: string): string | null {
  const base = publicBaseUrl();
  if (!base) return null;
  return `${base}${p.startsWith("/") ? p : `/${p}`}`;
}

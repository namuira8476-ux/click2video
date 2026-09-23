import { getEnv } from "@/lib/env";
import type { H3Client } from "./client";
import { createFalH3Client } from "./fal-client";
import { createMockH3Client } from "./mock";

const g = globalThis as unknown as { __c2v_h3_mock?: H3Client };

/**
 * 어떤 키로 생성하는가 — 모드를 하나로 못 박는다. 섞이면 같은 작업을 서버 키와 브라우저 키가
 * 번갈아 조회해 실패하거나(요청 id 는 계정마다 다르다) 엉뚱한 계정에 과금된다.
 *
 * - `byok`   : 공개 배포. 방문자 브라우저 키만 쓴다. 서버 키 폴백 없음.
 * - `server` : 로컬 개발·운영자 단독. 서버 `FAL_KEY` 만 쓰고 브라우저 키는 무시한다.
 *              `FAL_KEY` 가 비어 있으면 데모(MOCK) 모드. 작업은 인터벌 러너가 민다.
 * - `open`   : 두 플래그가 다 없을 때. 브라우저 키를 쓰되 BYOK 의 쿠키 서명 강제는 없다.
 */
export type KeyMode = "byok" | "server" | "open";

export function keyMode(): KeyMode {
  const env = getEnv();
  if (env.byok) return "byok";
  if (env.allowServerKey) return "server";
  return "open";
}

export function effectiveKey(userKey: string): string {
  return keyMode() === "server" ? getEnv().falKey : userKey.trim();
}

export function isMockMode(userKey: string): boolean {
  if (getEnv().mockForced) return true;
  return keyMode() === "server" && effectiveKey(userKey) === "";
}

/** 생성하려면 브라우저가 키를 보내야 하는가 (UI 가 키 입력을 요구할지 정한다). */
export function requiresBrowserKey(): boolean {
  if (getEnv().mockForced) return false;
  return keyMode() !== "server";
}

/**
 * 요청 하나를 처리할 생성 클라이언트. **키는 필수 인자다** —
 * 선택 인자로 두면 키를 안 넘긴 호출부가 컴파일을 통과해 조용히 남의 키/빈 키로 나간다.
 *
 * BYOK 에서는 요청마다 키가 다르므로 캐시하지 않는다(createFalClient 는 객체 생성만 하므로
 * 비용이 없다). mock 만 상태를 유지해야 해서 전역에 둔다.
 */
export function getH3Client(userKey: string): H3Client {
  if (isMockMode(userKey)) {
    if (!g.__c2v_h3_mock) g.__c2v_h3_mock = createMockH3Client();
    return g.__c2v_h3_mock;
  }
  const key = effectiveKey(userKey);
  if (!key) throw new Error("fal API 키가 없습니다.");
  return createFalH3Client(key);
}

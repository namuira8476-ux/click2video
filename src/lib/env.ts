function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const v = Number(raw);
  return Number.isFinite(v) ? v : fallback;
}

export function getEnv() {
  const falKey = process.env.FAL_KEY?.trim() ?? "";
  const mockForced = process.env.MOCK_FAL === "1";
  /**
   * 공개 배포 모드. 방문자가 각자 자기 fal 키를 넣어 쓰고, 요금은 각자의 fal 계정에 붙는다.
   * 켜면 서버 키 폴백이 막히고 내부 크레딧 차감도 끈다.
   */
  const byok = process.env.BYOK_MODE === "1";
  /**
   * 서버 FAL_KEY 로 대신 생성하는 것을 **명시적으로** 허용한다 (로컬 개발·운영자 단독 배포·e2e).
   * 기본이 꺼짐인 것이 중요하다 — 환경변수 하나가 빠졌을 때 조용히 운영자 키로 과금되지 않게.
   */
  const allowServerKey = process.env.ALLOW_SERVER_KEY === "1";
  return {
    falKey,
    mockForced,
    byok,
    allowServerKey,
    /** 서버 자체가 키 없이 도는 상태(= 서버 키로는 아무것도 못 만든다) */
    mock: mockForced || (allowServerKey && falKey === ""),
    mockFailRate: Math.min(1, Math.max(0, num("MOCK_FAIL_RATE", 0))),
    creditMarkup: num("CREDIT_MARKUP", 2),
    /** BYOK 에서는 사용자가 fal 에 직접 과금되므로 내부 크레딧을 쓰지 않는다 */
    unlimitedCredits: process.env.UNLIMITED_CREDITS === "1" || byok,
    /** 사용자 식별 쿠키 서명용. BYOK 배포에서는 반드시 설정해야 한다 (wrangler secret). */
    sessionSecret: process.env.SESSION_SECRET?.trim() ?? "",
    priceOutput480P: num("PRICE_OUTPUT_480P", 0.05),
    priceOutput768P: num("PRICE_OUTPUT_768P", 0.08),
    promptExpansion: (process.env.FAL_PROMPT_EXPANSION === "quality" ? "quality" : "balanced") as
      | "balanced"
      | "quality",
  };
}

export type Env = ReturnType<typeof getEnv>;

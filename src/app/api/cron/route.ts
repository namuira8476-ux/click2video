import { handleError, json } from "@/lib/api";
import { ensureGuest } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { tickOnce } from "@/lib/jobs/runner";

/**
 * 작업 큐를 한 번 진행시킨다 — **서버 키 모드 전용**.
 * 운영자 단독 배포에서 크론 트리거를 켜면 `cf/worker.ts` 의 scheduled 핸들러가 이 경로를 부른다.
 * 기본 배포(BYOK)에는 크론이 없고, 호출되더라도 아래에서 바로 돌아간다.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 크론(내부 호출)이 아니면 상태만 알려주고 아무 것도 하지 않는다.
    if (req.headers.get("x-c2v-cron") !== "1") return json({ ok: true, ran: false });
    // BYOK 에서는 서버에 키가 없다. 여기서 큐를 돌리면 사용자 키로 만든 작업을
    // 키 없이 제출하려다 1분 만에 전부 실패 처리해 버린다.
    const env = getEnv();
    if (env.byok || !env.allowServerKey) return json({ ok: true, ran: false, reason: "byok" });
    await ensureGuest();
    await tickOnce();
    return json({ ok: true, ran: true });
  } catch (e) {
    return handleError(e);
  }
}

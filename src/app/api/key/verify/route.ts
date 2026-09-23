import { errorJson, handleError, json } from "@/lib/api";
import { verifyFalKey } from "@/lib/h3/fal-client";
import { falKeyFrom, requireUid } from "@/lib/request-context";

/**
 * 브라우저가 넣은 fal 키가 쓸 수 있는 키인지 확인한다.
 *
 * 키는 헤더로만 받고, 로그·DB 어디에도 남기지 않으며, 응답에는 고정된 결과 코드만 담는다
 * (상류 메시지를 그대로 돌려주면 훔친 키를 대량 검사하는 무료 오라클이 된다).
 * 브라우저당 짧은 간격의 반복 호출은 막는다.
 */
export const dynamic = "force-dynamic";

const lastCall = new Map<string, number>();
const MIN_INTERVAL_MS = 3000;

export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const now = Date.now();
    const prev = lastCall.get(uid) ?? 0;
    if (now - prev < MIN_INTERVAL_MS) return errorJson(429, "잠시 후 다시 시도해 주세요.");
    lastCall.set(uid, now);
    if (lastCall.size > 5000) lastCall.clear();

    const key = falKeyFrom(req);
    if (!key) return errorJson(400, "키가 비어 있습니다.");

    const r = await verifyFalKey(key);
    return json(r.ok ? { ok: true } : { ok: false, reason: r.reason, message: r.message }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (e) {
    return handleError(e);
  }
}

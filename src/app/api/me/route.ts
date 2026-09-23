import { handleError, json } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { isMockMode, keyMode, requiresBrowserKey } from "@/lib/h3";
import { getCredits } from "@/lib/jobs/service";
import { falKeyFrom, maskKey, requireUser } from "@/lib/request-context";

export const dynamic = "force-dynamic";

/**
 * 이 브라우저의 상태. **요청 스코프**로 계산한다 —
 * 서버 FAL_KEY 유무로 판단하면 BYOK 배포에서는 사용자가 유효한 키를 넣어도 MOCK 으로 보인다.
 */
export async function GET(req: Request) {
  try {
    const uid = await requireUser(req);
    const env = getEnv();
    const key = falKeyFrom(req);
    const hasKey = key !== "";
    return json(
      {
        user: { id: uid },
        byok: env.byok,
        hasKey,
        requiresBrowserKey: requiresBrowserKey(),
        keySource: keyMode() === "server" ? (env.falKey ? "server" : "none") : hasKey ? "browser" : "none",
        keyMasked: hasKey ? maskKey(key) : null,
        mock: isMockMode(key),
        unlimited: env.unlimitedCredits,
        credits: env.byok ? null : await getCredits(uid),
      },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch (e) {
    return handleError(e);
  }
}

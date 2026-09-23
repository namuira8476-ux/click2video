import { errorJson, handleError, json } from "@/lib/api";
import { isMockMode, keyMode } from "@/lib/h3";
import { hasFileSystem } from "@/lib/runtime";
import { falKeyFrom, requireUid, requireKeyIfNeeded } from "@/lib/request-context";
import { stepJob } from "@/lib/jobs/runner";
import { serializeJob } from "@/lib/jobs/serialize";
import { getJob } from "@/lib/jobs/service";

/**
 * 작업을 한 칸 진행시킨다.
 *
 * BYOK 에서는 서버가 키를 갖고 있지 않아 크론이 작업을 밀 수 없다. 대신 결과 화면이
 * 폴링하면서 이 경로를 부르고, 서버는 **이 요청에 실려 온 주인의 키로만** 제출·조회한다.
 * 부수효과가 있으므로 캐시 가능한 GET 이 아니라 POST 다.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const uid = await requireUid(req);
    const key = falKeyFrom(req);
    requireKeyIfNeeded(key);

    const job = await getJob(id, uid);
    if (!job) return errorJson(404, "작업을 찾을 수 없습니다.");
    // 로컬 서버 키 모드에서는 인터벌 러너가 작업을 민다. 여기서도 밀면 같은 작업을 두 경로가 진행시킨다.
    if (!(keyMode() === "server" && hasFileSystem())) await stepJob(job, key);

    const after = await getJob(id, uid);
    return json(
      { job: await serializeJob(after ?? job, { withPoster: true, mock: isMockMode(key) }) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return handleError(e);
  }
}

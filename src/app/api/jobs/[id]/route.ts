import { errorJson, handleError, json } from "@/lib/api";
import { isMockMode } from "@/lib/h3";
import { falKeyFrom, requireUid } from "@/lib/request-context";
import { serializeJob } from "@/lib/jobs/serialize";
import { getJob } from "@/lib/jobs/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  try {
    const { id } = await ctx.params;
    const uid = await requireUid(req);
    // 내 작업이 아니면 존재 여부도 알리지 않는다.
    const job = await getJob(id, uid);
    if (!job) return errorJson(404, "작업을 찾을 수 없습니다.");
    return json({ job: await serializeJob(job, { withPoster: true, mock: isMockMode(falKeyFrom(req)) }) });
  } catch (e) {
    return handleError(e);
  }
}

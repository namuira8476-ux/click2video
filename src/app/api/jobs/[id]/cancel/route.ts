import { handleError, json } from "@/lib/api";
import { isMockMode } from "@/lib/h3";
import { falKeyFrom, requireUid } from "@/lib/request-context";
import { serializeJob } from "@/lib/jobs/serialize";
import { cancelJob } from "@/lib/jobs/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RouteContext<"/api/jobs/[id]/cancel">) {
  try {
    const { id } = await ctx.params;
    const uid = await requireUid(req);
    const key = falKeyFrom(req);
    // 키가 없으면 fal 쪽 생성은 계속 돌아 과금된다 — 취소는 키와 함께 와야 의미가 있다.
    const job = await cancelJob(id, uid, key);
    return json({ job: await serializeJob(job, { withPoster: true, mock: isMockMode(key) }) });
  } catch (e) {
    return handleError(e);
  }
}

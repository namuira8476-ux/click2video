import { handleError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/request-context";
import { prepareJob, type CreateJobRequest } from "@/lib/jobs/service";

/** 생성 전 검증 + 견적. 크레딧을 차감하지 않는다. */
export async function POST(req: Request) {
  try {
    const uid = await requireUser(req);
    const body = await readJson<CreateJobRequest>(req);
    const p = await prepareJob(body, uid);
    return json({
      credits: p.credits,
      usd: Number(p.estimate.totalUsd.toFixed(4)),
      breakdown: {
        outputUsd: Number(p.estimate.outputUsd.toFixed(4)),
        refUsd: Number(p.estimate.refUsd.toFixed(4)),
        refTokens: p.estimate.refTokens,
      },
      generation: p.gen,
      errors: p.errors,
    });
  } catch (e) {
    return handleError(e);
  }
}

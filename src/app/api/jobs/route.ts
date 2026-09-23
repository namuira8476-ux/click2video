import { handleError, json, readJson } from "@/lib/api";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isMockMode, keyMode } from "@/lib/h3";
import { falKeyFrom, requireUid, requireUser, requireKeyIfNeeded } from "@/lib/request-context";
import { hasFileSystem } from "@/lib/runtime";
import { startRunner, stepJob } from "@/lib/jobs/runner";
import { serializeJob } from "@/lib/jobs/serialize";
import { createJob, listJobs, type CreateJobRequest } from "@/lib/jobs/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const uid = await requireUid(req);
    const key = falKeyFrom(req);
    const jobs = await Promise.all(
      (await listJobs(uid)).map((j) => serializeJob(j, { withPoster: true, mock: isMockMode(key) })),
    );
    return json({ jobs });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const uid = await requireUser(req);
    const key = falKeyFrom(req);
    requireKeyIfNeeded(key);
    const body = await readJson<CreateJobRequest>(req);
    const job = await createJob(body, uid);

    // 첫 스텝(업로드+제출)을 이 요청의 키로 바로 밀어 준다. 응답이 늦지 않게 waitUntil 에 맡긴다.
    // 로컬 서버 키 모드에서는 인터벌 러너가 이어받는다.
    if (keyMode() === "server" && hasFileSystem()) startRunner();
    else {
      const first = stepJob(job, key);
      try {
        getCloudflareContext().ctx.waitUntil(first);
      } catch {
        void first;
      }
    }
    return json({ job: await serializeJob(job, { withPoster: true, mock: isMockMode(key) }) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}

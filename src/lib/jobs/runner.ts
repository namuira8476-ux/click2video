import { and, eq, inArray, lt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Job } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { getH3Client } from "@/lib/h3";
import { H3UserError } from "@/lib/h3/client";
import type { PromptExpansion, Ratio, Resolution } from "@/lib/h3/limits";
import { buildRequest, maskInput, type H3Mode } from "@/lib/h3/request-builder";
import { hasFileSystem } from "@/lib/runtime";
import { getStorage, hasStorage } from "@/lib/storage";
import { getTemplate, hydrateTemplate } from "@/lib/templates/loader";
import { assignRefs } from "@/lib/templates/prompt-renderer";
import { materializeUrl } from "./materialize";
import { resolveAssets } from "./resolve-assets";
import { refundJob } from "./service";

const TICK_MS = 3000;
const POLL_MS = 5000;
const JOB_TIMEOUT_MS = 10 * 60 * 1000;
/** 업로드·제출 도중 멈춘 것으로 보고 큐로 되돌리는 시간 */
const STALE_MS = 3 * 60 * 1000;
/** 동시에 fal 에 올려 두는 작업 수. RUNNER_CONCURRENCY 로 조정 (기본 2, 전체 템플릿 검증 시 4~6) */
const MAX_CONCURRENT = Math.max(1, Number(process.env.RUNNER_CONCURRENCY) || 2);

type RunnerState = { timer?: NodeJS.Timeout; busy: boolean };
const g = globalThis as unknown as { __c2v_runner?: RunnerState };

function state(): RunnerState {
  if (!g.__c2v_runner) g.__c2v_runner = { busy: false };
  return g.__c2v_runner;
}

/** 조건부 UPDATE 가 실제로 몇 행을 바꿨는지 — 드라이버마다 모양이 다르다(better-sqlite3 / D1). */
function changedRows(r: unknown): number {
  const any = r as { changes?: number; rowsAffected?: number; meta?: { changes?: number } } | undefined;
  return any?.changes ?? any?.rowsAffected ?? any?.meta?.changes ?? 0;
}

/**
 * 상태를 **기대한 값일 때만** 바꾼다(compare-and-swap).
 * 사용자가 탭을 두 개 열어 동시에 폴링하면 같은 작업이 두 번 제출돼 두 번 과금된다 — 그걸 막는다.
 */
async function claim(jobId: string, from: Job["status"], to: Job["status"], patch: Partial<typeof schema.jobs.$inferInsert> = {}): Promise<boolean> {
  const r = await getDb()
    .update(schema.jobs)
    .set({ ...patch, status: to, updatedAt: Date.now() })
    .where(and(eq(schema.jobs.id, jobId), eq(schema.jobs.status, from)))
    .run();
  return changedRows(r) === 1;
}

/**
 * 로컬(장수명 Node 프로세스)에서만 쓰는 인터벌 러너. 서버 키로 도는 경로다.
 * BYOK 배포에서는 서버에 키가 없어 이 러너를 쓰지 않는다 — 브라우저가 stepJob 으로 진행시킨다.
 */
export function startRunner() {
  const env = getEnv();
  if (!env.allowServerKey || env.byok) return;
  const s = state();
  if (s.timer) return;
  void recoverInterrupted();
  s.timer = setInterval(() => void tickOnce(), TICK_MS);
  s.timer.unref?.();
  console.log("[runner] started (mock=%s)", getH3Client("").isMock);
}

/** 프로세스가 죽어 업로드/제출 도중 멈춘 작업을 다시 큐로 */
async function recoverInterrupted() {
  await getDb()
    .update(schema.jobs)
    .set({ status: "queued", updatedAt: Date.now() })
    .where(inArray(schema.jobs.status, ["uploading", "submitting"]))
    .run();
}

/**
 * 서버 키로 도는 큐 워커(로컬 인터벌·크론).
 * **서버 키 경로 전용**이다 — 사용자 키로 만든 작업을 여기서 건드리면 남의 키로 조회·제출하게 된다.
 */
export async function tickOnce(): Promise<void> {
  const env = getEnv();
  if (!env.allowServerKey || env.byok) return;
  const key = "";
  const s = state();
  if (s.busy) return;
  s.busy = true;
  try {
    const db = getDb();
    const active = await db.select().from(schema.jobs).where(inArray(schema.jobs.status, ["running", "downloading"])).all();
    for (const job of active) {
      if (job.status !== "running") continue;
      if (Date.now() - job.updatedAt < POLL_MS) continue;
      await pollJob(job, key).catch((e) => fail(job.id, e));
    }

    const busy = await db.select().from(schema.jobs).where(inArray(schema.jobs.status, ["uploading", "submitting", "running", "downloading"])).all();
    if (busy.length < MAX_CONCURRENT) {
      const next = await db
        .select()
        .from(schema.jobs)
        .where(and(eq(schema.jobs.status, "queued"), lt(schema.jobs.createdAt, Date.now() + 1)))
        .orderBy(schema.jobs.createdAt)
        .limit(1)
        .get();
      if (next) await submitJob(next, key).catch((e) => fail(next.id, e));
    }
  } catch (e) {
    console.error("[runner] tick error", (e as Error)?.name, (e as Error)?.message);
  } finally {
    s.busy = false;
  }
}

/**
 * 작업 하나를 한 스텝 진행시킨다 — **그 작업 주인의 키로**.
 *
 * BYOK 에서는 서버가 키를 갖고 있지 않으므로, 브라우저가 자기 작업을 폴링할 때마다
 * 이 함수가 제출→상태확인→결과저장을 한 칸씩 민다. 탭을 닫으면 진행이 멈추고
 * (fal 쪽 생성은 계속 돈다) 다시 열면 이어서 진행된다.
 */
export async function stepJob(job: Job, userKey: string): Promise<void> {
  try {
    switch (job.status) {
      case "queued":
        await submitJob(job, userKey);
        return;
      case "uploading":
      case "submitting":
        // 앞선 요청이 중간에 끊긴 채 오래 머물러 있으면 큐로 되돌린다.
        if (Date.now() - job.updatedAt > STALE_MS) await claim(job.id, job.status, "queued");
        return;
      case "running":
        if (Date.now() - job.updatedAt < POLL_MS) return;
        await pollJob(job, userKey);
        return;
      case "downloading":
        await finishJob(job, userKey);
        return;
      default:
        return;
    }
  } catch (e) {
    await fail(job.id, e);
  }
}

async function setStatus(id: string, patch: Partial<typeof schema.jobs.$inferInsert>) {
  await getDb().update(schema.jobs).set({ ...patch, updatedAt: Date.now() }).where(eq(schema.jobs.id, id)).run();
}

async function fail(id: string, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  const kind = e instanceof H3UserError ? "입력 파일 문제" : "생성 서비스 오류";
  console.error("[runner] job %s failed: %s", id, (e as Error)?.name ?? "Error");
  await setStatus(id, { status: "failed", errorMessage: msg.startsWith(kind) ? msg : `${kind}: ${msg}`, finishedAt: Date.now() });
  await refundJob(id);
}

/* ---------- 업로드 + 제출 ---------- */

async function submitJob(job: Job, userKey: string) {
  const base = getTemplate(job.templateId);
  if (!base) throw new Error("템플릿이 사라졌습니다.");
  const template = hydrateTemplate(base);

  // 큐에서 집어올 때 선점 — 같은 작업을 두 요청이 동시에 제출해 두 번 과금되는 것을 막는다.
  if (!(await claim(job.id, "queued", "uploading", { startedAt: Date.now() }))) return;

  const assets = await resolveAssets(template, job.inputs, job.userId);
  for (const a of assets) a.url = await materializeUrl(a, userKey);

  if (!(await claim(job.id, "uploading", "submitting"))) return;
  const { order } = assignRefs(template, assets);
  const req = buildRequest(template.mode, {
    prompt: job.renderedPrompt,
    assets,
    order,
    resolution: job.resolution as Resolution,
    duration: job.duration,
    ratio: job.ratio as Ratio,
    promptExpansion: job.promptExpansion as PromptExpansion,
  });
  const { requestId } = await getH3Client(userKey).submit(req);
  await setStatus(job.id, { status: "running", falRequestId: requestId, requestSnapshot: maskInput(req) });
}

/* ---------- 상태 폴링 + 결과 저장 ---------- */

/** 작업의 fal 엔드포인트 모드 — 템플릿 정의에서 온다 (제출 때와 같은 엔드포인트로 조회해야 한다). */
export function modeOf(templateId: string): H3Mode {
  return getTemplate(templateId)?.mode ?? "reference";
}

async function pollJob(job: Job, userKey: string) {
  if (!job.falRequestId) throw new Error("fal request id missing");
  const mode = modeOf(job.templateId);
  const client = getH3Client(userKey);
  const s = await client.status(job.falRequestId, mode);
  if (s.status === "IN_QUEUE") {
    // 아직 fal 큐에 있으면 10분 타임아웃을 적용한다 (진행 중인 생성은 끊지 않는다).
    if (job.startedAt && Date.now() - job.startedAt > JOB_TIMEOUT_MS) {
      await client.cancel(job.falRequestId, mode);
      throw new Error("생성 시간이 10분을 넘어 중단했습니다.");
    }
    await setStatus(job.id, { queuePosition: s.queuePosition ?? null });
    return;
  }
  if (s.status === "IN_PROGRESS") {
    await setStatus(job.id, { queuePosition: null });
    return;
  }
  if (!(await claim(job.id, "running", "downloading", { queuePosition: null }))) return;
  await finishJob({ ...job, status: "downloading" }, userKey);
}

/** 완료된 fal 요청의 결과를 가져와 저장한다. 중간에 끊겨도 같은 지점부터 다시 할 수 있다. */
async function finishJob(job: Job, userKey: string) {
  if (!job.falRequestId) throw new Error("fal request id missing");
  const out = await getH3Client(userKey).result(job.falRequestId, modeOf(job.templateId));
  const resultKey = await saveResult(job.id, out.video?.url ?? "");
  await setStatus(job.id, {
    status: "succeeded",
    resultKey,
    expandedPrompt: out.expanded_prompt ?? null,
    falSeed: typeof out.seed === "number" ? out.seed : null,
    finishedAt: Date.now(),
  });
}

/**
 * 결과 영상을 어디에 둘지 정한다.
 * 로컬에서는 내려받아 storage/results 에 보관하고, Cloudflare 에서는 fal 의 URL 을 그대로 저장한다
 * (R2 가 없어 보관할 곳이 없다 — fal URL 은 영구 보장이 아니라는 점을 UI 에 알린다).
 */
async function saveResult(jobId: string, url: string): Promise<string | null> {
  if (!url) return null;
  // 보관할 저장소가 없으면(R2 미활성 Cloudflare) fal URL 을 그대로 남긴다 — 영구 보관은 아니다.
  if (!hasStorage()) return url;

  const key = `results/${jobId}.mp4`;
  let data: Uint8Array;
  if (url.startsWith("/") && hasFileSystem()) {
    const fs = (await import("node:fs")).default;
    const path = (await import("node:path")).default;
    const abs = path.resolve(process.cwd(), "public", url.replace(/^\//, ""));
    if (!fs.existsSync(abs)) return null;
    data = await fs.promises.readFile(abs);
  } else {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`결과 다운로드 실패 (${res.status})`);
    data = new Uint8Array(await res.arrayBuffer());
  }
  await getStorage().put(key, data, "video/mp4");
  return key;
}

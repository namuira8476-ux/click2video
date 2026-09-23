import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Job, JobInputs } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { getH3Client } from "@/lib/h3";
import { clampDuration, isDuration, isRatio, isResolution, type PromptExpansion, type Ratio, type Resolution } from "@/lib/h3/limits";
import { newId } from "@/lib/ids";
import { estimateFromAssets, toCredits, type Estimate } from "@/lib/pricing/estimate";
import { getTemplate, hydrateTemplate } from "@/lib/templates/loader";
import { renderPrompt } from "@/lib/templates/prompt-renderer";
import type { Template } from "@/lib/templates/schema";
import { validateInputs } from "@/lib/templates/validate-inputs";
import { ResolveError, resolveAssets } from "./resolve-assets";

export class JobError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors: string[] = [message],
  ) {
    super(message);
  }
}

export type GenerationParams = {
  resolution?: unknown;
  duration?: unknown;
  ratio?: unknown;
  promptExpansion?: unknown;
};

export type CreateJobRequest = {
  templateId: string;
  slots: Record<string, string>;
  options: Record<string, string | boolean>;
  consent: boolean;
} & GenerationParams;

const RATIO_VALUE: Record<Exclude<Ratio, "adaptive">, number> = { "21:9": 21 / 9, "16:9": 16 / 9, "4:3": 4 / 3, "1:1": 1, "3:4": 3 / 4, "9:16": 9 / 16 };

/**
 * "adaptive" 는 fal 이 알아서 고르는데, 세로 영상을 넣어도 16:9 로 나오는 경우가 있다 (e2e 검증에서 확인).
 * 입력 영상(없으면 첫 사용자 이미지)의 비율에 가장 가까운 허용 비율로 바꿔 "그대로 가져와서 돌리기"가 되게 한다.
 */
export function pickRatioFromAssets(t: Template, assets: { kind: string; source: string; width?: number; height?: number }[]): Ratio {
  const lead = assets.find((a) => a.kind === "video" && a.width && a.height) ?? assets.find((a) => a.kind === "image" && a.source !== "generated" && a.width && a.height);
  if (!lead?.width || !lead.height) return "adaptive";
  const target = lead.width / lead.height;
  const candidates = t.allow.ratios.filter((r): r is Exclude<Ratio, "adaptive"> => r !== "adaptive");
  if (candidates.length === 0) return "adaptive";
  return candidates.reduce((best, r) => (Math.abs(Math.log(RATIO_VALUE[r] / target)) < Math.abs(Math.log(RATIO_VALUE[best] / target)) ? r : best));
}

function resolveGeneration(t: Template, p: GenerationParams, clipSeconds?: number, assets: { kind: string; source: string; width?: number; height?: number }[] = []) {
  const resolution: Resolution = isResolution(p.resolution) ? p.resolution : t.defaults.resolution;
  let ratio: Ratio = isRatio(p.ratio) ? p.ratio : t.defaults.ratio;
  if (ratio === "adaptive") ratio = pickRatioFromAssets(t, assets);
  let duration: number;
  if (isDuration(p.duration)) duration = p.duration;
  else if (t.defaults.duration === "clip") duration = clampDuration(clipSeconds ?? 5);
  else duration = t.defaults.duration;
  const promptExpansion: PromptExpansion = p.promptExpansion === "quality" ? "quality" : getEnv().promptExpansion;
  return { resolution, ratio, duration, promptExpansion };
}

export function normalizeOptions(t: Template, raw: Record<string, unknown> | undefined): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const o of t.options) {
    const v = raw?.[o.key];
    if (o.type === "toggle") out[o.key] = typeof v === "boolean" ? v : o.default;
    else if (o.type === "select") out[o.key] = typeof v === "string" && v !== "" ? v : o.default;
    else out[o.key] = typeof v === "string" ? v : "";
  }
  // showWhen 조건이 맞지 않아 UI 에서 숨겨진 옵션은 프롬프트에 새지 않게 비운다
  // (예: 배경 교체에서 '직접 입력'을 썼다가 프리셋으로 되돌리면 customText 가 프리셋을 덮어쓰던 문제)
  for (const o of t.options) {
    if (o.type !== "text" || !o.showWhen) continue;
    if (out[o.showWhen.key] !== o.showWhen.equals) out[o.key] = "";
  }
  return out;
}

export type PreparedJob = {
  template: Template;
  inputs: JobInputs;
  gen: ReturnType<typeof resolveGeneration>;
  estimate: Estimate;
  credits: number;
  prompt: string;
  errors: string[];
};

/** 검증 + 견적 + 프롬프트 렌더링. 생성 전 미리보기(/api/estimate)와 생성(createJob)이 공유한다. */
export async function prepareJob(req: CreateJobRequest, userId: string): Promise<PreparedJob> {
  const base = getTemplate(req.templateId);
  if (!base) throw new JobError(404, "템플릿을 찾을 수 없습니다.");
  const template = hydrateTemplate(base);
  const inputs: JobInputs = {
    slots: Object.fromEntries(Object.entries(req.slots ?? {}).filter(([, v]) => typeof v === "string" && v !== "")) as Record<string, string>,
    options: normalizeOptions(template, req.options),
    consent: Boolean(req.consent),
  };

  let assets;
  try {
    assets = await resolveAssets(template, inputs, userId);
  } catch (e) {
    if (e instanceof ResolveError) throw new JobError(400, e.message);
    throw e;
  }

  const firstVideo = assets.find((a) => a.kind === "video");
  const gen = resolveGeneration(template, req, firstVideo?.durationSec, assets);
  const estimate = estimateFromAssets({ resolution: gen.resolution, duration: gen.duration }, assets);
  const credits = toCredits(estimate.totalUsd);

  const user = await getDb().select().from(schema.users).where(eq(schema.users.id, userId)).get();
  const unlimited = getEnv().unlimitedCredits;
  const errors = validateInputs(template, {
    assets,
    options: inputs.options,
    consent: inputs.consent,
    resolution: gen.resolution,
    duration: gen.duration,
    ratio: gen.ratio,
    credits: { balance: unlimited ? Number.POSITIVE_INFINITY : (user?.credits ?? 0), cost: credits },
  });

  let prompt = "";
  if (errors.length === 0) {
    try {
      prompt = renderPrompt(template, { assets, options: inputs.options, duration: gen.duration }).prompt;
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  return { template, inputs, gen, estimate, credits, prompt, errors };
}

export async function createJob(req: CreateJobRequest, userId: string): Promise<Job> {
  const p = await prepareJob(req, userId);
  if (p.errors.length) throw new JobError(400, p.errors[0], p.errors);

  const db = getDb();
  const now = Date.now();
  const id = newId("job");
  const unlimited = getEnv().unlimitedCredits;
  // D1 에는 대화형 트랜잭션이 없어 순차 실행한다. 게스트 1인 데모라 경합이 없고,
  // 배포 환경은 UNLIMITED_CREDITS=1 이라 차감 자체를 하지 않는다.
  const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user) throw new JobError(400, "사용자를 찾을 수 없습니다.");
  if (!unlimited) {
    if (user.credits < p.credits) throw new JobError(400, "크레딧이 부족합니다.");
    await db.update(schema.users).set({ credits: user.credits - p.credits }).where(eq(schema.users.id, userId)).run();
  }
  await db
    .insert(schema.jobs)
    .values({
      id,
      userId,
      templateId: p.template.id,
      status: "queued",
      inputs: p.inputs,
      renderedPrompt: p.prompt,
      resolution: p.gen.resolution,
      duration: p.gen.duration,
      ratio: p.gen.ratio,
      promptExpansion: p.gen.promptExpansion,
      estimatedCredits: p.credits,
      chargedCredits: unlimited ? 0 : p.credits,
      refunded: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  const job = (await db.select().from(schema.jobs).where(eq(schema.jobs.id, id)).get())!;
  return job;
}

/** 소유자까지 맞아야 돌려준다. id 만으로 조회하면 job id 하나로 남의 프롬프트·업로드·결과가 나간다. */
export async function getJob(id: string, userId: string): Promise<Job | undefined> {
  return await getDb()
    .select()
    .from(schema.jobs)
    .where(and(eq(schema.jobs.id, id), eq(schema.jobs.userId, userId)))
    .get();
}

export async function listJobs(userId: string, limit = 100): Promise<Job[]> {
  return await getDb().select().from(schema.jobs).where(eq(schema.jobs.userId, userId)).orderBy(desc(schema.jobs.createdAt)).limit(limit).all();
}

export async function getCredits(userId: string): Promise<number> {
  const u = await getDb().select().from(schema.users).where(eq(schema.users.id, userId)).get();
  return u?.credits ?? 0;
}

/** 실패·취소 시 전액 환불(멱등). D1 에 대화형 트랜잭션이 없어 순차 실행한다 — refunded 플래그가 멱등성을 보장한다. */
export async function refundJob(jobId: string) {
  const db = getDb();
  const job = await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId)).get();
  if (!job || job.refunded || job.chargedCredits <= 0) return;
  const user = await db.select().from(schema.users).where(eq(schema.users.id, job.userId)).get();
  if (user) await db.update(schema.users).set({ credits: user.credits + job.chargedCredits }).where(eq(schema.users.id, user.id)).run();
  await db.update(schema.jobs).set({ refunded: true, chargedCredits: 0, updatedAt: Date.now() }).where(eq(schema.jobs.id, jobId)).run();
}

export async function cancelJob(jobId: string, userId: string, userKey: string): Promise<Job> {
  const job = await getJob(jobId, userId);
  if (!job) throw new JobError(404, "작업을 찾을 수 없습니다.");
  if (["succeeded", "failed", "cancelled"].includes(job.status)) return job;
  // 키 없이 부르면 fal 원격 취소가 401 로 조용히 삼켜져(UI 는 취소인데 생성은 계속 돌아 과금된다) 키를 반드시 넘긴다.
  if (job.falRequestId) await getH3Client(userKey).cancel(job.falRequestId, getTemplate(job.templateId)?.mode ?? "reference");
  const now = Date.now();
  await getDb().update(schema.jobs).set({ status: "cancelled", finishedAt: now, updatedAt: now }).where(eq(schema.jobs.id, jobId)).run();
  await refundJob(jobId);
  return (await getJob(jobId, userId))!;
}

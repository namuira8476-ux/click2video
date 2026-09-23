import type { Job } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { getStorage, hasStorage } from "@/lib/storage";
import { getTemplate } from "@/lib/templates/loader";
import { resolveAssets, publicUrlFor } from "./resolve-assets";

export type PublicJob = {
  id: string;
  templateId: string;
  templateName: string;
  status: Job["status"];
  resolution: string;
  duration: number;
  ratio: string;
  promptExpansion: string;
  estimatedCredits: number;
  /** 크레딧에서 되돌린 예상 요금(USD). BYOK 에서는 이 금액이 사용자의 fal 계정에 청구된다. */
  estimatedUsd: number;
  chargedCredits: number;
  refunded: boolean;
  queuePosition: number | null;
  errorMessage: string | null;
  resultUrl: string | null;
  posterUrl: string | null;
  renderedPrompt: string;
  expandedPrompt: string | null;
  requestSnapshot: Record<string, unknown> | null;
  inputs: Job["inputs"];
  mock: boolean;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
};

export async function serializeJob(job: Job, opts: { withPoster?: boolean; mock?: boolean } = {}): Promise<PublicJob> {
  const t = getTemplate(job.templateId);
  let posterUrl: string | null = null;
  if (opts.withPoster && t) {
    try {
      const assets = await resolveAssets(t, job.inputs, job.userId);
      const first = assets.find((a) => a.kind === "image");
      posterUrl = first ? await publicUrlFor(first) : null;
    } catch {
      posterUrl = null;
    }
  }
  return {
    id: job.id,
    templateId: job.templateId,
    templateName: t?.name ?? job.templateId,
    status: job.status,
    resolution: job.resolution,
    duration: job.duration,
    ratio: job.ratio,
    promptExpansion: job.promptExpansion,
    estimatedCredits: job.estimatedCredits,
    // credits = ceil(usd * 100 * markup) 이라 되돌릴 때 최대 1센트 오차가 있다 (표시용).
    estimatedUsd: job.estimatedCredits / (100 * Math.max(1, getEnv().creditMarkup)),
    chargedCredits: job.chargedCredits,
    refunded: job.refunded,
    queuePosition: job.queuePosition ?? null,
    errorMessage: job.errorMessage ?? null,
    resultUrl: job.resultKey ? (/^https?:\/\//.test(job.resultKey) || !hasStorage() ? job.resultKey : getStorage().publicUrl(job.resultKey)) : null,
    posterUrl,
    renderedPrompt: job.renderedPrompt,
    expandedPrompt: job.expandedPrompt ?? null,
    requestSnapshot: job.requestSnapshot ?? null,
    inputs: job.inputs,
    mock: opts.mock ?? false,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt ?? null,
    finishedAt: job.finishedAt ?? null,
  };
}

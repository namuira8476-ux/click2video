import { H3MAX, type Resolution } from "@/lib/h3/limits";
import type { ResolvedAsset } from "@/lib/templates/prompt-renderer";
import { getEnv } from "@/lib/env";

export type PriceList = { outputPerSec: Record<Resolution, number> };

export type EstimateInput = {
  resolution: Resolution;
  duration: number;
  images: { w: number; h: number }[];
  videoSeconds: number[];
  audioSeconds: number[];
};

export type Estimate = {
  outputUsd: number;
  refTokens: number;
  refUsd: number;
  totalUsd: number;
};

export function currentPriceList(): PriceList {
  const env = getEnv();
  return { outputPerSec: { "480P": env.priceOutput480P, "768P": env.priceOutput768P } };
}

/** fal H3-Max 요금 계산. docs/제안서.md §10 */
export function estimateUsd(i: EstimateInput, prices: PriceList = currentPriceList()): Estimate {
  const p = H3MAX.pricing;
  const outputUsd = prices.outputPerSec[i.resolution] * i.duration;
  const tokens =
    i.images.reduce((s, im) => s + p.imageTokens(im.w, im.h), 0) +
    i.videoSeconds.reduce((s, sec) => s + Math.ceil(sec) * p.videoTokensPerSec[i.resolution], 0) +
    i.audioSeconds.reduce((s, sec) => s + Math.ceil(sec) * p.audioTokensPerSec, 0);
  const refTokens = Math.max(0, tokens - p.freeRefTokens);
  const refUsd = (refTokens / 1000) * p.usdPer1kRefTokens;
  return { outputUsd, refTokens, refUsd, totalUsd: outputUsd + refUsd };
}

export function toCredits(usd: number, markup: number = getEnv().creditMarkup): number {
  return Math.max(0, Math.ceil(usd * 100 * markup - 1e-9));
}

export function estimateFromAssets(
  gen: { resolution: Resolution; duration: number },
  assets: ResolvedAsset[],
  prices: PriceList = currentPriceList(),
): Estimate {
  const images = assets
    .filter((a) => a.kind === "image")
    .map((a) => ({ w: a.width ?? 1024, h: a.height ?? 1024 }));
  const videoSeconds = assets.filter((a) => a.kind === "video").map((a) => a.durationSec ?? gen.duration);
  const audioSeconds = assets.filter((a) => a.kind === "audio").map((a) => a.durationSec ?? 5);
  return estimateUsd({ ...gen, images, videoSeconds, audioSeconds }, prices);
}

/**
 * fal.ai `minimax/h3-max/*` 확정 스펙. docs/제안서.md §3 (2026-09-03 검증).
 */
export const H3MAX = {
  endpoint: {
    reference: "minimax/h3-max/reference-to-video",
    image: "minimax/h3-max/image-to-video",
    text: "minimax/h3-max/text-to-video",
  },
  sampleImageModel: "fal-ai/gpt-image-2",
  durations: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const,
  resolutions: ["480P", "768P"] as const,
  ratios: ["adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"] as const,
  promptExpansion: ["balanced", "quality"] as const,
  promptMaxChars: 7000,
  image: {
    formats: ["jpg", "jpeg", "png", "webp", "heic", "heif"],
    mimes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
    maxBytes: 30 * 1024 * 1024,
    minPx: 256,
    maxPx: 5760,
    aspectMin: 0.4,
    aspectMax: 2.5,
    maxCount: 9,
  },
  video: {
    formats: ["mp4", "mov"],
    mimes: ["video/mp4", "video/quicktime"],
    maxBytes: 50 * 1024 * 1024,
    minSec: 2,
    maxSec: 15,
    totalMaxSec: 15,
    maxCount: 3,
    minPx: 256,
    maxPx: 5760,
    aspectMin: 0.4,
    aspectMax: 2.5,
  },
  audio: {
    formats: ["wav", "mp3"],
    mimes: ["audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3"],
    maxBytes: 15 * 1024 * 1024,
    minSec: 2,
    maxSec: 15,
    totalMaxSec: 15,
    maxCount: 3,
  },
  maxTotalFiles: 12,
  /** 3MB 이하 이미지는 업로드 대신 data URI로 전달 */
  inlineImageMaxBytes: 3 * 1024 * 1024,
  pricing: {
    freeRefTokens: 4096,
    usdPer1kRefTokens: 0.02,
    imageTokens: (w: number, h: number) => Math.ceil((w * h) / 1024),
    videoTokensPerSec: { "480P": 2886, "768P": 7459 } as const,
    audioTokensPerSec: 80,
  },
} as const;

export type Resolution = (typeof H3MAX.resolutions)[number];
export type Ratio = (typeof H3MAX.ratios)[number];
export type Duration = (typeof H3MAX.durations)[number];
export type PromptExpansion = (typeof H3MAX.promptExpansion)[number];
export type MediaKind = "image" | "video" | "audio";

export function isResolution(v: unknown): v is Resolution {
  return typeof v === "string" && (H3MAX.resolutions as readonly string[]).includes(v);
}
export function isRatio(v: unknown): v is Ratio {
  return typeof v === "string" && (H3MAX.ratios as readonly string[]).includes(v);
}
export function isDuration(v: unknown): v is Duration {
  return typeof v === "number" && (H3MAX.durations as readonly number[]).includes(v);
}

/** 입력 클립 길이를 허용 길이(5~15초 정수)로 맞춘다. */
export function clampDuration(sec: number): Duration {
  const r = Math.round(sec);
  const min = H3MAX.durations[0];
  const max = H3MAX.durations[H3MAX.durations.length - 1];
  return Math.min(max, Math.max(min, r)) as Duration;
}

export function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function kindFromMime(mime: string, filename = ""): MediaKind | null {
  const m = mime.toLowerCase();
  const ext = extensionOf(filename);
  if (m.startsWith("image/") || (H3MAX.image.formats as readonly string[]).includes(ext)) return "image";
  if (m.startsWith("video/") || (H3MAX.video.formats as readonly string[]).includes(ext)) return "video";
  if (m.startsWith("audio/") || (H3MAX.audio.formats as readonly string[]).includes(ext)) return "audio";
  return null;
}

import type { Template } from "@/lib/templates/schema";
import type { ResolvedAsset } from "@/lib/templates/prompt-renderer";

/** 패션 캠페인과 비슷한 구조: 필수 이미지 2, 선택 이미지 1, 옵션 고정 이미지 1 */
export const fashionLike: Template = {
  id: "fashion-like",
  name: "테스트 패션",
  tagline: "테스트",
  category: "commerce",
  mode: "reference",
  defaults: { resolution: "768P", duration: 10, ratio: "16:9" },
  allow: { resolutions: ["480P", "768P"], durations: [5, 8, 10, 12, 15], ratios: ["16:9", "9:16"] },
  slots: [
    { key: "talent", kind: "image", label: "모델", source: "user", required: true },
    { key: "product", kind: "image", label: "제품", source: "user", required: true },
    { key: "logo", kind: "image", label: "로고", source: "user", required: false },
    { key: "mood", kind: "image", label: "무드", source: "option", required: true, optionKey: "mood" },
  ],
  options: [
    {
      key: "mood",
      type: "select",
      label: "무드",
      values: [
        { value: "desert", label: "사막", prompt: "a desert highway", refId: "mood-desert" },
        { value: "studio", label: "스튜디오", prompt: "a white studio", refId: "mood-studio" },
      ],
      default: "desert",
    },
    { key: "extra", type: "text", label: "추가 요청", maxLen: 200 },
  ],
  prompt:
    "{{ref.mood}} sets the mood. {{ref.talent}} is the talent. {{ref.product}} is the product.{{#slots.logo}} {{ref.logo}} is the logo.{{/slots.logo}}\nSet in {{opt.mood.prompt}} for {{duration}} seconds.\n{{#opt.extra}}Additional user request (lower priority than everything above): \"{{opt.extra}}\"{{/opt.extra}}",
  negative: "No text.",
  requiresConsent: true,
  sampleInputs: { talent: "/samples/x/talent.png", product: "/samples/x/product.png" },
  badges: ["📷4"],
};

/** 영상 + 오디오 템플릿 */
export const dubLike: Template = {
  id: "dub-like",
  name: "테스트 더빙",
  tagline: "테스트",
  category: "edit",
  mode: "reference",
  defaults: { resolution: "768P", duration: "clip", ratio: "adaptive" },
  allow: { resolutions: ["480P", "768P"], durations: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], ratios: ["adaptive"] },
  slots: [
    { key: "clip", kind: "video", label: "영상", source: "user", required: true },
    { key: "voice", kind: "audio", label: "목소리", source: "user", required: true },
  ],
  options: [{ key: "line", type: "text", label: "대사", maxLen: 200, required: true }],
  prompt: "{{ref.clip}} is the video. {{ref.voice}} is the voice. Line: \"{{opt.line}}\"",
  requiresConsent: true,
  sampleInputs: {},
  badges: ["🎬1", "🎤"],
};

export const img = (slotKey: string, extra: Partial<ResolvedAsset> = {}): ResolvedAsset => ({
  slotKey,
  kind: "image",
  source: "user",
  bytes: 100_000,
  width: 1024,
  height: 1024,
  mime: "image/png",
  filename: `${slotKey}.png`,
  ...extra,
});

export const vid = (slotKey: string, durationSec: number, extra: Partial<ResolvedAsset> = {}): ResolvedAsset => ({
  slotKey,
  kind: "video",
  source: "user",
  bytes: 5_000_000,
  width: 1080,
  height: 1920,
  durationSec,
  mime: "video/mp4",
  filename: `${slotKey}.mp4`,
  ...extra,
});

export const aud = (slotKey: string, durationSec: number, extra: Partial<ResolvedAsset> = {}): ResolvedAsset => ({
  slotKey,
  kind: "audio",
  source: "user",
  bytes: 300_000,
  durationSec,
  mime: "audio/wav",
  filename: `${slotKey}.wav`,
  ...extra,
});

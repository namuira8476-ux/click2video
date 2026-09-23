import { H3MAX, extensionOf, type Ratio, type Resolution } from "@/lib/h3/limits";
import type { ResolvedAsset } from "./prompt-renderer";
import { sanitizeExtra } from "./prompt-renderer";
import type { Template } from "./schema";

export type ValidateInput = {
  assets: ResolvedAsset[];
  options: Record<string, string | boolean>;
  consent: boolean;
  resolution: Resolution;
  duration: number;
  ratio: Ratio;
  credits?: { balance: number; cost: number };
};

const KIND_LABEL = { image: "이미지", video: "영상", audio: "오디오" } as const;

function mb(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

/** 제안서 §9. 문제 없으면 빈 배열. */
export function validateInputs(t: Template, input: ValidateInput): string[] {
  const errors: string[] = [];
  const byKey = new Map(input.assets.map((a) => [a.slotKey, a]));

  // 1. 필수 슬롯 (+ 업로드 또는 프리셋 중 하나)
  for (const slot of t.slots) {
    if (slot.skipIfSlot && byKey.has(slot.skipIfSlot)) continue;
    if (slot.required && !byKey.has(slot.key)) {
      if (slot.source === "textImage") {
        const opt = t.options.find((o) => o.key === slot.optionKey);
        errors.push(`'${opt?.label ?? slot.label}'을(를) 입력해 주세요.`);
      } else errors.push(`'${slot.label}' 슬롯에 ${KIND_LABEL[slot.kind]}를 넣어 주세요.`);
    }
  }
  for (const group of t.oneOf ?? []) {
    if (!group.some((k) => byKey.has(k))) {
      const labels = group.map((k) => t.slots.find((s) => s.key === k)?.label ?? k).join(" 또는 ");
      errors.push(`${labels} 중 하나는 필요합니다.`);
    }
  }

  // 2~4. 파일별 한도
  for (const a of input.assets) {
    const slot = t.slots.find((s) => s.key === a.slotKey);
    const label = slot?.label ?? a.slotKey;
    if (slot && slot.kind !== a.kind) {
      errors.push(`'${label}' 슬롯에는 ${KIND_LABEL[slot.kind]}만 넣을 수 있습니다.`);
      continue;
    }
    const lim = H3MAX[a.kind];
    const ext = extensionOf(a.filename);
    const formatOk =
      (lim.formats as readonly string[]).includes(ext) || (lim.mimes as readonly string[]).includes(a.mime.toLowerCase());
    if (!formatOk) errors.push(`'${label}': 지원하지 않는 형식입니다. (${lim.formats.join(", ")})`);
    if (a.bytes > lim.maxBytes) errors.push(`'${label}': 파일이 너무 큽니다. 최대 ${mb(lim.maxBytes)}`);
    if (a.kind === "image" || a.kind === "video") {
      const l = H3MAX[a.kind];
      if (a.width && a.height) {
        if (a.width < l.minPx || a.height < l.minPx || a.width > l.maxPx || a.height > l.maxPx) {
          errors.push(`'${label}': 가로세로는 ${l.minPx}~${l.maxPx}px 사이여야 합니다. (현재 ${a.width}×${a.height})`);
        }
        const ar = a.width / a.height;
        if (ar < l.aspectMin || ar > l.aspectMax) errors.push(`'${label}': 화면 비율이 너무 극단적입니다. (0.4~2.5 허용)`);
      }
    }
    if (a.kind === "video" || a.kind === "audio") {
      const l = H3MAX[a.kind];
      if (a.durationSec !== undefined) {
        if (a.durationSec < l.minSec) errors.push(`'${label}': ${KIND_LABEL[a.kind]}은 최소 ${l.minSec}초 이상이어야 합니다.`);
        if (a.durationSec > l.maxSec) errors.push(`'${label}': ${KIND_LABEL[a.kind]}은 최대 ${l.maxSec}초까지 가능합니다.`);
      }
    }
  }

  // 4~6. 합계
  const images = input.assets.filter((a) => a.kind === "image");
  const videos = input.assets.filter((a) => a.kind === "video");
  const audios = input.assets.filter((a) => a.kind === "audio");
  const vsum = videos.reduce((s, a) => s + (a.durationSec ?? 0), 0);
  const asum = audios.reduce((s, a) => s + (a.durationSec ?? 0), 0);
  if (vsum > H3MAX.video.totalMaxSec) errors.push(`레퍼런스 영상 길이 합계가 ${H3MAX.video.totalMaxSec}초를 넘습니다. (${Math.round(vsum)}초)`);
  if (asum > H3MAX.audio.totalMaxSec) errors.push(`오디오 길이 합계가 ${H3MAX.audio.totalMaxSec}초를 넘습니다. (${Math.round(asum)}초)`);
  if (images.length > H3MAX.image.maxCount) errors.push(`이미지는 최대 ${H3MAX.image.maxCount}장까지 가능합니다.`);
  if (videos.length > H3MAX.video.maxCount) errors.push(`영상은 최대 ${H3MAX.video.maxCount}개까지 가능합니다.`);
  if (audios.length > H3MAX.audio.maxCount) errors.push(`오디오는 최대 ${H3MAX.audio.maxCount}개까지 가능합니다.`);
  if (input.assets.length > H3MAX.maxTotalFiles) errors.push(`파일은 합계 ${H3MAX.maxTotalFiles}개까지 가능합니다.`);
  if (audios.length > 0 && images.length === 0 && videos.length === 0) {
    errors.push("오디오만 단독으로 넣을 수 없습니다. 이미지나 영상을 함께 넣어 주세요.");
  }

  // 7~8. 생성 옵션
  if (!t.allow.durations.includes(input.duration)) errors.push(`길이 ${input.duration}초는 이 템플릿에서 선택할 수 없습니다.`);
  if (!t.allow.resolutions.includes(input.resolution)) errors.push(`해상도 ${input.resolution}은 이 템플릿에서 선택할 수 없습니다.`);
  if (!t.allow.ratios.includes(input.ratio)) errors.push(`화면비 ${input.ratio}은 이 템플릿에서 선택할 수 없습니다.`);

  // 9. 동의
  if (t.requiresConsent && !input.consent) errors.push("인물·음성 사용 동의에 체크해 주세요.");

  // 10. 텍스트 옵션
  for (const opt of t.options) {
    if (opt.type !== "text") continue;
    if (opt.showWhen) {
      const dep = input.options[opt.showWhen.key];
      const depDefault = t.options.find((o) => o.key === opt.showWhen!.key);
      const depValue = typeof dep === "string" && dep !== "" ? dep : depDefault?.type === "select" ? depDefault.default : "";
      if (depValue !== opt.showWhen.equals) continue;
    }
    const raw = input.options[opt.key];
    const text = typeof raw === "string" ? raw : "";
    const boundToImage = t.slots.some((s) => s.source === "textImage" && s.optionKey === opt.key);
    if (opt.required && text.trim() === "" && !boundToImage) errors.push(`'${opt.label}'을(를) 입력해 주세요.`);
    if (text.length > opt.maxLen) errors.push(`'${opt.label}'은(는) ${opt.maxLen}자 이내로 입력해 주세요.`);
    if (text.trim() !== "") {
      const r = sanitizeExtra(text, opt.maxLen);
      if (!r.ok) errors.push(`'${opt.label}': ${r.reason}`);
    }
  }
  for (const opt of t.options) {
    if (opt.type !== "select" || opt.dynamic) continue;
    const raw = input.options[opt.key];
    if (typeof raw === "string" && raw !== "" && !opt.values.some((v) => v.value === raw)) {
      errors.push(`'${opt.label}' 값이 올바르지 않습니다.`);
    }
  }

  // 11. 크레딧
  if (input.credits && input.credits.balance < input.credits.cost) {
    errors.push(`크레딧이 부족합니다. 필요 ${input.credits.cost}, 보유 ${input.credits.balance}`);
  }

  return errors;
}

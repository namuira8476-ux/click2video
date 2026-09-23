import Mustache from "mustache";
import type { MediaKind } from "@/lib/h3/limits";
import { H3MAX } from "@/lib/h3/limits";
import type { SelectOption, Template } from "./schema";

/** 슬롯에 실제로 바인딩된 자산(사용자 업로드·샘플·고정 자산 공통 표현) */
export type ResolvedAsset = {
  slotKey: string;
  kind: MediaKind;
  source: "user" | "sample" | "ref" | "generated";
  bytes: number;
  mime: string;
  filename: string;
  width?: number;
  height?: number;
  durationSec?: number;
  /** fal 에 넘길 최종 URL(공개 URL 또는 data URI). 제출 직전에 채워진다 */
  url?: string;
  /** 로컬 파일 위치(업로드 대상). Cloudflare 에는 없다 */
  localPath?: string;
  /** public/ 아래 사이트 상대 경로 (정적 자산). fal 에는 절대 URL 로 바꿔 넘긴다 */
  publicPath?: string;
  /** 저장소 키 (로컬 fs 또는 R2). 로컬 파일이 없을 때 여기서 바이트를 읽어 fal 로 올린다 */
  storageKey?: string;
  assetId?: string;
};

export type RefOrder = { image: string[]; video: string[]; audio: string[] };

const LABEL: Record<MediaKind, string> = { image: "Image", video: "Video", audio: "Audio" };

/**
 * 슬롯 정의 순서대로, 실제 존재하는 자산에만 타입별 번호를 부여한다.
 * refs: slotKey → "Image 2" / order: 타입별 slotKey 배열(= fal 배열 순서)
 */
export function assignRefs(template: Template, assets: ResolvedAsset[]): { refs: Record<string, string>; order: RefOrder } {
  const byKey = new Map(assets.map((a) => [a.slotKey, a]));
  const counters: Record<MediaKind, number> = { image: 0, video: 0, audio: 0 };
  const refs: Record<string, string> = {};
  const order: RefOrder = { image: [], video: [], audio: [] };
  for (const slot of template.slots) {
    const a = byKey.get(slot.key);
    if (!a) continue;
    counters[slot.kind] += 1;
    refs[slot.key] = `${LABEL[slot.kind]} ${counters[slot.kind]}`;
    order[slot.kind].push(slot.key);
  }
  for (const [alias, keys] of Object.entries(template.refAliases ?? {})) {
    const first = keys.find((k) => refs[k]);
    if (first) refs[alias] = refs[first];
  }
  return { refs, order };
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)/i,
  /system\s*prompt/i,
  /\binstruction(s)?\b/i,
  /프롬프트\s*무시/,
  /이전\s*지시/,
  /지시\s*무시/,
];

export type SanitizeResult = { ok: true; text: string } | { ok: false; reason: string };

/** 자유 텍스트 옵션 정제. 제안서 §8.2 */
export function sanitizeExtra(raw: string, maxLen = 200): SanitizeResult {
  const text = raw
    .replace(/[\r\n]+/g, " ")
    .replace(/[{}<>]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLen);
  if (INJECTION_PATTERNS.some((p) => p.test(text))) {
    return { ok: false, reason: "허용되지 않는 문구가 포함되어 있습니다." };
  }
  return { ok: true, text };
}

type OptView = Record<string, string | boolean | { prompt: string; value: string; toString(): string }>;

function buildOptionView(template: Template, options: Record<string, string | boolean>): OptView {
  const view: OptView = {};
  for (const opt of template.options) {
    const raw = options[opt.key];
    if (opt.type === "select") {
      const value = typeof raw === "string" && raw !== "" ? raw : opt.default;
      const chosen = (opt as SelectOption).values.find((v) => v.value === value);
      const prompt = chosen?.prompt ?? "";
      view[opt.key] = { value, prompt, toString: () => value };
    } else if (opt.type === "toggle") {
      const on = typeof raw === "boolean" ? raw : opt.default;
      view[opt.key] = on ? (opt.promptOn ?? "true") : (opt.promptOff ?? "");
      if (!on && !opt.promptOff) view[opt.key] = false;
    } else {
      const text = typeof raw === "string" ? raw.trim() : "";
      view[opt.key] = text; // 빈 문자열은 mustache 에서 falsy → 조건 블록 생략
    }
  }
  return view;
}

export type RenderContext = {
  assets: ResolvedAsset[];
  options: Record<string, string | boolean>;
  duration: number;
};

export function renderPrompt(template: Template, ctx: RenderContext): { prompt: string; refs: Record<string, string>; order: RefOrder } {
  const { refs, order } = assignRefs(template, ctx.assets);
  const slots: Record<string, boolean> = {};
  for (const s of template.slots) slots[s.key] = Boolean(refs[s.key]);

  const view = {
    ref: refs,
    slots,
    opt: buildOptionView(template, ctx.options),
    duration: ctx.duration,
  };

  // 이스케이프 비활성화: 프롬프트는 HTML이 아니다.
  let body = Mustache.render(template.prompt, view, {}, { escape: (v: unknown) => String(v) });
  if (template.negative) body = `${body.trim()}\n\n${template.negative.trim()}`;
  const prompt = body
    .split("\n")
    .map((l) => l.replace(/[ \t]{2,}/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (prompt.length > H3MAX.promptMaxChars) {
    throw new Error(`prompt too long: ${prompt.length} > ${H3MAX.promptMaxChars}`);
  }
  return { prompt, refs, order };
}

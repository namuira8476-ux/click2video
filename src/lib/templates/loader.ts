import fs from "node:fs";
import path from "node:path";
import { BUNDLED_PUBLIC_FILES, BUNDLED_TEMPLATES } from "@/generated/static-data";
import { hasFileSystem } from "@/lib/runtime";
import { dynamicSelectValues, getRefItem } from "@/lib/refs/manifest";
import { estimateUsd, toCredits } from "@/lib/pricing/estimate";
import { templateSchema, type SelectValue, type Template, type TemplateOption } from "./schema";

type Holder = { templates?: Template[] };
const g = globalThis as unknown as { __c2v_templates?: Holder };

export function templatesDir() {
  return path.resolve(process.cwd(), "templates");
}

/**
 * 템플릿 원본을 읽는다. 로컬에서는 `templates/*.json` 을 직접 읽어 편집이 바로 반영되고,
 * 파일 시스템이 없는 환경(Cloudflare Workers)에서는 빌드 시 인라인된 번들을 쓴다.
 */
function readTemplateSources(): Record<string, unknown> {
  if (!hasFileSystem()) return BUNDLED_TEMPLATES;
  const dir = templatesDir();
  if (!fs.existsSync(dir)) return BUNDLED_TEMPLATES;
  const out: Record<string, unknown> = {};
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    out[f] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  }
  return Object.keys(out).length > 0 ? out : BUNDLED_TEMPLATES;
}

/** 템플릿 정의를 전부 읽어 검증한다. 하나라도 틀리면 즉시 throw. */
export function loadTemplates(): Template[] {
  if (!g.__c2v_templates) g.__c2v_templates = {};
  if (g.__c2v_templates.templates && process.env.NODE_ENV === "production") return g.__c2v_templates.templates;

  const sources = readTemplateSources();
  const out: Template[] = [];
  const errors: string[] = [];
  for (const [f, raw] of Object.entries(sources)) {
    try {
      const parsed = templateSchema.safeParse(raw);
      if (!parsed.success) {
        errors.push(`${f}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
        continue;
      }
      if (parsed.data.id !== f.replace(/\.json$/, "")) errors.push(`${f}: id must equal filename`);
      out.push(parsed.data);
    } catch (e) {
      errors.push(`${f}: ${(e as Error).message}`);
    }
  }
  if (errors.length) throw new Error(`template definitions invalid:\n${errors.join("\n")}`);
  g.__c2v_templates.templates = out;
  return out;
}

export function getTemplate(id: string): Template | undefined {
  return loadTemplates().find((t) => t.id === id);
}

/* ---------- 클라이언트용 뷰 ---------- */

export type PublicSelectValue = SelectValue & { available?: boolean };
export type PublicOption =
  | (Omit<Extract<TemplateOption, { type: "select" }>, "values"> & { values: PublicSelectValue[] })
  | Extract<TemplateOption, { type: "text" }>
  | Extract<TemplateOption, { type: "toggle" }>;

export type PublicTemplate = Omit<Template, "prompt" | "negative" | "options"> & {
  options: PublicOption[];
  /** 고정 자산이 준비되지 않아 생성이 불가능하면 false */
  ready: boolean;
  readyReason?: string;
  /** 카드 썸네일/프리뷰 */
  thumbnail: string | null;
  preview: string | null;
  /** 기본 옵션 + 일반적인 입력 기준 예상 크레딧 */
  baseCredits: number;
};

function baseCredits(t: Template): number {
  const duration = t.defaults.duration === "clip" ? 10 : t.defaults.duration;
  const images = t.slots.filter((s) => s.kind === "image" && (s.required || s.source !== "user")).map(() => ({ w: 1024, h: 1024 }));
  const videoSeconds = t.slots.filter((s) => s.kind === "video").map(() => duration);
  const audioSeconds = t.slots.filter((s) => s.kind === "audio").map(() => 5);
  return toCredits(estimateUsd({ resolution: t.defaults.resolution, duration, images, videoSeconds, audioSeconds }).totalUsd);
}

/** 동적 select 를 manifest 값으로 채운 서버용 템플릿(프롬프트 포함) */
export function hydrateTemplate(t: Template): Template {
  const options = t.options.map((o) => {
    if (o.type !== "select" || !o.dynamic) return o;
    const values = dynamicSelectValues(o.dynamic).filter((v) => v.available);
    if (values.length === 0) return o;
    return {
      ...o,
      values: values.map((v) => ({
        value: v.value,
        label: v.label,
        prompt: v.prompt,
        refId: v.refId,
        durationSec: v.durationSec,
        previewUrl: v.previewUrl,
        kind: v.kind,
      })),
      default: values[0].value,
    };
  });
  return { ...t, options };
}

/** public/ 아래 파일 존재 확인. Workers 에는 fs 가 없어 빌드 시 만든 목록을 쓴다. */
function firstExisting(candidates: string[]): string | null {
  const useFs = hasFileSystem();
  for (const c of candidates) {
    if (useFs ? fs.existsSync(path.resolve(process.cwd(), "public", c.replace(/^\//, ""))) : BUNDLED_PUBLIC_FILES.has(c)) return c;
  }
  return null;
}

export function toPublicTemplate(t: Template): PublicTemplate {
  const h = hydrateTemplate(t);
  let ready = true;
  let readyReason: string | undefined;

  for (const slot of h.slots) {
    if (slot.source === "fixed" && slot.refId) {
      const item = getRefItem(slot.refId);
      if (!item?.available) {
        ready = false;
        readyReason = `고정 자산 '${slot.refId}' 준비 중`;
      }
    }
    if (slot.source === "option" && !slot.skipIfSlot) {
      const opt = h.options.find((o) => o.key === slot.optionKey);
      if (opt?.type === "select") {
        const usable = opt.values.filter((v) => (v.refId ? getRefItem(v.refId)?.available : true));
        if (usable.length === 0 || (opt.dynamic && opt.values[0]?.value === "__placeholder__")) {
          ready = false;
          readyReason = slot.kind === "video" ? "레퍼런스 영상 준비 중" : `'${slot.label}' 고정 자산 준비 중`;
        }
      }
    }
  }

  const options: PublicOption[] = h.options.map((o) => {
    if (o.type !== "select") return o;
    return {
      ...o,
      values: o.values.map((v) => {
        const item = v.refId ? getRefItem(v.refId) : undefined;
        return {
          ...v,
          available: v.refId ? Boolean(item?.available) : true,
          previewUrl: v.previewUrl ?? (item?.available ? item.publicUrl : undefined),
          kind: v.kind ?? item?.kind,
        };
      }),
    };
  });

  const firstImageSlot = h.slots.find((s) => s.kind === "image" && s.source === "user");
  const sampleThumb = firstImageSlot ? h.sampleInputs[firstImageSlot.key] : undefined;
  return {
    id: h.id,
    name: h.name,
    tagline: h.tagline,
    category: h.category,
    mode: h.mode,
    defaults: h.defaults,
    allow: h.allow,
    slots: h.slots,
    requiresConsent: h.requiresConsent,
    sampleInputs: h.sampleInputs,
    sampleOptions: h.sampleOptions,
    badges: h.badges,
    options,
    ready,
    readyReason,
    thumbnail: firstExisting([`/samples/${t.id}/thumb.png`, `/samples/${t.id}/thumb.svg`, sampleThumb ?? "", `/samples/${t.id}/preview.jpg`].filter(Boolean)),
    preview: firstExisting([`/samples/${t.id}/preview.mp4`]),
    baseCredits: baseCredits(t),
  };
}

import { z } from "zod";
import { H3MAX } from "@/lib/h3/limits";

export const ratioSchema = z.enum(H3MAX.ratios);
export const resolutionSchema = z.enum(H3MAX.resolutions);
export const durationSchema = z
  .number()
  .int()
  .refine((d) => (H3MAX.durations as readonly number[]).includes(d), "duration must be 5~15");

export const CATEGORIES = ["effects", "commerce", "edit", "smallbiz"] as const;
export const categorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof categorySchema>;
export const CATEGORY_LABEL: Record<Category, string> = {
  effects: "이펙트",
  commerce: "광고·커머스",
  edit: "편집",
  smallbiz: "소상공인 광고",
};

export const slotSchema = z.object({
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
  kind: z.enum(["image", "video", "audio"]),
  label: z.string().min(1),
  /** textImage: optionKey 의 텍스트 옵션(한국어 등)을 이미지로 렌더링해 레퍼런스로 넣는다 */
  source: z.enum(["user", "fixed", "option", "textImage"]),
  required: z.boolean(),
  refId: z.string().optional(),
  optionKey: z.string().optional(),
  hint: z.string().optional(),
  /** 이 슬롯(사용자 업로드)이 채워져 있으면 option 슬롯을 건너뛴다 */
  skipIfSlot: z.string().optional(),
  /** textImage 스타일: dark = 검정 배경 흰 글씨(기본), light = 흰 배경 검정 글씨 */
  textStyle: z.enum(["dark", "light"]).optional(),
});

export const selectValueSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  prompt: z.string().optional(),
  refId: z.string().optional(),
  durationSec: z.number().positive().optional(),
  /** 런타임에 채워지는 미리보기 URL (manifest 기반) */
  previewUrl: z.string().optional(),
  kind: z.enum(["image", "video", "audio"]).optional(),
});

export const optionSchema = z.discriminatedUnion("type", [
  z.object({
    key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
    type: z.literal("select"),
    label: z.string().min(1),
    values: z.array(selectValueSchema).min(1),
    default: z.string(),
    /** "dance" 처럼 지정하면 refs 매니페스트의 `dance-*` 항목으로 값 목록을 동적으로 채운다 */
    dynamic: z.string().optional(),
    /** 다른 select 옵션의 특정 값일 때만 표시 (예: background=custom) */
    showWhen: z.object({ key: z.string(), equals: z.string() }).optional(),
  }),
  z.object({
    key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
    type: z.literal("text"),
    label: z.string().min(1),
    maxLen: z.number().int().positive(),
    placeholder: z.string().optional(),
    required: z.boolean().optional(),
    showWhen: z.object({ key: z.string(), equals: z.string() }).optional(),
  }),
  z.object({
    key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
    type: z.literal("toggle"),
    label: z.string().min(1),
    default: z.boolean(),
    promptOn: z.string().optional(),
    promptOff: z.string().optional(),
  }),
]);

/**
 * 생성 모드.
 *  - reference: 이미지·영상·오디오를 레퍼런스로 넣는 기본 모드 (reference-to-video)
 *  - first-last: 이미지 1~2장을 시작·끝 프레임으로 잇는 모드 (image-to-video). 화면비는 첫 이미지를 따른다.
 */
export const modeSchema = z.enum(["reference", "first-last"]);
export type TemplateMode = z.infer<typeof modeSchema>;

export const templateSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    tagline: z.string().min(1),
    category: categorySchema,
    mode: modeSchema.default("reference"),
    defaults: z.object({
      resolution: resolutionSchema,
      duration: z.union([durationSchema, z.literal("clip")]),
      ratio: ratioSchema,
    }),
    allow: z.object({
      resolutions: z.array(resolutionSchema).min(1),
      durations: z.array(durationSchema).min(1),
      ratios: z.array(ratioSchema).min(1),
    }),
    slots: z.array(slotSchema).min(1),
    /** 각 그룹에서 최소 하나의 슬롯은 채워져야 한다 (예: 업로드 또는 프리셋) */
    oneOf: z.array(z.array(z.string()).min(1)).optional(),
    /** 프롬프트용 별칭: ref.<alias> = 목록 중 처음으로 존재하는 슬롯의 번호 */
    refAliases: z.record(z.string(), z.array(z.string()).min(1)).optional(),
    options: z.array(optionSchema),
    prompt: z.string().min(1),
    negative: z.string().optional(),
    requiresConsent: z.boolean(),
    sampleInputs: z.record(z.string(), z.string()),
    /** "샘플로 해보기" 가 채우는 옵션 값 (텍스트 옵션). 없으면 필수 텍스트만 placeholder 의 "예: …" 로 채운다 */
    sampleOptions: z.record(z.string(), z.string()).optional(),
    badges: z.array(z.enum(["📷1", "📷2", "📷4", "🎬1", "🎤", "✍️"])),
  })
  .superRefine((t, ctx) => {
    const slotKeys = new Set<string>();
    for (const s of t.slots) {
      if (slotKeys.has(s.key)) ctx.addIssue({ code: "custom", message: `duplicate slot key ${s.key}` });
      slotKeys.add(s.key);
      if (s.source === "fixed" && !s.refId)
        ctx.addIssue({ code: "custom", message: `slot ${s.key}: fixed slot needs refId` });
      if (s.source === "option" && !s.optionKey)
        ctx.addIssue({ code: "custom", message: `slot ${s.key}: option slot needs optionKey` });
      if (s.source === "option" && !t.options.some((o) => o.key === s.optionKey))
        ctx.addIssue({ code: "custom", message: `slot ${s.key}: optionKey ${s.optionKey} not found` });
      if (s.source === "textImage") {
        const opt = t.options.find((o) => o.key === s.optionKey);
        if (!opt || opt.type !== "text") ctx.addIssue({ code: "custom", message: `slot ${s.key}: textImage needs a text optionKey` });
        if (s.kind !== "image") ctx.addIssue({ code: "custom", message: `slot ${s.key}: textImage must be kind image` });
      }
    }
    for (const s of t.slots) {
      if (s.skipIfSlot && !slotKeys.has(s.skipIfSlot))
        ctx.addIssue({ code: "custom", message: `slot ${s.key}: skipIfSlot ${s.skipIfSlot} not found` });
    }
    for (const group of t.oneOf ?? []) {
      for (const k of group) if (!slotKeys.has(k)) ctx.addIssue({ code: "custom", message: `oneOf: slot ${k} not found` });
    }
    for (const k of Object.keys(t.sampleOptions ?? {})) {
      if (!t.options.some((o) => o.key === k && o.type === "text")) ctx.addIssue({ code: "custom", message: `sampleOptions: ${k} is not a text option` });
    }
    for (const [alias, keys] of Object.entries(t.refAliases ?? {})) {
      if (slotKeys.has(alias)) ctx.addIssue({ code: "custom", message: `refAliases: ${alias} collides with a slot key` });
      for (const k of keys) if (!slotKeys.has(k)) ctx.addIssue({ code: "custom", message: `refAliases ${alias}: slot ${k} not found` });
    }
    const optKeys = new Set<string>();
    for (const o of t.options) {
      if (optKeys.has(o.key)) ctx.addIssue({ code: "custom", message: `duplicate option key ${o.key}` });
      optKeys.add(o.key);
      if (o.type === "select" && !o.dynamic && !o.values.some((v) => v.value === o.default))
        ctx.addIssue({ code: "custom", message: `option ${o.key}: default not in values` });
    }
    if (t.mode === "first-last") {
      const imgs = t.slots.filter((s) => s.kind === "image");
      if (imgs.length < 1 || imgs.length > 2) ctx.addIssue({ code: "custom", message: "first-last mode needs 1 or 2 image slots" });
      if (t.slots.some((s) => s.kind !== "image")) ctx.addIssue({ code: "custom", message: "first-last mode accepts image slots only" });
      if (t.defaults.duration === "clip") ctx.addIssue({ code: "custom", message: "first-last mode has no clip to follow; set a numeric default duration" });
    }
    if (!t.allow.resolutions.includes(t.defaults.resolution))
      ctx.addIssue({ code: "custom", message: "default resolution not allowed" });
    if (!t.allow.ratios.includes(t.defaults.ratio))
      ctx.addIssue({ code: "custom", message: "default ratio not allowed" });
    if (t.defaults.duration !== "clip" && !t.allow.durations.includes(t.defaults.duration))
      ctx.addIssue({ code: "custom", message: "default duration not allowed" });
  });

export type Template = z.infer<typeof templateSchema>;
export type Slot = z.infer<typeof slotSchema>;
export type TemplateOption = z.infer<typeof optionSchema>;
export type SelectOption = Extract<TemplateOption, { type: "select" }>;
export type SelectValue = z.infer<typeof selectValueSchema>;

/** 고정 자산 매니페스트 (public/refs/manifest.json) */
export const refItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["image", "video", "audio"]),
  file: z.string().min(1),
  label: z.string().min(1),
  durationSec: z.number().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  falUrl: z.string().optional(),
  falUrlAt: z.number().optional(),
});
export const refManifestSchema = z.object({ items: z.array(refItemSchema) });
export type RefItem = z.infer<typeof refItemSchema>;
export type RefManifest = z.infer<typeof refManifestSchema>;

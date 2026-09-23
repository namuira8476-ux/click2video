import { describe, expect, it } from "vitest";
import { assignRefs, renderPrompt } from "@/lib/templates/prompt-renderer";
import { validateInputs } from "@/lib/templates/validate-inputs";
import { templateSchema, type Template } from "@/lib/templates/schema";
import { img, vid } from "./fixtures";

/** 댄스 트랜스퍼와 같은 구조: 업로드 또는 프리셋 중 하나, 프롬프트는 별칭 ref.motion 사용 */
const danceLike: Template = {
  id: "dance-like",
  name: "테스트 댄스",
  tagline: "t",
  category: "effects",
  mode: "reference",
  defaults: { resolution: "768P", duration: "clip", ratio: "9:16" },
  allow: { resolutions: ["480P", "768P"], durations: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], ratios: ["9:16"] },
  slots: [
    { key: "person", kind: "image", label: "인물", source: "user", required: true },
    { key: "danceUpload", kind: "video", label: "내 댄스 영상", source: "user", required: false },
    { key: "dance", kind: "video", label: "댄스 프리셋", source: "option", required: false, optionKey: "dance", skipIfSlot: "danceUpload" },
    { key: "title", kind: "image", label: "제목 이미지", source: "textImage", required: true, optionKey: "title" },
  ],
  oneOf: [["danceUpload", "dance"]],
  refAliases: { motion: ["danceUpload", "dance"] },
  options: [
    { key: "dance", type: "select", label: "댄스", values: [{ value: "d1", label: "D1", refId: "dance-d1" }], default: "d1" },
    { key: "title", type: "text", label: "제목", maxLen: 20, required: true },
  ],
  prompt: "{{ref.motion}} is the motion reference. {{ref.person}} is the character. {{ref.title}} shows the exact title text.",
  requiresConsent: false,
  sampleInputs: {},
  badges: ["📷1"],
};

describe("schema additions", () => {
  it("accepts oneOf / refAliases / skipIfSlot / textImage and validates references", () => {
    expect(templateSchema.safeParse(danceLike).success).toBe(true);
    const bad = { ...danceLike, refAliases: { motion: ["nope"] } };
    expect(templateSchema.safeParse(bad).success).toBe(false);
    const badText = { ...danceLike, slots: danceLike.slots.map((s) => (s.key === "title" ? { ...s, optionKey: "dance" } : s)) };
    expect(templateSchema.safeParse(badText).success).toBe(false);
  });
});

describe("refAliases", () => {
  it("points the alias at the uploaded video when present, else the preset", () => {
    const withUpload = assignRefs(danceLike, [img("person"), vid("danceUpload", 8), img("title", { source: "generated" })]);
    expect(withUpload.refs.motion).toBe("Video 1");
    expect(withUpload.order.video).toEqual(["danceUpload"]);
    const withPreset = assignRefs(danceLike, [img("person"), vid("dance", 10, { source: "ref" }), img("title", { source: "generated" })]);
    expect(withPreset.refs.motion).toBe("Video 1");
    expect(withPreset.order.video).toEqual(["dance"]);
  });

  it("renders the alias and the generated text image number", () => {
    const { prompt } = renderPrompt(danceLike, {
      assets: [img("person"), vid("dance", 10, { source: "ref" }), img("title", { source: "generated" })],
      options: { dance: "d1", title: "우리 가게" },
      duration: 10,
    });
    expect(prompt).toContain("Video 1 is the motion reference. Image 1 is the character. Image 2 shows the exact title text.");
  });
});

describe("validateInputs with oneOf / skipIfSlot / textImage", () => {
  const base = { options: { dance: "d1", title: "우리 가게" }, consent: true, resolution: "768P" as const, duration: 10, ratio: "9:16" as const };

  it("requires either the upload or the preset", () => {
    const errors = validateInputs(danceLike, { ...base, assets: [img("person"), img("title", { source: "generated" })] });
    expect(errors.some((e) => e.includes("내 댄스 영상 또는 댄스 프리셋"))).toBe(true);
  });

  it("passes with the upload only, and with the preset only", () => {
    expect(validateInputs(danceLike, { ...base, assets: [img("person"), vid("danceUpload", 8), img("title", { source: "generated" })] })).toEqual([]);
    expect(validateInputs(danceLike, { ...base, assets: [img("person"), vid("dance", 10, { source: "ref" }), img("title", { source: "generated" })] })).toEqual([]);
  });

  it("asks for the text option when a required textImage slot is empty", () => {
    const errors = validateInputs(danceLike, { ...base, options: { dance: "d1", title: "" }, assets: [img("person"), vid("dance", 10, { source: "ref" })] });
    expect(errors.some((e) => e.includes("'제목'"))).toBe(true);
  });
});

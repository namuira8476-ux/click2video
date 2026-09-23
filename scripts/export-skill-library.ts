import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * templates/*.json 을 재사용 스킬(~/.claude/skills/h3-video-templates/references/templates.md)의
 * 프롬프트 라이브러리로 내보낸다. 템플릿을 고치거나 재검증하면 다시 실행해 스킬을 최신으로 맞춘다.
 *
 *   npm run export-skill            # 기본 위치로
 *   npm run export-skill -- --out=path/to/templates.md
 *
 * 검증 상태는 docs/verification-status.json(판정·날짜·jobId·메모)에서 읽고,
 * 프리뷰 승격 여부는 public/samples/<id>/preview.mp4 존재로 계산한다(사실만 기록, 추정 없음).
 */
const outArg = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
const OUT = outArg ?? path.join(os.homedir(), ".claude", "skills", "h3-video-templates", "references", "templates.md");

type Slot = { key: string; kind: string; source: string; required?: boolean; optionKey?: string; refId?: string; skipIfSlot?: string };
type Opt = { key: string; type: string; default?: string; dynamic?: string; required?: boolean; maxLen?: number; placeholder?: string; showWhen?: unknown; values?: { value: string; prompt?: string; refId?: string }[] };
type T = {
  id: string; name: string; tagline: string; category: string; mode?: string;
  defaults: { resolution: string; duration: number | string; ratio: string };
  allow: { resolutions: string[]; durations: number[]; ratios: string[] };
  requiresConsent?: boolean; slots: Slot[]; oneOf?: unknown; refAliases?: unknown; options: Opt[];
  prompt: string; negative?: string; sampleInputs?: Record<string, string>; sampleOptions?: Record<string, string>;
};
type Status = { verdict: string; date: string; jobId?: string; note?: string };

const dir = path.resolve(process.cwd(), "templates");
const templates: T[] = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
const statusFile = path.resolve(process.cwd(), "docs", "verification-status.json");
const statusAll: Record<string, Status | string> = fs.existsSync(statusFile) ? JSON.parse(fs.readFileSync(statusFile, "utf8")) : {};
const statusOf = (id: string): Status | undefined => (typeof statusAll[id] === "object" ? (statusAll[id] as Status) : undefined);
const hasPreview = (id: string) => fs.existsSync(path.resolve(process.cwd(), "public", "samples", id, "preview.mp4"));
const CAT: Record<string, string> = { smallbiz: "소상공인", commerce: "광고·커머스", effects: "이펙트", edit: "편집" };

const nPreview = templates.filter((t) => hasPreview(t.id)).length;
const nPass = templates.filter((t) => statusOf(t.id)?.verdict === "pass").length;

let md = `# Click2Video 템플릿 라이브러리 (H3-Max 프롬프트 ${templates.length}종, 실제 생성으로 판정)

각 항목: 검증 상태 → 슬롯(사용자 입력) → 옵션 → 프롬프트(mustache) → 네거티브. \`{{ref.<slot>}}\` 는 실행 시 "Image 1"/"Video 1"/"Audio 1" 로 치환된다. \`{{opt.<key>.prompt}}\` 는 select 값의 prompt 문자열, \`{{opt.<key>}}\` 는 text 값, \`{{#slots.<key>}}…{{/slots.<key>}}\` 는 슬롯이 채워졌을 때만.

규칙: **본문은 단어 단위로 그대로 쓴다.** 변형은 옵션 슬롯으로만. \`defaults.ratio: "adaptive"\` 는 서버가 입력 자산 비율로 치환한다는 뜻이며(fal 에 adaptive 를 보내지 않는다), first-last 모드에서는 ratio 가 무시된다. 오디오는 항상 재합성되므로 어떤 템플릿도 원본 오디오 보존을 지시하지 않는다. 모든 템플릿에 공통 옵션 \`extra\`(text, ≤200자, 프롬프트 패턴 7 "Additional user request (lower priority…)")가 있으며 아래 옵션 목록에서는 생략했다.

## 검증 상태 (${nPass}/${templates.length} pass · 프리뷰 승격 ${nPreview}/${templates.length})

"검증됨" 의 뜻: 아래 표의 날짜에 샘플 입력으로 실제 생성 → 프레임 4점·전사 → 판정자+반박자 2인 판정. 표에 없는 상태(예: 다른 날짜, 다른 옵션 조합)는 **검증된 적이 없는 것**이다 — 답변에 검증 상태를 적을 때는 이 표의 값만 인용하고, 표가 없는 항목은 "미검증" 이라고 쓴다.

| 템플릿 | 판정 | 프리뷰 승격 | 판정일 | jobId | 메모 |
|---|---|---|---|---|---|
`;
for (const t of templates) {
  const s = statusOf(t.id);
  md += `| \`${t.id}\` | ${s?.verdict ?? "미검증"} | ${hasPreview(t.id) ? "예" : "아니오"} | ${s?.date ?? "—"} | ${s?.jobId ?? "—"} | ${s?.note ?? ""} |\n`;
}
md += `\n판정 뜻: pass = 태그라인이 약속한 것을 하고 샘플 입력·문구가 보존됨. partial = 의도는 맞으나 눈에 띄는 결함(프리뷰 불가). "프리뷰 승격" 은 실제로 \`public/samples/<id>/preview.mp4\` 가 있는지로 계산한 값이다.\n`;

for (const c of ["smallbiz", "commerce", "effects", "edit"]) {
  const list = templates.filter((t) => t.category === c);
  if (!list.length) continue;
  md += `\n## ${CAT[c] ?? c}\n`;
  for (const t of list) {
    const s = statusOf(t.id);
    md += `\n### ${t.id} — ${t.name}\n> ${t.tagline}\n\n`;
    md += `- 검증: ${s ? `${s.verdict} (${s.date}${s.jobId ? `, ${s.jobId}` : ""})` : "미검증"} · 프리뷰 ${hasPreview(t.id) ? "승격" : "없음"}${s?.note ? ` · ${s.note}` : ""}\n`;
    md += `- 모드: \`${t.mode ?? "reference"}\` · 기본 ${t.defaults.resolution} · ${t.defaults.duration === "clip" ? "입력 영상 길이(clip)" : `${t.defaults.duration}초`} · 비율 ${t.defaults.ratio}${t.requiresConsent ? " · 인물·음성 동의 필요(requiresConsent)" : ""}\n`;
    md += `- allow: 해상도 ${t.allow.resolutions.join("/")} · 길이 ${t.allow.durations.join(",")} · 비율 ${t.allow.ratios.join(", ")}\n`;
    md += `- 슬롯: ${t.slots.map((s) => `\`${s.key}\`(${s.kind}, ${s.source}${s.required ? "" : ", 선택"}${s.optionKey ? `, ←${s.optionKey}` : ""}${s.refId ? `, ref:${s.refId}` : ""}${s.skipIfSlot ? `, skipIf:${s.skipIfSlot}` : ""})`).join(", ")}\n`;
    if (t.oneOf) md += `- oneOf: ${JSON.stringify(t.oneOf)}${t.refAliases ? ` · refAliases: ${JSON.stringify(t.refAliases)}` : ""}\n`;
    const opts = t.options.filter((o) => o.key !== "extra");
    if (opts.length) {
      md += `- 옵션:\n`;
      for (const o of opts) {
        if (o.type === "select") md += `  - \`${o.key}\` (select${o.dynamic ? `, dynamic:${o.dynamic}` : ""}, 기본 ${o.default}): ${(o.values ?? []).map((v) => (v.prompt ? `${v.value}=“${v.prompt}”` : v.refId ? `${v.value}→ref:${v.refId}` : v.value)).join(" | ")}\n`;
        else if (o.type === "text") md += `  - \`${o.key}\` (text${o.required ? ", 필수" : ""}, ≤${o.maxLen}자${o.showWhen ? `, showWhen ${JSON.stringify(o.showWhen)}` : ""}) ${o.placeholder ? `예: ${o.placeholder}` : ""}\n`;
        else md += `  - \`${o.key}\` (toggle)\n`;
      }
    }
    if (t.sampleInputs) md += `- 샘플 입력: ${Object.entries(t.sampleInputs).map(([k, v]) => `${k}=${v}`).join(", ")}\n`;
    if (t.sampleOptions) md += `- 샘플 문구: ${JSON.stringify(t.sampleOptions)}\n`;
    md += `\n\`\`\`text\n${t.prompt}\n\`\`\`\n`;
    if (t.negative) md += `네거티브: ${t.negative}\n`;
  }
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, md);
console.log(`[export-skill] ${templates.length} templates (${nPass} pass, ${nPreview} previews) → ${OUT}`);

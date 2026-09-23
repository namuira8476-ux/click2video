import "./load-env";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * 모든 템플릿을 "샘플로 해보기" 와 같은 입력으로 실제 생성해 보고 결과를 리포트로 남긴다 (dev 서버가 떠 있어야 한다).
 * UI 의 useSamples() 와 같은 규칙: sampleInputs → sample: 슬롯, 필수 텍스트는 placeholder 의 "예: …" 로 채움, select 는 기본값, 동의 체크.
 *
 *   npx tsx scripts/e2e-samples.ts                       # 전체
 *   npx tsx scripts/e2e-samples.ts --only=relight,korean-typo
 *   옵션: --base=http://localhost:3000 --out=<report.json> --frames=<dir> --submit-only
 */
type PublicSlot = { key: string; kind: "image" | "video" | "audio"; source: string; required: boolean };
type PublicOption =
  | { key: string; type: "select"; default: string; values: { value: string; available?: boolean }[] }
  | { key: string; type: "text"; required?: boolean; placeholder?: string }
  | { key: string; type: "toggle"; default: boolean };
type PublicTemplate = {
  id: string;
  name: string;
  ready: boolean;
  slots: PublicSlot[];
  options: PublicOption[];
  sampleInputs: Record<string, string>;
  sampleOptions?: Record<string, string>;
  requiresConsent: boolean;
};
type PublicJob = {
  id: string;
  templateId: string;
  status: string;
  errorMessage: string | null;
  resultUrl: string | null;
  renderedPrompt: string;
  expandedPrompt: string | null;
  estimatedCredits: number;
  duration: number;
  resolution: string;
  ratio: string;
  createdAt: number;
  finishedAt: number | null;
  inputs: unknown;
  queuePosition: number | null;
};

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const BASE = arg("base") ?? "http://localhost:3000";
const ONLY = arg("only")
  ?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const OUT = arg("out") ?? path.resolve(process.cwd(), "storage", "e2e", "report.json");
const FRAMES = arg("frames") ?? path.resolve(process.cwd(), "storage", "e2e", "frames");
const SUBMIT_ONLY = process.argv.includes("--submit-only");
const TIMEOUT_MS = 25 * 60 * 1000;

/**
 * 소유자 쿠키를 들고 다닌다.
 *
 * 서버가 요청마다 서명된 `c2v_uid` 를 발급하고 작업을 그 소유자로 묶기 때문에,
 * 쿠키를 되돌려 보내지 않으면 생성한 작업을 폴링할 때 매번 다른 사용자가 되어 404 가 난다.
 * BYOK 서버(BYOK_MODE=1)를 대상으로 돌릴 때는 `--key=<fal key>` 또는 FAL_KEY 로 키를 실어 보낸다.
 */
const cookieJar = new Map<string, string>();
const E2E_KEY = (process.argv.find((a) => a.startsWith("--key="))?.slice(6) ?? process.env.FAL_KEY ?? "").trim();

async function api<T>(p: string, init?: RequestInit): Promise<T> {
  const jar = [...cookieJar].map(([k, v]) => `${k}=${v}`).join("; ");
  const headers: Record<string, string> = { "content-type": "application/json", ...((init?.headers as Record<string, string>) ?? {}) };
  if (jar) headers.cookie = jar;
  if (E2E_KEY) headers["x-fal-key"] = E2E_KEY;

  const res = await fetch(BASE + p, { ...init, headers });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    if (i > 0) cookieJar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
  const body = (await res.json()) as T & { error?: string; errors?: string[] };
  if (!res.ok) throw new Error(`${p} → ${res.status}: ${(body.errors ?? [body.error]).join(" / ")}`);
  return body;
}

/** GenerateForm.useSamples() 와 같은 규칙 */
function sampleRequest(t: PublicTemplate) {
  const slots: Record<string, string> = {};
  for (const s of t.slots) if (s.source === "user" && t.sampleInputs[s.key]) slots[s.key] = `sample:${t.sampleInputs[s.key]}`;
  const options: Record<string, string | boolean> = {};
  for (const o of t.options) {
    if (o.type === "select") {
      const usable = o.values.filter((v) => v.available !== false);
      options[o.key] = usable.some((v) => v.value === o.default) ? o.default : (usable[0]?.value ?? o.default);
    } else if (o.type === "toggle") options[o.key] = o.default;
    else if (t.sampleOptions?.[o.key]) options[o.key] = t.sampleOptions[o.key];
    else options[o.key] = o.required && o.placeholder ? o.placeholder.replace(/^예\s*:\s*/, "").split(" / ")[0] : "";
  }
  return { templateId: t.id, slots, options, consent: true };
}

function probe(file: string) {
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", file]).toString();
    const j = JSON.parse(out) as { format: { duration: string }; streams: { codec_type: string; width?: number; height?: number }[] };
    const v = j.streams.find((s) => s.codec_type === "video");
    return { durationSec: Number(j.format.duration), width: v?.width, height: v?.height, hasAudio: j.streams.some((s) => s.codec_type === "audio") };
  } catch {
    return null;
  }
}

/**
 * 프레임 파일은 jobId 로 키를 잡는다 — 같은 템플릿을 재실행해도 이전 실행의 프레임을 덮어쓰지 않는다.
 * 0.75×길이 지점을 추가로 뽑는다: 고정 3점(0.4 / 절반 / 끝)만 쓰면 헤드라인·엔드카드가 나오는
 * 후반 타이포 구간을 구조적으로 한 번도 샘플링하지 못해 철자 오류를 놓친다(검증에서 실제로 놓쳤다).
 */
function frames(file: string, id: string, jobId: string, durationSec: number): string[] {
  fs.mkdirSync(FRAMES, { recursive: true });
  const ts = [0.4, durationSec / 2, durationSec * 0.75, Math.max(0.5, durationSec - 0.4)];
  const out: string[] = [];
  ts.forEach((t, i) => {
    const f = path.join(FRAMES, `${id}-${jobId}-${i + 1}.jpg`);
    try {
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", t.toFixed(2), "-i", file, "-frames:v", "1", "-vf", "scale=720:-2", "-q:v", "3", f]);
      out.push(f);
    } catch (e) {
      console.warn("  frame failed", id, t, (e as Error).message);
    }
  });
  return out;
}

async function fetchTemplates(): Promise<PublicTemplate[]> {
  // dev 서버가 막 떴을 수 있으니 최대 1분 기다린다
  for (let i = 0; ; i++) {
    try {
      return (await api<{ templates: PublicTemplate[] }>("/api/templates")).templates;
    } catch (e) {
      if (i >= 30) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function main() {
  const templates = await fetchTemplates();
  const targets = templates.filter((t) => !ONLY || ONLY.includes(t.id));
  console.log(`[e2e] ${targets.length} templates @ ${BASE}`);

  const rows: Record<string, unknown>[] = [];
  const pending = new Map<string, { t: PublicTemplate; jobId: string; submittedAt: number }>();
  for (const t of targets) {
    const req = sampleRequest(t);
    if (!t.ready) {
      rows.push({ templateId: t.id, name: t.name, status: "skipped", error: "template not ready", request: req });
      console.log("  skip (not ready)", t.id);
      continue;
    }
    try {
      const est = await api<{ credits: number; usd: number; errors: string[] }>("/api/estimate", { method: "POST", body: JSON.stringify(req) });
      if (est.errors.length) {
        rows.push({ templateId: t.id, name: t.name, status: "rejected", error: est.errors.join(" / "), request: req });
        console.log("  rejected", t.id, "→", est.errors.join(" / "));
        continue;
      }
      const { job } = await api<{ job: PublicJob }>("/api/jobs", { method: "POST", body: JSON.stringify(req) });
      pending.set(t.id, { t, jobId: job.id, submittedAt: Date.now() });
      console.log(`  submitted ${t.id.padEnd(22)} ${job.id}  est ${est.credits} cr ($${est.usd.toFixed(2)})`);
    } catch (e) {
      rows.push({ templateId: t.id, name: t.name, status: "rejected", error: (e as Error).message, request: req });
      console.log("  rejected", t.id, "→", (e as Error).message);
    }
  }
  if (SUBMIT_ONLY) {
    console.log("[e2e] submitted only; jobs:", [...pending.values()].map((p) => p.jobId).join(","));
    return;
  }

  const start = Date.now();
  while (pending.size && Date.now() - start < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, 5000));
    for (const [tid, p] of [...pending]) {
      let job: PublicJob;
      try {
        job = (await api<{ job: PublicJob }>(`/api/jobs/${p.jobId}`)).job;
      } catch (e) {
        console.warn("  poll error", tid, (e as Error).message);
        continue;
      }
      if (!["succeeded", "failed", "cancelled"].includes(job.status)) continue;
      pending.delete(tid);
      const took = job.finishedAt ? Math.round((job.finishedAt - job.createdAt) / 1000) : null;
      const row: Record<string, unknown> = {
        templateId: tid,
        name: p.t.name,
        jobId: job.id,
        status: job.status,
        error: job.errorMessage,
        tookSec: took,
        resolution: job.resolution,
        duration: job.duration,
        ratio: job.ratio,
        estimatedCredits: job.estimatedCredits,
        inputs: job.inputs,
        renderedPrompt: job.renderedPrompt,
        expandedPrompt: job.expandedPrompt,
        resultUrl: job.resultUrl,
      };
      if (job.status === "succeeded" && job.resultUrl) {
        const file = path.resolve(process.cwd(), "storage", "results", `${job.id}.mp4`);
        row.resultPath = file;
        const pr = probe(file);
        Object.assign(row, pr ?? {});
        row.frames = pr ? frames(file, tid, job.id, pr.durationSec) : [];
      }
      rows.push(row);
      console.log(`  ${job.status.padEnd(9)} ${tid.padEnd(22)} ${took ?? "?"}s ${job.errorMessage ?? ""}`);
    }
  }
  for (const [tid, p] of pending) rows.push({ templateId: tid, name: p.t.name, jobId: p.jobId, status: "timeout", error: "no terminal status within 25 min" });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), rows }, null, 2));
  const ok = rows.filter((r) => r.status === "succeeded").length;
  console.log(`[e2e] done: ${ok}/${rows.length} succeeded → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import "./load-env";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * e2e 리포트(scripts/e2e-samples.ts)의 성공 결과를 카드 프리뷰로 승격한다.
 *   public/samples/<templateId>/preview.mp4  (호버 시 재생)
 *   public/samples/<templateId>/thumb.png    (첫 프레임, --thumb 를 붙였을 때만 덮어씀)
 *
 *   npx tsx scripts/promote-previews.ts storage/e2e/report.json [more-report.json …] [--only=a,b] [--thumb]
 * 같은 템플릿이 여러 리포트에 있으면 뒤에 오는 리포트가 이긴다.
 */
type Row = { templateId: string; status: string; resultPath?: string; jobId?: string };

const args = process.argv.slice(2);
const reports = args.filter((a) => !a.startsWith("--"));
const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",").map((s) => s.trim()).filter(Boolean);
const withThumb = args.includes("--thumb");
if (reports.length === 0) {
  console.error("usage: promote-previews.ts <report.json> [...] [--only=a,b] [--thumb]");
  process.exit(1);
}

const latest = new Map<string, Row>();
for (const r of reports) {
  const j = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), r), "utf8")) as { rows: Row[] };
  for (const row of j.rows) if (row.status === "succeeded" && row.resultPath) latest.set(row.templateId, row);
}

let n = 0;
for (const [id, row] of latest) {
  if (only && !only.includes(id)) continue;
  if (!fs.existsSync(row.resultPath!)) {
    console.warn("  missing result", id, row.resultPath);
    continue;
  }
  const dir = path.resolve(process.cwd(), "public", "samples", id);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(row.resultPath!, path.join(dir, "preview.mp4"));
  let thumbNote = "";
  if (withThumb) {
    try {
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "0.5", "-i", row.resultPath!, "-frames:v", "1", "-vf", "scale=1080:-2", path.join(dir, "thumb.png")]);
      thumbNote = " + thumb.png";
    } catch (e) {
      thumbNote = ` (thumb 실패: ${(e as Error).message})`;
    }
  }
  console.log(`  ${id.padEnd(22)} ← ${row.jobId}${thumbNote}`);
  n++;
}
console.log(`[previews] promoted ${n} template(s)`);

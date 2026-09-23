import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * 카드 프리뷰(public/samples/<id>/preview.mp4)를 웹 재생용으로 압축한다.
 * H3 원본은 개당 3~20MB 라 카드 그리드 17개가 200MB를 넘어 호버 재생이 실용적이지 않다.
 * 긴 변 720px, CRF 30, AAC 96k, faststart 로 개당 1MB 안팎까지 줄인다. 원본은 storage/results 에 그대로 남는다.
 *
 *   npx tsx scripts/compress-previews.ts            # 아직 압축되지 않은 것만
 *   npx tsx scripts/compress-previews.ts --force    # 전부 다시
 */
const force = process.argv.includes("--force");
const MAX_LONG_EDGE = 720;
const dir = path.resolve(process.cwd(), "public", "samples");
const MARKER = "c2v-web";

function isCompressed(file: string): boolean {
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format_tags=comment", "-of", "default=nw=1:nk=1", file]).toString().trim();
    return out === MARKER;
  } catch {
    return false;
  }
}

let before = 0;
let after = 0;
let n = 0;
for (const id of fs.readdirSync(dir)) {
  const file = path.join(dir, id, "preview.mp4");
  if (!fs.existsSync(file)) continue;
  const size = fs.statSync(file).size;
  before += size;
  if (!force && isCompressed(file)) {
    after += size;
    console.log("  skip (already web)", id);
    continue;
  }
  const tmp = file.replace(/\.mp4$/, ".web.mp4");
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-i", file,
    // 긴 변만 720 으로 줄이고 짧은 변은 비율 유지(짝수 보정). 원본이 이미 작으면 확대하지 않는다.
    "-vf", `scale='if(gt(iw,ih),min(${MAX_LONG_EDGE},iw),-2)':'if(gt(iw,ih),-2,min(${MAX_LONG_EDGE},ih))'`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k",
    "-movflags", "+faststart", "-metadata", `comment=${MARKER}`,
    tmp,
  ]);
  fs.renameSync(tmp, file);
  const now = fs.statSync(file).size;
  after += now;
  n++;
  console.log(`  ${id.padEnd(22)} ${(size / 1048576).toFixed(1)}MB → ${(now / 1048576).toFixed(1)}MB`);
}
console.log(`[previews] compressed ${n} file(s): ${(before / 1048576).toFixed(0)}MB → ${(after / 1048576).toFixed(0)}MB`);

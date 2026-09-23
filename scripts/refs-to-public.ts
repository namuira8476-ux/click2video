import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * storage/refs/** 를 public/refs/** 로 옮긴다 (Cloudflare Workers 에는 파일 시스템이 없어
 * 고정 레퍼런스 자산도 정적 자산으로 서빙해야 하고, fal 도 공개 URL 로 읽어가기 때문이다).
 * 영상은 웹 전송용으로 압축한다 (긴 변 720px, CRF 30). manifest.json 도 함께 옮긴다.
 *
 *   npx tsx scripts/refs-to-public.ts [--force]
 */
const force = process.argv.includes("--force");
const src = path.resolve(process.cwd(), "storage", "refs");
const dst = path.resolve(process.cwd(), "public", "refs");

if (!fs.existsSync(src)) {
  console.log("[refs] storage/refs 가 없습니다. 건너뜁니다.");
  process.exit(0);
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

let copied = 0;
let before = 0;
let after = 0;
for (const file of walk(src)) {
  const rel = path.relative(src, file);
  const out = path.join(dst, rel);
  if (fs.existsSync(out) && !force) continue;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const size = fs.statSync(file).size;
  before += size;
  if (file.endsWith(".mp4")) {
    execFileSync("ffmpeg", [
      "-y", "-loglevel", "error", "-i", file,
      "-vf", "scale='if(gt(iw,ih),min(720,iw),-2)':'if(gt(iw,ih),-2,min(720,ih))'",
      "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", out,
    ]);
  } else {
    fs.copyFileSync(file, out);
  }
  after += fs.statSync(out).size;
  copied++;
  console.log("  ", rel, `${(size / 1048576).toFixed(1)}MB → ${(fs.statSync(out).size / 1048576).toFixed(1)}MB`);
}
console.log(`[refs] ${copied} file(s): ${(before / 1048576).toFixed(0)}MB → ${(after / 1048576).toFixed(0)}MB → public/refs/`);

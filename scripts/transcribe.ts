import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { getEnv } from "@/lib/env";

/**
 * 결과·샘플 영상의 음성을 fal-ai/whisper 로 전사한다 (대사·나레이션이 실제로 들어갔는지 검증용).
 *   npx tsx scripts/transcribe.ts --out=storage/e2e/transcripts.json <file.mp4|wav> [...]
 */
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const OUT = arg("out") ?? path.resolve(process.cwd(), "storage", "e2e", "transcripts.json");
const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));

async function one(file: string) {
  const buf = await fs.promises.readFile(file);
  const ext = path.extname(file).toLowerCase();
  const mime = ext === ".wav" ? "audio/wav" : ext === ".mp3" ? "audio/mpeg" : "video/mp4";
  const url = await fal.storage.upload(new File([new Uint8Array(buf)], path.basename(file), { type: mime }));
  const r = await fal.subscribe("fal-ai/whisper", { input: { audio_url: url, task: "transcribe", chunk_level: "segment" } });
  const d = r.data as { text?: string; inferred_languages?: string[] };
  return { file, text: (d.text ?? "").trim(), languages: d.inferred_languages ?? [] };
}

async function main() {
  const env = getEnv();
  if (env.mockForced || !env.falKey) {
    console.error("[transcribe] FAL_KEY 가 필요합니다.");
    process.exit(1);
  }
  fal.config({ credentials: env.falKey });
  const results: Record<string, { text: string; languages: string[]; error?: string }> = {};
  let cursor = 0;
  async function worker() {
    while (cursor < files.length) {
      const f = files[cursor++];
      try {
        const r = await one(f);
        results[f] = { text: r.text, languages: r.languages };
        console.log(`  ${path.basename(f).padEnd(34)} [${r.languages.join(",")}] ${r.text.slice(0, 120)}`);
      } catch (e) {
        results[f] = { text: "", languages: [], error: (e as Error).message };
        console.warn(`  ${path.basename(f)} FAILED: ${(e as Error).message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, files.length) }, worker));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(`[transcribe] ${Object.keys(results).length} files → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { readManifest, writeManifest } from "@/lib/refs/manifest";
import { getEnv } from "@/lib/env";

const URL = "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4";
const DURATION = 10;

async function main() {
  const publicMock = path.resolve(process.cwd(), "public", "samples", "mock");
  const refsDir = path.resolve(process.cwd(), "public", "refs");
  fs.mkdirSync(publicMock, { recursive: true });
  const result = path.join(publicMock, "result.mp4");

  if (!fs.existsSync(result)) {
    try {
      console.log("[mock-video] downloading", URL);
      const res = await fetch(URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.writeFileSync(result, Buffer.from(await res.arrayBuffer()));
      console.log("[mock-video] saved", result);
    } catch (e) {
      console.warn("[mock-video] download failed, continuing without mock video:", (e as Error).message);
      return;
    }
  } else {
    console.log("[mock-video] exists, skip download");
  }

  const clip = path.join(publicMock, "clip.mp4");
  if (!fs.existsSync(clip)) fs.copyFileSync(result, clip);

  // 실제 댄스·밈 레퍼런스(npm run refs)가 이미 있으면 mock 프리셋은 만들지 않는다 — 옵션 목록에 Big Buck Bunny 가 다시 뜨는 것을 막는다.
  const m = readManifest();
  const hasReal = (prefix: string) => m.items.some((i) => i.id.startsWith(`${prefix}-`) && i.id !== `${prefix}-mock`);
  const add = (prefix: string, label: string) => {
    if (hasReal(prefix) || m.items.some((i) => i.id === `${prefix}-mock`)) return;
    const file = path.join(refsDir, prefix, "mock.mp4");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) fs.copyFileSync(result, file);
    m.items.push({ id: `${prefix}-mock`, kind: "video", file: `${prefix}/mock.mp4`, label, durationSec: DURATION, width: 640, height: 360 });
  };
  add("dance", "테스트 댄스 (mock)");
  add("meme", "테스트 밈 (mock)");
  writeManifest(m);
  console.log("[mock-video] manifest updated:", m.items.map((i) => i.id).join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

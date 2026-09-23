import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { getEnv } from "@/lib/env";
import { H3MAX } from "@/lib/h3/limits";
import { readManifest, writeManifest } from "@/lib/refs/manifest";

/**
 * 댄스 챌린지 / 밈 레퍼런스 클립을 H3-Max text-to-video 로 합성해 public/refs 에 넣고 manifest 에 등록한다.
 * 실제 챌린지 안무를 재현하는 것이 아니라 "그 챌린지 느낌"의 합성 레퍼런스다. 진짜 챌린지 영상은 템플릿의 "내 댄스 영상 업로드"로 넣는다.
 *
 *   npm run refs            # 예상 비용만 출력
 *   npm run refs -- --yes   # 생성 (이미 있는 파일은 건너뜀)
 *   npm run refs -- --yes --only=dance-digiri
 */
type Clip = { id: string; dir: "dance" | "meme"; label: string; duration: number; ratio: "9:16" | "16:9"; prompt: string };

const DANCE_COMMON =
  "Single dancer, full body always in frame, locked-off medium-wide shot, clean softly lit studio with a neutral backdrop and subtle floor reflections, photoreal, 24fps, no text, no watermark. Upbeat original pop track that matches the moves.";

const CLIPS: Clip[] = [
  {
    id: "dance-digiri",
    dir: "dance",
    label: "디기리 챌린지",
    duration: 10,
    ratio: "9:16",
    prompt: `A viral short-form dance challenge in the style of the "Digiri" trend: a young dancer does a playful, bouncy routine built on a repeating 4-count — quick alternating hand points at the camera, a hip sway, a two-step slide, then a big arm swing overhead — repeated with growing energy and a confident smile. ${DANCE_COMMON}`,
  },
  {
    id: "dance-choesan",
    dir: "dance",
    label: "최산댄스",
    duration: 10,
    ratio: "9:16",
    prompt: `A comedic viral dance challenge in the style of the "Choesan dance" trend: exaggerated shoulder bounces, knees bending in and out, arms swinging loosely from side to side, a cheeky head tilt on every beat, then a spin and a finger-point pose at the end. Funny, loose, charming. ${DANCE_COMMON}`,
  },
  {
    id: "dance-slickback",
    dir: "dance",
    label: "슬릭백",
    duration: 8,
    ratio: "9:16",
    prompt: `A "slick back" gliding dance challenge: the dancer appears to float backwards across the floor with smooth alternating heel-toe glides, arms relaxed, body leaning slightly back, ending in a casual freeze. Smooth and effortless. ${DANCE_COMMON}`,
  },
  {
    id: "dance-kpop-point",
    dir: "dance",
    label: "K-pop 포인트 안무",
    duration: 10,
    ratio: "9:16",
    prompt: `A sharp K-pop point choreography for a chorus: crisp synchronized arm hits, a signature hand gesture framing the face, a hip roll, a quick turn and a strong final pose on the last beat. Precise, energetic, idol-style. ${DANCE_COMMON}`,
  },
  {
    id: "dance-hiphop-freestyle",
    dir: "dance",
    label: "힙합 프리스타일",
    duration: 10,
    ratio: "9:16",
    prompt: `A groovy hip-hop freestyle: chest pops, bounce, a body roll, footwork variations and a small spin, loose and musical, finishing with a relaxed head nod to the camera. ${DANCE_COMMON}`,
  },
  {
    id: "meme-capybara",
    dir: "meme",
    label: "카피바라 피라미드",
    duration: 8,
    ratio: "16:9",
    prompt:
      "Comedic meme clip from a locked-off wide camera in a plain living room: three men in dark suits suddenly drop to the floor at the same time; the left one jumps to the center, the center one rolls to the far left, the new center one rolls to the far right, the right one jumps to the center, and finally the center one climbs onto the other two forming a human pyramid. Deadpan, no camera movement, natural room lighting, photoreal, no text.",
  },
  {
    id: "meme-office-dance",
    dir: "meme",
    label: "사무실 댄스 브레이크",
    duration: 8,
    ratio: "16:9",
    prompt:
      "Comedic meme clip from a locked-off camera in an open-plan office: a man in a shirt and tie stands up from his desk, breaks into an over-the-top dance for four seconds while two coworkers stare in silence, then sits back down and keeps typing as if nothing happened. Fluorescent lighting, photoreal, no text.",
  },
];

async function main() {
  const env = getEnv();
  if (env.mockForced || !env.falKey) {
    console.error("[refs] FAL_KEY 가 필요합니다.");
    process.exit(1);
  }
  fal.config({ credentials: env.falKey });
  const yes = process.argv.includes("--yes");
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
  const refsDir = path.resolve(process.cwd(), "public", "refs");

  const todo = CLIPS.filter((c) => (!only || c.id === only) && !fs.existsSync(path.join(refsDir, c.dir, `${c.id}.mp4`)));
  const cost = todo.reduce((s, c) => s + c.duration * env.priceOutput768P, 0);
  console.log(`[refs] 생성 대상 ${todo.length}개, 예상 비용 ≈ $${cost.toFixed(2)} (768P $${env.priceOutput768P}/s)`);
  for (const c of todo) console.log(`  ${c.id.padEnd(24)} ${c.duration}s ${c.ratio}`);
  if (!yes) {
    console.log("실행하려면 --yes 를 붙이세요.");
    return;
  }

  const m = readManifest();
  for (const c of todo) {
    console.log("[refs] generating", c.id);
    const r = await fal.subscribe(H3MAX.endpoint.text, {
      input: {
        prompt: c.prompt,
        duration: c.duration,
        resolution: "768P",
        aspect_ratio: c.ratio,
        prompt_expansion_mode: "balanced",
        enable_safety_checker: true,
      },
      logs: true,
      onQueueUpdate: (u) => {
        if (u.status === "IN_PROGRESS") u.logs?.slice(-1).forEach((l) => console.log("   ", l.message));
      },
    });
    const url = (r.data as { video?: { url?: string } }).video?.url;
    if (!url) throw new Error(`${c.id}: no video url`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${c.id}: download ${res.status}`);
    const file = path.join(refsDir, c.dir, `${c.id}.mp4`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    const [w, h] = c.ratio === "9:16" ? [768, 1366] : [1366, 768];
    const item = { id: c.id, kind: "video" as const, file: `${c.dir}/${c.id}.mp4`, label: c.label, durationSec: c.duration, width: w, height: h };
    const idx = m.items.findIndex((i) => i.id === c.id);
    if (idx === -1) m.items.push(item);
    else m.items[idx] = { ...m.items[idx], ...item };
    writeManifest(m);
    console.log("  saved", path.relative(process.cwd(), file));
  }

  // 실제 레퍼런스가 생겼으면 mock 항목은 목록에서 뺀다
  const hasDance = m.items.some((i) => i.id.startsWith("dance-") && i.id !== "dance-mock");
  const hasMeme = m.items.some((i) => i.id.startsWith("meme-") && i.id !== "meme-mock");
  m.items = m.items.filter((i) => !((i.id === "dance-mock" && hasDance) || (i.id === "meme-mock" && hasMeme)));
  writeManifest(m);
  console.log("[refs] manifest:", m.items.map((i) => i.id).join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

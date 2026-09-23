import "./load-env";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fal } from "@fal-ai/client";
import { getEnv } from "@/lib/env";
import { H3MAX } from "@/lib/h3/limits";
import { readManifest, writeManifest } from "@/lib/refs/manifest";
import { loadTemplates } from "@/lib/templates/loader";

type Size = "portrait_16_9" | "landscape_16_9" | "square_hd";
type Item = { out: string; prompt: string; size: Size; label: string };

const SUFFIX = " Photorealistic, no text, no watermark, no logos.";
const DANCER =
  "Full-body photo of a young Korean woman in her twenties standing and facing the camera in a bright dance studio, oversized hoodie, cargo pants and sneakers, relaxed confident smile, whole body from head to shoes visible, neutral gray backdrop.";
const TALENT =
  "Full-body editorial fashion photo of a tall model in a long black wool coat, dark sunglasses and black boots, standing straight with a cool expression, minimal warm-gray studio backdrop.";

/**
 *   npm run samples                   # 없는 파일만 생성
 *   npm run samples -- --placeholders # 없는 파일 + SVG 플레이스홀더(FAL_KEY 없이 만든 것)만 다시 생성
 *   npm run samples -- --force        # 전부 다시 생성
 */
const force = process.argv.includes("--force");
const regenPlaceholders = process.argv.includes("--placeholders");
const env = getEnv();
const PUBLIC = path.resolve(process.cwd(), "public");
const REFS = path.resolve(process.cwd(), "public", "refs");

const items: Item[] = [
  // 사용자 슬롯 샘플 (docs/제안서.md §12.2)
  { out: "samples/dance-transfer/person.png", prompt: DANCER, size: "portrait_16_9", label: "댄스 인물" },
  // 스타일 변신은 사람 얼굴을 실사로 유지하려는 모델 성향이 강해 반려동물·사물 샘플을 쓴다 (docs: 알려진 한계)
  { out: "samples/style-transform/subject.png", prompt: "Full-body studio photo of a happy corgi sitting and facing the camera, ears up, tongue out, on a plain light-grey seamless backdrop, soft even light, whole body including paws visible.", size: "square_hd", label: "스타일 피사체" },
  { out: "samples/fashion-campaign/talent.png", prompt: TALENT, size: "portrait_16_9", label: "패션 모델" },
  { out: "samples/meme-recreate/character.png", prompt: "An orange tabby cat sitting in front of a plain white background, facing the camera.", size: "square_hd", label: "고양이" },
  { out: "samples/black-studio-launch/product.png", prompt: "A matte black wireless earbuds charging case on a pure black background with studio rim lighting.", size: "square_hd", label: "이어버드" },
  { out: "samples/product-360/product.png", prompt: "A minimalist ceramic scented candle in a white vessel on a white background, soft studio light.", size: "square_hd", label: "향초" },
  { out: "samples/product-360/detail.png", prompt: "Macro close-up of the printed label on a minimalist white ceramic scented candle, shallow depth of field.", size: "square_hd", label: "향초 디테일" },
  { out: "samples/fashion-campaign/product.png", prompt: "A black leather tote bag product shot on a white background, studio lighting.", size: "square_hd", label: "토트백" },
  { out: "samples/fashion-campaign/logo.png", prompt: "A single simple geometric logo mark in black on a white background, no letters, no words.", size: "square_hd", label: "로고" },
  // 액센트를 스우시 유사 형태로 두면 모델이 상표를 그대로 재현한다(검증됨) → 중립적인 대각 스트라이프로
  { out: "samples/landing-motion/hero.png", prompt: "A single modern running shoe with a pale blue knit upper, one straight diagonal charcoal stripe across the side panel, and a bright green midsole, product shot on a pure white background, side view. No logo, no brand mark, no swoosh or tick shape, no text.", size: "square_hd", label: "운동화" },
  // 소상공인 광고
  { out: "samples/store-promo/store.png", prompt: "The storefront of a small cozy neighborhood cafe in Seoul in the morning: glass door, wooden facade, plants by the entrance, warm interior light visible, no readable signage text.", size: "portrait_16_9", label: "가게 외관" },
  { out: "samples/store-promo/product.png", prompt: "A latte with latte art and a fresh croissant on a wooden cafe table, natural window light, shallow depth of field.", size: "square_hd", label: "대표 메뉴" },
  { out: "samples/menu-spotlight/food.png", prompt: "A plate of glossy Korean fried chicken with sesame seeds on a dark ceramic plate, pure black background, dramatic studio rim light.", size: "square_hd", label: "메뉴" },
  { out: "samples/event-notice/store.png", prompt: "Interior of a small stylish clothing boutique: racks of clothes, warm spotlights, a wooden counter, no readable text.", size: "portrait_16_9", label: "가게 내부" },
  { out: "samples/owner-greeting/owner.png", prompt: "Portrait of a friendly Korean small-business owner in their forties wearing a dark apron, smiling at the camera behind a cafe counter, warm light, upper body.", size: "portrait_16_9", label: "사장님" },
  // 소상공인 2차 (전후 비교 · 매크로 전환 · 상품 갈아끼우기)
  { out: "samples/before-after/before.png", prompt: "A dusty, mud-splattered white compact SUV parked in a plain concrete driveway, side three-quarter view, overcast daylight, no people, no license plate text.", size: "square_hd", label: "세차 전" },
  { out: "samples/before-after/after.png", prompt: "The same white compact SUV, now spotless and glossy with water beads on the paint, parked in the same plain concrete driveway from the same side three-quarter view, overcast daylight, no people, no license plate text.", size: "square_hd", label: "세차 후" },
  { out: "samples/macro-cut/beans.png", prompt: "Extreme macro photograph of roasted coffee beans piled together, oily surfaces catching soft window light, extremely shallow depth of field, warm brown tones.", size: "square_hd", label: "원두 접사" },
  { out: "samples/macro-cut/crema.png", prompt: "Extreme macro photograph of fresh espresso crema swirling in a cup, tiny golden-brown bubbles and foam ridges, extremely shallow depth of field, warm tones.", size: "square_hd", label: "크레마 접사" },
  { out: "samples/wear-swap/product.png", prompt: "A plain mustard-yellow crew-neck cotton t-shirt laid flat on a pure white background, front view, product photo, no logo, no print, no text.", size: "square_hd", label: "무지 티셔츠" },
  // 고정 자산 (refs)
  { out: "refs:doodle/apricot.png", prompt: "Hand-drawn apricot-orange crayon and chalk doodle sparkles and small hearts on a pure black background, uneven line weight.", size: "square_hd", label: "살구빛 낙서" },
  { out: "refs:doodle/pink.png", prompt: "Hand-drawn pink brush-stroke doodle sparkles and hearts on a pure black background, rough texture.", size: "square_hd", label: "핑크 브러시" },
  { out: "refs:doodle/chalk.png", prompt: "Hand-drawn white chalk doodle sparkles and hearts on a pure black background, dusty chalk texture.", size: "square_hd", label: "화이트 초크" },
  { out: "refs:mood/desert.png", prompt: "A vintage car parked on a desert highway at late afternoon, 35mm film look with fine grain and restrained color.", size: "landscape_16_9", label: "사막 하이웨이" },
  { out: "refs:mood/studio.png", prompt: "A seamless minimal white cyclorama photo studio, empty, soft even light.", size: "landscape_16_9", label: "화이트 스튜디오" },
  { out: "refs:mood/cyber.png", prompt: "A nighttime cyber-grunge city street with neon signs, smoke, orange firelight and VHS texture.", size: "landscape_16_9", label: "사이버 그런지" },
];

const THUMB_PROMPTS: Record<string, string> = {
  "before-after": "Split vertical frame: left half a mud-covered white SUV, right half the same SUV gleaming clean, a thin diagonal wipe line between them, driveway setting, no text.",
  "season-swap": "A cozy neighborhood cafe storefront in gentle falling snow with a thin layer of fresh snow on the awning and planters, warm light in the windows, vertical composition, no readable text.",
  "poster-motion": "A printed cafe poster pinned on a warm wall, its elements lifting slightly off the paper as if coming to life, soft motion blur on floating shapes, vertical composition, no readable text.",
  "pop-out": "A corgi leaping out of a framed white poster on a shop wall into the room, becoming three-dimensional as it crosses the frame edge, playful, vertical composition, no readable text.",
  "macro-cut": "Extreme macro of roasted coffee beans dissolving into swirling golden espresso crema, one continuous texture, shallow depth of field, warm tones, vertical composition.",
  "wear-swap": "A young woman walking on a sunny street wearing a plain mustard-yellow t-shirt, medium shot, natural light, vertical composition, no text or logos.",
  "dance-transfer": "A young person mid street-dance move in a softly lit studio, full body, dynamic pose, vertical composition.",
  "meme-recreate": "Three photoreal capybaras forming a pyramid on a living-room floor, locked-off camera, comedic.",
  "ar-magic": "A phone-camera view of a city crosswalk with translucent holographic AR panels floating over real buildings.",
  "style-transform": "A claymation fox character with visible fingerprints in clay, warm practical lighting, centered.",
  "hand-drawn-fx": "A couple walking at dusk with glowing apricot hand-drawn doodle sparkles around them, live-action plus 2D animation.",
  "black-studio-launch": "A premium product launch frame: matte black earbuds case on pure black background, rim light, large negative space.",
  "product-360": "A minimalist ceramic candle rotating on a stone plinth in a premium office, macro detail, cool tones.",
  "fashion-campaign": "A fashion campaign still: model with a black tote bag beside a vintage car on a desert highway, 35mm film.",
  "landing-motion": "A dark sneaker landing page UI on a large monitor with motion blur streaks, glowing cursor.",
  "background-swap": "Split frame: a person on green screen on the left, the same person composited into a neon rainy street on the right.",
  relight: "Split frame: the same street scene at noon on the left and at night with warm lamps on the right.",
  "voice-clone-dub": "Close-up of a person speaking to camera with a waveform overlay glowing beside their face.",
  "store-promo": "A warm vertical ad frame of a cozy neighborhood cafe storefront at golden hour with a bold clean end-card area at the bottom, no readable text.",
  "menu-spotlight": "A premium food commercial frame: glossy Korean fried chicken on a dark plate against pure black with dramatic rim light and space for a big title.",
  "event-notice": "A kinetic typography promo frame: blurred boutique interior with large bold white block shapes where text would slam in, lime green accents, no readable text.",
  "owner-greeting": "A friendly shop owner in an apron smiling at camera behind a cafe counter, vertical framing, warm light.",
  "korean-typo": "Abstract kinetic typography on pure black: large white geometric letter-like blocks colliding and fragmenting with deep red offsets, no readable text.",
};

function outPath(out: string) {
  return out.startsWith("refs:") ? path.join(REFS, out.slice(5)) : path.join(PUBLIC, out);
}

function placeholderSvg(label: string, sub: string, w: number, h: number, hue: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${hue},70%,18%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360},80%,45%)"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${w * 0.75}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.18}" fill="rgba(255,255,255,0.12)"/>
  <text x="${w / 2}" y="${h / 2}" font-family="Arial, sans-serif" font-size="${Math.min(w, h) * 0.07}" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text>
  <text x="${w / 2}" y="${h / 2 + Math.min(w, h) * 0.09}" font-family="Arial, sans-serif" font-size="${Math.min(w, h) * 0.04}" fill="rgba(255,255,255,0.75)" text-anchor="middle">${sub}</text>
</svg>`;
}

const DIMS: Record<Size, [number, number]> = { portrait_16_9: [1080, 1920], landscape_16_9: [1920, 1080], square_hd: [1024, 1024] };
const PLACEHOLDER_DIMS = new Set(Object.values(DIMS).map(([w, h]) => `${w}x${h}`));

/** writePlaceholder 가 만든 SVG 그라데이션 PNG 인지 판별 (정확히 DIMS 크기이고 300KB 이하). gpt-image-2 결과는 1MB 안팎이고 크기가 다르다. */
async function isPlaceholder(file: string): Promise<boolean> {
  try {
    if (fs.statSync(file).size > 300 * 1024) return false;
    const m = await sharp(file).metadata();
    return PLACEHOLDER_DIMS.has(`${m.width}x${m.height}`);
  } catch {
    return false;
  }
}

async function needsWrite(file: string): Promise<boolean> {
  if (force || !fs.existsSync(file)) return true;
  return regenPlaceholders && (await isPlaceholder(file));
}

async function writePlaceholder(file: string, label: string, sub: string, size: Size, seed: number) {
  const [w, h] = DIMS[size];
  const png = await sharp(Buffer.from(placeholderSvg(label, sub, w, h, (seed * 47) % 360))).png().toBuffer();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
}

async function generateWithFal(file: string, prompt: string, size: Size, attempts = 3) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fal.subscribe(H3MAX.sampleImageModel, {
        input: { prompt: prompt + SUFFIX, image_size: size, quality: "medium", num_images: 1, output_format: "png" },
      });
      const url = (r.data as { images?: { url: string }[] }).images?.[0]?.url;
      if (!url) throw new Error("fal returned no image");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download ${res.status}`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      return;
    } catch (e) {
      lastErr = e; // 일시적인 네트워크 오류("fetch failed")가 잦아서 재시도한다
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw lastErr;
}

function writeVoiceWav(file: string) {
  if (fs.existsSync(file) && !force) return;
  const sampleRate = 22050;
  const seconds = 3;
  const n = sampleRate * seconds;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, t * 8, (seconds - t) * 8);
    const v = Math.sin(2 * Math.PI * 440 * t) * 0.4 * env + Math.sin(2 * Math.PI * 660 * t) * 0.15 * env;
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([header, data]));
}

async function main() {
  const useFal = Boolean(env.falKey) && !env.mockForced;
  console.log(`[samples] mode: ${useFal ? "fal-ai/gpt-image-2" : "SVG placeholders (no FAL_KEY)"}${force ? " --force" : regenPlaceholders ? " --placeholders" : ""}`);
  if (useFal) fal.config({ credentials: env.falKey });

  // 사용자 슬롯 샘플 + 고정 자산 + 카드 썸네일을 한 목록으로 모아 동시 4개씩 생성한다 (gpt-image-2 는 장당 1분 안팎)
  type Task = { file: string; name: string; prompt: string; size: Size; label: string; sub: string; seed: number };
  const tasks: Task[] = items.map((it, i) => ({ file: outPath(it.out), name: it.out, prompt: it.prompt, size: it.size, label: it.label, sub: "sample", seed: i + 1 }));
  loadTemplates().forEach((t, i) => {
    tasks.push({
      file: path.join(PUBLIC, "samples", t.id, "thumb.png"),
      name: `thumb ${t.id}`,
      prompt: THUMB_PROMPTS[t.id] ?? t.tagline,
      size: "portrait_16_9",
      label: t.name,
      sub: t.tagline,
      seed: items.length + i + 1,
    });
  });

  const todo: Task[] = [];
  for (const t of tasks) {
    if (await needsWrite(t.file)) todo.push(t);
    else console.log("  skip", t.name);
  }
  console.log(`[samples] ${todo.length} to generate`);

  const CONCURRENCY = 4;
  let cursor = 0;
  async function worker() {
    while (cursor < todo.length) {
      const t = todo[cursor++];
      try {
        if (useFal) await generateWithFal(t.file, t.prompt, t.size);
        else await writePlaceholder(t.file, t.label, t.sub, t.size, t.seed);
        console.log("  wrote", t.name);
      } catch (e) {
        console.warn("  fal failed for", t.name, "→ placeholder:", (e as Error).message);
        await writePlaceholder(t.file, t.label, t.sub, t.size, t.seed);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));

  writeVoiceWav(path.join(PUBLIC, "samples", "mock", "voice.wav"));
  console.log("  wrote samples/mock/voice.wav");

  // manifest 에 고정 이미지 자산 등록
  const m = readManifest();
  const ensure = (id: string, file: string, label: string, w: number, h: number) => {
    if (m.items.some((x) => x.id === id)) return;
    m.items.push({ id, kind: "image", file, label, width: w, height: h });
  };
  ensure("doodle-apricot", "doodle/apricot.png", "살구빛 낙서", 1024, 1024);
  ensure("doodle-pink", "doodle/pink.png", "핑크 브러시", 1024, 1024);
  ensure("doodle-chalk", "doodle/chalk.png", "화이트 초크", 1024, 1024);
  ensure("mood-desert", "mood/desert.png", "사막 하이웨이", 1920, 1080);
  ensure("mood-studio", "mood/studio.png", "화이트 스튜디오", 1920, 1080);
  ensure("mood-cyber", "mood/cyber.png", "사이버 그런지", 1920, 1080);
  writeManifest(m);
  console.log("[samples] manifest items:", m.items.map((x) => x.id).join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

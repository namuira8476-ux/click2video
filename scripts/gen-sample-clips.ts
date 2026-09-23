import "./load-env";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { getEnv } from "@/lib/env";
import { H3MAX } from "@/lib/h3/limits";

/**
 * 영상·오디오 입력 템플릿의 "샘플로 해보기" 자산을 만든다.
 *  - 샘플 클립 5개: H3-Max text-to-video (5초, 768P) → public/samples/clips/*.mp4
 *  - 한국어 목소리 샘플: fal-ai/minimax/speech-02-hd → public/samples/voice/korean-greeting.wav (ffmpeg 로 wav 변환)
 *
 *   npm run clips            # 예상 비용만 출력
 *   npm run clips -- --yes   # 생성 (이미 있는 파일은 건너뜀)
 *   npm run clips -- --yes --force
 */
type Clip = { out: string; label: string; duration: number; ratio: "9:16" | "16:9"; prompt: string };

const CLIPS: Clip[] = [
  {
    out: "samples/clips/talking-owner.mp4",
    label: "말하는 사장님 (보이스 클론 더빙)",
    duration: 5,
    ratio: "9:16",
    prompt:
      'A friendly Korean cafe owner in her thirties wearing a dark apron stands behind a wooden counter and speaks warmly to the camera in Korean, saying "안녕하세요, 카페 봄날입니다. 오늘도 맛있는 커피 준비했어요." Natural lip movement matching the words, clear voice, one gentle hand gesture, warm interior light, medium close-up, locked-off phone camera, photoreal, no subtitles, no on-screen text.',
  },
  {
    out: "samples/clips/couple-dusk.mp4",
    label: "노을 산책 커플 (손그림 이펙트)",
    duration: 5,
    ratio: "16:9",
    prompt:
      "A young couple walks slowly toward the camera along a quiet riverside path at dusk, holding hands and laughing; near the end they lean closer together. Warm golden backlight, soft haze, handheld phone camera with subtle shake, photoreal, ambient sound of footsteps and distant birds, no text.",
  },
  {
    out: "samples/clips/greenscreen-wave.mp4",
    label: "그린스크린 인물 (배경 교체)",
    duration: 5,
    ratio: "9:16",
    prompt:
      "A young man in a plain white t-shirt stands in front of a flat, evenly lit chroma-key green screen, waves at the camera, then points to his left and gives a thumbs up. Even studio lighting, no shadows or wrinkles on the green screen, locked-off camera, medium shot, photoreal, no text.",
  },
  {
    out: "samples/clips/street-noon.mp4",
    label: "한낮의 거리 (릴라이팅)",
    duration: 5,
    ratio: "16:9",
    prompt:
      "A quiet European-style side street at noon under bright sunshine: a woman with a tote bag walks away from the camera past a cafe terrace, a cyclist passes, shop awnings and potted plants line the sidewalk. Slow dolly forward, hard midday shadows, photoreal, natural street ambience, no text.",
  },
  {
    out: "samples/clips/phone-crosswalk.mp4",
    label: "폰 카메라 횡단보도 (AR 매직)",
    duration: 5,
    ratio: "9:16",
    prompt:
      "Handheld smartphone footage from a pedestrian's point of view at a busy city crosswalk in daylight: the operator's hand briefly enters the bottom of the frame pointing across the street, cars pass, people cross, traffic lights change, buildings and trees on both sides. Natural camera sway, photoreal, real city ambience, no text.",
  },
];

// 상품 갈아끼우기(wear-swap)용 내장 스톡 클립 — 무지 옷·무지 소품이 잘 보이고 글자·로고가 없는 장면
CLIPS.push(
  {
    out: "samples/clips/stock-walk.mp4",
    label: "스톡: 무지 티셔츠 워킹 (상품 갈아끼우기)",
    duration: 5,
    ratio: "9:16",
    prompt:
      "A young woman in a plain white crew-neck t-shirt and light-blue jeans walks slowly toward the camera along a quiet sunny street, medium shot from the waist up, she glances at the camera and smiles, natural daylight, photoreal, absolutely no text, logos, prints, or signage anywhere in frame.",
  },
  {
    out: "samples/clips/stock-table.mp4",
    label: "스톡: 무지 머그컵 테이블 (상품 갈아끼우기)",
    duration: 5,
    ratio: "9:16",
    prompt:
      "Top-down medium shot of a person's hands setting a plain white ceramic mug on a wooden cafe table, then resting beside it, warm window light, shallow depth of field, photoreal, absolutely no text, logos, or prints anywhere in frame.",
  },
);

const VOICE = {
  out: "samples/voice/korean-greeting.wav",
  text: "안녕하세요, 카페 봄날 사장입니다. 매일 아침 직접 구운 빵으로 기다리고 있을게요.",
  voiceId: "Calm_Woman",
};

const PUBLIC = path.resolve(process.cwd(), "public");

async function download(url: string, file: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

async function genClip(c: Clip) {
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
  if (!url) throw new Error(`${c.out}: no video url`);
  await download(url, path.join(PUBLIC, c.out));
}

async function genVoice() {
  const r = await fal.subscribe("fal-ai/minimax/speech-02-hd", {
    input: {
      text: VOICE.text,
      output_format: "url",
      language_boost: "Korean",
      voice_setting: { voice_id: VOICE.voiceId, speed: 1, vol: 1, pitch: 0 },
      // audio_setting 은 생략: 기본값(mp3 · 32kHz · mono · 128kbps)이 원하는 값이고, 명시하면 클라이언트 타입/서버 스키마 불일치로 422 가 난다
    },
  });
  const url = (r.data as { audio?: { url?: string } }).audio?.url;
  if (!url) throw new Error("voice: no audio url");
  const wav = path.join(PUBLIC, VOICE.out);
  const mp3 = wav.replace(/\.wav$/, ".mp3");
  await download(url, mp3);
  try {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", mp3, "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", wav]);
    fs.unlinkSync(mp3);
  } catch (e) {
    console.warn("  ffmpeg 변환 실패 → mp3 로 남깁니다. 템플릿 sampleInputs 를 .mp3 로 바꾸세요:", (e as Error).message);
  }
}

async function main() {
  const env = getEnv();
  if (env.mockForced || !env.falKey) {
    console.error("[clips] FAL_KEY 가 필요합니다.");
    process.exit(1);
  }
  fal.config({ credentials: env.falKey });
  const yes = process.argv.includes("--yes");
  const force = process.argv.includes("--force");

  const todo = CLIPS.filter((c) => force || !fs.existsSync(path.join(PUBLIC, c.out)));
  const voiceTodo = force || !fs.existsSync(path.join(PUBLIC, VOICE.out));
  const cost = todo.reduce((s, c) => s + c.duration * env.priceOutput768P, 0);
  console.log(`[clips] 클립 ${todo.length}개 (≈ $${cost.toFixed(2)}, 768P $${env.priceOutput768P}/s) + 목소리 ${voiceTodo ? "1개 (TTS, 소액)" : "0개"}`);
  for (const c of todo) console.log(`  ${c.out.padEnd(40)} ${c.duration}s ${c.ratio}  ${c.label}`);
  if (!yes) {
    console.log("실행하려면 --yes 를 붙이세요.");
    return;
  }
  if (voiceTodo) {
    console.log("[clips] generating voice");
    await genVoice();
    console.log("  saved", VOICE.out);
  }
  for (const c of todo) {
    console.log("[clips] generating", c.out);
    await genClip(c);
    console.log("  saved", c.out);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

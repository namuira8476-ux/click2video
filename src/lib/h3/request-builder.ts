import type { PromptExpansion, Ratio, Resolution } from "./limits";
import type { RefOrder, ResolvedAsset } from "@/lib/templates/prompt-renderer";

/** fal `minimax/h3-max/reference-to-video` 입력 (docs/제안서.md §4.3) */
export type ReferenceToVideoInput = {
  prompt: string;
  duration: number;
  resolution: Resolution;
  aspect_ratio: Ratio;
  prompt_expansion_mode: PromptExpansion;
  enable_safety_checker: boolean;
  reference_image_urls?: string[];
  reference_video_urls?: string[];
  reference_audio_urls?: string[];
  seed?: number;
};

/**
 * fal `minimax/h3-max/image-to-video` 입력 — 첫/끝 프레임 모드.
 * 화면비는 첫 이미지를 따르므로 aspect_ratio 가 없다. 레퍼런스 배열도 받지 않는다.
 */
export type ImageToVideoInput = {
  prompt: string;
  duration: number;
  resolution: Resolution;
  prompt_expansion_mode: PromptExpansion;
  enable_safety_checker: boolean;
  image_url: string;
  end_image_url?: string;
  seed?: number;
};

export type H3Mode = "reference" | "first-last";

/** 엔진에 넘기는 요청. 모드에 따라 엔드포인트와 입력 모양이 다르다. */
export type H3Request = { mode: "reference"; input: ReferenceToVideoInput } | { mode: "first-last"; input: ImageToVideoInput };

export type ReferenceToVideoOutput = {
  video: { url: string; content_type?: string; file_name?: string; file_size?: number };
  expanded_prompt?: string | null;
  seed?: number;
  timings?: Record<string, number> | null;
};

type BuildArgs = {
  prompt: string;
  assets: ResolvedAsset[];
  order: RefOrder;
  resolution: Resolution;
  duration: number;
  ratio: Ratio;
  promptExpansion: PromptExpansion;
  seed?: number;
};

function urlsFor(assets: ResolvedAsset[], keys: string[]): string[] {
  const byKey = new Map(assets.map((a) => [a.slotKey, a]));
  return keys.map((k) => {
    const a = byKey.get(k);
    if (!a) throw new Error(`asset for slot ${k} missing`);
    if (!a.url) throw new Error(`asset for slot ${k} has no url`);
    return a.url;
  });
}

export function buildReferenceInput(args: BuildArgs): ReferenceToVideoInput {
  const images = urlsFor(args.assets, args.order.image);
  const videos = urlsFor(args.assets, args.order.video);
  const audios = urlsFor(args.assets, args.order.audio);
  if (images.length + videos.length + audios.length === 0) throw new Error("reference mode needs at least one asset");
  if (audios.length > 0 && images.length === 0 && videos.length === 0) throw new Error("audio cannot be the only reference");

  const input: ReferenceToVideoInput = {
    prompt: args.prompt,
    duration: args.duration,
    resolution: args.resolution,
    aspect_ratio: args.ratio,
    prompt_expansion_mode: args.promptExpansion,
    enable_safety_checker: true,
  };
  if (images.length) input.reference_image_urls = images;
  if (videos.length) input.reference_video_urls = videos;
  if (audios.length) input.reference_audio_urls = audios;
  if (args.seed !== undefined) input.seed = args.seed;
  return input;
}

/** 첫/끝 프레임 모드: 이미지 슬롯 순서대로 첫 번째가 시작 프레임, 두 번째가 끝 프레임. */
export function buildImageToVideoInput(args: Omit<BuildArgs, "ratio">): ImageToVideoInput {
  const images = urlsFor(args.assets, args.order.image);
  if (images.length < 1 || images.length > 2) throw new Error(`first-last mode needs 1 or 2 images (got ${images.length})`);
  if (args.order.video.length || args.order.audio.length) throw new Error("first-last mode accepts images only");
  const input: ImageToVideoInput = {
    prompt: args.prompt,
    duration: args.duration,
    resolution: args.resolution,
    prompt_expansion_mode: args.promptExpansion,
    enable_safety_checker: true,
    image_url: images[0],
  };
  if (images[1]) input.end_image_url = images[1];
  if (args.seed !== undefined) input.seed = args.seed;
  return input;
}

export function buildRequest(mode: H3Mode, args: BuildArgs): H3Request {
  return mode === "first-last" ? { mode, input: buildImageToVideoInput(args) } : { mode, input: buildReferenceInput(args) };
}

/**
 * 로그·DB 저장용 스냅샷.
 *
 * **허용 목록(allowlist)** 으로 만든다 — 스프레드로 통째로 복사하면 H3Request 에 필드가 하나
 * 추가될 때마다(예: 자격증명) 그대로 D1 과 작업 상세 화면으로 샌다. 자산 URL 은 fal 계정에
 * 묶인 capability URL 이라 개수만 남기고 내용은 남기지 않는다.
 */
export function maskInput(req: H3Request): Record<string, unknown> {
  const i = req.input;
  const out: Record<string, unknown> = {
    mode: req.mode,
    prompt: i.prompt,
    duration: i.duration,
    resolution: i.resolution,
    prompt_expansion_mode: i.prompt_expansion_mode,
    enable_safety_checker: i.enable_safety_checker,
  };
  if (req.mode === "first-last") {
    out.images = req.input.end_image_url ? 2 : 1;
  } else {
    out.aspect_ratio = req.input.aspect_ratio;
    out.reference_images = req.input.reference_image_urls?.length ?? 0;
    out.reference_videos = req.input.reference_video_urls?.length ?? 0;
    out.reference_audios = req.input.reference_audio_urls?.length ?? 0;
  }
  return out;
}

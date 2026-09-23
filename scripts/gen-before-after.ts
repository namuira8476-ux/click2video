import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { getEnv } from "@/lib/env";

/**
 * 전후 비교 샘플을 "같은 차, 같은 자리"로 만든다.
 * 프롬프트 두 개로 따로 생성하면 차종·날씨가 달라져 전후 비교가 아니라 다른 차 두 대가 된다(1차 시도에서 확인).
 * 그래서 깨끗한 차(after)를 먼저 만들고, 그 이미지를 gpt-image-2/edit 로 "흙먼지만 입힌" before 를 만든다.
 *
 *   npx tsx scripts/gen-before-after.ts [--force]
 */
const force = process.argv.includes("--force");
const PUBLIC = path.resolve(process.cwd(), "public");
const AFTER = path.join(PUBLIC, "samples/before-after/after.png");
const BEFORE = path.join(PUBLIC, "samples/before-after/before.png");

async function download(url: string, file: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const env = getEnv();
  if (env.mockForced || !env.falKey) throw new Error("FAL_KEY 가 필요합니다.");
  fal.config({ credentials: env.falKey });

  if (force || !fs.existsSync(AFTER)) {
    console.log("[before-after] after: clean unbranded SUV");
    const r = await fal.subscribe("fal-ai/gpt-image-2", {
      input: {
        prompt:
          "A generic unbranded white compact SUV, freshly washed and glossy with a few water beads on the paint, parked on a plain light-grey concrete driveway in front of a plain beige wall, side three-quarter view from slightly above, soft overcast daylight. No badges, no emblems, no brand logos, blank grille, no license plate text, no people. Photorealistic.",
        image_size: "square_hd",
        quality: "medium",
        num_images: 1,
        output_format: "png",
      },
    });
    const url = (r.data as { images?: { url: string }[] }).images?.[0]?.url;
    if (!url) throw new Error("no image");
    await download(url, AFTER);
    console.log("  saved after.png");
  }

  if (force || !fs.existsSync(BEFORE)) {
    console.log("[before-after] before: same car, edited to be dirty");
    const afterUrl = await fal.storage.upload(new File([fs.readFileSync(AFTER)], "after.png", { type: "image/png" }));
    const r = await fal.subscribe("fal-ai/gpt-image-2/edit", {
      input: {
        prompt:
          "Make this exact same car look like it has not been washed for months: cover the lower body, wheels, wheel arches and doors in dried mud splatter and a dull layer of road dust, remove the water beads and gloss so the paint looks matte and dirty. Keep everything else identical — same car, same angle, same position, same driveway, wall, lighting and framing. No badges, no logos, no text.",
        image_urls: [afterUrl],
        image_size: "auto",
        quality: "medium",
        num_images: 1,
        output_format: "png",
      },
    });
    const url = (r.data as { images?: { url: string }[] }).images?.[0]?.url;
    if (!url) throw new Error("no image");
    await download(url, BEFORE);
    console.log("  saved before.png");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

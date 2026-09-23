import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { GUEST_USER_ID } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { H3MAX, type PromptExpansion, type Ratio, type Resolution } from "@/lib/h3/limits";
import { buildRequest } from "@/lib/h3/request-builder";
import { materializeUrl } from "@/lib/jobs/materialize";
import { resolveAssets } from "@/lib/jobs/resolve-assets";
import { prepareJob } from "@/lib/jobs/service";
import { hydrateTemplate, loadTemplates } from "@/lib/templates/loader";
import { assignRefs } from "@/lib/templates/prompt-renderer";
import type { Template } from "@/lib/templates/schema";

/**
 * 템플릿별 카드 프리뷰 영상을 실제 H3-Max 로 1회 생성해 public/samples/<id>/preview.mp4 에 저장한다.
 * FAL_KEY 가 있어야 하며, 예상 비용을 출력한 뒤 --yes 가 없으면 중단한다. 이미 있는 프리뷰는 건너뛴다.
 */
async function main() {
  const env = getEnv();
  if (env.mockForced || !env.falKey) {
    console.error("[previews] FAL_KEY 가 필요합니다 (MOCK 모드에서는 생성하지 않습니다).");
    process.exit(1);
  }
  fal.config({ credentials: env.falKey });
  const yes = process.argv.includes("--yes");
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

  const targets: { t: Template; prepared: Awaited<ReturnType<typeof prepareJob>> }[] = [];
  for (const t of loadTemplates()) {
    if (only && t.id !== only) continue;
    const file = path.resolve(process.cwd(), "public", "samples", t.id, "preview.mp4");
    if (fs.existsSync(file)) {
      console.log("  skip (exists)", t.id);
      continue;
    }
    const slots = Object.fromEntries(Object.entries(t.sampleInputs).map(([k, v]) => [k, `sample:${v}`]));
    const prepared = await prepareJob({ templateId: t.id, slots, options: {}, consent: true }, GUEST_USER_ID);
    if (prepared.errors.length) {
      console.warn("  cannot generate", t.id, "→", prepared.errors.join(" / "));
      continue;
    }
    targets.push({ t, prepared });
  }
  if (targets.length === 0) {
    console.log("[previews] nothing to do");
    return;
  }

  const total = targets.reduce((s, x) => s + x.prepared.estimate.totalUsd, 0);
  console.log("[previews] 예상 비용:");
  for (const x of targets) console.log(`  ${x.t.id.padEnd(22)} $${x.prepared.estimate.totalUsd.toFixed(2)}  (${x.prepared.gen.resolution} ${x.prepared.gen.duration}s)`);
  console.log(`  합계 ≈ $${total.toFixed(2)} (fal 정가 기준)`);
  if (!yes) {
    console.log("실행하려면 --yes 를 붙이세요. 특정 템플릿만: --only=<templateId>");
    return;
  }

  for (const { t, prepared } of targets) {
    console.log("[previews] generating", t.id);
    const template = hydrateTemplate(t);
    const assets = await resolveAssets(template, prepared.inputs, "guest");
    for (const a of assets) a.url = await materializeUrl(a, env.falKey);
    const { order } = assignRefs(template, assets);
    const req = buildRequest(template.mode, {
      prompt: prepared.prompt,
      assets,
      order,
      resolution: prepared.gen.resolution as Resolution,
      duration: prepared.gen.duration,
      ratio: prepared.gen.ratio as Ratio,
      promptExpansion: prepared.gen.promptExpansion as PromptExpansion,
    });
    const r = await fal.subscribe(req.mode === "first-last" ? H3MAX.endpoint.image : H3MAX.endpoint.reference, {
      input: req.input,
      logs: true,
      onQueueUpdate: (u) => {
        if (u.status === "IN_PROGRESS") u.logs?.slice(-1).forEach((l) => console.log("   ", l.message));
      },
    });
    const url = (r.data as { video?: { url?: string } }).video?.url;
    if (!url) throw new Error("no video url");
    const res = await fetch(url);
    const file = path.resolve(process.cwd(), "public", "samples", t.id, "preview.mp4");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log("  saved", path.relative(process.cwd(), file));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

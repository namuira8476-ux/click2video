/**
 * Cloudflare Worker 진입점.
 *
 * OpenNext 가 만든 `.open-next/worker.js` 를 그대로 쓰되 `scheduled` 핸들러를 덧붙인다.
 *
 * 기본 배포(BYOK)는 서버에 fal 키가 없어 크론이 작업을 진행시킬 수 없으므로 wrangler.jsonc 에
 * 크론 트리거를 두지 않는다 — 브라우저가 `POST /api/jobs/:id/step` 으로 자기 작업을 민다.
 * 서버 키로 도는 운영자 단독 배포에서만 크론을 켜면 이 핸들러가 `/api/cron` 을 내부 호출한다.
 */
import openNext from "../.open-next/worker.js";

export { DOQueueHandler } from "../.open-next/.build/durable-objects/queue.js";
export { DOShardedTagCache } from "../.open-next/.build/durable-objects/sharded-tag-cache.js";
export { BucketCachePurge } from "../.open-next/.build/durable-objects/bucket-cache-purge.js";

type Env = { PUBLIC_BASE_URL?: string };

export default {
  fetch: openNext.fetch,

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    // 자기 자신의 공개 주소. 설정이 없으면 크론 요청을 보낼 곳이 없으므로 건너뛴다.
    const base = env.PUBLIC_BASE_URL;
    if (!base || base.includes("<YOUR_")) return;
    const req = new Request(`${base}/api/cron`, { headers: { "x-c2v-cron": "1" } });
    ctx.waitUntil(
      (openNext.fetch as (r: Request, e: unknown, c: ExecutionContext) => Promise<Response>)(req, env, ctx)
        .then(async (res) => {
          if (!res.ok) console.error("[cron] /api/cron returned", res.status, await res.text());
        })
        .catch((e) => console.error("[cron] failed", e)),
    );
  },
} satisfies ExportedHandler<Env>;

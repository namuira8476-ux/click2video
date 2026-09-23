import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getH3Client } from "@/lib/h3";
import { H3MAX } from "@/lib/h3/limits";
import { getRefItem, setRefFalUrl } from "@/lib/refs/manifest";
import { hasFileSystem, absolutePublicUrl } from "@/lib/runtime";
import { nodeRequire } from "@/lib/node-only";
import { getStorage } from "@/lib/storage";
import type { ResolvedAsset } from "@/lib/templates/prompt-renderer";
import { publicUrlFor } from "./resolve-assets";

const FAL_URL_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * 자산을 fal 이 읽을 수 있는 URL 로 만든다.
 *
 * 우선순위:
 *  1. 이미 URL 이 있으면 그대로 (업로드 시 fal 에 올려 둔 사용자 파일)
 *  2. 캐시된 fal URL (로컬에서 올린 고정 자산)
 *  3. 로컬 파일이 있으면 읽어서 data URI(작은 이미지) 또는 fal 업로드
 *  4. 공개 정적 자산이면 사이트의 절대 URL — fal 이 직접 가져간다 (Cloudflare 경로)
 */
export async function materializeUrl(a: ResolvedAsset, userKey: string): Promise<string> {
  const client = getH3Client(userKey);
  if (client.isMock) {
    const u = await publicUrlFor(a);
    if (!u) throw new Error(`mock: no public url for slot ${a.slotKey}`);
    return u;
  }

  if (a.url) return a.url;

  const now = Date.now();
  if (a.source === "ref" && a.assetId) {
    const item = getRefItem(a.assetId.slice(4));
    if (item?.falUrl && item.falUrlAt && now - item.falUrlAt < FAL_URL_TTL_MS) return item.falUrl;
  }
  if (a.source === "user" && a.assetId) {
    const row = await getDb().select().from(schema.assets).where(eq(schema.assets.id, a.assetId)).get();
    if (row?.falUrl && row.falUrlAt && now - row.falUrlAt < FAL_URL_TTL_MS) return row.falUrl;
  }

  if (a.localPath && hasFileSystem()) {
    const fs = nodeRequire<typeof import("node:fs")>("node:fs");
    const buf: Buffer = fs.readFileSync(a.localPath);
    if (a.kind === "image" && buf.length <= H3MAX.inlineImageMaxBytes && a.mime.startsWith("image/") && a.mime !== "image/svg+xml") {
      return `data:${a.mime};base64,${buf.toString("base64")}`;
    }
    const url = await client.upload({ buffer: buf, mime: a.mime, filename: a.filename });
    if (a.source === "ref" && a.assetId) setRefFalUrl(a.assetId.slice(4), url);
    if (a.source === "user" && a.assetId) {
      await getDb().update(schema.assets).set({ falUrl: url, falUrlAt: now }).where(eq(schema.assets.id, a.assetId)).run();
    }
    return url;
  }

  // R2 등 로컬 파일이 없는 저장소: 바이트를 읽어 fal 로 올리고 URL 을 캐시한다.
  if (a.storageKey) {
    const bytes = await getStorage().get(a.storageKey);
    const url = await client.upload({ buffer: bytes, mime: a.mime, filename: a.filename });
    if (a.source === "user" && a.assetId) {
      await getDb().update(schema.assets).set({ falUrl: url, falUrlAt: now }).where(eq(schema.assets.id, a.assetId)).run();
    }
    return url;
  }

  // Cloudflare: 로컬 파일이 없다. 공개 정적 자산은 절대 URL 로 넘기면 fal 이 직접 가져간다.
  if (a.publicPath) {
    const abs = absolutePublicUrl(a.publicPath);
    if (abs) return abs;
    throw new Error(`PUBLIC_BASE_URL 이 설정되지 않아 '${a.slotKey}' 의 공개 URL 을 만들 수 없습니다.`);
  }

  throw new Error(`asset for slot ${a.slotKey} has no usable source`);
}

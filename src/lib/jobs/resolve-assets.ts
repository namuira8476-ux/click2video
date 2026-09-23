import { eq } from "drizzle-orm";
import { BUNDLED_MEDIA_META, BUNDLED_PUBLIC_FILES } from "@/generated/static-data";
import { getDb, schema } from "@/lib/db";
import type { JobInputs } from "@/lib/db/schema";
import { kindFromMime, type MediaKind } from "@/lib/h3/limits";
import { renderTextImage, textImageKey, type TextImageStyle } from "@/lib/media/text-image";
import { getRefItem, type RefItemView } from "@/lib/refs/manifest";
import { hasFileSystem } from "@/lib/runtime";
import { nodeRequire } from "@/lib/node-only";
import { getStorage, hasStorage, tryGetStorage } from "@/lib/storage";
import type { ResolvedAsset } from "@/lib/templates/prompt-renderer";
import type { Template } from "@/lib/templates/schema";

export class ResolveError extends Error {}

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  svg: "image/svg+xml",
};

function mimeFor(file: string) {
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function basename(p: string) {
  return p.split(/[\\/]/).pop() ?? p;
}

/**
 * `sample:/samples/...` 값은 클라이언트가 보내는 문자열이다. public/samples 아래의 실제 파일만 허용한다
 * (절대 경로·역슬래시·널 문자·`..` 로 밖의 파일을 가리키는 것을 막는다).
 * Cloudflare Workers 에는 파일 시스템이 없으므로 빌드 시 만든 파일 목록으로 검증한다.
 */
export function resolveSamplePath(publicPath: string): string | null {
  if (typeof publicPath !== "string" || publicPath.includes("\0") || publicPath.includes("\\")) return null;
  if (!publicPath.startsWith("/samples/")) return null;
  const rel = publicPath.slice("/samples/".length);
  if (rel.split("/").some((s) => s === "" || s === "." || s === "..")) return null;
  if (!BUNDLED_PUBLIC_FILES.has(publicPath)) return null;
  return publicPath;
}

/** 공개 자산(samples·refs)의 크기·길이. Workers 에서는 빌드 시 잰 값을 쓴다. */
function publicMeta(publicPath: string): Partial<ResolvedAsset> {
  const m = BUNDLED_MEDIA_META[publicPath];
  if (!m) return { bytes: 0 };
  return { bytes: m.bytes, width: m.width, height: m.height, durationSec: m.durationSec };
}

function localPathFor(publicPath: string): string | undefined {
  if (!hasFileSystem()) return undefined;
  const path = nodeRequire<typeof import("node:path")>("node:path");
  return path.resolve(process.cwd(), "public", publicPath.replace(/^\//, ""));
}

async function fromSample(slotKey: string, kind: MediaKind, publicPath: string): Promise<ResolvedAsset> {
  const ok = resolveSamplePath(publicPath);
  if (!ok) throw new ResolveError(`샘플 파일이 없습니다: ${publicPath}. npm run setup 을 먼저 실행하세요.`);
  return {
    slotKey,
    kind,
    source: "sample",
    mime: mimeFor(ok),
    filename: basename(ok),
    publicPath: ok,
    localPath: localPathFor(ok),
    bytes: 0,
    ...publicMeta(ok),
  };
}

async function fromRef(slotKey: string, kind: MediaKind, item: RefItemView): Promise<ResolvedAsset> {
  if (!item.available) throw new ResolveError(`고정 자산 '${item.label}' 파일이 아직 준비되지 않았습니다.`);
  const meta = publicMeta(item.publicUrl);
  return {
    slotKey,
    kind,
    source: "ref",
    bytes: meta.bytes ?? 0,
    mime: mimeFor(item.file),
    filename: basename(item.file),
    publicPath: item.publicUrl,
    localPath: item.localPath ?? undefined,
    width: item.width ?? meta.width,
    height: item.height ?? meta.height,
    durationSec: item.durationSec ?? meta.durationSec,
    assetId: `ref:${item.id}`,
  };
}

/**
 * 텍스트 옵션(한국어 등)을 PNG 로 렌더링한다.
 * 로컬에서만 가능하다 — 래스터라이저(sharp)가 네이티브라 Workers 에서 돌지 않는다.
 * 배포 환경에서는 브라우저가 캔버스로 그려 일반 업로드로 보내므로 이 경로를 타지 않는다.
 */
async function fromText(slotKey: string, text: string, style: TextImageStyle): Promise<ResolvedAsset> {
  if (!hasFileSystem()) {
    // Cloudflare: 아직 브라우저가 그린 이미지를 받기 전이다(견적 단계).
    // 크기가 정해져 있으므로 자리표시 자산으로 견적·검증만 통과시키고, 실제 URL 은 제출 때 업로드본에서 온다.
    return {
      slotKey,
      kind: "image",
      source: "generated",
      bytes: 60 * 1024,
      mime: "image/png",
      filename: `${slotKey}.png`,
      width: 1024,
      height: 1024,
      assetId: `gen:${textImageKey(text, style)}`,
    };
  }
  const fs = nodeRequire<typeof import("node:fs")>("node:fs");
  const storage = getStorage();
  const key = textImageKey(text, style);
  if (!(await storage.exists(key))) await storage.put(key, await renderTextImage(text, style), "image/png");
  const localPath = storage.localPath(key)!;
  const buf = fs.readFileSync(localPath);
  return {
    slotKey,
    kind: "image",
    source: "generated",
    bytes: buf.length,
    mime: "image/png",
    filename: basename(key),
    localPath,
    width: 1024,
    height: 1024,
    assetId: `gen:${key}`,
  };
}

async function fromDb(slotKey: string, kind: MediaKind, assetId: string, userId: string): Promise<ResolvedAsset> {
  const a = await getDb().select().from(schema.assets).where(eq(schema.assets.id, assetId)).get();
  if (!a || a.userId !== userId) throw new ResolveError(`업로드한 파일을 찾을 수 없습니다 (${slotKey}).`);
  const k = a.kind as MediaKind;
  return {
    slotKey,
    kind: k === kind ? kind : k,
    source: "user",
    bytes: a.bytes,
    mime: a.mime,
    filename: a.originalName,
    width: a.width ?? undefined,
    height: a.height ?? undefined,
    durationSec: a.durationSec ?? undefined,
    // 업로드 시점에 fal 로 올려 둔 URL 이 있으면 그대로 쓴다 (Workers 에는 로컬 파일이 없다).
    url: a.falUrl ?? undefined,
    localPath: hasFileSystem() ? (tryGetStorage()?.localPath(a.key) ?? undefined) : undefined,
    // R2 등 로컬 파일이 없는 저장소면 키로 바이트를 읽어 fal 에 올린다 (fal URL 이 아직 없을 때).
    storageKey: !a.falUrl && hasStorage() ? a.key : undefined,
    assetId: a.id,
  };
}

/** JobInputs 의 슬롯 값을 실제 파일 정보로 바꾼다. 템플릿은 hydrate 된 것을 넘겨야 한다. */
export async function resolveAssets(template: Template, inputs: JobInputs, userId: string): Promise<ResolvedAsset[]> {
  const out: ResolvedAsset[] = [];
  for (const slot of template.slots) {
    if (slot.source === "user") {
      const v = inputs.slots[slot.key];
      if (!v) continue;
      if (v.startsWith("sample:")) out.push(await fromSample(slot.key, slot.kind, v.slice("sample:".length)));
      else if (v.startsWith("ref:")) {
        const item = getRefItem(v.slice(4));
        if (!item) throw new ResolveError(`고정 자산 '${v}' 을 찾을 수 없습니다.`);
        out.push(await fromRef(slot.key, slot.kind, item));
      } else out.push(await fromDb(slot.key, slot.kind, v, userId));
    } else if (slot.source === "fixed") {
      const item = getRefItem(slot.refId!);
      if (!item) throw new ResolveError(`고정 자산 '${slot.refId}' 을 찾을 수 없습니다.`);
      out.push(await fromRef(slot.key, slot.kind, item));
    } else if (slot.source === "textImage") {
      // 클라이언트가 캔버스로 그려 올린 이미지가 있으면 그것을 쓴다 (배포 환경의 기본 경로).
      const uploaded = inputs.slots[slot.key];
      if (uploaded) {
        out.push(await fromDb(slot.key, "image", uploaded, userId));
        continue;
      }
      const raw = inputs.options[slot.optionKey ?? ""];
      const text = typeof raw === "string" ? raw.trim() : "";
      if (!text) continue; // 필수 여부는 validateInputs 가 판단
      out.push(await fromText(slot.key, text, slot.textStyle ?? "dark"));
    } else {
      if (slot.skipIfSlot && inputs.slots[slot.skipIfSlot]) continue;
      const opt = template.options.find((o) => o.key === slot.optionKey);
      if (!opt || opt.type !== "select") continue;
      const raw = inputs.options[opt.key];
      const value = typeof raw === "string" && raw !== "" ? raw : opt.default;
      const chosen = opt.values.find((x) => x.value === value);
      if (!chosen?.refId) {
        if (slot.required) throw new ResolveError(`'${slot.label}' 고정 자산이 준비되지 않았습니다.`);
        continue;
      }
      const item = getRefItem(chosen.refId);
      if (!item) throw new ResolveError(`고정 자산 '${chosen.refId}' 을 찾을 수 없습니다.`);
      out.push(await fromRef(slot.key, slot.kind, item));
    }
  }
  return out;
}

/** UI 미리보기용 URL (사이트 상대 경로) */
export async function publicUrlFor(a: ResolvedAsset): Promise<string | null> {
  if (a.publicPath) return a.publicPath;
  if (a.source === "generated" && a.assetId && hasStorage()) return getStorage().publicUrl(a.assetId.slice(4));
  if (a.source === "user" && a.assetId) {
    const row = await getDb().select().from(schema.assets).where(eq(schema.assets.id, a.assetId)).get();
    if (!row) return null;
    return row.falUrl ?? (hasStorage() ? getStorage().publicUrl(row.key) : null);
  }
  return a.url ?? null;
}

export function detectKind(mime: string, filename: string): MediaKind | null {
  return kindFromMime(mime, filename);
}

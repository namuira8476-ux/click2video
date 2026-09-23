import fs from "node:fs";
import path from "node:path";
import { BUNDLED_REF_MANIFEST } from "@/generated/static-data";
import { hasFileSystem } from "@/lib/runtime";
import { refManifestSchema, type RefItem, type RefManifest } from "@/lib/templates/schema";
import type { SelectValue } from "@/lib/templates/schema";

/**
 * 고정 레퍼런스 자산(댄스·밈 클립, 무드·낙서 이미지)은 `public/refs/` 에 있다.
 * Cloudflare Workers 에는 파일 시스템이 없어 정적 자산으로 서빙해야 하고, fal 도 공개 URL 로 읽어간다.
 * 로컬에서는 파일을 직접 읽고, 읽을 수 없는 환경(Workers)에서는 빌드 시 인라인된 번들을 쓴다.
 */
export type RefItemView = RefItem & { available: boolean; localPath: string | null; publicUrl: string };

function refsDir() {
  return path.resolve(process.cwd(), "public", "refs");
}

function manifestPath() {
  return path.join(refsDir(), "manifest.json");
}

/** 파일 시스템을 쓸 수 있는 환경인가 (로컬 Node = yes, Workers = no) */
function hasFs(): boolean {
  return hasFileSystem() && fs.existsSync(refsDir());
}

export function readManifest(): RefManifest {
  let raw: unknown = BUNDLED_REF_MANIFEST;
  if (hasFs()) {
    try {
      const p = manifestPath();
      if (fs.existsSync(p)) raw = JSON.parse(fs.readFileSync(p, "utf8"));
    } catch (e) {
      console.warn("[refs] manifest.json unreadable, using bundled copy:", e);
    }
  }
  const parsed = refManifestSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[refs] manifest invalid:", parsed.error.issues.map((i) => i.message).join("; "));
    return { items: [] };
  }
  return parsed.data;
}

export function writeManifest(m: RefManifest) {
  if (!hasFs()) throw new Error("manifest 는 로컬에서만 쓸 수 있습니다.");
  const p = manifestPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(m, null, 2) + "\n", "utf8");
}

export function listRefItems(): RefItemView[] {
  const fsOk = hasFs();
  return readManifest().items.map((it) => {
    const file = it.file.replace(/\\/g, "/");
    const localPath = fsOk ? path.join(refsDir(), it.file) : null;
    // Workers 에서는 번들에 들어 있다는 것 자체가 빌드 시점에 파일이 있었다는 뜻이다.
    const available = fsOk ? fs.existsSync(localPath!) : true;
    return { ...it, localPath, available, publicUrl: `/refs/${file}` };
  });
}

export function getRefItem(id: string): RefItemView | undefined {
  return listRefItems().find((i) => i.id === id);
}

/** manifest 항목을 select 값으로 변환. prefix 예: "dance" → id 가 "dance-" 로 시작하는 항목 */
export function dynamicSelectValues(prefix: string): (SelectValue & { available: boolean })[] {
  return listRefItems()
    .filter((i) => i.id.startsWith(`${prefix}-`))
    .map((i) => ({
      value: i.id,
      label: i.label,
      refId: i.id,
      durationSec: i.durationSec,
      previewUrl: i.publicUrl,
      kind: i.kind,
      available: i.available,
    }));
}

/** fal 업로드 URL 캐시 갱신 (로컬 전용 — Workers 에서는 공개 URL 을 그대로 쓴다) */
export function setRefFalUrl(id: string, falUrl: string) {
  if (!hasFs()) return;
  const m = readManifest();
  const it = m.items.find((i) => i.id === id);
  if (!it) return;
  it.falUrl = falUrl;
  it.falUrlAt = Date.now();
  writeManifest(m);
}

import fs from "node:fs";
import path from "node:path";
import { probeImageSync, probeMp4Dimensions, probeMp4Duration, probeWavDuration } from "../src/lib/media/probe";

/**
 * templates/*.json 과 public/refs/manifest.json 을 소스로 인라인해 `src/generated/static-data.ts` 를 만든다.
 * Cloudflare Workers 에는 파일 시스템이 없어서 런타임에 읽을 수 없기 때문이다.
 * 로컬 dev 는 여전히 파일을 직접 읽고, 읽기에 실패할 때만 이 번들로 폴백한다.
 *
 *   npx tsx scripts/bundle-static.ts     # prebuild 에서 자동 실행
 */
const root = process.cwd();
const templatesDir = path.join(root, "templates");
const manifestPath = path.join(root, "public", "refs", "manifest.json");
const outFile = path.join(root, "src", "generated", "static-data.ts");

const templates: Record<string, unknown> = {};
for (const f of fs.readdirSync(templatesDir).filter((f) => f.endsWith(".json")).sort()) {
  templates[f] = JSON.parse(fs.readFileSync(path.join(templatesDir, f), "utf8"));
}

const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : { items: [] };

// public/ 아래 실제로 존재하는 파일 목록. Workers 에는 fs 가 없어 썸네일·프리뷰 존재 여부를 이걸로 판단한다.
function walkPublic(dir: string, base: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walkPublic(p, base) : ["/" + path.relative(base, p).split(path.sep).join("/")];
  });
}
const publicRoot = path.join(root, "public");
const publicFiles = [...walkPublic(path.join(publicRoot, "samples"), publicRoot), ...walkPublic(path.join(publicRoot, "refs"), publicRoot)].sort();

// 각 공개 미디어의 크기·길이. Workers 에는 파일이 없어 런타임에 잴 수 없으므로 빌드 때 재서 넣는다.
type Meta = { bytes: number; width?: number; height?: number; durationSec?: number };
const meta: Record<string, Meta> = {};
for (const rel of publicFiles) {
  const abs = path.join(publicRoot, rel.replace(/^\//, ""));
  const buf = fs.readFileSync(abs);
  const m: Meta = { bytes: buf.length };
  if (/\.(png|jpe?g|webp)$/i.test(rel)) {
    const d = probeImageSync(buf);
    if (d) {
      m.width = d.width;
      m.height = d.height;
    }
  } else if (/\.mp4$/i.test(rel)) {
    const d = probeMp4Duration(buf);
    if (d) m.durationSec = d;
    const dim = probeMp4Dimensions(buf);
    if (dim) {
      m.width = dim.width;
      m.height = dim.height;
    }
  } else if (/\.wav$/i.test(rel)) {
    const d = probeWavDuration(buf);
    if (d) m.durationSec = d;
  }
  meta[rel] = m;
}

const body = `// 자동 생성 파일 — 직접 고치지 말 것. \`npx tsx scripts/bundle-static.ts\` 가 만든다.
// 출처: templates/*.json, public/refs/manifest.json, public/{samples,refs}/**

export const BUNDLED_TEMPLATES: Record<string, unknown> = ${JSON.stringify(templates, null, 2)};

export const BUNDLED_REF_MANIFEST: unknown = ${JSON.stringify(manifest, null, 2)};

export const BUNDLED_PUBLIC_FILES: ReadonlySet<string> = new Set(${JSON.stringify(publicFiles, null, 2)});

/** 공개 미디어의 크기·길이 (Workers 에서 런타임 프로브 대신 사용) */
export const BUNDLED_MEDIA_META: Record<string, { bytes: number; width?: number; height?: number; durationSec?: number }> = ${JSON.stringify(meta, null, 2)};
`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, body);
console.log(`[bundle-static] ${Object.keys(templates).length} templates + ${(manifest.items ?? []).length} refs → ${path.relative(root, outFile)}`);

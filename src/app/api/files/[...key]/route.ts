import { eq } from "drizzle-orm";
import { errorJson } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { uidFrom } from "@/lib/identity";
import { nodeRequire } from "@/lib/node-only";
import { hasFileSystem } from "@/lib/runtime";
import { tryGetStorage } from "@/lib/storage";
import { R2Storage } from "@/lib/storage/r2";

/** 인라인으로 렌더링해도 안전한 타입만 허용한다. SVG 는 스크립트를 품을 수 있어 첨부(다운로드)로만 내려준다 (stored XSS 방지). */
const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  wav: "audio/wav",
  mp3: "audio/mpeg",
};

function baseHeaders(ext: string, filename: string): Record<string, string> {
  const h: Record<string, string> = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    // 이 오리진에서 내려주는 사용자 파일이 문서로 실행되지 못하게 한다
    "Content-Security-Policy": "sandbox; default-src 'none'",
  };
  if (!MIME[ext]) h["Content-Disposition"] = `attachment; filename="${filename}"`;
  return h;
}

function parseRange(range: string, size: number): { start: number; end: number } | null {
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  if (!m) return null;
  const start = m[1] ? Number(m[1]) : 0;
  const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (start > end || start >= size) return null;
  return { start, end };
}

/**
 * 이 파일이 요청자의 것인가.
 *
 * 경로가 추측 가능해서(`results/<jobId>.mp4`, `uploads/<assetId>.png`) 경로 자체를 권한으로
 * 쓸 수 없다 — 업로드 원본과 결과 영상이 남에게 그대로 열린다. DB 소유자로 확인한다.
 */
async function ownsFile(req: Request, storageKey: string): Promise<boolean> {
  const uid = await uidFrom(req);
  if (!uid) return false;
  const db = getDb();
  const asset = await db.select().from(schema.assets).where(eq(schema.assets.key, storageKey)).get();
  if (asset) return asset.userId === uid;
  const job = await db.select().from(schema.jobs).where(eq(schema.jobs.resultKey, storageKey)).get();
  if (job) return job.userId === uid;
  return false;
}

/** storage 아래 파일 서빙 (로컬 fs 또는 R2). Range 요청(영상 스크럽) 지원 */
export async function GET(req: Request, ctx: RouteContext<"/api/files/[...key]">) {
  const { key } = await ctx.params;
  const storage = tryGetStorage();
  if (!storage) return errorJson(404, "파일 저장소가 없습니다.");

  const joined = key.join("/");
  if (!(await ownsFile(req, joined))) return errorJson(404, "파일이 없습니다.");
  const ext = joined.split(".").pop()?.toLowerCase() ?? "";
  const type = MIME[ext] ?? "application/octet-stream";
  const filename = joined.split("/").pop() ?? "file";
  const range = req.headers.get("range");

  // R2: 객체를 스트리밍한다 (바이트를 통째로 메모리에 올리지 않는다)
  if (storage instanceof R2Storage) {
    const obj = await storage.getObject(joined).catch(() => null);
    if (!obj) return errorJson(404, "파일이 없습니다.");
    const size = obj.size;
    const r = range ? parseRange(range, size) : null;
    if (range && !r) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    if (r) {
      const sliced = await storage.getObject(joined);
      const buf = await sliced!.arrayBuffer();
      return new Response(buf.slice(r.start, r.end + 1), {
        status: 206,
        headers: {
          ...baseHeaders(ext, filename),
          "Content-Type": type,
          "Content-Length": String(r.end - r.start + 1),
          "Content-Range": `bytes ${r.start}-${r.end}/${size}`,
        },
      });
    }
    return new Response(obj.body, {
      headers: { ...baseHeaders(ext, filename), "Content-Type": type, "Content-Length": String(size) },
    });
  }

  if (!hasFileSystem()) return errorJson(404, "파일이 없습니다.");
  const fs = nodeRequire<typeof import("node:fs")>("node:fs");
  let localPath: string | null;
  try {
    localPath = storage.localPath(joined);
  } catch {
    return errorJson(400, "잘못된 경로입니다.");
  }
  if (!localPath || !fs.existsSync(localPath)) return errorJson(404, "파일이 없습니다.");

  const stat = fs.statSync(localPath);
  const r = range ? parseRange(range, stat.size) : null;
  if (range && !r) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });

  const stream = r ? fs.createReadStream(localPath, { start: r.start, end: r.end }) : fs.createReadStream(localPath);
  const headers = r
    ? {
        ...baseHeaders(ext, filename),
        "Content-Type": type,
        "Content-Length": String(r.end - r.start + 1),
        "Content-Range": `bytes ${r.start}-${r.end}/${stat.size}`,
      }
    : { ...baseHeaders(ext, filename), "Content-Type": type, "Content-Length": String(stat.size) };
  return new Response(toWebStream(stream), { status: r ? 206 : 200, headers });
}

function toWebStream(stream: import("node:fs").ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(typeof chunk === "string" ? Buffer.from(chunk) : new Uint8Array(chunk)));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });
}

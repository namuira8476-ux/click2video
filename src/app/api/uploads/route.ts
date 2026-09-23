import { errorJson, handleError, json } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { getH3Client } from "@/lib/h3";
import { falKeyFrom, requireUser, requireKeyIfNeeded } from "@/lib/request-context";
import { H3MAX, kindFromMime } from "@/lib/h3/limits";
import { newId } from "@/lib/ids";
import { probeImage, probeMp4Dimensions, probeMp4Duration, probeWavDuration } from "@/lib/media/probe";
import { getStorage, hasStorage } from "@/lib/storage";

/**
 * multipart/form-data: file (필수), durationSec (클라이언트 측 영상/오디오 길이, 선택)
 *
 * 로컬에서는 storage/uploads 에 저장하고, Cloudflare 에서는 저장할 곳이 없어
 * 곧바로 fal 로 올린 뒤 그 URL 만 DB 에 남긴다.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return errorJson(400, "file 필드가 필요합니다.");
    const kind = kindFromMime(file.type, file.name);
    if (!kind) return errorJson(400, "이미지, 영상(mp4/mov), 오디오(wav/mp3)만 업로드할 수 있습니다.");
    const lim = H3MAX[kind];
    if (file.size > lim.maxBytes) {
      return errorJson(400, `파일이 너무 큽니다. 최대 ${Math.round(lim.maxBytes / 1024 / 1024)}MB`);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let width: number | undefined;
    let height: number | undefined;
    let durationSec: number | undefined;
    const clientDuration = Number(form.get("durationSec"));
    if (kind === "image") {
      const m = await probeImage(bytes);
      if (!m) return errorJson(400, "이미지를 읽을 수 없습니다. JPG · PNG · WEBP 만 지원합니다.");
      width = m.width;
      height = m.height;
    } else if (kind === "video") {
      durationSec = probeMp4Duration(bytes) ?? (Number.isFinite(clientDuration) && clientDuration > 0 ? clientDuration : undefined);
      const dim = probeMp4Dimensions(bytes);
      const w = dim?.width ?? Number(form.get("width"));
      const h = dim?.height ?? Number(form.get("height"));
      if (w > 0 && h > 0) {
        width = w;
        height = h;
      }
    } else {
      durationSec = probeWavDuration(bytes) ?? (Number.isFinite(clientDuration) && clientDuration > 0 ? clientDuration : undefined);
    }

    const uid = await requireUser(req);
    const id = newId("ast");
    const dot = file.name.lastIndexOf(".");
    const ext = (dot > 0 ? file.name.slice(dot) : "").toLowerCase() || `.${kind === "image" ? "png" : kind === "video" ? "mp4" : "wav"}`;
    const mime = file.type || "application/octet-stream";

    let key = "";
    let falUrl: string | null = null;
    let publicUrl: string;
    if (hasStorage()) {
      // 로컬 디스크 또는 R2 에 원본을 보관한다.
      key = `uploads/${id}${ext}`;
      await getStorage().put(key, bytes, mime);
      publicUrl = getStorage().publicUrl(key);
    } else {
      // 저장소가 없으면(R2 미활성 Cloudflare) 곧바로 fal 로 올리고 URL 만 남긴다.
      // R2 가 없으면 여기가 유일한 업로드 경로다 — 이 시점에 사용자 키가 필요하다.
      const userKey = falKeyFrom(req);
      requireKeyIfNeeded(userKey);
      falUrl = await getH3Client(userKey).upload({ buffer: bytes, mime, filename: file.name });
      key = falUrl;
      publicUrl = falUrl;
    }

    const now = Date.now();
    await getDb()
      .insert(schema.assets)
      .values({
        id,
        userId: uid,
        kind,
        key,
        mime,
        bytes: bytes.length,
        width,
        height,
        durationSec,
        originalName: file.name,
        falUrl,
        falUrlAt: falUrl ? now : null,
        createdAt: now,
      })
      .run();

    return json({ asset: { id, kind, url: publicUrl, bytes: bytes.length, width, height, durationSec, name: file.name } });
  } catch (e) {
    return handleError(e);
  }
}

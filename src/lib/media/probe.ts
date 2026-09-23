/**
 * 미디어 메타데이터를 네이티브 모듈 없이 읽는다.
 * Cloudflare Workers 에서는 sharp(네이티브)도 ffprobe 도 쓸 수 없어 헤더를 직접 파싱한다.
 */
export type ImageMeta = { width: number; height: number; format: string };

const u16 = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const u32le = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));

/** PNG · JPEG · WebP 의 가로세로를 헤더에서 읽는다. HEIC/HEIF 는 지원하지 않는다(null). */
export function probeImageSync(input: Uint8Array): ImageMeta | null {
  const b = input;
  try {
    // PNG: 8바이트 시그니처 + IHDR(길이4 + "IHDR" + width4 + height4)
    if (b.length > 24 && b[0] === 0x89 && ascii(b, 1, 3) === "PNG") {
      return { width: u32(b, 16), height: u32(b, 20), format: "png" };
    }
    // GIF87a / GIF89a (리틀엔디언)
    if (b.length > 10 && ascii(b, 0, 3) === "GIF") {
      return { width: b[6] | (b[7] << 8), height: b[8] | (b[9] << 8), format: "gif" };
    }
    // WebP: "RIFF"...."WEBP" + VP8 / VP8L / VP8X
    if (b.length > 30 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") {
      const chunk = ascii(b, 12, 4);
      if (chunk === "VP8 ") {
        return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff, format: "webp" };
      }
      if (chunk === "VP8L") {
        const bits = u32le(b, 21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, format: "webp" };
      }
      if (chunk === "VP8X") {
        const w = (b[24] | (b[25] << 8) | (b[26] << 16)) + 1;
        const h = (b[27] | (b[28] << 8) | (b[29] << 16)) + 1;
        return { width: w, height: h, format: "webp" };
      }
      return null;
    }
    // JPEG: SOI 뒤로 마커를 따라가며 SOF(0xC0~0xCF, C4/C8/CC 제외)를 찾는다
    if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) {
          i++;
          continue;
        }
        const marker = b[i + 1];
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
          i += 2;
          continue;
        }
        const len = u16(b, i + 2);
        const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isSof) return { width: u16(b, i + 7), height: u16(b, i + 5), format: "jpeg" };
        if (marker === 0xda) break; // 스캔 시작 — 여기부터는 압축 데이터
        if (len < 2) break;
        i += 2 + len;
      }
      return null;
    }
  } catch {
    return null;
  }
  return null;
}

/** 서버 측 이미지 재검증. 실패하면 null. */
export async function probeImage(buf: Uint8Array): Promise<ImageMeta | null> {
  return probeImageSync(buf);
}

/** WAV 헤더에서 길이를 읽는다(PCM만). 실패하면 null. */
export function probeWavDuration(buf: Uint8Array): number | null {
  try {
    const b = buf;
    if (b.length < 44 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WAVE") return null;
    let offset = 12;
    let byteRate = 0;
    while (offset + 8 <= b.length) {
      const id = ascii(b, offset, 4);
      const size = u32le(b, offset + 4);
      if (id === "fmt ") byteRate = u32le(b, offset + 16);
      if (id === "data" && byteRate > 0) return size / byteRate;
      offset += 8 + size + (size % 2);
    }
    return null;
  } catch {
    return null;
  }
}

function indexOfAscii(b: Uint8Array, needle: string, from = 0): number {
  const n = needle.length;
  for (let i = from; i + n <= b.length; i++) {
    let ok = true;
    for (let j = 0; j < n; j++) {
      if (b[i + j] !== needle.charCodeAt(j)) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

/**
 * MP4 tkhd 박스에서 비디오 트랙의 표시 크기를 읽는다. 회전 매트릭스(90°/270°)가 있으면 가로세로를 바꾼다.
 * 오디오 트랙은 0×0 이라 건너뛴다. 실패하면 null.
 */
export function probeMp4Dimensions(buf: Uint8Array): { width: number; height: number } | null {
  try {
    const b = buf;
    let from = 0;
    while (from < b.length) {
      const idx = indexOfAscii(b, "tkhd", from);
      if (idx === -1) return null;
      from = idx + 4;
      const p = idx + 4; // payload: version(1) flags(3) ...
      const version = b[p];
      const matrixAt = version === 1 ? p + 52 : p + 40;
      const sizeAt = version === 1 ? p + 88 : p + 76;
      if (sizeAt + 8 > b.length) continue;
      const width = u32(b, sizeAt) / 65536;
      const height = u32(b, sizeAt + 4) / 65536;
      if (!(width > 0 && height > 0)) continue;
      const s32 = (i: number) => u32(b, i) | 0;
      const a = s32(matrixAt);
      const bb = s32(matrixAt + 4);
      const c = s32(matrixAt + 12);
      const d = s32(matrixAt + 16);
      const rotated = a === 0 && d === 0 && (bb !== 0 || c !== 0);
      return rotated ? { width: Math.round(height), height: Math.round(width) } : { width: Math.round(width), height: Math.round(height) };
    }
    return null;
  } catch {
    return null;
  }
}

/** MP4 mvhd 박스에서 길이를 읽는다. 실패하면 null. */
export function probeMp4Duration(buf: Uint8Array): number | null {
  try {
    const b = buf;
    const idx = indexOfAscii(b, "mvhd");
    if (idx === -1) return null;
    const version = b[idx + 4];
    if (version === 1) {
      const timescale = u32(b, idx + 4 + 4 + 8 + 8);
      const hi = u32(b, idx + 4 + 4 + 8 + 8 + 4);
      const lo = u32(b, idx + 4 + 4 + 8 + 8 + 8);
      const duration = hi * 2 ** 32 + lo;
      return timescale > 0 ? duration / timescale : null;
    }
    const timescale = u32(b, idx + 4 + 4 + 4 + 4);
    const duration = u32(b, idx + 4 + 4 + 4 + 4 + 4);
    return timescale > 0 ? duration / timescale : null;
  } catch {
    return null;
  }
}

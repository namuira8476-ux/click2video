/**
 * 문구를 브라우저 캔버스로 1024×1024 PNG 로 그린다.
 *
 * 왜 클라이언트인가: 서버 쪽 렌더러는 sharp(네이티브)라 Cloudflare Workers 에서 돌지 않는다.
 * 브라우저에는 한글 시스템 폰트가 있어 결과도 서버 렌더링과 동등하다.
 * 로컬 개발에서는 서버 폴백(`fromText`)도 남아 있어 e2e 스크립트가 그대로 동작한다.
 *
 * 레이아웃은 서버 렌더러(src/lib/media/text-image.ts)와 같게 맞춘다.
 */
export type TextImageStyle = "dark" | "light";

const FONT_STACK = `'Pretendard', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;
const SIZE = 1024;

/** 긴 문구를 줄바꿈. 사용자가 넣은 줄바꿈은 유지, 한 줄이 maxChars 를 넘으면 공백 기준으로 나눈다 */
function wrap(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const words = raw.trim().split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (next.length > maxChars && line) {
        out.push(line);
        line = w;
      } else line = next;
    }
    if (line) out.push(line);
    if (!words.length) out.push("");
  }
  return out.filter((l, i, a) => !(l === "" && (i === 0 || i === a.length - 1)));
}

export async function renderTextImageBlob(text: string, style: TextImageStyle = "dark"): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 만들 수 없습니다.");

  ctx.fillStyle = style === "dark" ? "#000000" : "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);

  const lines = wrap(text, 12).slice(0, 6);
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const fontSize = Math.max(48, Math.min(160, Math.floor((SIZE * 0.86) / (longest * 0.92)), Math.floor((SIZE * 0.7) / (lines.length * 1.25))));
  const lineHeight = fontSize * 1.25;

  ctx.fillStyle = style === "dark" ? "#ffffff" : "#111111";
  ctx.font = `700 ${fontSize}px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const startY = SIZE / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, SIZE / 2, startY + i * lineHeight));

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("문구 이미지를 만들지 못했습니다.");
  return blob;
}

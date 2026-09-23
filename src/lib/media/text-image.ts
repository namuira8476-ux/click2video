import crypto from "node:crypto";
import { nodeRequire } from "@/lib/node-only";

export type TextImageStyle = "dark" | "light";

const FONT = `'Pretendard', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Noto Sans CJK KR', sans-serif`;

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

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

export function textImageKey(text: string, style: TextImageStyle): string {
  const h = crypto.createHash("sha1").update(`${style}\n${text}`).digest("hex").slice(0, 16);
  return `generated/text-${style}-${h}.png`;
}

/**
 * 한국어 등 임의의 문구를 1024×1024 PNG 로 렌더링한다 (H3 공식 팁: 텍스트는 이미지로 넣어 "interpret as image").
 * 시스템 폰트(맑은 고딕 등)를 쓰므로 별도 폰트 파일이 필요 없다.
 */
export async function renderTextImage(text: string, style: TextImageStyle = "dark"): Promise<Buffer> {
  const W = 1024;
  const H = 1024;
  const bg = style === "dark" ? "#000000" : "#ffffff";
  const fg = style === "dark" ? "#ffffff" : "#111111";
  const lines = wrap(text, 12).slice(0, 6);
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const fontSize = Math.max(48, Math.min(160, Math.floor((W * 0.86) / (longest * 0.92)), Math.floor((H * 0.7) / (lines.length * 1.25))));
  const lineHeight = fontSize * 1.25;
  const startY = H / 2 - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines
    .map((l, i) => `<tspan x="${W / 2}" y="${(startY + i * lineHeight).toFixed(1)}">${escapeXml(l) || " "}</tspan>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <text font-family="${FONT}" font-size="${fontSize}" font-weight="700" fill="${fg}" text-anchor="middle" dominant-baseline="middle">${tspans}</text>
</svg>`;
  // sharp 는 네이티브 모듈이라 Cloudflare Workers 에서 돌지 않는다. 로컬에서만 이 경로를 탄다
  // (배포 환경에서는 브라우저 캔버스가 그린 PNG 를 업로드로 받는다).
  const sharp = nodeRequire<typeof import("sharp").default>("sharp");
  return sharp(Buffer.from(svg)).png().toBuffer();
}

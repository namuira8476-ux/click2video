import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

/**
 * 한국어 글자가 정확히 박힌 샘플 인쇄물을 합성한다 (gpt-image-2 는 한글을 자주 깨뜨린다).
 *  - samples/poster-motion/poster.png : 큰 글씨 3~5단어짜리 성긴 포스터 (전단지 살리기 샘플)
 *  - samples/pop-out/poster.png       : 저텍스트 로고 포스터 (간판 밖으로 튀어나오는 제품 샘플)
 *  - samples/gate/flyer-dense.png     : 정보 밀집 전단 (텍스트 보존 게이트 테스트용)
 *  - samples/gate/store-sign.png      : 가게 외관 위에 한글 간판 합성 (게이트 테스트용)
 *
 *   npx tsx scripts/compose-posters.ts [--force]
 */
const force = process.argv.includes("--force");
const PUBLIC = path.resolve(process.cwd(), "public");
const FONT = `'Pretendard', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function write(rel: string, buf: Buffer) {
  const abs = path.join(PUBLIC, rel);
  if (fs.existsSync(abs) && !force) {
    console.log("  skip", rel);
    return;
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, buf);
  console.log("  wrote", rel);
}

/** 큰 글씨 포스터: 사진 위 + 큰 문구 3줄 (성긴 레이아웃) */
async function bigPoster() {
  const W = 1080;
  const H = 1350;
  // 사진은 첫 문구 위쪽(글리프 상단 ≈ 905-130)에서 끝나야 겹치지 않는다
  const photo = await sharp(path.join(PUBLIC, "samples/store-promo/product.png")).resize(W, 640, { fit: "cover" }).toBuffer();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#f6efe6"/>
  <rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="none" stroke="#1a1a1a" stroke-width="6"/>
  <text x="${W / 2}" y="905" font-family="${FONT}" font-size="132" font-weight="800" fill="#1a1a1a" text-anchor="middle">오픈 기념</text>
  <text x="${W / 2}" y="1050" font-family="${FONT}" font-size="132" font-weight="800" fill="#c8102e" text-anchor="middle">20% 할인</text>
  <text x="${W / 2}" y="1190" font-family="${FONT}" font-size="58" font-weight="600" fill="#1a1a1a" text-anchor="middle">카페 봄날 · 9월 한 달간</text>
</svg>`;
  const buf = await sharp(Buffer.from(svg))
    .composite([{ input: photo, top: 100, left: 0 }])
    .png()
    .toBuffer();
  // 사진 위에 테두리가 겹치도록 프레임을 다시 그린다
  const frame = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="none" stroke="#1a1a1a" stroke-width="6"/></svg>`;
  return sharp(buf).composite([{ input: Buffer.from(frame) }]).png().toBuffer();
}

/** 저텍스트 로고 포스터: 로고 마크 + 상호 한 줄 + 넓은 여백 (팝아웃용) */
async function logoPoster() {
  const W = 1080;
  const H = 1350;
  const logo = await sharp(path.join(PUBLIC, "samples/fashion-campaign/logo.png")).resize(420, 420, { fit: "contain", background: "#ffffff" }).toBuffer();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <rect x="70" y="70" width="${W - 140}" height="${H - 140}" fill="none" stroke="#111111" stroke-width="5"/>
  <text x="${W / 2}" y="1060" font-family="${FONT}" font-size="96" font-weight="800" fill="#111111" text-anchor="middle" letter-spacing="6">카페 봄날</text>
</svg>`;
  return sharp(Buffer.from(svg)).composite([{ input: logo, top: 380, left: (W - 420) / 2 }]).png().toBuffer();
}

/** 정보 밀집 전단: 작은 본문·전화번호·가격 (게이트: 여기 글자가 살아남는지 본다) */
async function denseFlyer() {
  const W = 1080;
  const H = 1528; // A4 비율
  const lines = [
    ["카페 봄날 가을 시즌 메뉴", 72, 800, "#1a1a1a"],
    ["아메리카노 3,800원 · 카페라떼 4,300원", 44, 500, "#333333"],
    ["흑임자 크림 라떼 5,500원 · 단호박 스콘 3,200원", 44, 500, "#333333"],
    ["매일 07:30 ~ 21:00 · 월요일 휴무", 44, 500, "#333333"],
    ["서울 성동구 성수동 12-3 1층", 44, 500, "#333333"],
    ["예약·문의 02-123-4567", 52, 700, "#c8102e"],
    ["인스타그램 @example_cafe 팔로우 시 쿠키 증정", 40, 500, "#333333"],
  ] as const;
  const photo = await sharp(path.join(PUBLIC, "samples/menu-spotlight/food.png")).resize(W - 160, 560, { fit: "cover" }).toBuffer();
  let y = 760;
  const text = lines
    .map(([t, size, weight, color]) => {
      y += size * 1.55;
      return `<text x="${W / 2}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="middle">${esc(t)}</text>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fffdf8"/>${text}</svg>`;
  return sharp(Buffer.from(svg)).composite([{ input: photo, top: 120, left: 80 }]).png().toBuffer();
}

/** 가게 외관 위에 한글 간판을 합성 (게이트: 재생성 시 간판 글자가 살아남는지 본다) */
async function storeSign() {
  const src = path.join(PUBLIC, "samples/store-promo/store.png");
  const meta = await sharp(src).metadata();
  const W = meta.width ?? 608;
  const H = meta.height ?? 1088;
  const signH = Math.round(H * 0.11);
  const sign = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect x="${Math.round(W * 0.08)}" y="${Math.round(H * 0.12)}" width="${Math.round(W * 0.84)}" height="${signH}" rx="8" fill="#1f2a44"/>
  <text x="${W / 2}" y="${Math.round(H * 0.12) + signH * 0.68}" font-family="${FONT}" font-size="${Math.round(signH * 0.55)}" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="4">카페 봄날</text>
</svg>`;
  return sharp(src).composite([{ input: Buffer.from(sign) }]).png().toBuffer();
}

/** 계절 갈아입히기용 고정 안내 이미지: 결과 영상 구석에 "연출 영상" 표기를 강제한다 (설경 펜션 같은 과장광고 방지) */
async function stagedNotice() {
  // fal 은 이미지 비율 0.4~2.5 만 받는다 → 2:1
  const W = 1024;
  const H = 512;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#000000"/>
  <text x="${W / 2}" y="${H / 2 - 20}" font-family="${FONT}" font-size="88" font-weight="700" fill="#ffffff" text-anchor="middle">연출 영상</text>
  <text x="${W / 2}" y="${H / 2 + 90}" font-family="${FONT}" font-size="60" font-weight="500" fill="#cccccc" text-anchor="middle">실제와 다를 수 있음</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** 상품 갈아끼우기용 내장 스톡 클립을 refs 로 등록한다 (samples/clips 에서 복사) */
async function registerStockClips() {
  const { readManifest, writeManifest } = await import("../src/lib/refs/manifest");
  const m = readManifest();
  const items = [
    { id: "stock-walk", file: "stock/stock-walk.mp4", label: "거리 워킹 (무지 티셔츠)", src: "samples/clips/stock-walk.mp4" },
    { id: "stock-table", file: "stock/stock-table.mp4", label: "카페 테이블 (무지 머그컵)", src: "samples/clips/stock-table.mp4" },
  ];
  for (const it of items) {
    const src = path.join(PUBLIC, it.src);
    const dst = path.join(PUBLIC, "refs", it.file);
    if (!fs.existsSync(src)) {
      console.warn("  missing", it.src, "(npm run clips 먼저)");
      continue;
    }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (!fs.existsSync(dst) || force) fs.copyFileSync(src, dst);
    if (!m.items.some((x) => x.id === it.id)) {
      m.items.push({ id: it.id, kind: "video", file: it.file, label: it.label, durationSec: 5, width: 720, height: 1280 });
      console.log("  manifest +", it.id);
    }
  }
  const notice = { id: "notice-staged", kind: "image" as const, file: "notice/staged.png", label: "연출 영상 안내", width: 1024, height: 512 };
  const ni = m.items.findIndex((x) => x.id === "notice-staged");
  if (ni === -1) m.items.push(notice);
  else m.items[ni] = { ...m.items[ni], ...notice };
  console.log("  manifest notice-staged 1024x512");
  writeManifest(m);
}

async function main() {
  await write("samples/poster-motion/poster.png", await bigPoster());
  await write("samples/pop-out/poster.png", await logoPoster());
  await write("samples/gate/flyer-dense.png", await denseFlyer());
  await write("samples/gate/store-sign.png", await storeSign());
  await write("refs/notice/staged.png", await stagedNotice());
  await registerStockClips();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

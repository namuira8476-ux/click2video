import { getEnv } from "@/lib/env";

/**
 * 방문자 식별.
 *
 * 로그인이 없는 서비스라 "누구인가"를 증명할 방법이 없다. 대신 **서버가 발급하고 서명한**
 * 임의의 id 를 HttpOnly 쿠키로 준다. 브라우저가 보낸 값을 그대로 믿으면(예: localStorage 의
 * clientId 를 헤더로) 남의 id 를 넣어 남의 작업·업로드·결과를 볼 수 있다 — 서명이 그걸 막는다.
 *
 * 이 쿠키는 소유권 구분일 뿐 인증이 아니다. 브라우저 데이터를 지우면 작업 목록도 사라진다.
 */
export const UID_COOKIE = "c2v_uid";

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function secret(): string {
  const env = getEnv();
  if (env.sessionSecret) return env.sessionSecret;
  if (env.byok) {
    // 공개 배포에서 서명 비밀값이 없으면 누구나 남의 uid 로 위조할 수 있다 — 조용히 넘어가면 안 된다.
    throw new Error("SESSION_SECRET 이 설정되지 않았습니다 (wrangler secret put SESSION_SECRET).");
  }
  return "c2v-local-dev-secret";
}

async function sign(uid: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(uid));
  return b64url(new Uint8Array(sig));
}

/** 상수 시간 비교 — 서명 검증에서 타이밍으로 한 글자씩 맞춰지지 않게. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function mintUid(): string {
  return `u_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function makeCookieValue(uid: string): Promise<string> {
  return `${uid}.${await sign(uid)}`;
}

/** 쿠키 값에서 uid 를 꺼낸다. 서명이 맞지 않으면 null. */
export async function verifyCookieValue(value: string | undefined | null): Promise<string | null> {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const uid = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!/^u_[0-9a-f]{32}$/.test(uid)) return null;
  return safeEqual(sig, await sign(uid)) ? uid : null;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/**
 * 이 요청의 소유자 id. 쿠키가 없거나 서명이 틀리면 null 이고, 호출부는 401 로 막거나
 * 빈 목록을 돌려준다 (미들웨어가 다음 요청에 새 쿠키를 발급한다).
 */
export async function uidFrom(req: Request): Promise<string | null> {
  return verifyCookieValue(readCookie(req.headers.get("cookie"), UID_COOKIE));
}

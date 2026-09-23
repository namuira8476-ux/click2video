import { getKey } from "./key-store";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors: string[] = [message],
  ) {
    super(message);
  }
}

/**
 * 모든 API 호출에 이 브라우저의 fal 키를 싣는다.
 * 서버는 이 헤더를 요청 처리 중에만 쓰고 저장하지 않는다. 소유자 식별은 서버가 발급한
 * HttpOnly 쿠키가 하므로 여기서 보낼 것이 없다(same-origin 이라 자동으로 붙는다).
 */
function authHeaders(extra?: HeadersInit): Headers {
  const h = new Headers(extra);
  const key = getKey();
  if (key) h.set("X-Fal-Key", key);
  return h;
}

async function parse<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as { error?: string; errors?: string[] };
  if (!res.ok) throw new ApiClientError(res.status, body.error ?? `요청 실패 (${res.status})`, body.errors);
  return body as T;
}

export async function fetcher<T>(url: string): Promise<T> {
  return parse<T>(await fetch(url, { headers: authHeaders(), credentials: "same-origin" }));
}

export async function postJson<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
    credentials: "same-origin",
  });
  return parse<T>(res);
}

export async function postForm<T>(url: string, form: FormData): Promise<T> {
  // Content-Type 을 직접 넣으면 multipart boundary 가 깨진다 — 브라우저가 정하게 둔다.
  const res = await fetch(url, { method: "POST", headers: authHeaders(), body: form, credentials: "same-origin" });
  return parse<T>(res);
}

/** 키 검증처럼 저장 전 키로 한 번 호출해야 할 때 쓴다. */
export async function postWithKey<T>(url: string, key: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "X-Fal-Key": key, "Content-Type": "application/json" },
    body: "{}",
    credentials: "same-origin",
  });
  return parse<T>(res);
}

export function formatCredits(n: number) {
  return n.toLocaleString("ko-KR");
}

export function formatUsd(n: number) {
  return `$${n.toFixed(2)}`;
}

export function timeAgo(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}초 전`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

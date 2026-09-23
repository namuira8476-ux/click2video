import { JobError } from "@/lib/jobs/service";

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function errorJson(status: number, message: string, errors: string[] = [message]) {
  return Response.json({ error: message, errors }, { status });
}

export function handleError(e: unknown): Response {
  if (e instanceof JobError) return errorJson(e.status, e.message, e.errors);
  // 오류 객체를 통째로 찍지 않는다 — H3ServiceError.detail 에 fal 응답 원문이 들어 있고,
  // Workers 로그는 대시보드에 보존되므로 사용자 키가 운영자 로그로 새는 경로가 된다.
  const err = e as Error | undefined;
  console.error("[api] %s: %s", err?.name ?? "Error", redact(err?.message ?? "unknown"));
  return errorJson(500, redact(err?.message ?? "알 수 없는 오류"));
}

/** fal 키 모양(`<uuid>:<hex>`)의 문자열을 지운다. 로그·응답에 내보내기 전에 통과시킨다. */
export function redact(s: string): string {
  return s.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8,}/gi, "[redacted-key]");
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new JobError(400, "요청 본문이 JSON 이 아닙니다.");
  }
}

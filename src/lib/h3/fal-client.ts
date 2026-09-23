import { createFalClient, ApiError, ValidationError, type FalClient } from "@fal-ai/client";
import { H3MAX } from "./limits";
import { H3ServiceError, H3UserError, type H3Client, type H3Status, type UploadFile } from "./client";
import type { H3Mode, H3Request, ReferenceToVideoOutput } from "./request-builder";

/** 모드별 fal 엔드포인트. 첫/끝 프레임은 image-to-video, 나머지는 reference-to-video. */
function endpointFor(mode: H3Mode): string {
  return mode === "first-last" ? H3MAX.endpoint.image : H3MAX.endpoint.reference;
}

/** 키 자체가 문제(잘못됨·잔액 부족)라 재시도해도 소용없는 오류. 사용자에게 키를 고치라고 안내한다. */
export class H3KeyError extends H3ServiceError {
  constructor(message: string, detail?: unknown) {
    super(message, detail);
    this.name = "H3KeyError";
  }
}

function mapError(e: unknown): Error {
  if (e instanceof ValidationError) {
    const msg = e.fieldErrors.map((f) => `${f.loc.join(".")}: ${f.msg}`).join("; ") || e.message;
    return new H3UserError(`입력 파일 문제: ${msg}`, e.body);
  }
  if (e instanceof ApiError) {
    if (e.status === 401 || e.status === 403) return new H3KeyError("fal API 키가 올바르지 않습니다. 설정에서 키를 다시 확인해 주세요.", e.body);
    if (e.status === 402) return new H3KeyError("fal 계정 잔액이 부족합니다. fal.ai 대시보드에서 결제 수단을 확인해 주세요.", e.body);
    if (e.status === 422) return new H3UserError(`입력 파일 문제: ${e.message}`, e.body);
    return new H3ServiceError(`생성 서비스 오류 (${e.status}): ${e.message}`, e.body);
  }
  return new H3ServiceError(`생성 서비스 오류: ${(e as Error)?.message ?? String(e)}`);
}

function retryable(e: unknown): boolean {
  if (e instanceof ValidationError) return false;
  if (e instanceof ApiError) return e.status === 429 || e.status >= 500;
  // 네트워크 오류
  return !(e instanceof Error && e.name === "H3UserError");
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!retryable(e) || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
  throw mapError(lastErr);
}

/**
 * 키마다 **격리된** fal 인스턴스를 만든다.
 *
 * 전역 `fal` 싱글턴의 `fal.config({credentials})` 는 모듈 전역 상태라,
 * 사용자마다 키가 다른 BYOK 배포에서는 나중 요청이 앞 요청의 키를 덮어써
 * 남의 키로 과금되는 사고가 난다. `createFalClient` 는 인스턴스에 자격증명을 가둔다.
 */
export function createFalH3Client(apiKey: string): H3Client {
  const client: FalClient = createFalClient({ credentials: apiKey });
  return {
    isMock: false,

    async upload(file: UploadFile) {
      const blob = new File([new Uint8Array(file.buffer)], file.filename, { type: file.mime });
      return withRetry(() => client.storage.upload(blob));
    },

    async submit(req: H3Request) {
      const r = await withRetry(() => client.queue.submit(endpointFor(req.mode), { input: req.input }));
      return { requestId: r.request_id };
    },

    async status(requestId: string, mode: H3Mode): Promise<H3Status> {
      const s = await withRetry(() => client.queue.status(endpointFor(mode), { requestId, logs: true }));
      if (s.status === "IN_QUEUE") return { status: "IN_QUEUE", queuePosition: s.queue_position };
      const logs = (s.logs ?? []).map((l) => l.message);
      if (s.status === "IN_PROGRESS") return { status: "IN_PROGRESS", logs };
      return { status: "COMPLETED", logs };
    },

    async result(requestId: string, mode: H3Mode) {
      const r = await withRetry(() => client.queue.result(endpointFor(mode), { requestId }));
      return r.data as ReferenceToVideoOutput;
    },

    async cancel(requestId: string, mode: H3Mode) {
      try {
        await client.queue.cancel(endpointFor(mode), { requestId });
      } catch {
        /* 이미 끝났으면 무시 */
      }
    },
  };
}

export type VerifyResult = { ok: true } | { ok: false; reason: "invalid" | "no-balance" | "unknown"; message: string };

/**
 * 키가 쓸 수 있는 것인지 확인한다. fal 에는 전용 검증 엔드포인트가 없어
 * 무료인 storage 업로드(9바이트)로 확인한다.
 *
 * 결과는 **고정된 코드 집합**으로만 돌려준다 — 상류 메시지를 그대로 흘리면
 * 훔친 키를 대량 검사하는 오라클이 되고, 키가 섞여 나올 수도 있다.
 * fal 의 5xx·네트워크 오류를 "키가 틀렸다"로 표시하면 멀쩡한 키를 지우게 되므로 구분한다.
 */
export async function verifyFalKey(apiKey: string): Promise<VerifyResult> {
  try {
    const c = createFalClient({ credentials: apiKey });
    await c.storage.upload(new File([new Uint8Array([99, 50, 118, 45, 99, 104, 101, 99, 107])], "c2v-check.txt", { type: "text/plain" }));
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      return { ok: false, reason: "invalid", message: "키가 올바르지 않습니다. fal.ai 대시보드에서 다시 복사해 주세요." };
    }
    if (e instanceof ApiError && e.status === 402) {
      return { ok: false, reason: "no-balance", message: "키는 유효하지만 fal 계정 잔액이 없습니다. fal.ai 에서 결제 수단을 등록해 주세요." };
    }
    return { ok: false, reason: "unknown", message: "지금은 확인할 수 없습니다 (fal 일시 오류). 잠시 후 다시 시도해 주세요." };
  }
}

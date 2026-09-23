import type { H3Mode, H3Request, ReferenceToVideoOutput } from "./request-builder";

export type UploadFile = { buffer: Uint8Array; mime: string; filename: string };

export type H3Status =
  | { status: "IN_QUEUE"; queuePosition?: number }
  | { status: "IN_PROGRESS"; logs: string[] }
  | { status: "COMPLETED"; logs: string[] };

/**
 * 생성 엔진 경계. 실제 구현은 fal-client.ts, 로컬 검증용은 mock.ts
 * 모드(reference / first-last)마다 fal 엔드포인트가 달라 상태 조회·결과·취소에도 모드를 넘긴다.
 */
export interface H3Client {
  readonly isMock: boolean;
  /** 파일을 공개 URL 로 만든다 */
  upload(file: UploadFile): Promise<string>;
  submit(req: H3Request): Promise<{ requestId: string }>;
  status(requestId: string, mode: H3Mode): Promise<H3Status>;
  result(requestId: string, mode: H3Mode): Promise<ReferenceToVideoOutput>;
  cancel(requestId: string, mode: H3Mode): Promise<void>;
}

export class H3UserError extends Error {
  constructor(message: string, readonly detail?: unknown) {
    super(message);
    this.name = "H3UserError";
  }
}

export class H3ServiceError extends Error {
  constructor(message: string, readonly detail?: unknown) {
    super(message);
    this.name = "H3ServiceError";
  }
}

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { H3ServiceError, type H3Client, type H3Status, type UploadFile } from "./client";
import type { H3Request, ReferenceToVideoOutput } from "./request-builder";
import { getEnv } from "@/lib/env";

type MockJob = { createdAt: number; req: H3Request; fail: boolean; cancelled: boolean };
const g = globalThis as unknown as { __c2v_mock?: Map<string, MockJob> };
function store(): Map<string, MockJob> {
  if (!g.__c2v_mock) g.__c2v_mock = new Map();
  return g.__c2v_mock;
}

export const MOCK_RESULT_PUBLIC = "/samples/mock/result.mp4";
const QUEUE_MS = 5000;
const RUN_MS = 20000;

/**
 * 로컬 검증용 MOCK. 제안서 §12.1
 * - upload: 아무것도 올리지 않고 로컬 서빙 URL 을 돌려준다 (호출자가 localUrl 을 넘겨준다)
 * - status: 경과 시간에 따라 IN_QUEUE → IN_PROGRESS → COMPLETED
 * - result: public/samples/mock/result.mp4 (없으면 빈 url)
 */
export function createMockH3Client(): H3Client {
  return {
    isMock: true,

    async upload(file: UploadFile) {
      // 실제 업로드는 하지 않는다. 호출자(runner)가 로컬 URL 을 넘길 수 있게 파일명을 그대로 돌려준다.
      return `mock://${encodeURIComponent(file.filename)}`;
    },

    async submit(req: H3Request) {
      const requestId = `mock-${crypto.randomUUID()}`;
      const fail = Math.random() < getEnv().mockFailRate;
      store().set(requestId, { createdAt: Date.now(), req, fail, cancelled: false });
      return { requestId };
    },

    async status(requestId: string): Promise<H3Status> {
      const j = store().get(requestId);
      if (!j) throw new H3ServiceError("mock: unknown request");
      const t = Date.now() - j.createdAt;
      if (t < QUEUE_MS) return { status: "IN_QUEUE", queuePosition: t < QUEUE_MS / 2 ? 2 : 1 };
      if (t < RUN_MS) {
        const logs = ["[mock] loading references", "[mock] expanding prompt (balanced)", "[mock] denoising 24 steps"];
        const n = Math.min(logs.length, 1 + Math.floor(((t - QUEUE_MS) / (RUN_MS - QUEUE_MS)) * logs.length));
        return { status: "IN_PROGRESS", logs: logs.slice(0, n) };
      }
      return { status: "COMPLETED", logs: ["[mock] done"] };
    },

    async result(requestId: string): Promise<ReferenceToVideoOutput> {
      const j = store().get(requestId);
      if (!j) throw new H3ServiceError("mock: unknown request");
      if (j.fail) throw new H3ServiceError("[mock] 생성 실패 시뮬레이션 (MOCK_FAIL_RATE)");
      const abs = path.resolve(process.cwd(), "public", MOCK_RESULT_PUBLIC.replace(/^\//, ""));
      const exists = fs.existsSync(abs);
      return {
        video: { url: exists ? MOCK_RESULT_PUBLIC : "", content_type: "video/mp4", file_name: "result.mp4" },
        expanded_prompt: `[mock] ${j.req.input.prompt}`,
        seed: 42,
      };
    },

    async cancel(requestId: string) {
      const j = store().get(requestId);
      if (j) j.cancelled = true;
    },
  };
}

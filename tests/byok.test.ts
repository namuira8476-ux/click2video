import { describe, expect, it } from "vitest";
import { falKeyFrom, maskKey } from "@/lib/request-context";
import { makeCookieValue, mintUid, verifyCookieValue } from "@/lib/identity";
import { redact } from "@/lib/api";
import { maskInput } from "@/lib/h3/request-builder";

function reqWith(headers: Record<string, string>): Request {
  return new Request("https://example.test/api/jobs", { headers });
}

describe("falKeyFrom", () => {
  it("헤더가 없으면 빈 문자열", () => {
    expect(falKeyFrom(reqWith({}))).toBe("");
  });

  it("정상 키는 그대로 돌려준다", () => {
    const key = "11111111-2222-3333-4444-555555555555:0123456789abcdef";
    expect(falKeyFrom(reqWith({ "x-fal-key": ` ${key} ` }))).toBe(key);
  });

  it("개행이 섞인 키는 거절한다 (헤더 분리·로그 인젝션 방지)", () => {
    // Request 생성자가 막는 경우도 있어, 헤더를 직접 넣어 falKeyFrom 자체를 검사한다.
    const req = new Request("https://example.test/");
    Object.defineProperty(req, "headers", { value: { get: () => "key\nX-Injected: 1" } });
    expect(() => falKeyFrom(req)).toThrow();
  });

  it("지나치게 긴 값은 거절한다", () => {
    const req = new Request("https://example.test/");
    Object.defineProperty(req, "headers", { value: { get: () => "a".repeat(401) } });
    expect(() => falKeyFrom(req)).toThrow();
  });
});

describe("maskKey", () => {
  it("앞뒤 4자만 남긴다", () => {
    expect(maskKey("abcdefghijklmnop")).toBe("abcd****mnop");
  });
});

describe("소유자 쿠키 서명", () => {
  it("발급한 값은 검증을 통과한다", async () => {
    const uid = mintUid();
    expect(await verifyCookieValue(await makeCookieValue(uid))).toBe(uid);
  });

  it("uid 를 바꿔치기하면 거절한다", async () => {
    const mine = await makeCookieValue(mintUid());
    const other = mintUid();
    const forged = `${other}.${mine.slice(mine.lastIndexOf(".") + 1)}`;
    expect(await verifyCookieValue(forged)).toBeNull();
  });

  it("서명을 바꾸면 거절한다", async () => {
    const v = await makeCookieValue(mintUid());
    expect(await verifyCookieValue(`${v}x`)).toBeNull();
  });

  it("서명이 없는 값은 거절한다", async () => {
    expect(await verifyCookieValue(mintUid())).toBeNull();
    expect(await verifyCookieValue("")).toBeNull();
    expect(await verifyCookieValue(undefined)).toBeNull();
  });
});

describe("유출 방지", () => {
  it("redact 가 fal 키 모양을 지운다", () => {
    const msg = "failed for 11111111-2222-3333-4444-555555555555:0123456789abcdef while uploading";
    expect(redact(msg)).toBe("failed for [redacted-key] while uploading");
  });

  it("요청 스냅샷에 자산 URL 이 들어가지 않는다", () => {
    const snap = maskInput({
      mode: "reference",
      input: {
        prompt: "hello",
        duration: 6,
        resolution: "768P",
        aspect_ratio: "9:16",
        prompt_expansion_mode: "balanced",
        enable_safety_checker: true,
        reference_image_urls: ["https://fal.media/secret-a.png", "https://fal.media/secret-b.png"],
      },
    });
    const json = JSON.stringify(snap);
    expect(json).not.toContain("fal.media");
    expect(snap.reference_images).toBe(2);
    expect(snap.prompt).toBe("hello");
  });
});

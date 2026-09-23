import { describe, expect, it } from "vitest";
import { probeMp4Dimensions } from "@/lib/media/probe";
import { pickRatioFromAssets } from "@/lib/jobs/service";
import type { Template } from "@/lib/templates/schema";

/** tkhd 박스만 있는 가짜 mp4 버퍼 (version 0). matrix 는 단위행렬, 선택적으로 90° 회전 */
function fakeTkhd(width: number, height: number, rotated = false, version: 0 | 1 = 0): Buffer {
  const payloadLen = version === 1 ? 96 : 84;
  const box = Buffer.alloc(8 + payloadLen);
  box.writeUInt32BE(box.length, 0);
  box.write("tkhd", 4);
  const p = 8;
  box[p] = version;
  const matrixAt = version === 1 ? p + 52 : p + 40;
  const sizeAt = version === 1 ? p + 88 : p + 76;
  const one = 0x00010000;
  if (rotated) {
    box.writeInt32BE(0, matrixAt); // a
    box.writeInt32BE(one, matrixAt + 4); // b
    box.writeInt32BE(-one, matrixAt + 12); // c
    box.writeInt32BE(0, matrixAt + 16); // d
  } else {
    box.writeInt32BE(one, matrixAt);
    box.writeInt32BE(one, matrixAt + 16);
  }
  box.writeUInt32BE(0x40000000, matrixAt + 32); // w = 1.0 (2.30)
  box.writeUInt32BE(width * 65536, sizeAt);
  box.writeUInt32BE(height * 65536, sizeAt + 4);
  return box;
}

describe("probeMp4Dimensions", () => {
  it("reads width/height from tkhd (v0)", () => {
    expect(probeMp4Dimensions(Buffer.concat([Buffer.from("ftypisom"), fakeTkhd(1280, 720)]))).toEqual({ width: 1280, height: 720 });
  });
  it("reads v1 boxes", () => {
    expect(probeMp4Dimensions(fakeTkhd(768, 1344, false, 1))).toEqual({ width: 768, height: 1344 });
  });
  it("skips audio tracks (0x0) and finds the video track", () => {
    expect(probeMp4Dimensions(Buffer.concat([fakeTkhd(0, 0), fakeTkhd(720, 1280)]))).toEqual({ width: 720, height: 1280 });
  });
  it("swaps width/height for 90° rotation matrix (phone videos)", () => {
    expect(probeMp4Dimensions(fakeTkhd(1920, 1080, true))).toEqual({ width: 1080, height: 1920 });
  });
  it("returns null without tkhd", () => {
    expect(probeMp4Dimensions(Buffer.from("no boxes here"))).toBeNull();
  });
});

const tpl = { allow: { ratios: ["adaptive", "16:9", "9:16", "1:1", "4:3", "3:4", "21:9"] } } as unknown as Template;

describe("pickRatioFromAssets (adaptive → nearest allowed ratio)", () => {
  it("prefers the first video asset", () => {
    const r = pickRatioFromAssets(tpl, [
      { kind: "image", source: "sample", width: 1024, height: 1024 },
      { kind: "video", source: "sample", width: 768, height: 1344 },
    ]);
    expect(r).toBe("9:16");
  });
  it("falls back to the first non-generated image", () => {
    const r = pickRatioFromAssets(tpl, [
      { kind: "image", source: "generated", width: 1024, height: 1024 },
      { kind: "image", source: "user", width: 1920, height: 1080 },
    ]);
    expect(r).toBe("16:9");
  });
  it("maps ultra-wide to 21:9 and near-square to 1:1", () => {
    expect(pickRatioFromAssets(tpl, [{ kind: "video", source: "user", width: 2976, height: 1248 }])).toBe("21:9");
    expect(pickRatioFromAssets(tpl, [{ kind: "video", source: "user", width: 1000, height: 1050 }])).toBe("1:1");
  });
  it("stays adaptive when nothing has dimensions", () => {
    expect(pickRatioFromAssets(tpl, [{ kind: "video", source: "user" }])).toBe("adaptive");
  });
  it("only picks from the template's allowed ratios", () => {
    const narrow = { allow: { ratios: ["adaptive", "16:9"] } } as unknown as Template;
    expect(pickRatioFromAssets(narrow, [{ kind: "video", source: "user", width: 720, height: 1280 }])).toBe("16:9");
  });
});

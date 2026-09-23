import { describe, expect, it } from "vitest";
import { resolveSamplePath } from "@/lib/jobs/resolve-assets";

const BACKSLASH_PATH = "\\samples\\mock\\clip.mp4";
const MIXED_TRAVERSAL = "/samples/mock\\..\\..\\.env";
const NULL_BYTE = "/samples/mock/clip.mp4\u0000.png";

describe("resolveSamplePath (sample: 슬롯 값은 public/samples 아래 실제 파일만)", () => {
  it("accepts an existing sample under /samples/ and returns it unchanged", () => {
    expect(resolveSamplePath("/samples/mock/clip.mp4")).toBe("/samples/mock/clip.mp4");
  });

  it("rejects traversal, absolute paths, backslashes, null bytes and paths outside /samples/", () => {
    for (const bad of [
      "/samples/../../package.json",
      "/samples/mock/../../../.env",
      "C:/Windows/win.ini",
      "/C:/Windows/win.ini",
      BACKSLASH_PATH,
      MIXED_TRAVERSAL,
      NULL_BYTE,
      "/next.svg",
      "/refs/dance/dance-digiri.mp4",
      "samples/mock/clip.mp4",
      "/samples//mock/clip.mp4",
      "/samples/./mock/clip.mp4",
    ]) {
      expect(resolveSamplePath(bad), bad).toBeNull();
    }
  });

  it("returns null for files that do not exist", () => {
    expect(resolveSamplePath("/samples/nope/none.png")).toBeNull();
  });
});

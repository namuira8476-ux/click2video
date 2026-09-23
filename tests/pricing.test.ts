import { describe, expect, it } from "vitest";
import { estimateUsd, toCredits, estimateFromAssets } from "@/lib/pricing/estimate";
import { img, vid, aud } from "./fixtures";

const list = { outputPerSec: { "480P": 0.05, "768P": 0.08 } };

describe("estimateUsd", () => {
  it("matches the fal docs example: 768P 5s + two 1024² images + one 5s clip = $1.10", () => {
    const r = estimateUsd(
      { resolution: "768P", duration: 5, images: [{ w: 1024, h: 1024 }, { w: 1024, h: 1024 }], videoSeconds: [5], audioSeconds: [] },
      list,
    );
    expect(r.outputUsd).toBeCloseTo(0.4, 6);
    expect(r.refTokens).toBe(2 * 1024 + 5 * 7459 - 4096);
    expect(r.refUsd).toBeCloseTo(0.70494, 4);
    expect(r.totalUsd).toBeCloseTo(1.10494, 4);
  });

  it("charges nothing for references under the free allowance", () => {
    const r = estimateUsd(
      { resolution: "768P", duration: 10, images: [{ w: 1024, h: 1024 }], videoSeconds: [], audioSeconds: [] },
      list,
    );
    expect(r.refTokens).toBe(0);
    expect(r.refUsd).toBe(0);
    expect(r.totalUsd).toBeCloseTo(0.8, 6);
  });

  it("uses the 480P video token rate and counts audio at 80 tokens/s", () => {
    const r = estimateUsd(
      { resolution: "480P", duration: 10, images: [{ w: 1024, h: 1024 }], videoSeconds: [10], audioSeconds: [15] },
      list,
    );
    expect(r.outputUsd).toBeCloseTo(0.5, 6);
    expect(r.refTokens).toBe(1024 + 10 * 2886 + 15 * 80 - 4096);
    expect(r.totalUsd).toBeCloseTo(0.5 + r.refTokens / 1000 * 0.02, 6);
  });
});

describe("toCredits", () => {
  it("rounds up usd cents times markup", () => {
    expect(toCredits(0.8, 2)).toBe(160);
    expect(toCredits(1.10494, 2)).toBe(221);
    expect(toCredits(0.004, 2)).toBe(1);
    expect(toCredits(0, 2)).toBe(0);
  });
});

describe("estimateFromAssets", () => {
  it("derives image sizes and clip seconds from resolved assets", () => {
    const r = estimateFromAssets(
      { resolution: "768P", duration: 5 },
      [img("a"), img("b"), vid("c", 5), aud("d", 3)],
      list,
    );
    expect(r.refTokens).toBe(2 * 1024 + 5 * 7459 + 3 * 80 - 4096);
  });
});

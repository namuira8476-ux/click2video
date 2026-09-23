import { describe, expect, it } from "vitest";
import { buildReferenceInput } from "@/lib/h3/request-builder";
import { assignRefs } from "@/lib/templates/prompt-renderer";
import { fashionLike, dubLike, img, vid, aud } from "./fixtures";

describe("buildReferenceInput", () => {
  it("orders reference_image_urls exactly like the prompt numbering", () => {
    const assets = [
      img("mood", { source: "ref", url: "https://cdn/mood.png" }),
      img("product", { url: "https://cdn/product.png" }),
      img("talent", { url: "https://cdn/talent.png" }),
    ];
    const { order } = assignRefs(fashionLike, assets);
    const input = buildReferenceInput({
      prompt: "Image 1 talent, Image 2 product, Image 3 mood",
      assets,
      order,
      resolution: "768P",
      duration: 10,
      ratio: "16:9",
      promptExpansion: "balanced",
    });
    expect(input.reference_image_urls).toEqual([
      "https://cdn/talent.png",
      "https://cdn/product.png",
      "https://cdn/mood.png",
    ]);
    expect(input).not.toHaveProperty("reference_video_urls");
    expect(input).not.toHaveProperty("reference_audio_urls");
    expect(input.aspect_ratio).toBe("16:9");
    expect(input.duration).toBe(10);
    expect(input.resolution).toBe("768P");
    expect(input.prompt_expansion_mode).toBe("balanced");
    expect(input.enable_safety_checker).toBe(true);
  });

  it("puts videos and audio into their own arrays", () => {
    const assets = [aud("voice", 3, { url: "https://cdn/v.wav" }), vid("clip", 8, { url: "https://cdn/c.mp4" })];
    const { order } = assignRefs(dubLike, assets);
    const input = buildReferenceInput({
      prompt: "p",
      assets,
      order,
      resolution: "480P",
      duration: 8,
      ratio: "adaptive",
      promptExpansion: "quality",
    });
    expect(input.reference_video_urls).toEqual(["https://cdn/c.mp4"]);
    expect(input.reference_audio_urls).toEqual(["https://cdn/v.wav"]);
    expect(input).not.toHaveProperty("reference_image_urls");
  });

  it("throws when an asset has no url or audio is the only reference", () => {
    const assets = [aud("voice", 3, { url: "https://cdn/v.wav" })];
    expect(() =>
      buildReferenceInput({
        prompt: "p",
        assets,
        order: { image: [], video: [], audio: ["voice"] },
        resolution: "768P",
        duration: 5,
        ratio: "adaptive",
        promptExpansion: "balanced",
      }),
    ).toThrow();
    expect(() =>
      buildReferenceInput({
        prompt: "p",
        assets: [img("talent")],
        order: { image: ["talent"], video: [], audio: [] },
        resolution: "768P",
        duration: 5,
        ratio: "adaptive",
        promptExpansion: "balanced",
      }),
    ).toThrow();
  });
});

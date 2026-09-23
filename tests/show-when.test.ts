import { describe, expect, it } from "vitest";
import { normalizeOptions } from "@/lib/jobs/service";
import type { Template } from "@/lib/templates/schema";

const t = {
  options: [
    { key: "background", type: "select", label: "배경", values: [{ value: "office", label: "오피스" }, { value: "custom", label: "직접" }], default: "office" },
    { key: "customText", type: "text", label: "직접 입력", maxLen: 80, required: true, showWhen: { key: "background", equals: "custom" } },
    { key: "extra", type: "text", label: "추가", maxLen: 200 },
  ],
} as unknown as Template;

describe("normalizeOptions + showWhen", () => {
  it("drops a hidden text option so it cannot leak into the prompt", () => {
    const o = normalizeOptions(t, { background: "office", customText: "a cozy library", extra: "" });
    expect(o.customText).toBe("");
    expect(o.background).toBe("office");
  });
  it("keeps the text when the select actually is 'custom'", () => {
    const o = normalizeOptions(t, { background: "custom", customText: "a cozy library" });
    expect(o.customText).toBe("a cozy library");
  });
  it("applies select defaults before evaluating showWhen", () => {
    const o = normalizeOptions(t, { customText: "leak?" });
    expect(o.background).toBe("office");
    expect(o.customText).toBe("");
  });
});

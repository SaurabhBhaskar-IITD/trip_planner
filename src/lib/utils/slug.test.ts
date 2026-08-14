import { describe, it, expect } from "vitest";
import { slugify, SLUG_PATTERN } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Himachal Explorer")).toBe("himachal-explorer");
  });

  it("collapses and trims separators", () => {
    expect(slugify("  Kasol &  Parvati  Valley!! ")).toBe("kasol-parvati-valley");
  });

  it("produces pattern-valid slugs", () => {
    for (const input of ["Delhi", "New Delhi NCR", "Leh–Ladakh"]) {
      const s = slugify(input);
      expect(SLUG_PATTERN.test(s)).toBe(true);
    }
  });

  it("is stable (idempotent)", () => {
    const once = slugify("Shimla Hills");
    expect(slugify(once)).toBe(once);
  });
});

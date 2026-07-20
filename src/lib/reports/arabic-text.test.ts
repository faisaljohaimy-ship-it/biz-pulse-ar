import { describe, expect, it } from "vitest";
import { shapeArabic, toArabicDigits } from "./arabic-text";

describe("shapeArabic — presentation forms + visual ordering", () => {
  it("shapes a connected word into initial/medial/final forms", () => {
    // نور → ن initial (FEE7) · و final (FEEE) · ر isolated? و is right-joining
    // only, so ر after و takes ISOLATED form (FEAD).
    const shaped = shapeArabic("نور");
    const cps = Array.from(shaped).map((c) => c.codePointAt(0));
    // Visual order (LTR draw) = reverse of logical: ر و ن
    expect(cps).toEqual([0xfead, 0xfeee, 0xfee7]);
  });

  it("applies the mandatory lam-alef ligature", () => {
    const shaped = shapeArabic("لا");
    expect(Array.from(shaped).map((c) => c.codePointAt(0))).toEqual([0xfefb]);
    // Final form when connected from the previous letter: بلا
    const connected = shapeArabic("بلا");
    expect(Array.from(connected).map((c) => c.codePointAt(0))).toEqual([0xfefc, 0xfe91]);
  });

  it("strips harakat (combining marks are unreliable in flat PDF drawing)", () => {
    expect(shapeArabic("مُحَمَّد")).toBe(shapeArabic("محمد"));
  });

  it("keeps latin/digit runs LTR inside RTL text", () => {
    const shaped = shapeArabic("تقرير SEC-18 اليومي");
    // The latin token must survive intact (not reversed).
    expect(shaped).toContain("SEC-18");
    // And the Arabic words must be presentation-form shaped.
    expect(/[\uFB50-\uFDFF\uFE70-\uFEFF]/.test(shaped)).toBe(true);
  });

  it("converts western digits to Arabic-Indic on demand", () => {
    expect(toArabicDigits("2026/07/20")).toBe("٢٠٢٦/٠٧/٢٠");
  });
});

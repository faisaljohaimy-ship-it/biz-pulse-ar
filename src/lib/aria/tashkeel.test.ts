import { describe, it, expect } from "vitest";
import { stripTashkeel } from "./tashkeel";

describe("stripTashkeel", () => {
  it("removes harakat (fatha/damma/kasra/shadda/sukun) but keeps base letters", () => {
    expect(stripTashkeel("مُشَكَّل")).toBe("مشكل");
    expect(stripTashkeel("تُنَفِّذُ الخُطْوَةَ الآنَ")).toBe("تنفذ الخطوة الآن");
  });

  it("removes tanwin, dagger alef, and tatweel", () => {
    expect(stripTashkeel("شكرًا")).toBe("شكرا");
    expect(stripTashkeel("هَٰذَا")).toBe("هذا");
    expect(stripTashkeel("كتـــاب")).toBe("كتاب");
  });

  it("leaves already-clean Arabic prose untouched", () => {
    const clean = "الهيئة العليا للأمن الصناعي";
    expect(stripTashkeel(clean)).toBe(clean);
  });

  it("preserves Latin acronyms, numbers, and punctuation", () => {
    expect(stripTashkeel("SEC-18 مُهِمّ")).toBe("SEC-18 مهم");
    expect(stripTashkeel("PTW: 3 تَصَارِيح.")).toBe("PTW: 3 تصاريح.");
  });

  it("is a no-op on empty input", () => {
    expect(stripTashkeel("")).toBe("");
  });
});

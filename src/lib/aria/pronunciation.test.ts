import { describe, expect, it } from "vitest";
import { applyAriaPronunciation, arabicCardinal } from "./pronunciation";

/**
 * Pronunciation tests — constitution Article 22 §5. The TTS layer must SPEAK
 * Latin acronyms and directive codes as correct Arabic, never letter-spelled.
 */
describe("arabicCardinal (0–99)", () => {
  it("covers ones, teens, tens and compounds", () => {
    expect(arabicCardinal(0)).toBe("صفر");
    expect(arabicCardinal(7)).toBe("سبعة");
    expect(arabicCardinal(18)).toBe("ثمانية عشر");
    expect(arabicCardinal(20)).toBe("عشرون");
    expect(arabicCardinal(21)).toBe("واحد وعشرون");
    expect(arabicCardinal(99)).toBe("تسعة وتسعون");
  });
});

describe("applyAriaPronunciation — directive codes", () => {
  it("speaks SEC-18 as «سِك ثمانية عشر» (not letter-spelled, digit read)", () => {
    expect(applyAriaPronunciation("راجع توجيه SEC-18 الآن")).toBe("راجع توجيه سِك ثمانية عشر الآن");
  });

  it("handles zero-padding and spacing variants (SAF-07, SEC 3)", () => {
    expect(applyAriaPronunciation("SAF-07")).toBe("ساف سبعة");
    expect(applyAriaPronunciation("SEC 3")).toBe("سِك ثلاثة");
  });

  it("speaks a bare SEC / SAF with no code", () => {
    expect(applyAriaPronunciation("توجيهات SEC وSAF")).toBe("توجيهات سِك وساف");
  });
});

describe("applyAriaPronunciation — acronym dictionary", () => {
  it("expands the domain acronyms to their spoken Arabic", () => {
    expect(applyAriaPronunciation("PTW")).toBe("تصريح العمل");
    expect(applyAriaPronunciation("HCIS")).toBe("الهيئة العليا للأمن الصناعي");
    expect(applyAriaPronunciation("راجع CCTV")).toBe("راجع كاميرات المراقبة");
    expect(applyAriaPronunciation("NEXIOS")).toBe("نكسيوس");
    expect(applyAriaPronunciation("ARIA")).toBe("آريا");
  });

  it("leaves plain Arabic prose untouched", () => {
    const s = "حالة الامتثال مطابقة والتقرير جاهز.";
    expect(applyAriaPronunciation(s)).toBe(s);
  });
});

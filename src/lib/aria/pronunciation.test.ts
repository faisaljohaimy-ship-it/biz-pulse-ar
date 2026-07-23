import { describe, expect, it } from "vitest";
import {
  applyAriaPronunciation,
  arabicCardinal,
  arabicNumberWords,
  englishNumberWords,
} from "./pronunciation";

/**
 * Pronunciation tests — constitution Article 22 §5 + the spoken-clarity
 * clause. The TTS layer must SPEAK Latin acronyms and directive codes as
 * correct Arabic (never letter-spelled), and every number as full words
 * (Arabic in an Arabic reply, English in an English reply), with day names
 * clear and deliberate.
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

describe("arabicNumberWords (hundreds → millions)", () => {
  it("speaks hundreds, thousands and millions as full words", () => {
    expect(arabicNumberWords(0)).toBe("صفر");
    expect(arabicNumberWords(94)).toBe("أربعة وتسعون");
    expect(arabicNumberWords(142)).toBe("مئة واثنان وأربعون");
    expect(arabicNumberWords(248)).toBe("مئتان وثمانية وأربعون");
    expect(arabicNumberWords(1248)).toBe("ألف ومئتان وثمانية وأربعون");
    expect(arabicNumberWords(2026)).toBe("ألفان وستة وعشرون");
    expect(arabicNumberWords(2_000_000)).toBe("مليونان");
  });
});

describe("englishNumberWords (hundreds → millions)", () => {
  it("speaks numbers as full English words", () => {
    expect(englishNumberWords(0)).toBe("zero");
    expect(englishNumberWords(94)).toBe("ninety-four");
    expect(englishNumberWords(142)).toBe("one hundred forty-two");
    expect(englishNumberWords(1248)).toBe("one thousand two hundred forty-eight");
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
    expect(applyAriaPronunciation("FINN")).toBe("فِن");
  });

  it("leaves plain Arabic prose untouched", () => {
    const s = "حالة الامتثال مطابقة والتقرير جاهز.";
    expect(applyAriaPronunciation(s)).toBe(s);
  });
});

describe("applyAriaPronunciation — numbers spoken as words", () => {
  it("speaks bare Arabic-context numbers, percentages and thousands as words", () => {
    expect(applyAriaPronunciation("بلغ الامتثال 94%")).toBe("بلغ الامتثال أربعة وتسعون بالمئة");
    expect(applyAriaPronunciation("لدينا 142 مشروعًا")).toBe("لدينا مئة واثنان وأربعون مشروعًا");
    expect(applyAriaPronunciation("الموارد 1,248 وحدة")).toBe(
      "الموارد ألف ومئتان وثمانية وأربعون وحدة",
    );
  });

  it("speaks numbers in English inside an English reply", () => {
    expect(applyAriaPronunciation("Compliance reached 94%")).toBe(
      "Compliance reached ninety-four percent",
    );
  });

  it("protects clock times and decimals from being split", () => {
    expect(applyAriaPronunciation("الوقت 14:07:33 الآن")).toBe("الوقت 14:07:33 الآن");
    expect(applyAriaPronunciation("النسبة 3.67 تقريبًا")).toBe("النسبة 3.67 تقريبًا");
  });
});

describe("applyAriaPronunciation — day names spoken clearly", () => {
  it("speaks an English day name in Arabic within an Arabic reply", () => {
    expect(applyAriaPronunciation("التقرير جاهز يوم Thursday")).toBe("التقرير جاهز يوم الخميس");
  });

  it("leaves Arabic day names as clear full words", () => {
    const s = "يصدر التقرير يوم الخميس القادم.";
    expect(applyAriaPronunciation(s)).toBe(s);
  });
});

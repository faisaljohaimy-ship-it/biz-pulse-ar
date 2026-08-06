import { describe, expect, it } from "vitest";
import {
  applyFinnPronunciation,
  arabicCardinal,
  arabicClock,
  arabicNumberWords,
  arabicYear,
  englishNumberWords,
  toArabicSpokenNumber,
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

describe("applyFinnPronunciation — directive codes", () => {
  it("speaks SEC-18 as «سِك ثمانية عشر» (not letter-spelled, digit read)", () => {
    expect(applyFinnPronunciation("راجع توجيه SEC-18 الآن")).toBe("راجع توجيه سِك ثمانية عشر الآن");
  });

  it("handles zero-padding and spacing variants (SAF-07, SEC 3)", () => {
    expect(applyFinnPronunciation("SAF-07")).toBe("ساف سبعة");
    expect(applyFinnPronunciation("SEC 3")).toBe("سِك ثلاثة");
  });

  it("speaks a bare SEC / SAF with no code", () => {
    expect(applyFinnPronunciation("توجيهات SEC وSAF")).toBe("توجيهات سِك وساف");
  });
});

describe("applyFinnPronunciation — acronym dictionary", () => {
  it("expands the domain acronyms to their spoken Arabic", () => {
    expect(applyFinnPronunciation("PTW")).toBe("تصريح العمل");
    expect(applyFinnPronunciation("HCIS")).toBe("الهيئة العليا للأمن الصناعي");
    expect(applyFinnPronunciation("راجع CCTV")).toBe("راجع كاميرات المراقبة");
    // الاسم القديم لا يُنطق اسمًا — يُنطق «المنصة». لو أعاده أحد إلى النطق
    // الحرفي لخرج اسم مُزال من كل شاشة عبر الصوت وحده.
    expect(applyFinnPronunciation("NEXIOS")).toBe("المنصة");
    expect(applyFinnPronunciation("FINN")).toBe("فِن");
  });

  it("leaves plain Arabic prose untouched", () => {
    const s = "حالة الامتثال مطابقة والتقرير جاهز.";
    expect(applyFinnPronunciation(s)).toBe(s);
  });
});

describe("applyFinnPronunciation — numbers spoken as words", () => {
  it("speaks bare Arabic-context numbers, percentages and thousands as words", () => {
    expect(applyFinnPronunciation("بلغ الامتثال 94%")).toBe("بلغ الامتثال أربعة وتسعون بالمئة");
    expect(applyFinnPronunciation("لدينا 142 مشروعًا")).toBe("لدينا مئة واثنان وأربعون مشروعًا");
    expect(applyFinnPronunciation("الموارد 1,248 وحدة")).toBe(
      "الموارد ألف ومئتان وثمانية وأربعون وحدة",
    );
  });

  it("speaks numbers in English inside an English reply", () => {
    expect(applyFinnPronunciation("Compliance reached 94%")).toBe(
      "Compliance reached ninety-four percent",
    );
  });

  it("speaks decimals in full — integer part, «فاصلة», then digit-by-digit", () => {
    expect(applyFinnPronunciation("النسبة 3.67 تقريبًا")).toBe(
      "النسبة ثلاثة فاصلة ستة سبعة تقريبًا",
    );
    expect(applyFinnPronunciation("الإنتاج 125.6 مليون")).toBe(
      "الإنتاج مئة وخمسة وعشرون فاصلة ستة مليون",
    );
    expect(applyFinnPronunciation("accuracy 3.5%")).toBe("accuracy three point five percent");
  });

  it("speaks Arabic-reply clock times as words; protects dotted versions", () => {
    // Times are now SPOKEN in an Arabic reply (24h hour read as 12h ordinal).
    expect(applyFinnPronunciation("الوقت 14:07:33 الآن")).toBe("الوقت الثانية وسبع دقائق الآن");
    expect(applyFinnPronunciation("الاجتماع 12:35")).toBe(
      "الاجتماع الثانية عشرة وخمس وثلاثون دقيقة",
    );
    // Version strings are quantities-that-aren't — still protected.
    expect(applyFinnPronunciation("الإصدار 1.2.0 جاهز")).toBe("الإصدار 1.2.0 جاهز");
    // English-reply times stay protected (spoken correctly by the voice as-is).
    expect(applyFinnPronunciation("the time is 14:07")).toBe("the time is 14:07");
  });

  it("speaks riyal amounts and magnitude suffixes in an Arabic reply", () => {
    expect(applyFinnPronunciation("التأثير المالي 18.7M SAR")).toBe(
      "التأثير المالي ثمانية عشر مليون وسبعمئة ألف ريال",
    );
    expect(applyFinnPronunciation("العائد 3.67M هذا الربع")).toBe(
      "العائد ثلاثة ملايين وستمئة وسبعون ألف هذا الربع",
    );
  });
});

describe("toArabicSpokenNumber — the one isolated converter", () => {
  it("percentages", () => {
    expect(toArabicSpokenNumber("97", "percent")).toBe("سبعة وتسعون بالمئة");
    expect(toArabicSpokenNumber("97%", "auto")).toBe("سبعة وتسعون بالمئة");
  });

  it("millions / magnitude (scaled)", () => {
    expect(toArabicSpokenNumber("3.67M", "scaled")).toBe("ثلاثة ملايين وستمئة وسبعون ألف");
    expect(toArabicSpokenNumber("3.67M", "auto")).toBe("ثلاثة ملايين وستمئة وسبعون ألف");
  });

  it("clock times (12-hour ordinal + feminine minutes)", () => {
    expect(toArabicSpokenNumber("12:35", "time")).toBe("الثانية عشرة وخمس وثلاثون دقيقة");
    expect(arabicClock(9, 5)).toBe("التاسعة وخمس دقائق");
    expect(arabicClock(1, 0)).toBe("الواحدة تمامًا");
    expect(toArabicSpokenNumber("14:07", "auto")).toBe("الثانية وسبع دقائق");
  });

  it("riyal amounts (with magnitude suffix and currency word)", () => {
    expect(toArabicSpokenNumber("18.7M SAR", "riyal")).toBe("ثمانية عشر مليون وسبعمئة ألف ريال");
    expect(toArabicSpokenNumber("1,248 ريال", "riyal")).toBe("ألف ومئتان وثمانية وأربعون ريال");
  });

  it("years in the spoken genitive", () => {
    expect(toArabicSpokenNumber("2026", "year")).toBe("ألفين وستة وعشرين");
    expect(arabicYear(2000)).toBe("ألفين");
    expect(arabicYear(2030)).toBe("ألفين وثلاثين");
  });

  it("decimals read with a spoken point", () => {
    expect(toArabicSpokenNumber("3.67", "decimal")).toBe("ثلاثة فاصلة ستة سبعة");
    expect(toArabicSpokenNumber("3.67", "auto")).toBe("ثلاثة فاصلة ستة سبعة");
  });

  it("plain cardinals", () => {
    expect(toArabicSpokenNumber("142", "cardinal")).toBe("مئة واثنان وأربعون");
    expect(toArabicSpokenNumber(248, "auto")).toBe("مئتان وثمانية وأربعون");
  });
});

describe("negative values are SPOKEN, not dropped or voiced as a dash", () => {
  it("speaks a leading minus as «ناقص» in an Arabic reply", () => {
    expect(applyFinnPronunciation("الفارق -5 نقاط")).toBe("الفارق ناقص خمسة نقاط");
    expect(applyFinnPronunciation("انخفض بمقدار -12%")).toBe("انخفض بمقدار ناقص اثنا عشر بالمئة");
  });

  it("speaks «minus» in an English reply", () => {
    expect(applyFinnPronunciation("delta of -12%")).toBe("delta of minus twelve percent");
  });

  it("leaves a hyphen BETWEEN digits (a range) untouched — not «ناقص»", () => {
    expect(applyFinnPronunciation("النطاق 5-10")).not.toContain("ناقص");
  });

  it("prefixes «ناقص» via the isolated converter for every kind", () => {
    expect(toArabicSpokenNumber("-5", "cardinal")).toBe("ناقص خمسة");
    expect(toArabicSpokenNumber("-12%", "percent")).toBe("ناقص اثنا عشر بالمئة");
    expect(toArabicSpokenNumber("-3.5", "auto")).toBe("ناقص ثلاثة فاصلة خمسة");
  });
});

describe("invalid clock input never voices «undefined» or a wrong hour", () => {
  it("returns empty for out-of-range or non-integer input", () => {
    expect(arabicClock(45, 99)).toBe("");
    expect(arabicClock(Number.NaN, 5)).toBe("");
    expect(arabicClock(9, 5)).toBe("التاسعة وخمس دقائق");
  });

  it("keeps the original token when the time is invalid", () => {
    expect(toArabicSpokenNumber("45:99", "time")).toBe("45:99");
  });
});

describe("applyFinnPronunciation — day names spoken clearly", () => {
  it("speaks an English day name in Arabic within an Arabic reply", () => {
    expect(applyFinnPronunciation("التقرير جاهز يوم Thursday")).toBe("التقرير جاهز يوم الخميس");
  });

  it("leaves Arabic day names as clear full words", () => {
    const s = "يصدر التقرير يوم الخميس القادم.";
    expect(applyFinnPronunciation(s)).toBe(s);
  });
});

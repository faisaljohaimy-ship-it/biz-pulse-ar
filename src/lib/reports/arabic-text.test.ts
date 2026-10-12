import { describe, expect, it } from "vitest";
import { layoutArabicLine, shapeArabic, toArabicDigits } from "./arabic-text";

describe("layoutArabicLine — presentation forms + visual segment layout", () => {
  it("shapes a connected word into initial/medial/final forms in LOGICAL order", () => {
    // نور → ن initial (FEE7) · و final (FEEE) · ر isolated (FEAD) — و is
    // right-joining only, so ر after و takes ISOLATED form. Content stays
    // LOGICAL (fontkit performs the visual flip at draw time).
    const segs = layoutArabicLine("نور");
    expect(segs).toHaveLength(1);
    expect(segs[0]!.ar).toBe(true);
    const cps = Array.from(segs[0]!.text).map((c) => c.codePointAt(0));
    expect(cps).toEqual([0xfee7, 0xfeee, 0xfead]);
  });

  it("applies the mandatory lam-alef ligature", () => {
    expect(Array.from(shapeArabic("لا")).map((c) => c.codePointAt(0))).toEqual([0xfefb]);
    // Final form when connected from the previous letter: بلا — logical
    // order is ب (initial) then the ligature (final form).
    const connected = shapeArabic("بلا");
    expect(Array.from(connected).map((c) => c.codePointAt(0))).toEqual([0xfe91, 0xfefc]);
  });

  it("strips harakat (combining marks are unreliable in flat PDF drawing)", () => {
    expect(shapeArabic("مُحَمَّد")).toBe(shapeArabic("محمد"));
  });

  it("keeps latin/digit runs LTR and places them visually between Arabic runs", () => {
    const segs = layoutArabicLine("تقرير SEC-18 اليومي");
    // Latin token survives intact in its own non-Arabic segment.
    const latinSeg = segs.find((s) => !s.ar && s.text.includes("SEC-18"));
    expect(latinSeg).toBeDefined();
    // Visual order: for RTL base direction the FIRST logical word (تقرير)
    // must be the LAST placed segment (rightmost).
    expect(segs[segs.length - 1]!.ar).toBe(true);
    expect(segs[0]!.ar).toBe(true);
    // Arabic content is presentation-form shaped.
    expect(segs.some((s) => /[\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s.text))).toBe(true);
  });

  it("keeps digits inside an Arabic sentence most-significant-first", () => {
    const segs = layoutArabicLine("خلال 24 ساعة");
    const digits = segs.find((s) => !s.ar);
    expect(digits?.text).toContain("24");
    // ساعة (second logical word) is placed BEFORE the digits (further left).
    const arTexts = segs.filter((s) => s.ar).map((s) => s.text);
    expect(arTexts).toHaveLength(2);
  });

  it("never pre-reverses Arabic content (fontkit owns the flip)", () => {
    // نور logical starts with ن initial form FEE7 — a pre-reversed string
    // would start with ر (FEAD). Guard against the double-reversal defect.
    const flat = shapeArabic("نور");
    expect(flat.codePointAt(0)).toBe(0xfee7);
  });

  it("converts western digits to Arabic-Indic on demand", () => {
    expect(toArabicDigits("2026/07/20")).toBe("٢٠٢٦/٠٧/٢٠");
  });
});

describe("layoutArabicLine — اتجاه الأسطر المختلطة (UAX #9)", () => {
  /** ما يرسمه الملف فعلًا من اليسار: fontkit يقلب كل مقطع عربي. */
  const drawn = (line: string) =>
    layoutArabicLine(line)
      .map((s) => (s.ar ? Array.from(s.text).reverse().join("") : s.text))
      .join("");
  /** كلمة عربية كما تُرى: مشكَّلة ثم مقلوبة. */
  const w = (word: string) => Array.from(shapeArabic(word)).reverse().join("");

  it("المسافة تبقى في جهتها بين الكلمة العربية والرقم", () => {
    expect(drawn("يوجد 5 تصاريح نشطة")).toBe(`${w("نشطة")} ${w("تصاريح")} 5 ${w("يوجد")}`);
    expect(drawn("راجع SEC-18 اليوم")).toBe(`${w("اليوم")} SEC-18 ${w("راجع")}`);
    expect(drawn("نسبة الإنجاز 87% من الخطة")).toBe(
      `${w("الخطة")} ${w("من")} 87% ${w("الإنجاز")} ${w("نسبة")}`,
    );
  });

  it("العدد لا يغيّر موضعه، والقوس يحيط بالبند الصحيح", () => {
    expect(drawn("المتأخرة: 3 (SEC-18 و SAF-02)")).toBe(
      `(SAF-02 ${w("و")} SEC-18) 3 :${w("المتأخرة")}`,
    );
  });

  it("الأقواس تنعكس في السياق العربي", () => {
    expect(drawn("رد سديد (مولد بالذكاء الاصطناعي)")).toBe(
      `(${w("الاصطناعي")} ${w("بالذكاء")} ${w("مولد")}) ${w("سديد")} ${w("رد")}`,
    );
  });

  it("السطر اللاتيني الخالص فقرة يسارية تبقى كما هي", () => {
    expect(layoutArabicLine("Hello world.")).toEqual([{ ar: false, text: "Hello world." }]);
  });
});

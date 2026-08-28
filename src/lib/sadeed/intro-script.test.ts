/**
 * سيناريو المقدّمة — اختبار سلوك على البيانات، لا قراءة مصدر.
 *
 * الأهمّ هنا **المادة ٢٧**: النصّ المنطوق يُقال على الشاشة الأولى قبل أن
 * يرى المستخدم شيئًا، فأي رقم فيه يُقرأ قياسًا وقع — ولم يقع. الحارس يفحص
 * المنطوق والمكتوب معًا لأن السامع الذي لا يقرأ يسمع الأول وحده.
 */
import { describe, expect, it } from "vitest";
import {
  INTRO_BEATS,
  INTRO_FACE,
  INTRO_NARRATION_AR,
  INTRO_TOTAL_MS,
  beatAt,
  introProgress,
} from "./intro-script";

/** أرقام هندية وعربية ونِسَب — أي منها في نصٍّ معروض ادّعاءُ قياس. */
const DIGITS = /[0-9٠-٩]|٪|%/;

describe("المادة ٢٧ — لا رقم في المقدّمة", () => {
  it("النصّ المنطوق خالٍ من الأرقام والنِّسَب", () => {
    expect(INTRO_NARRATION_AR).not.toMatch(DIGITS);
  });

  it("وسطور الشاشة كذلك", () => {
    for (const b of INTRO_BEATS) {
      expect(b.caption, `المشهد عند ${b.atMs}ms يحمل رقمًا`).not.toMatch(DIGITS);
    }
  });

  it("والمحاكاة معلنةٌ في المنطوق لا في الشاشة وحدها", () => {
    // من يسمع ولا يقرأ يجب أن يعرف أن ما يراه ليس بيانات منشأته.
    expect(INTRO_NARRATION_AR).toContain("محاكاة مرجعية");
  });

  it("ولا يَعِد بما لم يُعتمد", () => {
    for (const banned of ["معتمد من", "الهيئة العليا", "شهادة", "الأفضل", "الأول في"]) {
      expect(INTRO_NARRATION_AR, `وعدٌ غير مسنَد: ${banned}`).not.toContain(banned);
    }
  });
});

describe("الخطّ الزمني — ثلاثون ثانية بالضبط", () => {
  it("المدّة ٣٠ ثانية كما أمر المالك حرفيًّا", () => {
    expect(INTRO_TOTAL_MS).toBe(30_000);
  });

  it("المشاهد مرتّبة تصاعديًّا وتبدأ من الصفر", () => {
    expect(INTRO_BEATS[0].atMs).toBe(0);
    for (let i = 1; i < INTRO_BEATS.length; i += 1) {
      expect(INTRO_BEATS[i].atMs).toBeGreaterThan(INTRO_BEATS[i - 1].atMs);
    }
  });

  it("ولا مشهد يبدأ بعد نهاية المقدّمة — وإلّا لَما رُئي قطّ", () => {
    for (const b of INTRO_BEATS) expect(b.atMs).toBeLessThan(INTRO_TOTAL_MS);
  });

  it("beatAt يعيد المشهد السّاري لا التالي", () => {
    expect(beatAt(0)).toBe(INTRO_BEATS[0]);
    expect(beatAt(INTRO_BEATS[1].atMs - 1)).toBe(INTRO_BEATS[0]);
    expect(beatAt(INTRO_BEATS[1].atMs)).toBe(INTRO_BEATS[1]);
    expect(beatAt(999_999)).toBe(INTRO_BEATS[INTRO_BEATS.length - 1]);
  });

  it("والتقدّم محصورٌ بين صفر وواحد", () => {
    expect(introProgress(-5)).toBe(0);
    expect(introProgress(0)).toBe(0);
    expect(introProgress(INTRO_TOTAL_MS / 2)).toBeCloseTo(0.5, 5);
    expect(introProgress(INTRO_TOTAL_MS)).toBe(1);
    expect(introProgress(INTRO_TOTAL_MS * 9)).toBe(1);
  });
});

describe("هندسة الوجه — نسبٌ لا بكسلات", () => {
  it("كل مرساة كسرٌ صالح من مقاس الصورة", () => {
    for (const [k, v] of Object.entries(INTRO_FACE)) {
      expect(v, `${k} خارج المدى`).toBeGreaterThan(0);
      expect(v, `${k} خارج المدى`).toBeLessThan(1);
    }
  });

  it("والفم أسفل العينين — انقلابهما يضع الرمش على الفكّ", () => {
    expect(INTRO_FACE.mouthY).toBeGreaterThan(INTRO_FACE.eyesY);
  });

  it("ومنطقة الفم أضيق من شريط العينين", () => {
    expect(INTRO_FACE.mouthHalfW).toBeLessThan(INTRO_FACE.eyesHalfW);
  });
});

describe("التقريب — الوجه يقرب حين يتكلّم", () => {
  it("مشهد الافتتاح يعرض المشهد كاملًا", () => {
    expect(INTRO_BEATS[0].zoom).toBe(1);
    expect(INTRO_BEATS[0].anchor).toBe("full");
  });

  it("ومشاهد الوجه تقرب فعلًا — بغير تقريب لا تُرى حركة الشفاه", () => {
    // الوجه ~10٪ من عرض الصورة؛ بلا تقريب تصير حركة الفم أصغر من أن تُقرأ.
    const faceBeats = INTRO_BEATS.filter((b) => b.anchor === "face");
    expect(faceBeats.length).toBeGreaterThan(0);
    for (const b of faceBeats) expect(b.zoom).toBeGreaterThan(1.1);
  });
});

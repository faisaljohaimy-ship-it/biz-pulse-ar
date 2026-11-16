/**
 * دورات السجلّ — والحدّ هو كل شيء.
 *
 * التجديد هنا مشتقٌّ من التاريخ لا مجدول، فالخطر الوحيد فيه أن يقع الحدّ
 * في اللحظة الخطأ. وهو خطرٌ صامت: دخولٌ يُنسب إلى نصفٍ آخر لا يُسقط شيئًا
 * ولا يُرى إلا حين يُراجَع سجلٌّ بعد شهور.
 */
import { describe, expect, it } from "vitest";
import {
  buildPeriod,
  currentPeriod,
  isClosed,
  parsePeriodKey,
  periodOf,
  previousPeriod,
  recentPeriods,
} from "./staff-period";

describe("دورة نصف السنة — الحدود بتوقيت الرياض", () => {
  it("النصف الأول يبدأ ١ يناير الرياض، وهو 21:00 UTC من ٣١ ديسمبر", () => {
    const p = buildPeriod(2026, 1);
    expect(p.key).toBe("2026-H1");
    // 00:00 بالرياض = 21:00 UTC من اليوم السابق (UTC+3).
    expect(p.startIso).toBe("2025-12-31T21:00:00.000Z");
    expect(p.endIso).toBe("2026-06-30T21:00:00.000Z");
  });

  it("والنصف الثاني يبدأ حيث ينتهي الأول بالضبط — لا ثغرة ولا تداخل", () => {
    const h1 = buildPeriod(2026, 1);
    const h2 = buildPeriod(2026, 2);
    expect(h2.startIso).toBe(h1.endIso);
    expect(h2.endIso).toBe("2026-12-31T21:00:00.000Z");
  });

  it("يحافظ حساب UTC الأخف على حدود الرياض في السنوات الكبيسة وعلى طرف السجل", () => {
    for (const [year, half] of [
      [1000, 1],
      [2024, 1],
      [2024, 2],
      [9999, 1],
    ] as const) {
      const period = buildPeriod(year, half);
      const month = half === 1 ? "01" : "07";
      const endYear = year + (half === 2 ? 1 : 0);
      const endMonth = half === 1 ? "07" : "01";
      expect(period.startIso).toBe(new Date(`${year}-${month}-01T00:00:00+03:00`).toISOString());
      expect(period.endIso).toBe(
        new Date(`${endYear}-${endMonth}-01T00:00:00+03:00`).toISOString(),
      );
    }
  });

  it("**الساعات الثلاث الحرجة**: أول يوليو ٠١:٠٠ بالرياض في النصف الثاني", () => {
    // هذه هي اللحظة التي يخطئ فيها حسابُ UTC: بـUTC هي ٣٠ يونيو 22:00
    // فتُنسب إلى النصف الأول، وهي عند من في الرياض أوّل يوليو.
    const at = new Date("2026-07-01T01:00:00+03:00");
    expect(at.toISOString()).toBe("2026-06-30T22:00:00.000Z"); // تأكيدُ أن الفخّ قائم
    expect(periodOf(at).key).toBe("2026-H2");
  });

  it("وآخر لحظةٍ في النصف الأول تبقى فيه", () => {
    const at = new Date("2026-06-30T23:59:59+03:00");
    expect(periodOf(at).key).toBe("2026-H1");
  });

  it("وأوّل لحظةٍ في السنة الجديدة تنتقل للسنة والنصف الأول", () => {
    const at = new Date("2027-01-01T00:00:00+03:00");
    expect(periodOf(at).key).toBe("2027-H1");
  });

  it("والانتقال يقع بلا تشغيل شيء — دالّةٌ في اللحظة وحدها", () => {
    // قبل الحدّ بدقيقة وبعده بدقيقة: مفتاحان مختلفان بلا أي حالةٍ مخزّنة.
    const before = currentPeriod(new Date("2026-06-30T23:59:00+03:00"));
    const after = currentPeriod(new Date("2026-07-01T00:01:00+03:00"));
    expect(before.key).toBe("2026-H1");
    expect(after.key).toBe("2026-H2");
  });
});

describe("التنقّل بين الدورات", () => {
  it("السابقة للنصف الثاني هي الأول من السنة نفسها", () => {
    expect(previousPeriod(buildPeriod(2026, 2)).key).toBe("2026-H1");
  });

  it("والسابقة للنصف الأول هي الثاني من السنة الماضية", () => {
    expect(previousPeriod(buildPeriod(2026, 1)).key).toBe("2025-H2");
  });

  it("والقائمة تنزل بالترتيب بلا تكرار", () => {
    const keys = recentPeriods(4, new Date("2026-09-20T12:00:00+03:00")).map((p) => p.key);
    expect(keys).toEqual(["2026-H2", "2026-H1", "2025-H2", "2025-H1"]);
  });

  it("وتعيد دورةً واحدة على الأقل مهما كان العدد", () => {
    expect(recentPeriods(0).length).toBe(1);
  });

  it("ترفض NaN وInfinity دون أن تعلق الواجهة أو تسقط الدورة الجارية", () => {
    const now = new Date("2026-09-20T12:00:00+03:00");
    for (const invalid of [NaN, Infinity, -Infinity]) {
      expect(recentPeriods(invalid, now).map((p) => p.key)).toEqual(["2026-H2"]);
    }
  });

  it("تحافظ على دلالة تقريب العدد الكسري إلى الأعلى", () => {
    const now = new Date("2026-09-20T12:00:00+03:00");
    expect(recentPeriods(1.5, now).map((p) => p.key)).toEqual(["2026-H2", "2026-H1"]);
  });

  it("تقيّد الطلب الهائل بسنوات السجل الصالحة بدلاً من استنفاد الذاكرة أو رمي RangeError", () => {
    const now = new Date("2026-09-20T12:00:00+03:00");
    const all = recentPeriods(Number.MAX_VALUE, now);
    expect(all).toHaveLength((2026 - 1000) * 2 + 2);
    expect(all[0].key).toBe("2026-H2");
    expect(all.at(-1)?.key).toBe("1000-H1");
    expect(all.every((p) => parsePeriodKey(p.key) !== null)).toBe(true);
  });
});

describe("قراءة المفاتيح", () => {
  it("تردّ مفاتيح السنوات التي كانت تُسقط طلب قراءة السجل بـRangeError", () => {
    for (const bad of ["0000-H1", "0001-H1", "0999-H2", "9999-H2"]) {
      expect(() => parsePeriodKey(bad), bad).not.toThrow();
      expect(parsePeriodKey(bad), bad).toBeNull();
    }
  });

  it("وتبقي حدود التاريخ الصالحة كما كانت", () => {
    expect(parsePeriodKey("1000-H1")?.startIso).toBe("0999-12-31T21:00:00.000Z");
    expect(parsePeriodKey("9999-H1")?.endIso).toBe("9999-06-30T21:00:00.000Z");
  });

  it("تقرأ المفتاح الصحيح", () => {
    expect(parsePeriodKey("2026-H2")?.half).toBe(2);
    expect(parsePeriodKey(" 2026-H1 ")?.year).toBe(2026);
  });

  it("وتردّ ما ليس مفتاحًا — فلا يصير مدخلُ مستخدمٍ نطاقَ استعلام", () => {
    for (const bad of ["2026-H3", "26-H1", "H1", "", "2026", "2026-H1; drop table"]) {
      expect(parsePeriodKey(bad), bad).toBeNull();
    }
  });
});

describe("انتهاء الدورة", () => {
  it("الجارية لم تنتهِ", () => {
    const now = new Date("2026-09-20T12:00:00+03:00");
    expect(isClosed(currentPeriod(now), now)).toBe(false);
  });

  it("والسابقة منتهية", () => {
    const now = new Date("2026-09-20T12:00:00+03:00");
    expect(isClosed(buildPeriod(2026, 1), now)).toBe(true);
  });
});

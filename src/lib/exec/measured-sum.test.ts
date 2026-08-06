/**
 * حارس المادة ٢٧ على الجمع.
 *
 * العطل الذي أنتج هذه الدالة: «منجز اليوم» كان يُعرض `0` على الرئيسية لأن
 * المسار الحيّ يكتب صفرًا لكل وكيل (لا عمود في القاعدة يحمل العدد) ثم يجمع
 * الأصفار — فيخرج «قياسٌ» لم يقع. `reduce` المباشر لا يفرّق بين قائمةٍ
 * فارغة وقائمةٍ كلّها أصفار؛ وهذا الفرق هو كل ما تحفظه الدالة.
 */
import { describe, expect, it } from "vitest";
import { sumMeasured } from "./measured-sum";

describe("sumMeasured — الصفر قياسٌ والغياب ليس صفرًا", () => {
  it("لا قياس ⇐ null لا صفر", () => {
    expect(sumMeasured([])).toBeNull();
    expect(sumMeasured([null, null])).toBeNull();
    expect(sumMeasured([undefined, null, undefined])).toBeNull();
  });

  it("صفرٌ مقيس يبقى صفرًا", () => {
    // هذا هو الطرف الآخر: لو أُعيد `null` هنا لأخفينا قياسًا وقع فعلًا.
    expect(sumMeasured([0])).toBe(0);
    expect(sumMeasured([0, 0, 0])).toBe(0);
  });

  it("يجمع المقيس ويتخطّى الغائب", () => {
    expect(sumMeasured([3, null, 4])).toBe(7);
    expect(sumMeasured([null, 5])).toBe(5);
  });

  it("لا يعدّ NaN ولا اللانهاية قياسًا", () => {
    // قيمة غير منتهية تُفسد المجموع كلّه بصمت لو مرّت.
    expect(sumMeasured([Number.NaN])).toBeNull();
    expect(sumMeasured([Number.POSITIVE_INFINITY])).toBeNull();
    expect(sumMeasured([2, Number.NaN, 3])).toBe(5);
  });
});

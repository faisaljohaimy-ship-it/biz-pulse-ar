/**
 * وجهة الرجوع — اختبار سلوك لا قراءة مصدر.
 *
 * `resolveBackTarget` دالّة خالصة عمدًا (وجود المسار والحجب يُحقنان)، فكل
 * فرعٍ فيها يُقاس هنا بلا مُسيّر ولا DOM. والفروع هي عين ما يخطئ فيه
 * الاشتقاق النصّي: أبٌ غير موجود، أبٌ محجوب، وأبٌ يخالف ترتيب المسار.
 */
import { describe, expect, it } from "vitest";
import { drilldownParent, resolveBackTarget } from "./drilldowns";
import { isRouteHidden } from "./hidden-routes";

/**
 * سجلّ مسارات مصغّر يقف مقام `router.routesByPath`.
 *
 * `/ptw` **مسجَّل هنا عمدًا**: الحجب في هذا النظام إعادةُ توجيه لا حذفَ
 * مسار (`hidden-routes.ts` — «أبقِ ملفات المكوّن»)، فالمسار يبقى في
 * السجلّ. وإسقاطه من السجلّ يجعل بند «لا رجوع إلى محجوب» يمرّ لأن
 * `routeExists` ردّه أوّلًا — أي يمرّ لعلّةٍ أخرى ولا يفحص الحجب أصلًا.
 * (ثبت فعلًا: حقنةُ إسقاط شرط الحجب لم تُسقط البند حتى صُحّح السجلّ.)
 */
const REAL = new Set([
  "/",
  "/sec",
  "/sec/access",
  "/sec/reports",
  "/settings",
  "/assistant",
  "/governance",
  "/ptw",
]);
const exists = (p: string) => REAL.has(p);
const back = (p: string) => resolveBackTarget(p, exists, isRouteHidden);

describe("resolveBackTarget — كل شاشة لها مخرج، ولا مخرج إلى العدم", () => {
  it("الرئيسية بلا رجوع — نقطة البداية لا أب لها", () => {
    expect(back("/")).toBeNull();
    expect(back("")).toBeNull();
  });

  it("الخريطة اليدوية تسود على ترتيب المسار", () => {
    // `/sec/contractors` سلفه النصّي `/sec`، لكن أباه المكتوب `/sec/access`.
    expect(drilldownParent("/sec/contractors")).toBe("/sec/access");
    expect(back("/sec/contractors")).toBe("/sec/access");
    expect(back("/settings/microsoft")).toBe("/settings");
  });

  it("والنمط الديناميكي كذلك — خيط المحادثة يعود إلى قائمتها", () => {
    expect(back("/assistant/abc-123")).toBe("/assistant");
  });

  it("الأب المشتقّ يُقبل حين يكون شاشةً مسجّلة فعلًا", () => {
    // هذا هو المكسب: مسارٌ لا ذكر له في الخريطة صار له رجوع.
    expect(drilldownParent("/sec/reports")).toBeNull();
    expect(back("/sec/reports")).toBe("/sec");
  });

  it("ويُرفض حين لا يكون مسارًا — الرجوع لا يفتح 404", () => {
    // `/nope` غير مسجّل، فالأب المشتقّ ساقط والمخرج الرئيسية.
    expect(back("/nope/deep")).toBe("/");
  });

  it("ويُرفض حين يكون محجوبًا — الرجوع لا يفتح ما حجبه المالك", () => {
    // `/ptw` في hidden-routes، فلا يصلح وجهةً لأي ابنٍ له.
    expect(isRouteHidden("/ptw")).toBe(true);
    expect(back("/ptw/anything")).toBe("/");
  });

  it("شاشة المستوى الواحد مخرجها الرئيسية", () => {
    expect(back("/sec")).toBe("/");
    expect(back("/governance")).toBe("/");
  });

  it("المائلة الختامية لا تصنع مكانًا ثانيًا", () => {
    expect(back("/sec/reports/")).toBe(back("/sec/reports"));
    expect(back("/")).toBeNull();
  });

  it("لا يعيد المسار نفسه — رجوعٌ إلى المكان نفسه ليس رجوعًا", () => {
    for (const p of ["/sec", "/sec/reports", "/sec/contractors", "/settings/microsoft"]) {
      expect(back(p)).not.toBe(p);
    }
  });
});

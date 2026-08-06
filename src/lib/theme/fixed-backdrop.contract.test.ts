/**
 * الخلفية ثابتة على الشاشة — حارس قرار مالك على فرعٍ له كاتبان.
 *
 * ## لماذا حارسٌ لا تعليق
 *
 * `main` عليه كاتبٌ آليّ نشط (المادة ٣٥). وقد قلب هذا السلوك مرّة: كانت
 * `body::before` مكتوبة `position: fixed` منذ إنشائها، فجاءت كتلة لاحقة
 * تفرض `position: absolute !important` بارتفاع المستند كلّه، فانساحت
 * الخلفية مع السحب. المالك نقض ذلك صراحةً.
 *
 * التعليق وحده لا يمنع العودة — الكاتب الآخر لا يقرأه. الحارس يمنعها:
 * أي دفعة تعيد الانسياح تُسقط البوابة وتقول السبب باسمه.
 *
 * ## لماذا فحصٌ على النصّ لا على التصيير
 *
 * `position: fixed` لا يُختبر في jsdom: لا إطار عرض ولا سحب ولا رسم.
 * والفرق بين `fixed` و`absolute` هنا لا يظهر إلا على متصفّح حقيقي بصفحة
 * أطول من الشاشة. فالمُلزِم هو **أيّهما كُتب**، وهذا يُقرأ من الملف.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const CSS = readFileSync("src/styles.css", "utf8");
/** التعليقات تشرح العطل وتقتبس الخاصيّة المنقوضة باسمها — الحارس يفحص
 *  القواعد وحدها، وإلّا أسقطَ الملفَّ شرحُ الملف. */
const CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** آخر كتلة تكتب موضع `body::before` هي التي تحكم فعلًا. */
const lastBackdropRule = (() => {
  const at = CSS.lastIndexOf("body::before");
  if (at === -1) return "";
  return CSS.slice(at, CSS.indexOf("}", at) + 1);
})();

describe("خلفية الصفحة ثابتة على الشاشة", () => {
  it("actually located the backdrop rule", () => {
    // حارس صامت: لو أُعيدت تسمية الطبقة لَمرّ الملف كلّه بلا معنى.
    expect(lastBackdropRule).not.toBe("");
    expect(CSS).toContain("body::before");
  });

  it("آخر قاعدة تحكم الموضع تكتب fixed لا absolute", () => {
    expect(lastBackdropRule).toMatch(/position:\s*fixed/);
    expect(lastBackdropRule).not.toMatch(/position:\s*absolute/);
  });

  it("لا ارتفاع بامتداد المستند — هذا هو شكل الانسياح", () => {
    // `height: auto` + `min-height: 100%` على طبقةٍ ثابتة تعني: امتدّ مع
    // الصفحة. وهو بالضبط ما نقضه المالك.
    expect(lastBackdropRule).not.toMatch(/height:\s*auto/);
  });

  it("لا يُعتمد على background-attachment: fixed — معطوبة على iOS", () => {
    // الثبات يأتي من العنصر لا من الخاصيّة. هذه التفرقة هي كل الفرق بين
    // «ثابتة تعمل» و«ثابتة تتقطّع على الجوال».
    expect(CODE).not.toMatch(/background-attachment:\s*fixed/);
  });

  it("`position: fixed` صالح: لا سلف يُنشئ containing block جديدًا", () => {
    // transform/filter/backdrop-filter/perspective على html أو body تُحوّل
    // «الثابت» إلى ثابتٍ بالنسبة إليها لا إلى الشاشة — فيعود الانسياح من
    // بابٍ آخر دون أن يمسّ أحدٌ سطر `position`.
    // **الأسلاف وحدهم.** أوّل صياغة التقطت `body::after { filter: blur(8px) }`
    // وعدّته خرقًا — وهو ليس كذلك: العنصر الزائف شقيقٌ لـ`body::before` لا
    // سلفٌ له، فمرشّحه لا يُنشئ لها containing block. المحدِّد هنا مقصورٌ
    // على `html` و`body` نفسيهما (ومعهما أصنافهما)، بلا عنصرٍ زائف وبلا
    // محدِّد نسب.
    const rootBlocks = [...CSS.matchAll(/(^|\n)((?:html|body)(?:\.[\w-]+)*)\s*\{([^}]*)\}/g)]
      .map((m) => ({ sel: m[2], body: m[3] }))
      .filter(({ body }) => /(^|\s|;)(transform|filter|perspective):/.test(body))
      .filter(({ body }) => !/transform:\s*none|filter:\s*none/.test(body));
    expect(
      rootBlocks.map((b) => b.sel),
      "سلفٌ جذريّ يحمل transform/filter فيُبطل الثبات",
    ).toEqual([]);
  });
});

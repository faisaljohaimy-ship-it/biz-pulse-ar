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

/**
 * **كل** كتل `body::before` لا آخرها.
 *
 * أوّل صياغة قرأت `lastIndexOf` وحدها، ظنًّا أن المتأخّر يحكم. وهي ثغرة:
 * الكاتب الآخر كتب `position: absolute !important` — و`!important` تغلب
 * الترتيب، فلو أعادها عند السطر ٤٧٧٦ (وهناك كتلة `html.dark body::before`
 * بالمحدِّد نفسه) لعاد الوضع الداكن إلى الانسياح **والحارس يمرّ**. الحماية
 * لا تكون بموضعٍ في الملف.
 */
const backdropRules = [...CODE.matchAll(/[^{}]*body::before[^{}]*\{[^}]*\}/g)].map((m) => m[0]);
const lastBackdropRule = backdropRules.at(-1) ?? "";

describe("خلفية الصفحة ثابتة على الشاشة", () => {
  it("actually located the backdrop rule", () => {
    // حارس صامت: لو أُعيدت تسمية الطبقة لَمرّ الملف كلّه بلا معنى.
    expect(lastBackdropRule).not.toBe("");
    expect(CSS).toContain("body::before");
  });

  it("لا كتلة واحدة — في أيٍّ منها — تُعيد الطبقة إلى absolute", () => {
    // كل الكتل تُفحص: `!important` تغلب الترتيب، فآخر كتلةٍ ليست بالضرورة
    // الكلمة الأخيرة.
    const offenders = backdropRules.filter((r) => /position:\s*absolute/.test(r));
    expect(offenders, `كتلة تُعيد الانسياح: ${offenders.join(" | ").slice(0, 200)}`).toEqual([]);
    expect(lastBackdropRule).toMatch(/position:\s*fixed/);
  });

  it("لا ارتفاع بامتداد المستند — هذا هو شكل الانسياح", () => {
    // `height: auto` + `min-height: 100%` على طبقةٍ ثابتة تعني: امتدّ مع
    // الصفحة. وهو بالضبط ما نقضه المالك.
    const stretched = backdropRules.filter((r) => /height:\s*auto/.test(r));
    expect(stretched).toEqual([]);
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
    // سلفٌ له، فمرشّحه لا يُنشئ لها containing block.
    //
    // لكنّها أخطأت في الاتّجاه الآخر أيضًا، وهو الأخطر: استثنت المحدِّدات
    // النسبية جملةً، بينما `html.dark body { … }` (styles.css:4767) يُنسّق
    // **body نفسه** — أي السلف المباشر. فالمقياس الصحيح ليس «بلا نسب» بل
    // «ينتهي بـhtml أو body».
    //
    // وأُضيفت الخصائص الناقصة: `will-change` (سببُ هذا العطل بعينه، ولم تكن
    // مفحوصة!) و`backdrop-filter` (وُعد بها التعليق ولم يطابقها المحدِّد:
    // اشتراط `(^|\s|;)` قبل `filter` يمنع مطابقة `backdrop-filter` لأن
    // السابق فيها شَرطة) و`contain` و`content-visibility` — وكلّها تُنشئ
    // containing block.
    const BREAKERS =
      /(^|[\s;])(transform|filter|backdrop-filter|perspective|will-change|contain|content-visibility)\s*:/;
    const rootBlocks = [
      ...CODE.matchAll(/(^|\n)([^{}]*?(?:html|body)(?:\.[\w-]+)*)\s*\{([^}]*)\}/g),
    ]
      .map((m) => ({ sel: m[2].trim(), body: m[3] }))
      // العناصر الزائفة شقيقة لا سلف — تُستثنى.
      .filter(({ sel }) => !sel.includes("::") && !sel.includes("*"))
      .filter(({ body }) => BREAKERS.test(body))
      .filter(({ body }) => !/(transform|filter|contain|will-change):\s*(none|auto)/.test(body));
    expect(
      rootBlocks.map((b) => b.sel),
      "سلفٌ جذريّ يحمل transform/filter فيُبطل الثبات",
    ).toEqual([]);
  });
});

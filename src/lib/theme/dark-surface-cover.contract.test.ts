/**
 * الأسطح الداكنة — حارس ضدّ «لونٌ صحيح تغطّيه صورة».
 *
 * ## العطل
 *
 * القاعدة العامّة للزجاج تكتب على كل عائلات البطاقات:
 *
 *   background-image: linear-gradient(rgba(255,255,255,0.94) → …) !important;
 *
 * بلا تخصيصٍ لوضع. وكتلة الوضع الداكن تكتب `background-color` وحده. و
 * **الصورة تُرسم فوق اللون** — فاللون الداكن الصحيح لا يُرى أصلًا: بطاقةٌ
 * بيضاء يُكتب عليها حبرٌ أبيض، ١٫٠٢:١.
 *
 * والأخطر أن الرقم المكتوب في التوثيق (١٢٫٣٠:١) كان **صحيحًا حسابيًّا**:
 * قِيس على `background-color` الذي لا يظهر. رقمٌ صحيح يجيب عن سؤالٍ آخر.
 *
 * ## القاعدة المستخلَصة
 *
 * **من يُلغِ لونًا في وضعٍ فليُلغِ صورته معه.** ولا يكفي أن يُنقَذ عضوان
 * من القائمة (كما وقع: `nexus-window` و`glass-sidebar` وحدهما) — القائمة
 * تُعالَج كلّها أو تُترك كلّها.
 *
 * ## لماذا فحصٌ على النصّ
 *
 * الفرق لا يظهر في jsdom: لا رسم ولا تركيب طبقات. ولا يظهر في لقطةٍ ما لم
 * يُنظر إلى البطاقة بعينها في الوضع الداكن. المُلزِم أن **الإلغاء مكتوب**.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const CSS = readFileSync("src/styles.css", "utf8");
const CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** أوّل كتلة `html.dark` تنسّق عائلة البطاقات. */
const darkCardBlock = (() => {
  const at = CODE.indexOf("html.dark .nexus-card");
  if (at === -1) return "";
  const open = CODE.indexOf("{", at);
  return CODE.slice(open, CODE.indexOf("}", open) + 1);
})();

describe("الأسطح الداكنة لا تغطّيها صورة فاتحة", () => {
  it("actually located the dark card block", () => {
    // حارس صامت: لو أُعيدت تسمية العائلة لَمرّ الملف كلّه بلا معنى.
    expect(darkCardBlock).not.toBe("");
    expect(CODE).toContain("html.dark .nexus-card");
  });

  it("القاعدة العامّة ما زالت تكتب تدرّجًا فاتحًا — فالإلغاء لازم", () => {
    // لو أُزيل التدرّج يومًا سقطت الحاجة إلى الإلغاء، ويجب أن يُعاد النظر
    // في هذا الحارس بدل أن يحرس شرطًا لم يعد قائمًا.
    expect(CODE).toMatch(/background-image:\s*linear-gradient\(\s*180deg,\s*rgba\(255, 255, 255/);
  });

  it("كتلة الداكن تُلغي الصورة كما تُلغي اللون", () => {
    // هذا هو السطر الذي كانت البطاقات بيضاء بدونه.
    expect(darkCardBlock).toMatch(/background-image:\s*none\s*!important/);
    expect(darkCardBlock).toMatch(/background-color:[^;]*!important/);
  });

  it("لا يُنقَذ بعض العائلة ويُترك سائرها", () => {
    // القائمة العامّة تسع أصناف. كتلة الداكن يجب أن تشملها جميعًا —
    // إنقاذ عضوين من تسعة هو ما ترك البطاقات بيضاء أوّل مرّة.
    const generalList = (() => {
      const at = CODE.indexOf(
        "background-image: linear-gradient(\n    180deg,\n    rgba(255, 255, 255",
      );
      if (at === -1) return [];
      const blockStart = CODE.lastIndexOf("}", at) + 1;
      return (CODE.slice(blockStart, at).match(/\.[a-z-]+|\[data-slot="card"\]/g) ?? []).map((s) =>
        s.trim(),
      );
    })();

    const darkSelectors = (() => {
      const at = CODE.indexOf("html.dark .nexus-card");
      const blockStart = CODE.lastIndexOf("}", at) + 1;
      const open = CODE.indexOf("{", at);
      return CODE.slice(blockStart, open);
    })();

    const missing = generalList.filter((sel) => !darkSelectors.includes(sel));
    expect(
      missing,
      `أصناف تُطلى بالتدرّج الفاتح ولا تُنقذها كتلة الداكن: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});

/**
 * جسر الأسطح الداكنة في الوضع الفاتح — حارس ضدّ «قائمةٍ تتأخّر عن الكود».
 *
 * ## العطل
 *
 * صفحة قاعة المجلس في الوضع الفاتح: الترويسة بيضاء والمتن **أسود**، والعنوان
 * حبرٌ داكن فوق أسود — أي عنوانٌ مطموس (المرفق IMG_9412). السبب لم يكن في
 * الصفحة: كانت في `styles.css` قائمةُ سماحٍ صريحة بعشرين لونًا داكنًا
 * تُقلَب في الوضع الفاتح، والصفحة تستعمل `bg-[#04060f]` — وفي القائمة
 * `#04060D`. حرفٌ واحد.
 *
 * ## لماذا لا يكفي إضافة الحرف
 *
 * لأن الاتّجاه هو العطل. قائمةُ سماحٍ تُعدَّد فيها الأسطح تتأخّر أبدًا: كل
 * لونٍ داكن جديد يُكتب في أي ملف يبدأ حياته خارجها، وفشلُه **صامت ومظلم**.
 * فقُلبت: تُستثنى اللكنات الفاتحة (ثلاثة ألوان ثابتة) ويُقلب ما عداها. اللون
 * الجديد الذي يفوت الاستثناء يفشل **إلى الأبيض** — خطأٌ يُرى ويُصلَح.
 *
 * وهذا الحارس يُبقي الأمرين مربوطين بالمستودع نفسه: يقرأ كل ألوان الخلفية
 * المكتوبة صراحةً في `src/`، يحسب إضاءتها، ويشترط أن يغطّيها الجسر. فلا
 * يعتمد على قائمة ثانية تُكتب هنا وتفترق بدورها.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const CSS = readFileSync("src/styles.css", "utf8");

/** كل `bg-[#rrggbb]` مكتوب في مصدر الواجهة. */
function arbitraryBackgroundHexes(): string[] {
  const found = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.(tsx?|jsx?)$/.test(entry)) continue;
      const src = readFileSync(p, "utf8");
      for (const m of src.matchAll(/bg-\[#([0-9a-fA-F]{6})/g)) {
        found.add(m[1].toLowerCase());
      }
    }
  };
  walk("src");
  return [...found];
}

/** إضاءة مُدرَكة تقريبية (ITU-R BT.601) — الحدّ ٦٠ يفصل السطح عن اللكنة. */
function luminance(hex: string): number {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

const HEXES = arbitraryBackgroundHexes();
const DARK = HEXES.filter((h) => luminance(h) < 60);
const LIGHT = HEXES.filter((h) => luminance(h) >= 60);

/**
 * القاعدة المقلوبة كما هي في الملف.
 *
 * الموضع يُلتقط بالمحدِّد الجوهري `[class*="bg-[#0" i]` لا بالسطر كاملًا:
 * Prettier يكسر المحدِّدات الطويلة على أسطر ويُزيح `:not()` الأخيرة، فبحثٌ
 * عن نصٍّ حرفيّ متّصل يفشل على تنسيقٍ صحيح تمامًا — وهو ما وقع فعلًا بعد
 * أوّل `prettier --write`. (المفارقة مقصودة التسجيل: حارسٌ يمنع نسخةً ثانية
 * من الحقيقة كاد يسقط لأنه افترض شكلًا واحدًا لكتابتها.)
 */
const RULE = (() => {
  const at = CSS.indexOf('[class*="bg-[#0" i]');
  if (at === -1) return "";
  const from = CSS.lastIndexOf(".light", at);
  return CSS.slice(from, CSS.indexOf("}", at) + 1);
})();

describe("جسر الأسطح — مقلوب لا مُعدَّد", () => {
  it("actually found background hexes to reason about", () => {
    // حارس صامت: لو تغيّرت طريقة كتابة الخلفيات لَمرّ الملف كلّه بلا معنى.
    expect(HEXES.length).toBeGreaterThan(10);
    expect(DARK.length).toBeGreaterThan(10);
  });

  it("القاعدة موجودة ومقلوبة: تلتقط `#0…` وتستثني بـ:not", () => {
    expect(RULE).not.toBe("");
    expect(RULE).toContain(":not(");
    expect(RULE).toContain("var(--chip-strong)");
    expect(RULE).toContain("var(--ink)");
  });

  it("لا تعود قائمةُ سماحٍ تُعدَّد فيها الأسطح الداكنة", () => {
    // عشرون محدِّدًا صريحًا للخلفيات الداكنة = القائمة القديمة عادت.
    const explicit = [...CSS.matchAll(/\.light \[class\*="bg-\[#0[0-9a-fA-F]{2,}/g)].filter(
      (m) => !m[0].includes('bg-[#0" '),
    );
    expect(explicit.length).toBeLessThan(4);
  });

  it("كل سطح داكن في المستودع يقلبه الجسر — ولا واحد يفوته", () => {
    // هذا هو الفحص الذي كان سيمسك `#04060f` قبل أن يراه المالك.
    const missed = DARK.filter((h) => RULE.toLowerCase().includes(`bg-[#${h}`));
    expect(missed, `أسطح داكنة مستثناة بالخطأ: ${missed.join(", ")}`).toEqual([]);
    // والقاعدة تلتقط `#0…` عمومًا، فكل داكن يبدأ بـ`#0` مشمول.
    const notStartingWithZero = DARK.filter((h) => !h.startsWith("0"));
    expect(
      notStartingWithZero,
      `أسطح داكنة لا تبدأ بـ#0 فلا يلتقطها الجسر: ${notStartingWithZero.join(", ")}`,
    ).toEqual([]);
  });

  it("كل لكنة فاتحة مستثناة صراحةً — وإلّا ابيضّت لكنةٌ مقصودة", () => {
    const unguarded = LIGHT.filter(
      (h) => h.startsWith("0") && !RULE.toLowerCase().includes(`bg-[#${h}`),
    );
    expect(unguarded, `لكنات فاتحة يبتلعها الجسر: ${unguarded.join(", ")}`).toEqual([]);
  });
});

/**
 * حارس الوضعين — المواد ٣٢·٣٣·٣٤ من الدستور.
 *
 * كل بند هنا يحرس عطلًا وقع فعلًا في هذا المستودع، لا احتمالًا نظريًّا:
 * لم يلتقطه tsc ولا eslint ولا أيٌّ من الألف اختبار القائمة، لأن أثره لا
 * يظهر إلا بعد إعادة رسم في متصفح حقيقي أو بعد قلب الوضع. الاختبار هو
 * الطريقة الوحيدة لمنع عودتها.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROOT = readFileSync("src/routes/__root.tsx", "utf8");
const CSS = readFileSync("src/styles.css", "utf8");
const THEME = readFileSync("src/lib/theme.tsx", "utf8");
/** التعليق يشرح ما أُزيل ويسمّيه — الحارس يفحص الكود وحده. */
const THEME_CODE = THEME.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

describe("عقد الهوية — المادة ٣٢: الصنف ذو الكاتبين", () => {
  it("لا يكتب صنف ثيم على <html> في الترميز", () => {
    // العطل الأصلي: <html className="light"> يعيد فرض نفسه عند كل إعادة رسم
    // فيمحو `dark` الذي يضعه المزوّد — فيستحيل تثبيت الوضع الداكن.
    const htmlTag = ROOT.match(/<html[^>]*>/)?.[0] ?? "";
    expect(htmlTag).not.toMatch(/className\s*=\s*["'{][^}"']*\b(light|dark)\b/);
  });

  it("يثبّت الداكن بسكربت يسبق أول رسم ولا يقرأ تفضيلًا", () => {
    // الهوية داكنة ثابتة (٢٠٢٦/٠٨/٠٦). بغير سكربت ما قبل الرسم يومض النظام
    // حتى يكتمل الترطيب؛ وبقراءة تفضيلٍ مخزَّن يعود الوضع الملغى من الباب
    // الخلفي على جهاز جرّبه صاحبه يومًا.
    expect(ROOT).toMatch(/classList\.remove\(['"]light['"]\)/);
    expect(ROOT).toMatch(/classList\.add\(['"]dark['"]\)/);
    expect(ROOT).not.toMatch(/localStorage\.getItem\(['"]theme['"]\)/);
  });

  it("المزوّد يثبّت ولا يبدّل — ولا يصدّر مبدّلًا", () => {
    // `setTheme` أُزيل لا عُطِّل: دالةٌ لا تفعل شيئًا أسوأ من غيابها، تُغري
    // بالنداء وتصمت. والمزوّد يمسح `light` حارسًا من تخزينٍ قديم أو امتداد.
    expect(THEME_CODE).not.toMatch(/setTheme/);
    expect(THEME).toMatch(/classList\.remove\("light"\)/);
    expect(THEME).toMatch(/classList\.add\("dark"\)/);
    expect(THEME).toMatch(/export type Theme = "dark"/);
  });
});

describe("عقد الوضعين — المادة ٣٤: لا لون صريح خارج طبقة الرموز", () => {
  it('لا fill="white" في أي مكوّن أو مسار', async () => {
    // العطل الأصلي: نسبة أداء المنطقة داخل حلقة SVG كانت fill="white" —
    // مقروءة على الكحلي، غائبة تمامًا على الأبيض.
    const { globSync } = await import("node:fs");
    const files = globSync("src/{components,routes}/**/*.tsx");
    const offenders = files.filter((f) => /fill="white"/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("رموز السطح والزجاج معرّفة للوضعين معًا", () => {
    for (const token of [
      "--ink",
      "--surface",
      "--chip",
      "--hairline",
      "--glass-fill",
      "--glass-sheen",
      "--glass-rim",
    ]) {
      // مرّة في الجذر (الداكن) ومرّة تحت .light — رمز يُعرَّف مرة واحدة
      // يعني وضعًا واحدًا يعمل.
      const occurrences = CSS.split(`${token}:`).length - 1;
      expect(occurrences, `${token} معرّف ${occurrences} مرة`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("عقد الوضعين — أطياف الحالة لكل وضع طيفه", () => {
  /** الكتلة المشتركة التي كانت تفرض درجات الأبيض على الوضعين معًا. */
  const SHARED = (() => {
    const i = CSS.indexOf(":root,\n.light,\n.dark {");
    return i === -1 ? "" : CSS.slice(i, CSS.indexOf("\n}", i));
  })();

  it("الكتلة المشتركة موجودة فعلًا (وإلا لم يفحص البند شيئًا)", () => {
    // حارس صامت يمرّ إلى الأبد. لو أُعيدت صياغة المحدِّد تفشل هذه أولًا.
    expect(SHARED, "كتلة `:root, .light, .dark` لم تعد موجودة بهذه الصيغة").not.toBe("");
  });

  it("لا طيف حالة داخل كتلة `:root, .light, .dark`", () => {
    // العطل الأصلي (٢٠٢٦/٠٨/٠٦): الكتلة كانت تعلن `--tone-*` بدرجات الوضع
    // الفاتح، ومحدِّدها يشمل `.dark` بنوعيّة (0,1,0) تعلو `:root` (0,0,1) —
    // فكل `var(--tone-*)` في الوضع الداكن يرسم الدرجة المعتمة المصمَّمة
    // للأبيض، على مستوى النظام كلّه. اكتُشف بقياس `getComputedStyle` لا
    // بقراءة: الملف يقرأ سليمًا، والنوعيّة وحدها هي التي تقلبه.
    for (const tone of ["cyan", "emerald", "rose", "amber", "blue", "violet"]) {
      expect(SHARED, `--tone-${tone} داخل الكتلة المشتركة يُبطل طيف الوضع الداكن`).not.toContain(
        `--tone-${tone}:`,
      );
    }
  });

  it("لكل طيف حالة درجتان: مشبَعة على الكحلي وعميقة على الأبيض", () => {
    for (const tone of ["cyan", "emerald", "rose", "amber", "blue", "violet"]) {
      const occurrences = CSS.split(`--tone-${tone}:`).length - 1;
      expect(occurrences, `--tone-${tone} معرّف ${occurrences} مرة`).toBe(2);
    }
  });
});

describe("عقد الوضعين — الزجاج حالة ساكنة", () => {
  it("البريق مُعرَّف خارج :hover", () => {
    // ما يظهر بالتمرير وحده لا وجود له على الجوال إطلاقًا.
    const staticRule = CSS.match(/\.holo-card,\s*\n\s*\.nexus-card,\s*\n\s*\.nx-glass\s*\{[^}]*\}/);
    expect(staticRule, "قاعدة الزجاج الساكنة مفقودة").not.toBeNull();
    expect(staticRule![0]).toContain("--glass-sheen");
  });

  it("يحترم prefers-reduced-transparency و forced-colors", () => {
    expect(CSS).toContain("prefers-reduced-transparency");
    expect(CSS).toContain("forced-colors: active");
  });
});

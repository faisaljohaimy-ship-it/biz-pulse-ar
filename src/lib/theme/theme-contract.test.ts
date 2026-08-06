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

  it("يقرأ الاختيار المحفوظ قبل أول رسم، والافتراضي داكن", () => {
    // قراءةُ الاختيار في مزوّد React بدل السكربت تعني وميضةً داكنة كاملة
    // عند كل فتح لمن اختار الفاتح. والافتراضي داكن بلا كشفٍ عن تفضيل نظام
    // التشغيل: من لم يختر يحصل على هوية سَدِيد كما صُمِّمت.
    expect(ROOT).toMatch(/localStorage\.getItem\(['"]theme['"]\)/);
    expect(ROOT).toMatch(/classList\.toggle\(['"]dark['"]/);
    expect(ROOT).toMatch(/classList\.toggle\(['"]light['"]/);
    expect(ROOT).not.toMatch(/prefers-color-scheme/);
  });

  it("المزوّد يبدّل ويحفظ، ونقطة التطبيق واحدة", () => {
    // كاتبان على الصنف يعني وضعًا يتأرجح. `apply` هي الموضع الوحيد الذي
    // يلمس `<html>`، و`setTheme` تحفظ الاختيار وإلا سقط عند أول تنقّل.
    expect(THEME_CODE).toMatch(/export type Theme = "dark" \| "light"/);
    expect(THEME_CODE).toMatch(/function apply\(theme: Theme\)/);
    expect(THEME_CODE).toMatch(/localStorage\.setItem\(THEME_KEY/);
    // حالةٌ أوّلية داكنة دائمًا — أي اشتقاقها من DOM يُنتج اختلاف ترطيب.
    expect(THEME_CODE).toMatch(/useState<Theme>\(DEFAULT_THEME\)/);
    const applyCount = (THEME_CODE.match(/classList\.toggle/g) ?? []).length;
    expect(applyCount, "الصنف يُكتب في أكثر من موضع").toBe(2);
  });
});

describe("عقد الوضع الفاتح — سُلَّم الحبر يُقرأ فعلًا", () => {
  /** نسبة تباين WCAG بين لونين ست عشريّين. */
  const ratio = (a: string, b: string) => {
    const lum = (hex: string) => {
      const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const [r, g, bl] = v.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    };
    const [x, y] = [lum(a), lum(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };

  /**
   * القيمة النافذة فعلًا لا أوّل تعريف.
   *
   * الرمز يُقرأ من **آخر** كاتبٍ له بالنوعيّة نفسها. في هذا الملف كتلتان
   * تكتبان حبر الوضع الفاتح: `.light` أعلاه، ثم `:root, .light` بعدها —
   * والثانية تحجب الأولى. قراءةُ الأولى كانت ستُمرّر الحارس على قيمةٍ لا
   * يراها المستخدم.
   */
  const effective = (token: string) => {
    const hits = [...CSS.matchAll(new RegExp(`\\.light[^{]*\\{[^}]*?${token}:\\s*([^;]+);`, "gs"))];
    const last = hits.at(-1)?.[1]?.trim();
    return last?.startsWith("#") ? last : undefined;
  };

  it("الحبر الثانوي والثالث يعبران ٤٫٥:١ على الأبيض (WCAG 1.4.3)", () => {
    // كانا `#6b7280` و`#9ca3af` — والثاني ٢٫٥٤:١، أي أن كل نصّ ثانوي في
    // الوضع الفاتح كان غير مقروء. رُصد بمسحٍ آليّ على الرئيسية لا بالقراءة.
    for (const token of ["--ink-2", "--ink-3"]) {
      const hex = effective(token);
      expect(hex, `${token} لا يُقرأ من الملف`).toBeDefined();
      expect(ratio(hex!, "#ffffff"), `${token} = ${hex} تباينه ضعيف`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("التدرّج محفوظ — الثانوي أعمق من الثالث", () => {
    // إصلاحٌ يوحّد الدرجتين يُنجي التباين ويقتل الهرمية البصرية.
    const [i2, i3] = [effective("--ink-2")!, effective("--ink-3")!];
    expect(ratio(i2, "#ffffff")).toBeGreaterThan(ratio(i3, "#ffffff"));
  });
});

describe("عقد الوضع الداكن — أزرق سماوي مائل إلى الأزرق الداكن", () => {
  /**
   * أساس الوضع الداكن كما يُقرأ من `:root` — من **آخر** كتلة تعلنه.
   *
   * أول صياغة قرأت أوّل `:root {` في الملف، وهي كتلة لوحة `--nx-*` التي
   * لا تعلن `--surface` أصلًا، فعاد الرمز `undefined` وسقط الحارس على
   * قيمةٍ لا وجود لها بدل أن يفحص القيمة النافذة. الموضع في ملفٍ تتعدّد
   * فيه كتل `:root` ليس هويّة.
   */
  const darkSurface = (() => {
    let found: string | undefined;
    for (const m of CSS.matchAll(/:root[^{]*\{/g)) {
      const block = CSS.slice(m.index!, CSS.indexOf("\n}", m.index!));
      if (/^\s*\.light/m.test(block.slice(0, block.indexOf("{")))) continue; // كتلة مشتركة
      const hit = block.match(/--surface:\s*(#[0-9a-f]{6})/i)?.[1];
      if (hit) found = hit;
    }
    return found;
  })();

  it("الأساس أزرق لا أسود — والقناة الزرقاء تعلو الحمراء بفارق ظاهر", () => {
    // قرار المالك ٢٠٢٦/٠٨/٠٦. كان `#04070f` — كحليّ شبه أسود، فارق
    // الزرقة فيه ١١ درجة فقط ولا يُقرأ لونًا.
    expect(darkSurface, "أساس الوضع الداكن غير مقروء من :root").toBeDefined();
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(darkSurface!.slice(i, i + 2), 16));
    expect(b, `الزرقة ${b} لا تعلو الحمرة ${r}`).toBeGreaterThan(r + 24);
    expect(b).toBeGreaterThan(g); // سماويّ مائل للأزرق لا أخضر
  });

  it("لا قاعدتان داكنتان متنازعتان — `--surface` و`--nx-bg-1` واحد", () => {
    // كان `--background` يقرأ من `--nx-bg-1` (كحليّ) و`--surface` من
    // شبه الأسود، فسطحان مختلفان في الشاشة الواحدة.
    const nxBg = CSS.match(/--nx-bg-1:\s*(#[0-9a-f]{6})/i)?.[1];
    expect(nxBg?.toLowerCase()).toBe(darkSurface?.toLowerCase());
  });

  it("يبقى تحت الحبر الأبيض بتباين عالٍ", () => {
    const lum = (hex: string) => {
      const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const [r, g, b] = v.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    expect(1.05 / (lum(darkSurface!) + 0.05)).toBeGreaterThan(12);
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

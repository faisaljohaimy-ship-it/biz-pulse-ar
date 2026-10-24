/**
 * حارس الوضعين — المواد ٣٢·٣٣·٣٤ من الدستور.
 *
 * كل بند هنا يحرس عطلًا وقع فعلًا في هذا المستودع، لا احتمالًا نظريًّا:
 * لم يلتقطه tsc ولا eslint ولا أيٌّ من الألف اختبار القائمة، لأن أثره لا
 * يظهر إلا بعد إعادة رسم في متصفح حقيقي أو بعد قلب الوضع. الاختبار هو
 * الطريقة الوحيدة لمنع عودتها.
 */
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, resolveStoredTheme, type Theme } from "@/lib/theme";

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

  it("يقرأ اختيار الجلسة قبل أول رسم، والافتراضي داكن (أمر ٢٠٢٦/١٠/٢٤)", () => {
    // قراءةُ الاختيار في مزوّد React بدل السكربت تعني وميضةً كاملة بالوضع
    // الآخر عند كل فتح لمن اختار غير الافتراضي. ولا كشفَ عن تفضيل نظام
    // التشغيل: الافتراضي قرارُ مالك لا استنتاج. والافتراضي نفسه يُثبَت
    // سلوكيًّا في الكتلة التالية لا بنصٍّ هنا. والمصدر `sessionStorage`
    // لا `localStorage`: كل زيارةٍ جديدة تبدأ داكنة.
    expect(ROOT).toMatch(/sessionStorage\.getItem\(['"]theme['"]\)/);
    expect(ROOT).not.toMatch(/localStorage\.getItem\(['"]theme['"]\)/);
    expect(ROOT).toMatch(/classList\.toggle\(['"]dark['"]/);
    expect(ROOT).toMatch(/classList\.toggle\(['"]light['"]/);
    expect(ROOT).not.toMatch(/prefers-color-scheme/);
  });

  it("المزوّد يبدّل ويحفظ، ونقطة التطبيق واحدة", () => {
    // كاتبان على الصنف يعني وضعًا يتأرجح. `apply` هي الموضع الوحيد الذي
    // يلمس `<html>`، و`setTheme` تحفظ الاختيار وإلا سقط عند أول تنقّل.
    expect(THEME_CODE).toMatch(/export type Theme = "dark" \| "light"/);
    expect(THEME_CODE).toMatch(/function apply\(theme: Theme\)/);
    expect(THEME_CODE).toMatch(/sessionStorage\.setItem\(THEME_KEY/);
    expect(THEME_CODE).not.toMatch(/localStorage/);
    // حالةٌ أوّلية من الافتراضي دائمًا — أي اشتقاقها من DOM يُنتج اختلاف ترطيب.
    expect(THEME_CODE).toMatch(/useState<Theme>\(DEFAULT_THEME\)/);
    // والمزامنة بعد التركيب تمرّ بالقاعدة الواحدة نفسها التي يُقارَن بها
    // السكربت أدناه — لا نسخةً ثالثة مكتوبة في المزوّد.
    expect(THEME_CODE).toMatch(/resolveStoredTheme\(stored\)/);
    const applyCount = (THEME_CODE.match(/classList\.toggle/g) ?? []).length;
    expect(applyCount, "الصنف يُكتب في أكثر من موضع").toBe(2);
  });
});

/**
 * **الافتراضي داكن دائمًا — أمر المالك ٢٠٢٦/١٠/٢٤، ناسخ N1 «الفاتح أساسًا».**
 *
 * والافتراضي سلوكٌ لا نصّ، فيُقاس هنا بتشغيل **السكربت الفعلي** المستخرَج من
 * `__root.tsx` على جذرٍ وتخزينٍ مزيّفين، لكل قيمةٍ مخزَّنة ممكنة — ثم بزرع النسخ
 * القديمة (فاتحٌ افتراضًا؛ وقراءةٌ من `localStorage`) لإثبات أن الحارس يسقط عليها
 * (المادة ٣٠).
 */
describe("عقد الافتراضي — داكن عند كل بدء، والفاتح اختيارُ الجلسة", () => {
  /** نصّ السكربت المانع كما يصل المتصفّح: سلسلة الحروف المضمومة بـ`+`. */
  const prePaintScript = (() => {
    const expr = ROOT.match(/__html:([\s\S]*?),?\s*\}\}\s*\/>/)?.[1] ?? "";
    // التعليقات بين الأجزاء قد تحوي علامات اقتباس — تُنزع أولًا.
    const code = expr.replace(/^[ \t]*\/\/.*$/gm, "");
    return [...code.matchAll(/"((?:[^"\\]|\\.)*)"/g)]
      .map((m) => JSON.parse(`"${m[1]}"`) as string)
      .join("");
  })();

  /** «محجوب»: تخزينٌ يرمي عند القراءة، كما في التصفّح الخاص المقيَّد. */
  type Stored = string | null | "محجوب";

  /**
   * يشغّل نصّ سكربتٍ على جذرٍ مزيّف ويعيد الوضع الذي رسمه قبل أول رسم.
   * `session` مخزن الجلسة الذي يُقرأ منه الاختيار، و`local` مخزنٌ دائم قديم **لا يجوز
   * أن يؤثّر** (كان يحفظ «light» فيبقى فاتحًا عند كل زيارة).
   */
  const paint = (script: string, session: Stored, local: Stored = null) => {
    const classes = new Set<string>();
    const root = {
      classList: {
        add: (c: string) => void classes.add(c),
        toggle: (c: string, on: boolean) => void (on ? classes.add(c) : classes.delete(c)),
      },
      style: { colorScheme: "" },
    };
    const store = (value: Stored) => ({
      getItem: () => {
        if (value === "محجوب") throw new Error("SecurityError");
        return value;
      },
    });
    runInNewContext(script, {
      document: { documentElement: root },
      sessionStorage: store(session),
      localStorage: store(local),
    });
    const painted: Theme | "متنازع" | "بلا صنف" =
      classes.has("light") && classes.has("dark")
        ? "متنازع"
        : classes.has("light")
          ? "light"
          : classes.has("dark")
            ? "dark"
            : "بلا صنف";
    return { painted, scheme: root.style.colorScheme };
  };

  /** النسخة السابقة (N1: فاتحٌ ما لم يُحفظ `dark`، من `localStorage`) — مزروعةً ليسقط عليها الحارس. */
  const PLANTED_LIGHT_DEFAULT =
    "(function(){try{var r=document.documentElement;" +
    "var t=localStorage.getItem('theme');" +
    "var d=t==='dark';" +
    "r.classList.toggle('light',!d);r.classList.toggle('dark',d);" +
    "r.style.colorScheme=d?'dark':'light';}" +
    "catch(e){var h=document.documentElement;h.classList.add('light');h.style.colorScheme='light';}})();";

  it("السكربت يُستخرج فعلًا (وإلا لم يفحص البند شيئًا)", () => {
    // حارسٌ صامت يمرّ إلى الأبد لو تغيّرت صيغة الضمّ فعاد النصّ فارغًا.
    expect(prePaintScript).toContain("sessionStorage.getItem('theme')");
    expect(prePaintScript).toContain("catch(e)");
  });

  it("الافتراضي المعلَن داكن", () => {
    expect(DEFAULT_THEME).toBe("dark");
  });

  it("أول زيارة (لا اختيار في الجلسة) ⇐ داكن بمخطّط ألوان داكن", () => {
    expect(paint(prePaintScript, null)).toEqual({ painted: "dark", scheme: "dark" });
  });

  it("اختيار الجلسة يُحترم: الفاتح بالأيقونة يسري، والداكن كما هو", () => {
    expect(paint(prePaintScript, "light")).toEqual({ painted: "light", scheme: "light" });
    expect(paint(prePaintScript, "dark")).toEqual({ painted: "dark", scheme: "dark" });
  });

  it("اختيارٌ قديم في localStorage لا يُقرأ — كل زيارةٍ جديدة تبدأ داكنة", () => {
    // كان «light» المحفوظ دائمًا يُبقي من بدّل مرّةً فاتحًا إلى الأبد.
    expect(paint(prePaintScript, null, "light").painted).toBe("dark");
    expect(paint(prePaintScript, null, "dark").painted).toBe("dark");
  });

  it("قيمة تالفة أو تخزينٌ محجوب ⇐ الداكن، لا الفاتح", () => {
    for (const junk of ["", "Light", "auto", "system"]) {
      expect(paint(prePaintScript, junk).painted, `القيمة «${junk}»`).toBe("dark");
    }
    // الاحتياطيّ في `catch` نسخةٌ ثانية للافتراضي تفلت من أي حارسٍ يقرأ السطر
    // الرئيسي وحده.
    expect(paint(prePaintScript, "محجوب").painted).toBe("dark");
  });

  it("السكربت والمزوّد قاعدة واحدة — فلا قفزة وضعٍ بعد الترطيب", () => {
    // السكربت يرسم أولًا، ثم يقرأ المزوّد المفتاح نفسه بعد التركيب ويطبّق
    // ما يراه. افتراقهما = أول رسمٍ بوضع ثم قفزةٌ إلى الآخر.
    for (const stored of [null, "light", "dark", "", "auto"]) {
      expect(paint(prePaintScript, stored).painted, `القيمة ${String(stored)}`).toBe(
        resolveStoredTheme(stored),
      );
    }
  });

  it("زرعٌ أحمر (المادة ٣٠): السكربت القديم (فاتحٌ افتراضًا من localStorage) يسقط", () => {
    // لو عاد الفاتح افتراضًا أو القراءة من `localStorage` لسقطت البنود أعلاه —
    // يُثبَت هنا بتشغيل الفاحص نفسه على النسخة المزروعة.
    expect(paint(PLANTED_LIGHT_DEFAULT, null, null).painted).toBe("light");
    expect(paint(PLANTED_LIGHT_DEFAULT, "محجوب", "محجوب").painted).toBe("light");
    expect(paint(PLANTED_LIGHT_DEFAULT, null, "light").painted).not.toBe(
      paint(prePaintScript, null, "light").painted,
    );
  });

  it("زرعٌ أحمر: سكربتٌ يكتب الصنفين معًا يُكشف لا يمرّ داكنًا", () => {
    // فاحصٌ يسأل «هل `dark` موجود؟» وحده يمرّ على جذرٍ يحمل الصنفين.
    const both =
      "document.documentElement.classList.add('light');" +
      "document.documentElement.classList.add('dark');";
    expect(paint(both, null).painted).toBe("متنازع");
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
  it("لا تعبئة بيضاء نهائية (white / #fff / #ffffff) في أي مكوّن أو مسار", async () => {
    // العطل الأصلي: نسبة أداء المنطقة داخل حلقة SVG كانت fill="white" —
    // مقروءة على الكحلي، غائبة تمامًا على الأبيض. والنمط الحرفي وحده كان
    // يترك الصيغ السداسية (#fff/#ffffff بأي حالة أحرف) تفلت — فوُسِّع.
    const WHITE_FILL = /fill=["'](?:white|#f{3}|#f{6})["']/i;
    /**
     * استثناء موثَّق — قائمة صريحة مغلقة، فأي موضع جديد يمسكه الحارس:
     * NexusRevealHero يرسم بريق النواة `fill="#ffffff"` فوق خلفية داكنة
     * ذاتية داخل الـSVG نفسه (تدرّج `nxh-nucleus`) لا فوق سطح الوضعين —
     * فتحويله إلى currentColor يكسر المظهر لا يصلحه. النظير الآخر المعلوم
     * `src/lib/sadeed/signature.ts` (لوح كحلي ذاتي داخل SVG مولَّد) خارج نطاق
     * glob هذا الحارس أصلًا فلا يحتاج إدراجًا هنا.
     */
    const SELF_BACKED_SVG = new Set(["src/components/cinematic/NexusRevealHero.tsx"]);
    const { globSync } = await import("node:fs");
    const files = globSync("src/{components,routes}/**/*.tsx");
    const offenders = files.filter((f) => {
      if (SELF_BACKED_SVG.has(f)) return false;
      // الحارس يفحص الكود وحده — تعليقٌ يشرح النمط ليس خرقًا له
      // (نفس مبدأ THEME_CODE أعلاه؛ وإلا سقط LottieIcon على تعليق توثيقي).
      const code = readFileSync(f, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^[ \t]*\/\/.*$/gm, "");
      return WHITE_FILL.test(code);
    });
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

/**
 * عقد بنود سجل التغيير المفتوحة — التنقّل والإخفاء والوضعان.
 *
 * هذه البنود أُغلقت بالفعل في الشجرة، وهذا الملف هو ما يمنع انفتاحها ثانيةً
 * بصمت. كلٌّ منها من النوع الذي **لا يكسر بناءً ولا اختبارًا** حين يسقط:
 * رابطٌ يُحذف من الشريط، أو مسارٌ مخفيّ يُعاد فتحه، أو زرُّ وضعٍ ثانٍ
 * يُضاف — فلا يظهر الخلل إلا لمن يتصفّح الواجهة بعينه.
 *
 * المرجع: OPEN_CHANGELOG (فحص d06f247 · ٠٢/٠٨/٢٠٢٦)، البنود ٤٩ · ٥٢ · ٥٤ ·
 * ٥٦ · ٥٧ · ٥٨.
 */
import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HIDDEN_ROUTES, isRouteHidden } from "@/lib/nav/hidden-routes";
import { MODULES, MODULE_PURPOSE } from "@/lib/nav/modules";

const read = (p: string) => readFileSync(p, "utf8");
const SHELL = read("src/components/app-shell.tsx");
const ROOT = read("src/routes/__root.tsx");
const CSS_SRC = read("src/styles.css");

describe("البند ٤٩ — الامتثال: HCIS هو المعتمد ولا أثر لـSAIS", () => {
  it("لا ذكر لـSAIS في أي مصدر تطبيقي", () => {
    // قرار المالك في CLAUDE.md: «SAIS غير معتمد ولا واضح. لا يُضاف، ولا
    // يُخمَّن معناه، ولا يُغيَّر بسببه مسار أو تسمية.» فالإخفاء المطلوب في
    // السجل تحقّق بأنظف صورة: لا شاشة SAIS أصلًا، والمعتمد وحده باقٍ.
    for (const [name, src] of [
      ["app-shell", SHELL],
      ["modules", read("src/lib/nav/modules.ts")],
      ["hidden-routes", read("src/lib/nav/hidden-routes.ts")],
    ] as const) {
      expect(src, `${name} يذكر SAIS`).not.toMatch(/\bSAIS\b/);
    }
  });

  it("مسار الامتثال المعتمد حيّ ومسمّى HCIS", () => {
    const hcis = MODULES.find((m) => m.to === "/hcis");
    expect(hcis, "وحدة الامتثال غائبة عن السجل الكانوني").toBeDefined();
    expect(hcis!.ar).toBe("الامتثال HCIS");
    expect(isRouteHidden("/hcis")).toBe(false);
    expect(MODULE_PURPOSE["/hcis"]).toBeDefined();
  });

  it("الرابط التاريخي /hcis-compliance يوجّه للمعتمد لا يُسقط الزائر", () => {
    // الإخفاء الأعمى كان سيحوّل كل رابط قديم إلى 404؛ التوجيه يحفظه.
    const compat = read("src/routes/hcis-compliance.tsx");
    expect(compat).toMatch(/redirect\(\{\s*to:\s*"\/hcis"\s*\}\)/);
  });
});

describe("البندان ٥٢ و٥٤ — شاشتان جاهزتان لهما رابط في التنقّل", () => {
  // شاشة مبنيّة بلا رابط شاشةٌ مهدورة: لا تُحذف، تُوصَل.
  for (const [to, ar] of [
    ["/finn-analytics", "تحليلات FINN"],
    ["/observability", "الرصد والتكاليف"],
  ] as const) {
    it(`«${ar}» موصولة من الشريط الجانبي وحاضرة في السجل الكانوني`, () => {
      expect(SHELL, `${to} غير موصول في app-shell`).toContain(`to: "${to}"`);
      expect(MODULES.some((m) => m.to === to)).toBe(true);
      expect(MODULE_PURPOSE[to], `${to} بلا سطر غرض`).toBeDefined();
      expect(isRouteHidden(to)).toBe(false);
    });
  }
});

describe("البند ٥٦ — شجرة قيادة الوكلاء مخفيّة والملفات باقية", () => {
  it("المسار مخفيّ ولا رابط له في أي سطح تنقّل", () => {
    expect(isRouteHidden("/agents-flow")).toBe(true);
    expect(SHELL).not.toContain('to: "/agents-flow"');
    expect(MODULES.some((m) => m.to === "/agents-flow")).toBe(false);
  });

  it("المسار يوجّه إلى البديل الكانوني ولم يُحذف ملفه", () => {
    // الإخفاء = إزالة من التنقّل + توجيه + إبقاء الملفات. والتوجيه إلى
    // «منصة عمليات الوكلاء» لا إلى الرئيسية: من قصد الشجرة يقصد الوكلاء.
    const route = read("src/routes/agents-flow.tsx");
    expect(route).toMatch(/redirect\(\{\s*to:\s*"\/agents"\s*\}\)/);
  });
});

describe("البندان ٥٧ و٥٨ — هوية داكنة ثابتة بلا مبدّل", () => {
  it("لا شاشة تفرض وضعًا برمجيًّا خارج المزوّد", () => {
    // العطل المُبلَّغ: «الرئيسية مثبّتة داكنة برمجيًّا». الفرض يقع بكتابة
    // صنف الوضع في الترميز أو بإضافته من مكوّن صفحة — والسكربت السابق
    // لأول رسم هو الموضع الوحيد المسموح، وهو في الجذر.
    const pages = ["src/routes/-blueprint-page.tsx", "src/components/app-shell.tsx"];
    for (const p of pages) {
      expect(read(p), `${p} يفرض صنف وضع`).not.toMatch(
        /classList\.(add|toggle)\(\s*["'](dark|light)["']/,
      );
    }
  });

  it("مبدّل الوضع حاضر على الجوال وكل الأجهزة", () => {
    // البند ٥٨ كان قد أُغلق بالإزالة مع اعتماد الداكن هويةً ثابتة. ثم نقض
    // المالك ذلك (٢٠٢٦/٠٨/٠٦) وطلب عودة المبدّل على الجوال وكل الأجهزة —
    // فالحارس يحرس القرار الجديد لا القديم.
    //
    // موضعه `TopUtilityBar` لا الشريط الجانبي: القشرة تُركّب هذا الشريط
    // مرّتين — في ترويسة الجوال وفي الشريط العلوي للشاشات الواسعة — بينما
    // الشريط الجانبي على الجوال يُطوى داخل درج لا يُفتح إلا بنقرة.
    const bar = read("src/components/nav/TopUtilityBar.tsx");
    expect(bar).toContain("<ThemeToggle />");
    // ترويسة الجوال (`md:hidden`) والشريط العريض كلاهما يُركّبه.
    expect(SHELL.match(/<TopUtilityBar\s*\/>/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(SHELL).toContain("md:hidden");
    // والرئيسية خارج القشرة، فلها مبدّلها في شريطها.
    expect(read("src/components/nav/HomeTopNav.tsx")).toContain("<ThemeToggle");
  });

  it("المبدّل زرّ حقيقي بهدف لمس ٤٤px يعمل باللمس والمؤشّر", () => {
    // مبدّلٌ يظهر بالتمرير وحده لا وجود له على الجوال إطلاقًا.
    const cmp = read("src/components/layout/ThemeToggle.tsx");
    expect(cmp).toContain('type="button"');
    expect(cmp).toContain("onClick={toggle}");
    expect(cmp).toMatch(/aria-pressed=/);
    expect(cmp).toMatch(/aria-label=/);
    const rule = CSS_SRC.slice(CSS_SRC.indexOf(".nx-theme-toggle {"));
    const body = rule.slice(0, rule.indexOf("\n}"));
    expect(body).toContain("inline-size: 44px");
    expect(body).toContain("block-size: 44px");
  });

  it("الأيقونة تتبع صنف الجذر لا حالة React — فلا وميضة عند كل فتح", () => {
    // الحالة تبدأ داكنة دائمًا لتطابق الخادم؛ الرسم منها يُظهر أيقونة الوضع
    // الخطأ حتى يكتمل الترطيب لمن اختار الفاتح.
    expect(CSS_SRC).toContain(".dark .nx-theme-ico--moon");
    expect(CSS_SRC).toContain(".light .nx-theme-ico--sun");
  });

  it("الاختيار يُقرأ قبل أول رسم ويُحفظ", () => {
    expect(ROOT).toContain("localStorage.getItem('theme')");
    expect(read("src/lib/theme.tsx")).toContain("localStorage.setItem(THEME_KEY");
  });

  it("جسر الوضع الفاتح قائم — وإلا عاد المبدّل بعطله", () => {
    // ١٢٨٧ قيمة داكنة مكتوبة يدويًّا في ١٤٥ ملفًا هي سبب إلغاء المبدّل أول
    // مرّة. Tailwind يُصرّف كل أدوات الأبيض عبر `--color-white`، فإعادة
    // تعريفه تحت `.light` وحدها تقلب ١٠٧٢ موضعًا مع حفظ تدرّج الشفافية.
    const bridge = CSS_SRC.slice(CSS_SRC.indexOf("جسر الوضع الفاتح"));
    expect(bridge).toMatch(/\.light \{\s*[^}]*--color-white:/);
    // والخطوات دون ٥٥٪ تسقط تحت ٤٫٥:١ على الأبيض، فتُرفع إلى `--ink-3`.
    expect(bridge).toContain('[class*="text-white/50"]');
    expect(bridge).toContain("color: var(--ink-3)");
  });
});

describe("سلامة سطح التنقّل بعد كل إخفاء", () => {
  it("لا وحدة في السجل الكانوني تشير إلى مسار مخفيّ", () => {
    // مسارٌ مخفيّ وباقٍ في السجل = أيقونة تفتح توجيهًا — أسوأ من غيابها.
    const leaking = MODULES.filter((m) => HIDDEN_ROUTES.has(m.to)).map((m) => m.to);
    expect(leaking).toEqual([]);
  });

  it("كل وحدة معروضة لها سطر غرض يشرحها (المادة ٢١)", () => {
    const missing = MODULES.filter((m) => !MODULE_PURPOSE[m.to]).map((m) => m.to);
    expect(missing).toEqual([]);
  });
});

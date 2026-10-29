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
import { existsSync, globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HIDDEN_ROUTES, isRouteHidden } from "@/lib/nav/hidden-routes";
import { MODULES, MODULE_PURPOSE } from "@/lib/nav/modules";
import { systemNavDestinations } from "@/lib/nav/system-nav";

const read = (p: string) => readFileSync(p, "utf8");
const SHELL = read("src/components/app-shell.tsx");
const ROOT = read("src/routes/__root.tsx");
const CSS_SRC = read("src/styles.css");
/**
 * المصدر منزوع التعليقات. **بندٌ سقط بسبب هذا فعلًا:** تعليقُ الجذر يشرح
 * ما أُزيل ويسمّيه (`GlobalUtilityBar`)، فقراءةُ النصّ الخام تقرأ الشرح
 * عودةً للشيء المشروح. الحارس يفحص الكود، والتعليق يبقى حرًّا في وصف ما
 * كان — وهو أنفع ما فيه.
 */
const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const ROOT_CODE = stripComments(ROOT);
const SHELL_CODE = stripComments(SHELL);

describe("البند ٤٩ — شاشة الامتثال محذوفة، ولا أثر لـSAIS", () => {
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

  // البند كان يحرس **حياة** شاشة «الامتثال HCIS» على `/hcis`. نقض المالك
  // ذلك بأمر مباشر (٢٠٢٦/٠٨/٠٩): «احذف هذه الصفحة مع أيقونتها بشكل نهائي».
  // فالحارس يحرس القرار الجديد لا القديم — وهو الآن حارس **اقتلاع**: حذفٌ
  // لا إخفاء، فلا سطر في `hidden-routes` ولا جذع توجيه، وطبقة بياناتها
  // (`src/lib/hcis/`) سقطت معها لأن مستهلكها الوحيد كان صفحتيها.
  it("لا وحدة ولا سطر غرض ولا رابط تنقّل لمسار الامتثال المحذوف", () => {
    expect(MODULES.some((m) => m.to === "/hcis")).toBe(false);
    expect(MODULE_PURPOSE["/hcis"]).toBeUndefined();
    expect(SHELL).not.toContain('to: "/hcis"');
    expect(systemNavDestinations()).not.toContain("/hcis");
  });

  it("الحذف حذفٌ لا إخفاء — لا ملفّ مسار ولا جذع توجيه ولا طبقة بيانات", () => {
    // الإخفاء يُبقي الملفات ويضيف توجيهًا؛ المطلوب هنا نقيضه تمامًا،
    // فوجود أيٍّ من هذه يعني أن الاقتلاع ارتدّ إلى إخفاء بصمت.
    for (const p of [
      "src/routes/_authenticated/hcis.tsx",
      "src/routes/_authenticated/hcis_.directive.$code.tsx",
      "src/routes/hcis-compliance.tsx",
      "src/lib/hcis/framework.ts",
      "src/lib/hcis/reference-data.ts",
    ]) {
      expect(existsSync(p), `${p} عاد إلى الشجرة`).toBe(false);
    }
    expect(isRouteHidden("/hcis")).toBe(false);
    expect(read("src/lib/nav/hidden-routes.ts")).not.toContain('"/hcis"');
  });
});

describe("البندان ٥٢ و٥٤ — الشاشتان حاضرتان في السجل الكانوني", () => {
  // كان البندان يشترطان رابطًا في الشريط الجانبي («شاشة بلا رابط شاشة
  // مهدورة») — ثم أمر المالك ٢٠٢٦/٠٨/٢٠ بقصر الشريط على خمسة أزرار، وهو
  // ناسخٌ صريح لذلك الشرط: غياب الرابط اليوم قرارُ مالكٍ لا سهوُ بناء.
  // فبقي من الحارس ما لم يُنسخ: الهوية في السجل الكانوني، وسطر الغرض،
  // وأن الشاشتين حيّتان غير محجوبتين — وشرطٌ جديد يحرس قرار المالك نفسه:
  // الشريط لا يعود يصل إليهما إلا بأمر جديد.
  for (const [to, ar] of [
    ["/sadeed-analytics", "تحليلات سَدِيد"],
    ["/observability", "الرصد والتكاليف"],
  ] as const) {
    it(`«${ar}» حاضرة في السجل الكانوني وحيّة — والشريط خارجها بأمر المالك`, () => {
      expect(SHELL, `${to} عاد إلى الشريط دون أمر مالك جديد`).not.toContain(`to: "${to}"`);
      // والشريط صار سجلًّا مستقلًّا — فيُفحص هو أيضًا لا القشرة وحدها.
      expect(systemNavDestinations(), `${to} دخل سجل الشريط`).not.toContain(to);
      expect(MODULES.some((m) => m.to === to)).toBe(true);
      expect(MODULE_PURPOSE[to], `${to} بلا سطر غرض`).toBeDefined();
      expect(isRouteHidden(to)).toBe(false);
    });
  }
});

/**
 * **الشريط الجانبي — محطّاته الثلاث.**
 *
 *   ٢٠٢٦/٠٨/٢٠: «حذف جميع الأزرار في الشريط الجانبي باستثناء خمسة».
 *   ٢٠٢٦/٠٩/٢٩: تطبيق تصميم لوحة القيادة «مع تفعيل جميع الأيقونات»،
 *     والشريط «في النظام كلّه» — ناسخٌ صريح للخمسة.
 *   ٢٠٢٦/١٠/٢٩: «احذف الموجود فالمرفق من النافذه فقط» — ثمانية صفوف سقطت من
 *     النافذة وحدها (عشرون ← اثنا عشر) وصفحاتها حيّة؛ التفصيل والكواشف في
 *     `system-nav.contract.test.ts`. لم يمسّ ما يحرسه هذا الفصل.
 *
 * فالحارس يحرس المحطّة الأخيرة: القائمة في سجلٍّ واحد (`SYSTEM_NAV`)، ولا
 * قائمة ثانية في القشرة. وتفصيل الوجهات في `system-nav.contract.test.ts`.
 */
describe("الشريط الجانبي من سجلٍّ واحد — أمر المالك ٢٠٢٦/٠٩/٢٩", () => {
  /**
   * **والقشرة صارت واحدة (أمر المالك ٢٠٢٦/١٠/١٨):** «اجعل جميع صفحات النظام بنفس تخطيط
   * وهيئة الصفحة الرئيسية». فلم تعد القشرة الداخلية (`app-shell`) تركّب الشريط — تركّبه
   * `SystemChrome` مرّةً في الجذر حول كل صفحة نظام، والشريط يركّب القائمة الموحَّدة.
   * والمحروس هو هو: سجلٌّ واحد، ولا قائمة مكتوبة في أيٍّ من القشرتين.
   */
  it("القشرة تركّب الشريط الموحَّد ولا تكتب قائمتها", () => {
    const chrome = stripComments(read("src/components/nav/SystemChrome.tsx"));
    const sidebar = stripComments(read("src/components/nav/SystemSidebar.tsx"));
    expect(chrome, "القشرة لا تركّب الشريط").toContain("<SystemSidebar />");
    expect(sidebar, "الشريط لا يركّب القائمة الموحَّدة").toContain("<SystemSidebarNav />");
    const secondList = (code: string) => code.match(/\bto: "\//g) ?? [];
    expect(secondList(chrome), "قائمة ثانية في القشرة").toEqual([]);
    expect(secondList(SHELL_CODE), "قائمة ثانية عادت إلى القشرة الداخلية").toEqual([]);
    // يحمرّ على المزروع (المادة ٣٠): قائمةٌ مكتوبة في القشرة.
    expect(secondList(`${chrome}\nconst ITEMS = [{ to: "/sec" }];`)).toHaveLength(1);
  });

  it("الاسم المحروس يُقرأ من السجل الكانوني لا حرفيًّا", () => {
    // نمط V4 (١١٩٢) نفسه، على «مركز القيادة» هذه المرّة: الاسم لمساره
    // المحجوب، والوجهة بديله الحيّ.
    const nav = read("src/lib/nav/system-nav.ts");
    expect(nav).toContain('labelRoute: "/mission-control"');
    expect(read("src/components/nav/SystemSidebar.tsx")).toContain("screenNameAr(item.labelRoute)");
  });
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
    const pages = [
      "src/routes/-blueprint-page.tsx",
      "src/components/app-shell.tsx",
      // القشرة الواحدة حول كل صفحة نظام (٢٠٢٦/١٠/١٨) — لا تفرض وضعًا كذلك.
      "src/components/nav/SystemChrome.tsx",
    ];
    const forcing = /classList\.(add|toggle)\(\s*["'](dark|light)["']/;
    for (const p of pages) {
      expect(read(p), `${p} يفرض صنف وضع`).not.toMatch(forcing);
    }
    // يحمرّ على المزروع (المادة ٣٠): قشرةٌ تفرض الداكن عند تركيبها.
    expect(
      `${read("src/components/nav/SystemChrome.tsx")}\ndocument.documentElement.classList.add("dark");`,
    ).toMatch(forcing);
  });

  /**
   * **البند في محطّته الخامسة — والحارس يحرس آخرها وحدها.**
   *
   *   ٥٨ (قديم): حُذف المبدّل مع اعتماد الداكن هويةً ثابتة.
   *   ٢٠٢٦/٠٨/٠٦: نقض المالك ذلك وطلبه «على الجوال وكل الأجهزة».
   *   ٢٠٢٦/٠٨/٢٧: «في أعلى صفحة النظام الرئيسية **فقط**» — فضاق النطاق.
   *   ٢٠٢٦/٠٩/١٠: «أزل … من النظام كاملًا» — فسقط الزرّ من كل سطح.
   *   ٢٠٢٦/٠٩/١١: «أضف أيقونة زر تغيير الوضعية ثابتة في أعلى الصفحة
   *     الرئيسية» — فعاد، بنطاق محطّة ٢٠٢٦/٠٨/٢٧ نفسه لا أوسع.
   *
   * وهذا البند من النوع الذي وُجد هذا الملفّ لأجله: زرُّ وضعٍ **ثانٍ**
   * يُضاف لا يكسر بناءً ولا اختبارًا — يظهر في الواجهة وحدها. فالمحروس
   * هنا أن السطوح التي حملته يومًا لكلٍّ منها لم تعُد تحمله بنفسها:
   * مصدره واحدٌ مثبَّت في الجذر. وتفصيل الشكل والموضع في
   * `top-bar.contract.test.ts`.
   */
  it("مبدّل الوضع — مصدرٌ واحد مثبَّت، والرئيسية وحدها نطاقه", () => {
    expect(existsSync("src/components/nav/TopBar.tsx"), "سقط مصدر المبدّل").toBe(true);
    expect(ROOT_CODE, "الجذر لا يركّب الشريط العلوي").toMatch(/<TopBar\b/);

    // ولا شرطَ مسارٍ في الجذر: النطاق يملكه المكوّن وحده، وبعثرتُه هي ما
    // أنتجت مبدّلَين متراكبَين على الرئيسية (فارق 8px، قِيس).
    expect(ROOT_CODE, "عاد قيد المسار إلى الجذر").not.toContain("showUtilityBar");

    // والسطوح التي كانت تركّب مبدّلها بنفسها لا تفعل: نسخةٌ ثانية تتراكب.
    for (const p of [
      "src/routes/-blueprint-page.tsx",
      "src/routes/-nx-ops-page.tsx",
      "src/routes/-nx-flow-page.tsx",
      "src/components/app-shell.tsx",
      "src/components/nav/SystemChrome.tsx",
    ]) {
      expect(stripComments(read(p)), `${p} يركّب مبدّلًا ثانيًا`).not.toContain("<ThemeToggle");
    }
    // يحمرّ على المزروع (المادة ٣٠): مبدّلٌ ثانٍ في القشرة الواحدة.
    expect(
      `${stripComments(read("src/components/nav/SystemChrome.tsx"))}\n<ThemeToggle />`,
    ).toContain("<ThemeToggle");

    // والجرس لم يُذكر في أمر العودة فلم يعُد.
    expect(existsSync("src/components/nav/TopUtilityBar.tsx"), "عاد شريط الجرس").toBe(false);
    expect(SHELL_CODE.match(/<TopUtilityBar\s*\/>/g)?.length ?? 0).toBe(0);
    // **كان: `expect(SHELL).toContain("md:hidden")`** — ترويسة الجوال في القشرة الداخلية
    // (`.nexus-mobile-header md:hidden`) سطحٌ لا يحمل المبدّل. وسقطت تلك الترويسة مع القشرة
    // القديمة (أمر المالك ٢٠٢٦/١٠/١٨ «اجعل جميع صفحات النظام بنفس تخطيط وهيئة الصفحة
    // الرئيسية»)، فبقي سطحٌ واحد: ترويسة النظام بدرجها **في كل صفحة** — بلا خاصيّة
    // `withMenu` تُسقط الدرج من صفحةٍ دون أخرى — والمبدّل فيها خانةٌ للرئيسية وحدها.
    const header = stripComments(read("src/components/nav/SystemHeader.tsx"));
    const drawerAlways = (code: string) =>
      /^\s*<MobileMenu ar=\{ar\} \/>\s*$/m.test(code) && !/\bwithMenu\b/.test(code);
    expect(SHELL_CODE, "عادت ترويسة الجوال إلى القشرة الداخلية").not.toContain(
      "nexus-mobile-header",
    );
    expect(drawerAlways(header), "الدرج مشروطٌ في الترويسة").toBe(true);
    // يحمرّ على المزروع (المادة ٣٠): ترويسة جوالٍ ثانية في القشرة، ودرجٌ مشروط.
    expect(
      `${SHELL_CODE}\n<header className="nexus-mobile-header sticky top-0 z-40 md:hidden" />`,
    ).toContain("nexus-mobile-header");
    const gated = header.replace("<MobileMenu ar={ar} />", "{withMenu && <MobileMenu ar={ar} />}");
    expect(gated).not.toBe(header);
    expect(drawerAlways(gated)).toBe(false);
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

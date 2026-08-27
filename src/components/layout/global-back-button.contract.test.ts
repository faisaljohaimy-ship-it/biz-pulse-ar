/**
 * زوج الرجوع/الرئيسية — حارس انحدار مزدوج.
 *
 * ── العطل الأول (٢٠٢٦/٠٨/٠٦): «تعود الصفحة إلى الشكل القديم» ──
 * لم يكن ارتدادًا في البناء — كان الزر ينفّذ `window.history.back()` بشرط
 * `window.history.length > 1`، وهذا الطول يَعُدّ **تاريخ التبويب كله** لا
 * تاريخ التطبيق. فأي صفحة سبق أن فتحها المستخدم في التبويب نفسه — بما فيها
 * نسخة قديمة من الموقع — تبقى مُدخلة صالحة، ويعيدها المتصفح من ذاكرة
 * التنقّل (bfcache) بهيئتها القديمة كاملةً.
 *
 * ── العطل الثاني (فقرة 1175، قِيس ٢٠٢٦/٠٨/٢٤): «الهوم متحرك» ──
 * الحل الوسيط (نسخة داخل ترويسة الجوال + نسخة عائمة تُحسم بينهما بـ`:has()`)
 * منع الإزاحة داخل الصفحة الواحدة لكنه ترك أربع حركات قيست بالبكسل:
 *   ١. قفزة 68px→272px عن الحافة على 1280 بعد ~2.5ث من كل فتح مباشر —
 *      لأن `body:has(.nexus-sidebar)` لا يصدق إلا بعد تركيب القشرة
 *      (`ssr:false`)، فالإحداثي كان تابعًا لحالة DOM.
 *   ٢. تبادل زرّين مختلفين (عائم ثم سطري) بفارق ~7px على 390.
 *   ٣. النسخة السطرية داخل ترويسة `sticky` معطّلة اللصوق (سلفها
 *      `overflow-x-hidden`) — الهوم يغادر الشاشة عند السكرول (y=-257).
 *   ٤. الرئيسية لا تعرض الزوج أصلًا — يظهر ويختفي بين صفحة وأخرى.
 * العلاج المثبَّت هنا: زوج تفاعلي **واحد** في الجذر، `fixed` بإحداثيات من
 * طبقة الرموز وحدها، يُرسم على كل صفحة بما فيها الرئيسية؛ وما في القشرة
 * خانة حجز مساحة صمّاء لا أزرار.
 *
 * لماذا حارسٌ على المصدر لا اختبار سلوك: الفرقان أعلاه لا يظهران في تصيير
 * jsdom — يظهران في تبويبٍ له تاريخ، وفي توقيت تركيب القشرة الحي. المُلزِم
 * هنا هو **أي البنيتين كُتبت**.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync("src/components/layout/GlobalBackButton.tsx", "utf8");
/** التعليق يشرح العطل ويذكر السطر القديم — الحارس يفحص الكود وحده. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CSS = readFileSync("src/styles.css", "utf8");
/** تعليقات CSS تشرح العلّة القديمة وتذكر محدِّدها — فحص المحدِّدات على الكود وحده. */
const CSS_CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
const SHELL = readFileSync("src/components/app-shell.tsx", "utf8");
const ROOT = readFileSync("src/routes/__root.tsx", "utf8");

describe("GlobalBackButton — الرجوع محبوس داخل مكدّس التطبيق", () => {
  it("actually read the component", () => {
    // حارس صامت يمرّ إلى الأبد. لو انتقل الملف تفشل هذه أولًا وتقول السبب.
    expect(SRC).toContain("export function GlobalBackButton");
  });

  it("يبني القرار على خريطة الهرم لا على تاريخ التنقّل (V5)", () => {
    // القرار التاريخي (`useCanGoBack` + آخر مسار) كان يُظهر الزر في كل واجهة
    // رئيسية بمجرّد أي تنقّل سابق — وهي ملاحظة العميل. الرجوع صفةُ مكان:
    // الشاشات التفصيلية وحدها لها أبٌ مكتوب، والنقل حتمي إليه.
    expect(SRC).toContain("drilldownParent");
    expect(CODE).not.toContain("useCanGoBack");
    expect(CODE).not.toContain("window.history.back");
    expect(CODE).toMatch(/backNeeded = parent !== null/);
  });

  it("لا يفحص window.history.length إطلاقًا", () => {
    // هذا هو السطر الذي سبّب العطل الأول. عودته تعيده.
    expect(CODE).not.toMatch(/history\.length/);
  });

  it("يسقط إلى الرئيسية حين لا يملك التطبيق مُدخلة يرجع إليها", () => {
    expect(SRC).toMatch(/navigate\(\{ to: "\/" \}\)/);
  });
});

describe("الزوج المثبّت — الهوم لا يتحرّك بكسلًا: بين الصفحات ولا عند ظهور الرجوع", () => {
  it("الجذر يركّب الزوج المثبّت — خارج RouteTransition فلا يتحرّك مع الانتقالات", () => {
    expect(ROOT).toContain("<GlobalBackButton />");
    // داخل __root: التركيب قبل غلاف الانتقال (<RouteTransition> يلفّ <Outlet/> وحده).
    expect(ROOT.indexOf("<GlobalBackButton />")).toBeLessThan(ROOT.indexOf("<RouteTransition>"));
    expect(SRC).toMatch(
      /GlobalBackButton\(\)\s*\{\s*return <BackHomePair className="nx-backhome-pin" \/>/,
    );
  });

  it("يُرسم على الرئيسية أيضًا — لا إخفاء بالمسار، فالظهور والاختفاء حركة", () => {
    // كان `if (pathname === "/") return null;` فيغيب الهوم على الرئيسية
    // ويقفز حضورُه بين صفحة وأخرى. لا عودة لأي إخفاءٍ شرطي في هذا الملف.
    expect(CODE).not.toMatch(/return null/);
  });

  it("الموضع في طبقة الرموز لا في المكوّن", () => {
    expect(SRC).toContain("nx-backhome-pin");
    expect(CSS).toMatch(/\.nx-backhome-pin\s*\{\s*position: fixed/);
    // لا إحداثيات مكتوبة في JSX — انفصالها عن الرموز هو ما افترق بصمت سابقًا.
    expect(CODE).not.toMatch(/fixed top-\[/);
    expect(CODE).not.toMatch(/rtl:right-\[|ltr:left-\[/);
  });

  it("الإحداثيات لا تتبدّل بحالة DOM — لا :has على موضع الزوج", () => {
    // هذا هو مصدر قفزة 68→272: محدِّد يقرأ وجود الشريط الجانبي فيُحرّك
    // الزوج ساعة تركيب القشرة. موضع `.nx-backhome-pin` لا يجوز أن يقع
    // داخل أي محدِّد `:has(...)` كائنًا ما كان شرطه.
    expect(CSS_CODE).not.toMatch(/:has\([^)]*\)[^{]*\.nx-backhome-pin/);
  });

  it("الرأسي مشتقّ من رموز الشريط والترويسة والمدار معًا", () => {
    const rule = CSS.slice(CSS.indexOf(".nx-backhome-pin {"));
    expect(rule).toContain("--nx-clockbar-h");
    expect(rule).toContain("--nx-header-h");
    expect(rule).toContain("--nx-orb-size");
    // الحدّ السفلي جزءٌ من الارتفاع المشغول — إغفاله أزاح الزوج بكسلًا.
    expect(rule).toContain("--nx-hairline-w");
    // ولا يجوز أن يستعمل الشريط ارتفاعًا آخر غير هذا المتغيّر.
    expect(CSS).toMatch(/\.nx-clock-row\s*\{[^}]*--nx-clockbar-h/);
  });

  it("معفًى من حركة الدخول — لا «ظهور ونهوض» للهوم بعد كل تحميل", () => {
    // `nx-ico-rise` (icon-motion.css) تبدأ من opacity:0 + scale:0.92 +
    // translate 4px وتعلق حتى اكتمال الترطيب — قِيست 40.5px بإزاحة 5.8px.
    // الإعفاء أعلى نوعيةً (0,2,0) من قاعدة `.nx-orb` العامة (0,1,0).
    expect(CSS_CODE).toMatch(/\.nx-backhome-pin \.nx-orb\s*\{\s*animation: none;\s*\}/);
  });

  it("خانة الرجوع محجوزة دائمًا — الإخفاء بـinvisible لا بإزالة العنصر", () => {
    // إزالة العنصر تزيح الهوم حين يظهر الرجوع؛ الحجز يثبّته.
    expect(SRC).toContain('invisible pointer-events-none"');
    expect(SRC).toContain("aria-hidden={!backNeeded}");
    expect(SRC).toMatch(/tabIndex=\{backNeeded \? 0 : -1\}/);
  });

  it("نسخة القشرة خانةُ حجزِ مساحةٍ صمّاء — لا زوج ثانٍ يتبادل مع المثبّت", () => {
    // القشرة تُبقي `BackHomeControls` في صفّ الترويسة كي يواصل justify-between
    // إفساح ممرّ الزوج (فلا يجلس الشعار تحته)، لكنها بصمة قدم لا أزرار.
    expect(SHELL).toContain("BackHomeControls");
    const spacer = SRC.slice(
      SRC.indexOf("export function BackHomeControls"),
      SRC.indexOf("export function GlobalBackButton"),
    );
    expect(spacer).toContain('aria-hidden="true"');
    expect(spacer).toContain("invisible pointer-events-none");
    expect(spacer).not.toContain("<button");
    // وعرض الخانة هو عرض الزوج نفسه: قرصان 44px (size-11) بفجوة gap-2.
    expect(spacer.match(/size-11/g)?.length).toBe(2);
  });

  it("الهيئة تطابق NexusOrb: 44px · دائري · القرص الزجاجي نفسه", () => {
    expect(SRC).toContain("size-11");
    expect(SRC).toContain("rounded-full");
    expect(SRC).toContain("border-primary/30");
    expect(SRC).toContain("bg-card/40");
    // ولا عودة إلى قرص أصغر من هدف اللمس ولا إلى حبّة بنصّ بجوار دائرة.
    expect(CODE).not.toMatch(/\bh-9\b/);
  });

  it("الشريط لا يلبس حدًّا صندوقيًّا في الفاتح — بكسلان يزيحان كل ما تحته", () => {
    // القاعدة العامّة للزجاج تكتب `border-width: 2px` على الجهات الأربع.
    // الشريط ممتدّ بعرض الشاشة، فحدّه العلوي ارتفاعٌ زائد لا زينة.
    const boxy = CSS.slice(CSS.indexOf("border-width: 2px !important") - 400);
    expect(boxy.slice(0, 400)).not.toContain(".nx-clock-bar");
  });

  it("ممرّ الساعة باقٍ كاملًا — لم يعُد فوق الشريط ما يقصّه", () => {
    const slot = CSS.slice(CSS.indexOf(".nx-clock-slot {"), CSS.indexOf(".nx-clock-slot {") + 260);
    expect(slot).not.toMatch(/margin-right:\s*6\.75rem/);
    expect(slot).not.toMatch(/margin-left:\s*3\.5rem/);
  });
});

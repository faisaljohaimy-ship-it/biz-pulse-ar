/**
 * زر الرجوع لا يغادر النظام — حارس انحدار.
 *
 * العطل المُبلَّغ (٢٠٢٦/٠٨/٠٦): «تعود الصفحة إلى الشكل القديم». لم يكن ارتدادًا
 * في البناء — كان الزر ينفّذ `window.history.back()` بشرط
 * `window.history.length > 1`، وهذا الطول يَعُدّ **تاريخ التبويب كله** لا تاريخ
 * التطبيق. فأي صفحة سبق أن فتحها المستخدم في التبويب نفسه — بما فيها نسخة
 * قديمة من الموقع — تبقى مُدخلة صالحة، ويعيدها المتصفح من ذاكرة التنقّل
 * (bfcache) بهيئتها القديمة كاملةً.
 *
 * لماذا حارسٌ على المصدر لا اختبار سلوك: الفرق بين الشرطين لا يظهر في تصيير
 * المكوّن ولا في نقرة واحدة — يظهر فقط في تبويب له تاريخ سابق، وهو ما لا
 * يُنشأ في jsdom. المُلزِم هنا هو **أي الاثنين كُتب**.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync("src/components/layout/GlobalBackButton.tsx", "utf8");
/** التعليق يشرح العطل ويذكر السطر القديم — الحارس يفحص الكود وحده. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

describe("GlobalBackButton — الرجوع محبوس داخل مكدّس التطبيق", () => {
  it("actually read the component", () => {
    // حارس صامت يمرّ إلى الأبد. لو انتقل الملف تفشل هذه أولًا وتقول السبب.
    expect(SRC).toContain("export function GlobalBackButton");
  });

  it("يبنيَ القرار على مكدّس المسيّر لا على طول تاريخ التبويب", () => {
    expect(SRC).toContain("useCanGoBack");
    expect(SRC).toMatch(/if \(canGoBack\)/);
  });

  it("لا يفحص window.history.length إطلاقًا", () => {
    // هذا هو السطر الذي سبّب العطل. عودته تعيده.
    expect(CODE).not.toMatch(/history\.length/);
  });

  it("يسقط إلى الرئيسية حين لا يملك التطبيق مُدخلة يرجع إليها", () => {
    expect(SRC).toMatch(/navigate\(\{ to: "\/" \}\)/);
  });
});

/**
 * محاذاة السقف — حارس ضدّ عودة «الصفّ الذي لا ينتمي إليه أحد».
 *
 * المُبلَّغ (المرفق IMG_9412): الزرّان يطفوان *داخل* شريط الساعة فيقصّان
 * التاريخ ويقفان أعلى صفّ مدار النوافذ لا في محاذاته. العلاج ليس رقمًا
 * أفضل — بل **ألّا يُكتب الرقم هنا أصلًا**: الموضع يعتمد على ثلاثة مقادير
 * يملكها ثلاثة ملفات (ارتفاع الشريط · ارتفاع الترويسة · مقاس المدار)، وأي
 * نسخة ثانية منها تفترق عن الأصل بصمت.
 *
 * فالحارس يفحص أمرين لا يظهران في أي تصيير: أن الموضع مركزيّ في الرموز،
 * وأن الهيئة تطابق المدار الذي تُحاذيه.
 */
const CSS = readFileSync("src/styles.css", "utf8");
const SHELL = readFileSync("src/components/app-shell.tsx", "utf8");

describe("الزوج يحاذي مدار النوافذ — لا يطفو فوق شريط الساعة ولا فوق الشعار", () => {
  /**
   * المحاولة الأولى أبقت الزوج عائمًا وحسبت له إحداثيًّا. والحساب صحّ:
   * قِيس على الصفحة الحيّة فكان أعلى الزرّ ٤٣ وأعلى المدار ٤٣ — تطابقٌ تامّ.
   * ومع ذلك كانت خطأً، لأن العائم لا يزيح شيئًا: جلس فوق شعار سَدِيد فحجبه.
   * فالحارس يُثبّت **التركيب** لا الرقم: داخل الصفّ يحاذي التخطيطُ ويُفسح معًا.
   */
  it("القشرة تركّبه داخل ترويستها بجوار مدار النوافذ", () => {
    expect(SRC).toContain("export function BackHomeControls");
    expect(SHELL).toContain("BackHomeControls");
    // بجوار المدار فعلًا: كلاهما في ترويسة الجوال نفسها.
    const header = SHELL.slice(SHELL.indexOf("nexus-mobile-header"));
    const orbAt = header.indexOf("<NexusOrb");
    const pairAt = header.indexOf("<BackHomeControls");
    expect(orbAt).toBeGreaterThan(-1);
    expect(pairAt).toBeGreaterThan(-1);
    // ويسبقه المدار فيبقى الترتيب: نوافذ ← رجوع ← رئيسية.
    expect(orbAt).toBeLessThan(pairAt);
  });

  it("النسخة العائمة تختفي حيث ركّبتها القشرة — فلا تحجب الشعار", () => {
    expect(CSS).toMatch(/body:has\(\.nexus-mobile-header\) \.nx-backhome\s*\{\s*display: none/);
  });

  it("الموضع في طبقة الرموز لا في المكوّن", () => {
    expect(SRC).toContain("nx-backhome");
    expect(CSS).toMatch(/\.nx-backhome\s*\{/);
    // لا إحداثيات مكتوبة في JSX — هذا بالضبط ما انفصل عن الأصل.
    expect(CODE).not.toMatch(/fixed top-\[/);
    expect(CODE).not.toMatch(/rtl:right-\[|ltr:left-\[/);
  });

  it("الرأسي مشتقّ من ارتفاع الشريط وحدّه والترويسة معًا", () => {
    const rule = CSS.slice(CSS.indexOf(".nx-backhome {"));
    expect(rule).toContain("--nx-clockbar-h");
    expect(rule).toContain("--nx-header-h");
    expect(rule).toContain("--nx-orb-size");
    // الحدّ السفلي جزءٌ من الارتفاع المشغول — إغفاله أزاح الزوج بكسلًا.
    expect(rule).toContain("--nx-hairline-w");
    // ولا يجوز أن يستعمل الشريط ارتفاعًا آخر غير هذا المتغيّر.
    expect(CSS).toMatch(/\.nx-clock-row\s*\{[^}]*--nx-clockbar-h/);
  });

  it("الشريط لا يلبس حدًّا صندوقيًّا في الفاتح — بكسلان يزيحان كل ما تحته", () => {
    // القاعدة العامّة للزجاج تكتب `border-width: 2px` على الجهات الأربع.
    // الشريط ممتدّ بعرض الشاشة، فحدّه العلوي ارتفاعٌ زائد لا زينة.
    const boxy = CSS.slice(CSS.indexOf("border-width: 2px !important") - 400);
    expect(boxy.slice(0, 400)).not.toContain(".nx-clock-bar");
  });

  it("الهيئة تطابق NexusOrb: 44px · دائري · القرص الزجاجي نفسه", () => {
    expect(SRC).toContain("size-11");
    expect(SRC).toContain("rounded-full");
    expect(SRC).toContain("border-primary/30");
    expect(SRC).toContain("bg-card/40");
    // ولا عودة إلى قرص أصغر من هدف اللمس ولا إلى حبّة بنصّ بجوار دائرة.
    expect(CODE).not.toMatch(/\bh-9\b/);
  });

  it("ممرّ الساعة استُعيد — لم يبقَ فوق الشريط ما يقصّه", () => {
    const slot = CSS.slice(CSS.indexOf(".nx-clock-slot {"), CSS.indexOf(".nx-clock-slot {") + 260);
    expect(slot).not.toMatch(/margin-right:\s*6\.75rem/);
    expect(slot).not.toMatch(/margin-left:\s*3\.5rem/);
  });
});

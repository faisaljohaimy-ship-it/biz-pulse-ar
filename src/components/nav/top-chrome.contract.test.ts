/**
 * قشرة الأعلى — **حارسٌ انقلب: من حراسة الوجود إلى حراسة الإزالة.**
 *
 * أمر المالك ٢٠٢٦/٠٩/١٠: «أزل علامات وأيقونات تغيير الوضع والجرس والرجوع
 * والهوم من النظام كاملًا».
 *
 * ## ما كان هنا قبل اليوم
 *
 * كان هذا الملف يحرس أربعة أزرار وُلدت من سلسلة أوامر متتابعة: زوج
 * الهوم/الرجوع مثبّتًا على كل صفحة بموضعٍ لا يتحرّك بكسلًا، وشريط الجرس
 * والمبدّل مقيَّدًا بالرئيسية وحدها، وطبقتهما عند 120 فوق لوحة سَدِيد،
 * ونزعُ التوهّج والحركة عنهما. كل تلك البنود سقطت مع مادّتها.
 *
 * ## ولماذا لا يُحذف الملف بل يُقلب
 *
 * الأزرار الأربعة تراكمت على مدى شهر بأوامر متتابعة، كلٌّ منها أضاف طبقة
 * (تثبيت · إعفاء حركة · نزع توهّج · ترتيب طبقات). فحذفُ الحارس مع الأزرار
 * يترك الشجرة بلا ذاكرةٍ لهذا القرار: أوّل طلبٍ لاحق فيه «زر رجوع» أو
 * «جرس تنبيهات» يُنفَّذ بحسن نيّة، فتعود القشرة التي أُزيلت عمدًا.
 * فالبنود أدناه تقيس **الغياب** كما كانت تقيس الحضور — وأي عودةٍ صامتة
 * تسقط هنا باسم الملف والقاعدة.
 *
 * ## وحدُّ الإزالة مقيسٌ كذلك
 *
 * المحذوف **العلامة لا نظام الألوان**: مبدّل الوضع زرٌّ، وطبقة الوضعين
 * (`.light` / `.dark` والرموز التي تقلبها) بنيةٌ تحكمها المواد ٣٢–٣٤ ولم
 * يأمر المالك بمسّها. والقسم الأخير يحرس هذا الحدّ من الجهتين: لا يعود
 * الزرّ، ولا تسقط الطبقة بحجّة أنه ذهب.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const exists = (p: string) => existsSync(join(root, p));
/** المصدر منزوع التعليقات: تعليقٌ يشرح ما أُزيل لا يُقرأ عودةً له. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** ملفّات القشرة التي كانت تركّب الأزرار أو تحجز لها مكانًا. */
const CHROME_HOSTS = [
  "src/routes/__root.tsx",
  "src/components/app-shell.tsx",
  "src/routes/-blueprint-page.tsx",
  "src/routes/-nx-ops-page.tsx",
  "src/routes/-nx-flow-page.tsx",
];

describe("① المكوّنات نفسها محذوفة — لا ملفّ يتيم يُعاد وصله بسهو", () => {
  it("ملفّات الأزرار الأربعة خارج الشجرة", () => {
    for (const p of [
      "src/components/layout/ThemeToggle.tsx",
      "src/components/nav/TopUtilityBar.tsx",
      "src/components/layout/GlobalBackButton.tsx",
    ]) {
      expect(exists(p), `${p} عاد إلى الشجرة`).toBe(false);
    }
  });

  it("ووحدة وجهة الرجوع معها — ماتت بموت مستهلكها الوحيد", () => {
    // `resolveBackTarget` كانت تُحسب لزرّ الرجوع وحده؛ لا مستهلك آخر لها
    // في الشجرة (فُحص قبل الحذف). إبقاؤها يعني وحدةً حيّة بلا نداء —
    // والحذف حذفٌ لا إخفاء (عقيدة CLAUDE.md).
    expect(exists("src/lib/nav/drilldowns.ts")).toBe(false);
    expect(exists("src/lib/nav/drilldowns.test.ts")).toBe(false);
  });

  it("ولا مستورِد باقٍ لأيٍّ منها في كل الشجرة", () => {
    // استيرادٌ لملفٍّ محذوف يكسر البناء، فهذا البند يمسك ما هو أخفى:
    // إعادة إنشاء الملف ثم وصله من مكانٍ لم يكن يصله سابقًا.
    for (const host of CHROME_HOSTS) {
      const src = code(host);
      expect(src, `${host} يستورد مبدّل الوضع`).not.toMatch(
        /from "@\/components\/layout\/ThemeToggle"/,
      );
      expect(src, `${host} يستورد شريط الجرس`).not.toMatch(
        /from "@\/components\/nav\/TopUtilityBar"/,
      );
      expect(src, `${host} يستورد زوج الرجوع/الهوم`).not.toMatch(
        /from "@\/components\/layout\/GlobalBackButton"/,
      );
    }
  });
});

describe("② لا تركيب لأيٍّ من الأربعة في أي سطح", () => {
  it("الجذر بلا زوج مثبّت وبلا شريط أدوات", () => {
    const src = code("src/routes/__root.tsx");
    expect(src, "عاد زوج الهوم/الرجوع المثبّت").not.toMatch(/<GlobalBackButton/);
    expect(src, "عاد شريط الجرس والمبدّل").not.toMatch(/<GlobalUtilityBar/);
    // والقيد الذي كان يخدمه سقط معه: شرطٌ بلا مشروط يُقرأ ميزةً معطّلة.
    expect(src, "بقي قيد المسار لشريطٍ محذوف").not.toMatch(/showUtilityBar/);
  });

  it("والقشرة بلا بصمة قدمٍ لزوجٍ لم يعد يطفو فوقها", () => {
    const src = code("src/components/app-shell.tsx");
    expect(src, "بقيت خانة حجز الزوج — فراغ ميت بعرض 96px").not.toMatch(/<BackHomeControls/);
    expect(src).not.toMatch(/<UtilityBarSpacer/);
    expect(src).not.toMatch(/<TopUtilityBar/);
  });

  it("ولا مبدّل في الصفحات الواقعة خارج القشرة", () => {
    // هاتان كانتا تركّبان مبدّلهما بأنفسهما بعلّة «خارج القشرة فلا شريط
    // لها» — فلو نُسي أحدهما لبقي المبدّل حيًّا على مسارٍ كامل.
    for (const p of [
      "src/routes/-nx-ops-page.tsx",
      "src/routes/-nx-flow-page.tsx",
      "src/routes/-blueprint-page.tsx",
    ]) {
      expect(code(p), `${p} ما زال يركّب مبدّل وضع`).not.toMatch(/<ThemeToggle/);
    }
  });

  it("ولا جرس ثانٍ في ترويسة القمرة — الإزالة تشمل النسخة الثانية", () => {
    // **أمسكه المسح لا القراءة:** `cockpit/header.tsx` كان يحمل زرّ
    // إشعارات كاملًا (مدار 44px + شارة غير المقروء + درج الإشعارات)،
    // خارج قائمة ملفّات القشرة تمامًا. ومساره محجوب يعيد التوجيه
    // للرئيسية فلا يُرسم لمستخدم — لكن «من النظام كاملًا» تشمل الشجرة
    // لا الشاشة وحدها، وأوّل من يرفع الحجب يرى جرسًا عاد وحده.
    const header = code("src/components/cockpit/header.tsx");
    expect(header, "عاد جرس الإشعارات إلى ترويسة القمرة").not.toMatch(/<Bell[\s/>]/);
    expect(header).not.toMatch(/data-action="notifications\.open"/);
  });

  it("ولا عودة لأيقوناتها في ملفّات القشرة", () => {
    // الأيقونة قبل المكوّن: من يُعيد الزرّ يبدأ باستيراد رمزه من lucide.
    // النطاق محصور بملفّات القشرة — Bell/Home/ArrowRight استعمالاتٌ
    // مشروعة في بطاقات البلاغات والجداول وسواها، ولا تخصّها هذه القاعدة.
    for (const host of CHROME_HOSTS) {
      const src = code(host);
      const lucide = /import\s*\{([^}]*)\}\s*from\s*"lucide-react"/g;
      const imported = [...src.matchAll(lucide)].flatMap((m) =>
        m[1].split(",").map((x) => x.trim().split(/\s+as\s+/)[0]),
      );
      for (const icon of ["Bell", "Sun", "Moon"]) {
        expect(imported, `${host} أعاد استيراد ${icon}`).not.toContain(icon);
      }
    }
  });
});

describe("③ طبقة الأنماط سقطت معها — لا محدِّد بلا مطابِق", () => {
  const CSS = read("src/styles.css").replace(/\/\*[\s\S]*?\*\//g, "");

  it("لا قاعدة باقية لأصناف الأزرار الأربعة", () => {
    // محدِّدٌ لا يطابق شيئًا ليس حياديًّا: يُقرأ لاحقًا عقدًا حيًّا فيُبنى
    // عليه، أو يُعاد الصنف إلى JSX فتنهض معه قواعد لم يقصدها أحد.
    // `.nx-backhome` بلا لاحقة عمدًا: كانت طبقة الموضع **الأولى** للزوج،
    // وبقيت في الملفّ يتيمةً بعد أن حلّ محلّها `.nx-backhome-pin` — فحصٌ
    // يبحث عن اللاحقة وحدها كان يمرّ فوقها. (أمسكها المسح لا القراءة.)
    for (const cls of [".nx-theme-toggle", ".nx-theme-ico", ".nx-backhome", ".nx-utilitybar-pin"]) {
      expect(CSS, `القاعدة ${cls} باقية بلا عنصر يطابقها`).not.toContain(cls);
    }
  });

  it("وممرّ الساعة لم يعد يحجز عرضًا لزوجٍ محذوف", () => {
    // كان يحجز حتى 9.5rem بالاسم («تظهر كلمة رجوع فوق sm فيتّسع الزوج»)؛
    // بقاؤه بعد الحذف يزيح الساعة والتاريخ عن وسط الشريط بلا سبب مرئي.
    const slot = CSS.slice(CSS.indexOf(".nx-clock-slot {"));
    const rule = slot.slice(0, slot.indexOf("}") + 1);
    expect(rule).toMatch(/margin-left:\s*0\.75rem/);
    expect(CSS, "عاد الحجز 9.5rem إلى ممرّ الساعة").not.toContain("9.5rem");
  });

  it("و`.nx-orb` باقية بكامل قواعدها — لم يكن المحذوف إلا تخصيصها", () => {
    // الشريط الجانبي و`mission-control` و`guide` يلبسونها؛ حذفها مع
    // المثبَّتين كان سيُطفئ مدارات لم يأمر المالك بمسّها.
    expect(CSS).toContain(".nx-orb");
    expect(code("src/components/app-shell.tsx")).toContain("nx-orb");
  });

  it("ومنع الارتداد المطّاطي باقٍ — يخدم كل مثبَّت لا الزوج وحده", () => {
    // وُلدت القاعدة لأجل الزوج، لكن موضوعها إطار العرض نفسه: لوحة سَدِيد
    // مثبّتة أيضًا، فحذفها مع الزوج يُعيد إزاحتها بالسحب على اللمس.
    expect(CSS).toMatch(/html,\s*body\s*\{[^}]*overscroll-behavior-block:\s*none/);
  });
});

describe("④ حدُّ الإزالة — العلامة ذهبت والطبقة باقية (المواد ٣٢–٣٤)", () => {
  it("محرّك الوضعين قائم: المزوّد والمفتاح والافتراض الداكن", () => {
    // المأمور به إزالة **زرّ** التبديل. أمّا طبقة الوضعين فبنيةُ ألوانٍ
    // تحكمها المواد ٣٢–٣٤، ولم يأمر المالك بمسّها — وإسقاطها بحجّة أن
    // زرّها ذهب توسيعٌ للأمر لا تنفيذٌ له.
    const theme = read("src/lib/theme.tsx");
    expect(theme).toContain("export function ThemeProvider");
    expect(theme).toContain('export const DEFAULT_THEME: Theme = "dark"');
    expect(code("src/routes/__root.tsx")).toContain("<ThemeProvider>");
  });

  it("وجسر الوضع الفاتح لم يُمسّ — الرموز تقلب كما كانت", () => {
    const CSS = read("src/styles.css");
    const bridge = CSS.slice(CSS.indexOf("جسر الوضع الفاتح"));
    expect(bridge, "سقط جسر الفاتح مع سقوط زرّه").toMatch(/\.light \{\s*[^}]*--color-white:/);
  });

  it("ولا كاتبَ للوضع في الواجهة بعد اليوم — لا زرّ ولا مفتاح لوحة", () => {
    // **صُحِّح هذا التعليق بعد أن كذب:** كُتب أوّلًا يقول إن `toggle`
    // تبقى «لأن الفحص الآلي ومسارًا برمجيًّا يستعملانها» — وهو تبريرٌ
    // مخترَع: `ui-audit.mjs` وفحص Lottie كلاهما يكتب `localStorage`
    // مباشرةً ولا يمسّ السياق. فحُذفت `toggle` فعلًا، وبقيت `setTheme`
    // وحدها طريقًا برمجيًّا. وأي مستدعٍ جديد للسياق في مكوّن يعني عودة
    // المبدّل بشكلٍ آخر.
    for (const host of CHROME_HOSTS) {
      expect(code(host), `${host} يستدعي تبديل الوضع`).not.toMatch(
        /\btoggle\(\)|onClick=\{toggle\}/,
      );
      expect(code(host), `${host} يقرأ سياق الوضع`).not.toMatch(/\buseTheme\(/);
    }
  });
});

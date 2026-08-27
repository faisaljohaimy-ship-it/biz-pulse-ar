/**
 * قشرة الأعلى — حارس العقد (أمر المالك ٢٠٢٦/٠٨/٢٧).
 *
 * نصّ الأمر: «ثبت زر الهوم في مكانه في اعلى صفحات النظام ولا تجعله
 * متحركاً وثبت ايظاً زري التنبيهات والوضعين في اعلى صفحة النظام
 * الرئيسية فقط».
 *
 * فحالتان مختلفتان في الطبقة نفسها، وخلطهما هو ما أنتج العطل:
 *
 *   ① زوج الرجوع/الهوم **تنقّلٌ** — على كل صفحة، بموضع واحد لا يتحرك.
 *     مقيس ٢٠٢٦/٠٨/٢٧ على 9 مسارات × قبل/بعد السكرول × مقاسين (36 خلية):
 *     ‏(1168,47) على 1280 و(278,43) على 390 في كلّها.
 *   ② الجرس والمبدّل **تفضيلٌ** — على الرئيسية وحدها. كان الشريط V5
 *     يُرسم على كل مسار: زرّان عائمان فوق كل شاشة داخلية، ومبدّلان
 *     متراكبان على الرئيسية (فارق 8px، قيس فعلًا) لأن الصفحة كانت
 *     تركّب مبدّلها بنفسها بعلّةٍ بطلت («خارج القشرة فلا شريط لها»).
 *
 * الفحص قراءة ساكنة للمصدر — كنمط `global-back-button.contract.test.ts`
 * — فأي ارتداد يسقط هنا باسم الملف والقاعدة لا في عين مراجع.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
/** المصدر منزوع التعليقات: تعليقٌ يذكر اسمًا مُزالًا يمرّر بندًا زورًا. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("① زوج الهوم/الرجوع — على كل صفحة وبموضع ثابت", () => {
  it("الجذر يركّبه بلا قيد مسار، خارج انتقال المسارات", () => {
    const src = code("src/routes/__root.tsx");
    expect(src, "سقط تركيب الزوج من الجذر").toMatch(/<GlobalBackButton\s*\/>/);
    // لا يُقيَّد بمسار: الرجوع/الهوم تنقّلٌ لا تفضيل.
    expect(src).not.toMatch(/pathname\s*===\s*"\/"\s*&&\s*<GlobalBackButton/);
    // خارج RouteTransition كي لا يتحرك مع انتقال الصفحات.
    const pin = src.indexOf("<GlobalBackButton");
    const trans = src.indexOf("<RouteTransition");
    expect(pin).toBeGreaterThan(-1);
    expect(trans).toBeGreaterThan(-1);
    expect(pin, "الزوج دخل داخل RouteTransition فصار يتحرك").toBeLessThan(trans);
  });

  it("موضعه من طبقة الرموز بـfixed — لا :has ولا حساب يعتمد على القشرة", () => {
    const css = read("src/styles.css");
    const block = css.slice(css.indexOf(".nx-backhome-pin {"));
    const rule = block.slice(0, block.indexOf("}") + 1);
    expect(rule).toMatch(/position:\s*fixed/);
    // إحداثيات من الرموز: لو عادت قيمة نهائية، عاد الاختلاف بين الصفحات.
    expect(rule).toMatch(/var\(--nx-header-h\)/);
    expect(rule).toMatch(/var\(--nx-shell-edge\)/);
    // القفزة القديمة (204px) كانت من شرطٍ يقرأ الشريط الجانبي بعد الترطيب.
    expect(rule, ":has على موضع الزوج يعيد قفزة الترطيب").not.toMatch(/:has\(/);
  });

  it("وحركة الدخول معفاة عنه — لا «ينهض» متأخرًا بعد كل تحميل", () => {
    const css = read("src/styles.css");
    expect(css).toMatch(/\.nx-backhome-pin\s+\.nx-orb\s*\{\s*animation:\s*none/);
  });
});

describe("② الجرس والمبدّل — الرئيسية وحدها", () => {
  it("الجذر يقيّد الشريط بالمسار «/» لا يرسمه على كل مسار", () => {
    const src = code("src/routes/__root.tsx");
    expect(src).toMatch(/showUtilityBar\s*=\s*pathname\s*===\s*"\/"/);
    expect(src, "الشريط رُسم بلا قيد مسار فعاد إلى الشاشات الداخلية").toMatch(
      /showUtilityBar\s*&&\s*<GlobalUtilityBar\s*\/>/,
    );
  });

  it("والرئيسية لا تركّب مبدّلًا ثانيًا فوق مبدّل الشريط", () => {
    const src = code("src/routes/-blueprint-page.tsx");
    expect(src, "عاد المبدّل المكرر إلى الرئيسية — تراكب 8px").not.toMatch(/<ThemeToggle/);
    expect(src).not.toMatch(/from "@\/components\/layout\/ThemeToggle"/);
  });

  it("وقشرة الصفحات الداخلية بلا بصمة قدمٍ لشريطٍ لم يعد يُرسم فيها", () => {
    const src = code("src/components/app-shell.tsx");
    expect(src, "بصمة القدم بقيت بلا شريط — فراغ ميت يزيح مبدّل المؤسسة").not.toMatch(
      /<UtilityBarSpacer/,
    );
    expect(src).not.toMatch(/UtilityBarSpacer.*from/);
  });

  it("والشريط نفسه طبقة مثبّتة واحدة بموضع من الرموز", () => {
    const css = read("src/styles.css");
    const block = css.slice(css.indexOf(".nx-utilitybar-pin {"));
    const rule = block.slice(0, block.indexOf("}") + 1);
    expect(rule).toMatch(/position:\s*fixed/);
    expect(rule).toMatch(/var\(--nx-shell-edge\)/);
    // الطرف المقابل للهوم: هذا يبقيهما على مستوى أفقي واحد بلا تصادم.
    expect(rule).toMatch(/inset-inline-end/);
  });
});

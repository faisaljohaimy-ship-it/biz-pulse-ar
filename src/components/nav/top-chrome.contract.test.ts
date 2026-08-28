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
    // الإعفاء اتّسع إلى الطبقتين معًا بأمر ٢٠٢٦/٠٨/٢٨ (تفصيله في ③)؛
    // المُلزِم هنا أن الزوج ما زال داخله.
    const css = read("src/styles.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = css.match(/:is\([^)]*\)\s*:is\([^)]*\)\s*\{[^}]*animation:\s*none[^}]*\}/)?.[0];
    expect(rule, "سقط إعفاء الزوج من حركة الدخول").toContain(".nx-backhome-pin");
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

/**
 * ③ أمر المالك ٢٠٢٦/٠٨/٢٨ — شقّان:
 *   «ثبتها في الخلفية بدون أن تتحرك مع تحرك الشاشة **جميعها**»
 *   «أضف زر للرجوع في الصفحات التي تحتاج لزر الرجوع … **مفعّلًا**»
 *
 * القياس هو ما فصل الشقّ الأول: السكرول لم يكن يحرّك شيئًا (١١ مسارًا ×
 * مقاسين × أربع مواضع = 44 خلية، إحداثية واحدة في كلّها)، والحركة كانت
 * حركة **الدخول** — الجرس ينزل 5.76px ويتلاشى داخلًا عند كل تحميل، لأن
 * الإعفاء كان مكتوبًا على زوج الهوم وحده. والشقّ الثاني قِيس كذلك: زرّ
 * رجوعٍ ظاهر على مسار واحد من أحد عشر.
 */
describe("③ لا حركة دخول على قشرة الأعلى، ورجوعٌ على كل شاشة لها أب", () => {
  /** قاعدة الإعفاء الموحّدة: سلفٌ من الطبقتين + مدار. */
  const exemption = () => {
    const css = read("src/styles.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const m = css.match(/:is\([^)]*\)\s*:is\([^)]*\)\s*\{[^}]*animation:\s*none[^}]*\}/);
    return m?.[0] ?? "";
  };

  it("الإعفاء يشمل الطبقتين معًا — الجرس والمبدّل لا يرثان النهوض", () => {
    const rule = exemption();
    expect(rule, "سقطت قاعدة إعفاء قشرة الأعلى من nx-ico-rise").not.toBe("");
    expect(rule).toContain(".nx-backhome-pin");
    expect(rule, "عاد الجرس والمبدّل إلى حركة الدخول — 5.76px مقيسة").toContain(
      ".nx-utilitybar-pin",
    );
    expect(rule).toContain(".nx-orb");
  });

  it("ويُبطل ما تخلّفه الحركة من إزاحة ومقياس وشفافية، لا اسمها وحده", () => {
    // `animation: none` وحدها تكفي ما دام لا أحد يكتب translate/scale
    // مباشرة؛ إبطالها صراحةً يقطع الطريق على أي حركة أخرى تُضاف لاحقًا.
    const rule = exemption();
    expect(rule).toMatch(/translate:\s*none/);
    expect(rule).toMatch(/scale:\s*none/);
    expect(rule).toMatch(/opacity:\s*1/);
  });

  it("ولا تُنشئ الطبقتان كتلة احتواء تُبطل تثبيتهما", () => {
    // `transform`/`filter`/`perspective` على المثبّت نفسه لا تكسر تثبيته،
    // لكنها تُنشئ جذر خلفية جديدًا فيفرغ زجاج `backdrop-blur` من محتواه.
    // وعلى أي سلفٍ لهما تكسر `fixed` نفسها فيعود الزر يتحرّك مع السكرول.
    const css = read("src/styles.css").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const pin of [".nx-backhome-pin {", ".nx-utilitybar-pin {"]) {
      const block = css.slice(css.indexOf(pin));
      const rule = block.slice(0, block.indexOf("}") + 1);
      expect(rule, `${pin} اكتسب تحويلًا يُفرغ الزجاج`).not.toMatch(
        /(^|[^-])(transform|perspective|filter):/,
      );
      expect(rule).not.toMatch(/will-change/);
    }
  });

  it("وجهة الرجوع تُحسم في وحدة خالصة لا في المكوّن", () => {
    const src = code("src/lib/nav/drilldowns.ts");
    expect(src).toMatch(/export function resolveBackTarget/);
    // الخريطة اليدوية تسبق الاشتقاق: أبٌ يخالف ترتيب المسار يبقى مصونًا.
    const body = src.slice(src.indexOf("export function resolveBackTarget"));
    expect(body.indexOf("drilldownParent")).toBeLessThan(body.indexOf("lastIndexOf"));
    // والرئيسية تُستثنى قبل كل شيء — لا رجوع من نقطة البداية.
    expect(body).toMatch(/path === "\/"\s*\)\s*return null/);
  });

  it("والزر مفعّل حين يوجد أب — لا خانة ميتة ولا مصيدة لوحة مفاتيح", () => {
    const src = code("src/components/layout/GlobalBackButton.tsx");
    expect(src).toMatch(/tabIndex=\{backNeeded \? 0 : -1\}/);
    expect(src).toMatch(/aria-hidden=\{!backNeeded\}/);
    // والإخفاء بـinvisible لا بإزالة العنصر — إزالته تزحزح الهوم.
    expect(src).toContain('invisible pointer-events-none"');
    expect(src).not.toMatch(/backNeeded\s*&&\s*\(?\s*</);
  });

  it("ولا يقصد الرجوعُ ما يقصده الهوم — تكرارٌ يخالف أمر ١١٧٥", () => {
    // كُتبت الطبقة ③ أوّلًا `return "/"` فصار على شاشات المستوى الأوّل
    // زرّان متجاوران بفعلٍ واحد. المُلزِم: من لا أب له لا زرّ له.
    const body = code("src/lib/nav/drilldowns.ts").slice(
      code("src/lib/nav/drilldowns.ts").indexOf("export function resolveBackTarget"),
    );
    expect(body, "الرجوع عاد يقصد الرئيسية فصار نسخةً من الهوم").not.toMatch(/\n\s*return "\/";/);
  });
});

/**
 * ⑥ ترتيب الطبقات — **حارسٌ وُلد من نقضٍ استحقّه** (٢٠٢٦/٠٨/٢٨).
 *
 * البند السابق كان يفحص `tabIndex` و`aria-hidden` في المصدر، فمرّ أخضر
 * بينما زرّ الرجوع على `/assistant` **ظاهرٌ وغير قابل للنقر**: حاجب لوحة
 * سَدِيد عند 105 وصندوقها عند 110 يعلوان مثبّتًا عند 70. أي أن الحارس كان
 * يفحص غير ما يدّعي — يفحص أن الزرّ *مكتوبٌ* مفعّلًا لا أنه *يُصاب*.
 *
 * وقياس الإصابة الحقيقي يحتاج متصفّحًا، لكن **سببه البنيوي ساكنٌ يُقرأ**:
 * ترتيب الطبقات. فيُحرس هنا رقميًّا — أي طبقةٍ تعلو المثبّت تُعيد العطل،
 * وهذا يمسك صنف العطل كلّه لا حالته الواحدة.
 */
describe("⑥ المثبّت يعلو كل ما يُرسم فوق الصفحة", () => {
  const zOf = (css: string, selector: string): number => {
    const block = css.slice(css.indexOf(selector));
    const rule = block.slice(0, block.indexOf("}") + 1);
    return Number(/z-index:\s*(\d+)/.exec(rule)?.[1] ?? NaN);
  };

  it("طبقة الزوج والشريط واحدة — وإلّا مات أحدهما تحت حاجبٍ حيّ فوق الآخر", () => {
    const css = read("src/styles.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const pair = zOf(css, ".nx-backhome-pin {");
    const util = zOf(css, ".nx-utilitybar-pin {");
    expect(Number.isFinite(pair)).toBe(true);
    expect(pair).toBe(util);
  });

  it("وتعلو حاجب لوحة سَدِيد وصندوقها — العطل المقيس على /assistant", () => {
    const css = read("src/styles.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const pair = zOf(css, ".nx-backhome-pin {");
    const copilot = code("src/components/sadeed-core/SadeedCopilot.tsx");
    const layers = [...copilot.matchAll(/\bz-\[(\d+)\]/g)].map((m) => Number(m[1]));
    expect(layers.length, "لم تُقرأ طبقات اللوحة — تبدّلت صيغتها").toBeGreaterThan(0);
    const highest = Math.max(...layers);
    expect(
      pair,
      `المثبّت ${pair} تحت طبقة اللوحة ${highest} — الزرّ يُرسم ولا يُنقر`,
    ).toBeGreaterThan(highest);
  });

  it("ويبقى دون المقدّمة السينمائية — هي تملك الشاشة في ثلاثينيتها", () => {
    const css = read("src/styles.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const pair = zOf(css, ".nx-backhome-pin {");
    const intro = code("src/components/intro/SadeedCinematicIntro.tsx");
    const introZ = Number(/z-\[(\d+)\]/.exec(intro)?.[1] ?? NaN);
    expect(Number.isFinite(introZ)).toBe(true);
    expect(pair).toBeLessThan(introZ);
  });
});

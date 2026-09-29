/**
 * عقد خلفية النظام — **فيلمٌ صامتٌ بطيء فوق سطحٍ مرسوم، وبلا زر.**
 *
 * **لماذا انقلب هذا الملف مرّتين.** حرس أوّلًا فيلمًا وزرَّ إيقاف، ثم
 * انقلب ٢٠٢٦/٠٨/٠٩ بأمر المالك («الخلفية ثابتة وغامقة، وشيل زر إيقاف
 * الخلفية») فصار يمنع `<video>` وملفَّ الخلفية نصًّا، ثم أمرَ المالكُ
 * ٢٠٢٦/٠٩/٢٨: «ضع هذا الفيديو كخلفية لصفحة النظام مع مراعاة تخفيض سرعة
 * الفيديو وحذف الصوت». فالمنعُ النصّيّ سقط **عمدًا** لا التفافًا عليه.
 *
 * **والبديلُ ليس فراغًا.** أمرُ المالك ثلاثةُ قيودٍ صريحة — فيلمٌ، أبطأُ
 * من الأصل، بلا صوت — وأمرُه السابق «لا زرّ» لم يُنسخ. فكلُّ واحدٍ منها
 * بندٌ هنا، ومعه ما يلزم عنها ولا يقوله المالك: أنّ حركةً دائمة بلا زرٍّ
 * توجب مخرجًا آخر (WCAG 2.2.2)، وأنّ الفيلم لا يعلو ما يحفظ قراءة الحبر.
 *
 * **والفحص سلوكيّ حيث أمكن:** يُركَّب المكوّن فعلًا بتفضيلٍ مُصطنع
 * ويُقرأ عنصرُ الوسائط من DOM. النصُّ لا يُفحص إلا حيث لا سلوكَ يُقرأ —
 * ترتيبُ المصدر وطبقةُ الأنماط — وهناك يُقال ذلك صراحةً.
 */
import { readFileSync, statSync } from "node:fs";
import { act, render, screen, fireEvent } from "@testing-library/react";
import postcss, { type Declaration } from "postcss";
import { afterEach, describe, expect, it } from "vitest";
import { HoloVideoEngine } from "./HoloVideoEngine";

const ENGINE = readFileSync("src/components/home/HoloVideoEngine.tsx", "utf8");
const CSS = readFileSync("src/styles.css", "utf8");
const ROOT = readFileSync("src/routes/__root.tsx", "utf8");

/** التعليقات تشرح ما حُذف وتذكر أسماءه — الحارس يفحص الكود وحده. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CODE = strip(ENGINE);
const ROOT_CODE = strip(ROOT);
/** ملف الأنماط بلا تعليقات: هذا الملف نفسه يذكر ما حُذف بأسمائه لتوثيق سببه. */
const SHEET = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** كل كتل قواعد `.nx-hv*` كما هي في الملف — على أي عمق من التداخل. */
const HV_RULES = SHEET.match(/\.nx-hv[\w-]*[^{}]*\{[^{}]*\}/g) ?? [];

/**
 * الملفّ **كما يراه محلِّل CSS**، لا كما يراه `indexOf`.
 *
 * **الدرس الذي وُلد منه هذا السطر.** كان كلُّ فحصٍ هنا يقرأ النصّ، وقِيس
 * أنّ ذلك عمًى تامّ عن أخطر ما يقع: تعليقٌ في `styles.css` احتوى صيغةً
 * منتهيةً بنجمةٍ ثمّ شرطة، فأُغلق قبل أوانه، فابتلع استردادُ المحلِّل
 * **قاعدة `.nx-hv-film` كاملةً** — تصريحاتُها الستّة محمولةٌ تحت محدِّدٍ
 * هو نصُّ التعليق، فلا تطابق شيئًا. والقاعدة لم تصل متصفّحًا قطّ،
 * والحارسُ أخضر، وtsc راضٍ، والبناء ناجح.
 *
 * فالقاعدة المكتسَبة: **ما لا يراه المحلِّل لا يراه المتصفّح** — وأخته
 * المكتسَبة في الجلسة نفسها: الطفرةُ التي لا يُتحقَّق من وقوعها ليست
 * طفرة. كلتاهما فرعٌ عن أصلٍ واحد: لا يُشهَد لأثرٍ لم يُقَس أثره.
 */
const AST = postcss.parse(CSS, { from: "src/styles.css" });

/**
 * تصريحاتُ **القاعدة الأساسية** كما حلّلها المحلِّل — `null` إن لم تُوجد.
 *
 * «الأساسية» أي في الجذر لا داخل `@media`: للاسم الواحد قاعدتان أحيانًا،
 * إحداهما `display: none` تحت تفضيلٍ وصوليّ. وأخذُ الأخيرة كان يُعطي
 * تلك، فيُقرأ غيابُ `opacity` عطلًا وليس بعطل — والمقصود هنا هو القاعدة
 * التي تُعرّف الطبقة لا التي تُخفيها.
 */
function parsedRule(selector: string): Record<string, string> | null {
  let out: Record<string, string> | null = null;
  AST.walkRules((r) => {
    if (r.parent?.type !== "root") return;
    if (r.selector.replace(/\s+/g, " ").trim() !== selector) return;
    out = Object.fromEntries(
      r.nodes
        .filter((n) => n.type === "decl")
        .map((n) => [(n as Declaration).prop, (n as Declaration).value]),
    );
  });
  return out;
}

/**
 * تفضيلُ الحركة مُصطنعًا — **الاستعلام يُقرأ لا يُفترض.**
 *
 * `matches` تُحسب من نصّ الاستعلام الذي يمرّره المكوّن: لو سأل يومًا عن
 * استعلامٍ آخر (أو أخطأ في كتابته) عادت `false` فيُركَّب الفيلم في حالة
 * «قلّل الحركة» — وذلك بالضبط ما يُسقط بند المخرَج أدناه. ولا يكفي ردُّ
 * `matches` ثابتًا: كان سيشهد لاستعلامٍ لا وجود له.
 */
const ORIGINAL_MM = window.matchMedia;

/**
 * مُصطنعٌ **حيّ**: يحتفظ بالمستمعين ويُبلّغهم عند التبديل.
 *
 * كان المُصطنع السابق `addEventListener: () => {}` فارغًا — فمسارُ «بدّل
 * التفضيل أثناء الجلسة» يمرّ بلا فحصٍ إطلاقًا، ولو حُذف المستمعُ من
 * المكوّن لما سقط شيء. ومستمعٌ لا يُبلَّغ حارسٌ لا يحرس.
 */
let mqListeners: (() => void)[] = [];
let mqReduced = false;
function setReducedMotion(on: boolean) {
  mqReduced = on;
  mqListeners = [];
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      // القيمة تُحسب عند القراءة لا عند الإنشاء: تبديلُها بعد التركيب
      // يُقرأ صحيحًا كما في المتصفّح.
      get matches() {
        return mqReduced && query === "(prefers-reduced-motion: reduce)";
      },
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_: string, fn: () => void) => mqListeners.push(fn),
      removeEventListener: (_: string, fn: () => void) => {
        mqListeners = mqListeners.filter((f) => f !== fn);
      },
      dispatchEvent: () => false,
    }),
  });
}

/** تبديلُ التفضيل بعد التركيب — كما يفعل النظام حين يغيّره المستخدم. */
function flipReducedMotion(on: boolean) {
  mqReduced = on;
  act(() => {
    for (const fn of [...mqListeners]) fn();
  });
}
afterEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: ORIGINAL_MM,
  });
});

/** عنصرُ الفيلم من DOM بعد تركيب المكوّن — لا من نصّ الملفّ. */
function mountFilm(): HTMLVideoElement {
  setReducedMotion(false);
  const { container } = render(<HoloVideoEngine />);
  const video = container.querySelector("video");
  expect(video, "لم يُركَّب الفيلم مع أن الحركة غير مُقلَّلة").not.toBeNull();
  return video as HTMLVideoElement;
}

describe("① الفيلم موجود — صامتًا وأبطأ من أصله (أمر المالك ٢٠٢٦/٠٩/٢٨)", () => {
  it("الأصل موجودٌ فعلًا على القرص وبحجمٍ معقول", () => {
    // `src` إلى ملفٍ غائب يعطي خلفيةً فارغة بلا خطأ بناءٍ ولا خطأ نوع:
    // العنصر يُركَّب، ويفشل التحميل صامتًا، وتبقى الطبقات الساكنة وحدها.
    // فالوجود يُقاس من نظام الملفّات لا يُفترض من سلامة المسار نصًّا.
    const src = mountFilm().getAttribute("src");
    expect(src, "الفيلم بلا مصدر").toBeTruthy();
    expect(src!.startsWith("/"), "مصدرٌ نسبيّ يكسر على المسارات العميقة").toBe(true);
    const stat = statSync(`public${src}`);
    expect(stat.isFile()).toBe(true);
    expect(stat.size, "ملفٌّ فارغ").toBeGreaterThan(100_000);
  });

  it("**الأصل نفسه بلا مسار صوت** — «حذف الصوت» حذفٌ لا كتم", () => {
    // أمرُ المالك «حذف الصوت». وكان الملفّ يحمل `mp4a`+`esds` (337 عيّنة،
    // 62,746 بايت) و`muted` وحده كان يكتمه — كتمٌ لا حذف، ورقٌ يسقط بسطرٍ
    // واحد. فنُزع المسار من الحاوية (remux بلا إعادة ترميز، والفيديو
    // منسوخٌ بتًّا بتًّا) ويُفحص هنا على **بايتات الملفّ** لا على وصفه:
    // أنواعُ الصناديق الأربعة لا تُكتب إلا حين يوجد مسارٌ سمعيّ.
    const bytes = readFileSync(`public${mountFilm().getAttribute("src")}`);
    for (const box of ["mp4a", "esds", "soun", "smhd"]) {
      expect(bytes.includes(box), `عاد مسارُ الصوت إلى الملفّ: صندوق ${box}`).toBe(false);
    }
    // والفيديو باقٍ: الفحص أعلاه يمرّ على ملفٍّ فارغ كذلك.
    expect(bytes.includes("avc1"), "لا مسار فيديو في الملفّ").toBe(true);
  });

  it("وصامتٌ عند التشغيل كذلك — سمةٌ نافذة لا نيّةٌ مكتوبة", () => {
    // حزامٌ ثانٍ بعد نزع المسار: `muted` **على العنصر المُركَّب** لا سمةً
    // في JSX قد يُلغيها سطرٌ لاحق، ولذلك تُقرأ من الخاصيّة لا من النصّ.
    // وهو كذلك شرطُ المتصفّحات لقبول التشغيل التلقائيّ أصلًا.
    const video = mountFilm();
    expect(video.muted, "الفيلم ينطق — وأمر المالك «حذف الصوت»").toBe(true);
    expect(video.hasAttribute("controls"), "أزرارُ تشغيلٍ تفتح طريقًا لرفع الكتم").toBe(false);
    // ولا كاتبَ يعيده: `muted = false` أو رفع `volume` في أيّ مسار.
    expect(CODE).not.toMatch(/muted\s*=\s*(false|\{false\})/);
    expect(CODE).not.toMatch(/\.volume\s*=/);
  });

  it("أبطأ من أصله — والسرعة تُقاس على العنصر بعد حدثها", () => {
    // `playbackRate` لا سمةَ HTML لها: تُضبط برمجيًّا عند `loadedmetadata`.
    // فحصُ الثابت وحده يشهد لرقمٍ قد لا يصل العنصر أبدًا — كما لو حُذف
    // المستمع أو أُسند إلى عنصرٍ آخر. فيُطلق الحدث وتُقرأ النتيجة.
    const video = mountFilm();
    fireEvent.loadedMetadata(video);
    expect(video.playbackRate, "الفيلم لم يُبطَّأ").toBeLessThan(1);
    expect(video.playbackRate, "بطءٌ إلى حدّ الوقوف لا تخفيضًا").toBeGreaterThan(0);
  });

  it("حلقةٌ دائمة وتشغيلٌ داخل الصفحة — لا مشغّلٌ يقتحم الشاشة", () => {
    const video = mountFilm();
    expect(video.loop, "فيلمٌ ينتهي فيترك لوحًا ساكنًا").toBe(true);
    expect(video.autoplay, "خلفيةٌ تنتظر نقرة لا تبدأ أبدًا").toBe(true);
    // `playsInline` شرطُ iOS: بدونه يُملئ الفيديو الشاشة عند التشغيل.
    expect(video.hasAttribute("playsinline")).toBe(true);
  });

  it("خارج شجرة الوصول وخارج ترتيب التنقّل", () => {
    // خلفيةٌ مزخرِفة: قارئ الشاشة لا يُعلن عنها، ولوحةُ المفاتيح لا تقف
    // عندها. و`aria-hidden` على الحاوية لا يُغني — العنصر داخلها يبقى
    // في ترتيب التنقّل لو حمل `tabindex` موجبًا يومًا.
    const video = mountFilm();
    expect(video.getAttribute("aria-hidden")).toBe("true");
    expect(video.tabIndex).toBeLessThan(0);
    // ولا عنصرَ وسائطٍ آخر: الصوت لا يدخل من بابٍ ثانٍ.
    expect(document.querySelector("audio")).toBeNull();
  });
});

describe("② المخرَج الوصوليّ — بلا زرّ (أمر المالك ٢٠٢٦/٠٨/٠٩ لم يُنسخ)", () => {
  it("«قلّل الحركة» ⇐ الفيلم لا يُركَّب أصلًا", () => {
    // WCAG 2.2.2 توجب مخرجًا للحركة الدائمة التي تبدأ تلقائيًّا. والمالك
    // منع الزرّ. فالمخرَج هو التفضيل: لا تحميل ولا فكّ ترميز ولا حركة —
    // وهو أقوى من زرٍّ لأنه يسبق أوّل إطار.
    setReducedMotion(true);
    const { container } = render(<HoloVideoEngine />);
    expect(
      container.querySelector("video"),
      "فيلمٌ يعمل لمن طلب تقليل الحركة — وبلا زرٍّ يوقفه",
    ).toBeNull();
    // والسطح الساكن يبقى كاملًا: لا خلفيةَ فارغة ثمنًا للمخرَج.
    expect(container.querySelector(".nx-hv-aurora")).not.toBeNull();
    expect(container.querySelector(".nx-hv-noise")).not.toBeNull();
  });

  it("تبديلُ التفضيل أثناء الجلسة ينفذ في الاتجاهين", () => {
    // المخرَج لا يكفي أن يُقرأ مرّةً عند التركيب: من يشغّل «قلّل الحركة»
    // في نظامه والصفحةُ مفتوحة يجب أن يتوقّف الفيلم عنده حينها — وإلّا
    // بقيت الحركة تعمل بلا مخرجٍ حتى يُعيد التحميل. والعكسُ كذلك.
    setReducedMotion(true);
    const { container } = render(<HoloVideoEngine />);
    expect(container.querySelector("video"), "فيلمٌ رغم التفضيل").toBeNull();

    flipReducedMotion(false);
    expect(container.querySelector("video"), "رفعُ التفضيل لم يُركّب الفيلم").not.toBeNull();

    flipReducedMotion(true);
    expect(
      container.querySelector("video"),
      "طلبُ تقليل الحركة أثناء الجلسة لم يفكّ الفيلم",
    ).toBeNull();
  });

  it("لا زر في الترميز ولا حالة تحفظ اختياره", () => {
    expect(CODE).not.toContain("<button");
    expect(CODE).not.toContain("aria-pressed");
    expect(CODE).not.toContain("localStorage");
    expect(CODE).not.toContain("nx-holo-bg");
  });

  it("لا قواعد `.nx-hv-toggle` في طبقة الأنماط", () => {
    // ست قواعد كانت: الرقاقة، التحويم، الضغط، حلقة التركيز، قلب الركن في
    // الإنجليزية، وأرضية اللمس ٤٤×٤٤. بقاؤها يُبقي ركنًا محجوزًا لعنصرٍ
    // ميت، ويصطدم يومًا بمُطلق سَدِيد في الركن نفسه.
    expect(SHEET).not.toContain("nx-hv-toggle");
  });

  it("السكربت المانع لم يعد يقرأ المفتاح اليتيم", () => {
    // الزرّ كان الكاتب الوحيد لـ`nx-holo-bg`. بقاء القراءة يعني أن من ضغط
    // الزرّ يومًا تبقى نبضات الأيقونات وانتقالات المسار مُطفأة عنده إلى
    // الأبد بلا واجهة تفكّها — حالة عالقة لا تفضيلًا.
    expect(ROOT_CODE).not.toContain("nx-holo-bg");
    expect(ROOT_CODE).not.toContain("data-nx-motion");
    // ولم يسقط معه سكربت الثيم: هو والراية كانا في السطر نفسه.
    expect(ROOT_CODE).toContain("localStorage.getItem('theme')");
    expect(ROOT_CODE).toMatch(/classList\.toggle\('dark',d\)/);
  });

  it("الحركة الأخرى في النظام تحتفظ بمخرجها الحيّ", () => {
    // نبضات الأيقونات مخرجُها تفضيل النظام وحده بعد ذهاب الزرّ.
    const flag = SHEET.indexOf('html[data-nx-motion="off"] .nx-pulse-halo');
    expect(flag, "راية سكون الحركة لم تعد تُسكِت النبضات").toBeGreaterThan(-1);
    const rm = SHEET.indexOf("@media (prefers-reduced-motion: reduce)", flag);
    expect(rm, "لا كتلة تفضيل نظام بعد الراية").toBeGreaterThan(-1);
    const body = SHEET.slice(rm, rm + 400);
    expect(body, "النبضات بلا مخرج بعد ذهاب الزرّ").toMatch(/\.nx-pulse-(halo|spark)/);
    expect(body).toMatch(/animation:\s*none/);
  });

  it("طبقات الخلفية نفسها بلا حركة — فلا حركةَ خارج مظلّة المخرَج", () => {
    // البند كان يقرأ «لا حركة في الصفحة إطلاقًا» فسقط ذلك المعنى بعودة
    // الفيلم. ومعناه اليوم أدقُّ وأبقى: الحركة **محصورةٌ في العنصر الذي
    // يحميه التفضيل**. فـ`animation` على طبقةٍ من طبقات الأنماط تعمل
    // للجميع بلا استثناء — حركةٌ دائمة بلا مخرجٍ البتّة.
    expect(HV_RULES.length, "لا قواعد `.nx-hv` أصلًا").toBeGreaterThan(0);
    for (const rule of HV_RULES) {
      expect(rule, "حركة على طبقة الخلفية بلا مخرج").not.toMatch(
        /\b(animation|transition)(-[\w-]+)?\s*:/,
      );
    }
  });
});

describe("③ سطحٌ يحفظ قراءة الحبر — في الوضعين معًا (المواد ٣٢–٣٤)", () => {
  const nxHv = SHEET.slice(
    SHEET.indexOf(".nx-hv {"),
    SHEET.indexOf("}", SHEET.indexOf(".nx-hv {")) + 1,
  );

  it("`.nx-hv` تُرسم من طبقة الرموز لا من ألوان مكتوبة", () => {
    // لونٌ مكتوب هنا هو الخطأ بعينه: `#041e2c` يعطي «غامقة» في الداكن
    // ويطلي الوضع الفاتح بلوحٍ أسود — والوضع الثاني سطح صحّة لا قشرة.
    expect(nxHv, "قاعدة `.nx-hv` غير موجودة").toContain("background");
    expect(nxHv).toContain("var(--surface)");
    expect(nxHv).toContain("var(--surface-2)");
    expect(nxHv, "لون مكتوب خارج طبقة الرموز").not.toMatch(
      /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/,
    );
  });

  it("رمز السطح ينقلب مع الوضع — فالداكن غامق والفاتح لا ينكسر", () => {
    // الفحص على الرمز نفسه لا على وصفٍ له: تعريفان مختلفان، أحدهما تحت
    // `.light`، والقيمة الأساس أغمق من قيمة الفاتح. لو وُحِّدت القيمتان
    // يومًا صار للنظام خلفيةٌ واحدة في الوضعين وسقط هذا البند.
    const luma = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    // كل تعريف حرفيّ للرمز مع محدِّد كتلته — يُقرأ من الملف لا يُفترض.
    const decls: { selector: string; hex: string }[] = [];
    for (const m of SHEET.matchAll(/--surface:\s*(#[0-9a-fA-F]{6})/g)) {
      const before = SHEET.slice(0, m.index);
      const open = before.lastIndexOf("{");
      const prev = Math.max(before.lastIndexOf("}"), before.lastIndexOf(";", open));
      decls.push({ selector: before.slice(prev + 1, open).trim(), hex: m[1] });
    }
    expect(decls.length, "لا تعريف حرفيّ لرمز السطح").toBeGreaterThanOrEqual(2);
    const dark = decls.filter((d) => luma(d.hex) < 0.2);
    const light = decls.filter((d) => luma(d.hex) > 0.7);
    expect(dark.length, "لا قيمة داكنة لرمز السطح").toBeGreaterThan(0);
    expect(light.length, "لا قيمة فاتحة لرمز السطح").toBeGreaterThan(0);
    // والقيمة الفاتحة تحت محدِّد الوضع الفاتح لا معلَّقة في الفراغ.
    expect(
      light.some((d) => d.selector.includes(".light")),
      "الفاتح بلا محدِّد وضع",
    ).toBe(true);
  });

  it("**قواعد الخلفية تصل المحلِّل** — لا محدِّدَ فاسدًا ولا قاعدةً مبتلَعة", () => {
    // **البند الذي كان غائبًا، وغيابُه أعمى كلَّ ما عداه.** قاعدةُ
    // `.nx-hv-film` كانت تُحمل تحت محدِّدٍ هو نصُّ تعليقٍ أُغلق قبل أوانه
    // (‏`*/` داخل صيغةٍ مكتوبة بين شرطتَي تحديد)، فلم تصل متصفّحًا قطّ —
    // والفيلم يُعرض بوضوحٍ كامل بلا `object-fit` ولا `position`، وكلُّ
    // أرقام الأرضية أعلاه كانت تصف قاعدةً لا وجود لها في الناتج.
    //
    // فيُفحص شيئان: أنّ كلَّ محدِّدٍ يمسّ الطبقة **محدِّدٌ سليم** لا نصُّ
    // نثرٍ، وأنّ قواعد الطبقة الأساسية تحمل تصريحاتها فعلًا.
    const bad: string[] = [];
    AST.walkRules((r) => {
      const sel = r.selector.replace(/\s+/g, " ").trim();
      if (!sel.includes("nx-hv")) return;
      // محدِّدٌ سليم يبدأ بنقطةٍ أو مُعرِّفٍ أو نقطتين، ولا يحمل نصًّا عربيًّا
      // ولا علامةً اقتباسٍ خلفية — وتلك بصمةُ تعليقٍ تسرّب.
      if (!/^[.#:[a-zA-Z]/.test(sel) || /[`*؀-ۿ]/.test(sel)) bad.push(sel.slice(0, 70));
    });
    expect(bad, "محدِّدٌ فاسد يحمل قواعد الخلفية — تعليقٌ أُغلق قبل أوانه").toEqual([]);

    // والقواعد الأساسية تحمل تصريحاتها: الغياب هنا هو العطل بعينه.
    for (const [sel, prop] of [
      [".nx-hv-film", "opacity"],
      [".nx-hv-scrim", "background"],
      [".nx-hv", "background"],
      [".nx-hv-noise", "opacity"],
    ] as const) {
      const decls = parsedRule(sel);
      expect(decls, `${sel} لا يراها المحلِّل — فلا يراها المتصفّح`).not.toBeNull();
      expect(decls![prop], `${sel} بلا ${prop} في الناتج المحلَّل`).toBeTruthy();
    }
    // والفيلم خاصّةً: الخصائص التي تجعله طبقةَ خلفيةٍ لا عنصرًا في السياق.
    const film = parsedRule(".nx-hv-film")!;
    expect(film["position"]).toBe("absolute");
    expect(film["object-fit"]).toBe("cover");
    expect(film["opacity"]).toBe("var(--hv-film-opacity)");
  });

  it("الفيلم مقصوصٌ إلى الإطار، ووضوحُه من الرمز لا من القاعدة", () => {
    // `object-fit` غير `cover` يشوّه النسبة أو يترك أشرطةً على الشاشات
    // العريضة — والملفّ رأسيّ 576×1024 فالفرق ليس نظريًّا.
    const body = ruleBody(".nx-hv-film {");
    expect(body, "لا قاعدة `.nx-hv-film` أصلًا — الصنف مكتوبٌ بلا تعريف").toContain(
      "object-fit: cover",
    );
    // **وقيمةٌ حرفيّة هنا تكسر الأمر:** كان `.light .nx-hv-film` قاعدةً
    // تقرأ صنف `html` وحده، فلا تملك صفحةٌ تفرض سطحًا داكنًا أن تُخالفها.
    // فصار الوضوح رمزًا يُورَّث، والقاعدة تقرؤه ولا تكتبه.
    expect(body, "وضوحٌ حرفيّ في القاعدة — الصفحة لا تقدر أن تُثبّته").toContain(
      "opacity: var(--hv-film-opacity)",
    );
    expect(SHEET, "قاعدةُ وضعٍ عادت تكتب الوضوح من فوق الرمز").not.toContain(".light .nx-hv-film");
  });

  it("**الوضعان عند ٨٠٪ — أمرا المالك ٢٠٢٦/٠٩/٢٨ و٢٠٢٦/٠٩/٢٩**", () => {
    // **البند انقلب مرّتين، وكلتاهما بأمرٍ صريح.** كان يشترط أن يكون
    // الفاتح **أخفت** من الداكن (٠٫١٦ مقابل ٠٫٣٤). ثم أمر المالك بالفاتح
    // ٨٠٪ فصار يشترط أن يكون **أوضح**. ثم أمر بالداكن ٨٠٪ فاستوَيا.
    //
    // فما يحرسه اليوم رقمان صريحان لا اتجاهٌ بينهما — والاتجاه سقط لأنه
    // كان استنتاجًا من حالةٍ عارضة لا قاعدةً. ولا يُترك البند بلا شرطٍ:
    // انجرافُ أيٍّ من الرقمين يُسقطه فيُعاد القرار إلى المالك.
    expect(modeOpacity(".light"), "الفاتح لم يعد ٨٠٪ كما أمر المالك").toBe(0.8);
    expect(modeOpacity(":root"), "الداكن لم يعد ٨٠٪ كما أمر المالك").toBe(0.8);
  });

  it("الصفحتان الدائمتا الدكنة تُثبّتان الوضوح والغطاء مع السطح", () => {
    // **نشأ البند لعطلٍ ثم تغيّر معناه بأمرٍ لاحق — ويُقال ذلك صراحةً.**
    // نشأ حين كان الفاتح ٨٠٪ والداكن ٠٫٣٤: صنفُ `.light` على `html` كان
    // سيرفع الفيلم على هاتين الصفحتين الداكنتين إلى ٨٠٪ خلافًا لطبيعتهما.
    // ثم صار الداكن نفسه ٨٠٪ بأمر المالك ٢٠٢٦/٠٩/٢٩، فتساوت القيمتان
    // وصار ٢٫٤٩:١ **المقيسَ المُقرَّ** لا عطلًا (انظر بند الأرضية).
    //
    // والتثبيتُ يبقى لأن الصفحتين **لا وضعَ لهما غير الداكن**: فإن افترق
    // الوضعان غدًا وجب أن تتبعا الداكن لا ما يصادف أن يكون على `html` —
    // ونزعُ التثبيت حينها لا يمسكه tsc ولا البناء ولا عينٌ تقرأ الـdiff.
    for (const page of BARE_PAGES) {
      const style = styleObjectPinning(page);
      expect(style, `${page}: السطح مثبَّتٌ والوضوح متروكٌ للوضع — ٨٠٪ فوق سطحٍ داكن`).toMatch(
        /"--hv-film-opacity"[^:]*:\s*"([\d.]+)"/,
      );
      const pinned = Number(style.match(/"--hv-film-opacity"[^:]*:\s*"([\d.]+)"/)![1]);
      expect(pinned, `${page}: الوضوح المثبَّت أعلى من قيمة الداكن`).toBeLessThanOrEqual(
        modeOpacity(":root"),
      );
      // والغطاء معهما: الأرضية حاصلُ ضربهما، فتثبيتُ أحدهما نصفُ تثبيت.
      expect(style, `${page}: الغطاء متروكٌ للوضع بينما السطح مثبَّت`).toMatch(
        /"--hv-scrim-mix"[^:]*:\s*"\d+%"/,
      );
    }
  });

  it("**مدخلات القرار مثبَّتة** — والأرقام يقيسها المحرّك لا هذا الملفّ", () => {
    // **كان هنا حسابٌ للتباين يكذب.** قرأ رموز الحبر من `styles.css` نصًّا،
    // فأخذ `.light { --ink-3: #3f3f46 }` وحسب عليه ٤٫٩٠:١ وصرّح به — وتلك
    // **تصريحاتٌ ميتة** تغلبها كتلةٌ لاحقة `:root, .light, .dark` بالنوعية
    // نفسها. النافذ فعلًا `#4b5563`، والتباين الحقيقيّ ٣٫٥٤:١، ونُشر كذلك.
    //
    // والتعاقب لا يُحسب نصًّا (نوعيةٌ ثم ترتيبٌ ثم طبقاتٌ ثم `var()`). فانتقل
    // الحساب كلُّه إلى `scripts/check-background-contrast.mjs`: يُحلّ التعاقب
    // في Chromium على **الناتج المبنيّ**، ويقيس الحبر وقناة السلامة في
    // الوضعين، ويقارن **من جهةٍ واحدة** بعتبة AA أو بما أقرّه المالك بتاريخه.
    //
    // وما يبقى هنا ما يقدر هذا الملفّ أن يشهد له صادقًا: **مدخلاتُ القرار**
    // مثبَّتةً بقيمها، فانجرافُ أيٍّ منها يُسقط البند قبل أن يصل المحرّك.
    expect(modeOpacity(":root"), "وضوح الداكن ليس ٨٠٪ كما أمر المالك").toBe(0.8);
    expect(modeOpacity(".light"), "وضوح الفاتح ليس ٨٠٪ كما أمر المالك").toBe(0.8);
    // «عاريةً بلا رفع الغطاء» — اختيار المالك الصريح ٢٠٢٦/٠٩/٢٩.
    expect(modeScrim(":root"), "غطاء الداكن ليس ٤٠٪ كما اختار المالك").toBe(0.4);
    expect(modeScrim(".light"), "غطاء الفاتح تغيّر عن ٦٢٪").toBe(0.62);
    expect(filmOpacity(), "الصفحتان الداكنتان لا تتبعان وضوح الداكن").toBe(modeOpacity(":root"));
    expect(scrimRatio(), "الصفحتان الداكنتان لا تتبعان غطاء الداكن").toBe(modeScrim(":root"));

    // والمحرّك نفسه جزءٌ من البوابة لا ملفٌّ جانبيّ: نزعُه يُسقط البند.
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["check:contrast"]).toBe("node scripts/check-background-contrast.mjs");
    expect(pkg.scripts.check, "فحص المحرّك خرج من `npm run check`").toContain(
      "npm run check:contrast",
    );
    expect(readFileSync(".github/workflows/ci.yml", "utf8"), "فحص المحرّك خرج من CI").toContain(
      "npm run check:contrast",
    );

    // والحساب في المحرّك محكمٌ بشرط أن يكون الغطاء مُركَّبًا فعلًا فوق الفيلم.
    setReducedMotion(false);
    const { container } = render(<HoloVideoEngine />);
    const kids = [...container.querySelector(".nx-hv")!.children];
    const iFilm = kids.findIndex((k) => k.classList.contains("nx-hv-film"));
    const iScrim = kids.findIndex((k) => k.classList.contains("nx-hv-scrim"));
    expect(iScrim, "لا غطاء في الشجرة").toBeGreaterThan(-1);
    expect(iFilm, "الغطاء تحت الفيلم فلا يغطّي شيئًا").toBeLessThan(iScrim);
  });

  it("الفيلم تحت طبقات العمق في ترتيب المصدر — لا فوقها", () => {
    // فحصٌ نصّيّ بإقرار: ترتيبُ الرسم بلا `z-index` هو ترتيبُ المصدر،
    // وjsdom لا يرسم فلا يُقرأ منه.
    //
    // والمعنى أنّ التعتيم يقع **فوق** الفيلم فيُطوّع أطرافه — **لا** أنه
    // يحفظ قراءة الحبر: تدرّجُه `transparent 38%`، أي شفّافٌ تمامًا حيث
    // يقع المتن. وحفظُ القراءة عملُ `.nx-hv-scrim` وحده، وبندُه أعلاه.
    const film = CODE.indexOf('className="nx-hv-film"');
    const vignette = CODE.indexOf('className="nx-hv-vignette"');
    expect(film, "لا عنصر فيلم").toBeGreaterThan(-1);
    expect(vignette, "لا طبقة تعتيم").toBeGreaterThan(-1);
    expect(film, "الفيلم فوق تعتيم الأطراف").toBeLessThan(vignette);
    // ولا `z-index` يقلب الترتيب من طبقة الأنماط من وراء ذلك.
    const rule = SHEET.slice(SHEET.indexOf(".nx-hv-film {"));
    expect(rule.slice(0, rule.indexOf("\n}"))).not.toMatch(/z-index/);
  });

  it("النسيج خافت يكسر التسطيح ولا يُشوّش الحبر", () => {
    const noise = SHEET.slice(SHEET.indexOf(".nx-hv-noise {"));
    const body = noise.slice(0, noise.indexOf("\n}"));
    const m = body.match(/opacity:\s*([\d.]+)/);
    expect(m, "`.nx-hv-noise` بلا وضوح معرَّف").not.toBeNull();
    expect(Number(m![1])).toBeLessThanOrEqual(0.08);
  });

  it("التفضيلان الوصوليان يُسقطان الفيلم معهما", () => {
    // «قلّل الشفافية» و«الألوان القسرية»: صورةٌ متحرّكة خافتة خلف الحبر
    // أشدُّ ما يُتعب القراءة في هذه الطبقة، فسقوطُها معهما لازم.
    for (const q of [
      "@media (prefers-reduced-transparency: reduce)",
      "@media (forced-colors: active)",
    ]) {
      const at = SHEET.lastIndexOf(q);
      expect(at, `لا كتلة ${q}`).toBeGreaterThan(-1);
      const block = SHEET.slice(at, SHEET.indexOf("\n}\n", at));
      expect(block, `الفيلم باقٍ في ${q}`).toMatch(/^\s*\.nx-hv-film\s*[,{]?\s*$/m);
      expect(block).toMatch(/display:\s*none/);
    }
    // والنسيج يسقط مع «قلّل الشفافية» في كتلته الأولى — الموضع لا النصّ.
    const noiseRule = SHEET.indexOf(".nx-hv-noise {", SHEET.indexOf(".nx-hv-noise {") + 1);
    expect(noiseRule, "لا قاعدة إخفاء ثانية للنسيج").toBeGreaterThan(-1);
    const trans = SHEET.lastIndexOf("@media (prefers-reduced-transparency: reduce)", noiseRule);
    expect(trans, "قاعدة إخفاء النسيج خارج كتلة «قلّل الشفافية»").toBeGreaterThan(-1);
    const after = SHEET.indexOf("@media (forced-colors: active)", trans);
    expect(noiseRule).toBeLessThan(after);
    expect(SHEET.slice(noiseRule, after)).toMatch(/display:\s*none/);
    const forced = SHEET.slice(after, SHEET.indexOf("\n}\n", after));
    expect(forced, "`.nx-hv` لا تُسقَط في الألوان القسرية").toMatch(/^\s*\.nx-hv,$/m);
  });

  it("لا عيّنة لون حية — ولا انهيار في توهّجات البطاقات بغيابها", () => {
    // العيّنة كانت تقرأ لوحة 8×8 من الفيديو كل ٣٥٠م.ث وتكتب `--live-rgb`.
    // وعودةُ الفيلم لم تُعدها: لوحةٌ تُقرأ كل ٣٥٠م.ث عملٌ دوريّ دائم.
    expect(CODE).not.toMatch(/getImageData|createElement\("canvas"\)/);
    expect(CODE).not.toContain("--live-rgb");
    // فالمستهلكون الثلاثة يعيشون على قيمة السقوط وحدها — وهي مرساة
    // السماوي نفسها. نزعُها من أيٍّ منهم يترك `--live` بلا قيمة فينهار
    // التوهّج إلى لا شيء، وهو ما لا يمسكه tsc ولا البناء.
    for (const consumer of [
      "src/routes/-nx-agents-page.tsx",
      "src/routes/-rag-search-page.tsx",
      "src/styles.css",
    ]) {
      expect(
        readFileSync(consumer, "utf8"),
        `${consumer} فقد قيمة السقوط الساكنة لـ--live-rgb`,
      ).toMatch(/var\(--live-rgb,\s*34 211 238\)/);
    }
  });

  it("الطبقة مُركَّبة في الصفحات الثلاث التي تستهلكها", () => {
    // الاسم عقدٌ حيّ عبر ثلاث صفحات: إعادة تسميته أو إسقاطه من إحداها
    // تترك تلك الصفحة بلا خلفية — ولا يمسكه tsc إن بقي الاستيراد.
    for (const page of [
      "src/routes/-blueprint-page.tsx",
      "src/routes/-nx-agents-page.tsx",
      "src/routes/-rag-search-page.tsx",
    ]) {
      expect(readFileSync(page, "utf8"), `${page} بلا خلفية`).toContain("<HoloVideoEngine />");
    }
  });
});

describe("④ لا تسريب — الطبقة لا تحجب النقر ولا تُخرج سكرولًا", () => {
  it("الحاوية خارج مسار المؤشّر ومقصوصةٌ إلى الإطار", () => {
    // `fixed inset-0` فوق الصفحة كلّها: لولا `pointer-events-none` لابتلعت
    // كل نقرة في النظام. والقصّ يمنع فيلمًا `cover` من دفع سكرولٍ أفقيّ.
    setReducedMotion(false);
    const { container } = render(<HoloVideoEngine />);
    const root = container.querySelector(".nx-hv");
    expect(root, "لا حاوية خلفية").not.toBeNull();
    expect(root!.className).toContain("pointer-events-none");
    expect(root!.getAttribute("aria-hidden")).toBe("true");
    expect(nxHvRule(), "`.nx-hv` بلا قصّ — فيلمٌ `cover` يدفع سكرولًا أفقيًّا").toMatch(
      /overflow:\s*hidden/,
    );
    expect(screen.queryByRole("button"), "زرٌّ عاد إلى الخلفية").toBeNull();
  });
});

function nxHvRule() {
  const at = SHEET.indexOf(".nx-hv {");
  return SHEET.slice(at, SHEET.indexOf("}", at) + 1);
}

/* ── قراءةُ القيم الحيّة، ثم حسابُ التباين منها ──────────────────────────
   كلُّ رقمٍ أدناه يُقرأ من مصدره لا يُكتب هنا: نقلُه يجعل الحارس يشهد
   لقيمةٍ قد لا تكون في الملفّ. */

function ruleBody(selector: string): string {
  const at = SHEET.indexOf(selector);
  expect(at, `لا قاعدة ${selector}`).toBeGreaterThan(-1);
  return SHEET.slice(at, SHEET.indexOf("\n}", at));
}

/**
 * كتلةُ رموزِ وضعٍ بعينها — `:root` للداكن و`.light` للفاتح.
 *
 * **تُنتقى بمحتواها لا بترتيبها.** للملفّ خمسُ كتل `:root` وعشراتُ كتل
 * `.light`، فـ«الأولى» تصيب كتلةً أخرى تمامًا — وهو ما وقع أوّل مرّة.
 * فالمنتقاة هي التي تُعلن `--hv-film-opacity`، **ويُشترط أن تُعلن
 * `--surface` معها**: الرمزان يُقاس أحدهما على الآخر، فافتراقُهما إلى
 * كتلتين يجعل الحساب يخلط سطحَ وضعٍ بوضوحِ وضعٍ آخر بلا أن يظهر.
 */
function modeBlock(selector: string): string {
  const found = [...SHEET.matchAll(new RegExp(`\\n${selector.replace(".", "\\.")} \\{`, "g"))]
    .map((m) => SHEET.slice(m.index, SHEET.indexOf("\n}", m.index)))
    .filter((b) => b.includes("--hv-film-opacity:"));
  expect(found.length, `لا كتلة رموزٍ واحدة للمحدِّد ${selector} تُعلن وضوح الفيلم`).toBe(1);
  expect(found[0], `${selector}: وضوح الفيلم في كتلةٍ غير كتلة السطح`).toMatch(/--surface:/);
  return found[0];
}

function modeOpacity(selector: string): number {
  const m = modeBlock(selector).match(/--hv-film-opacity:\s*([\d.]+)/);
  expect(m, `${selector} بلا وضوحٍ لفيلم الخلفية`).not.toBeNull();
  return Number(m![1]);
}

/**
 * كائنُ الأسلوب الذي تفرض فيه الصفحةُ السطحَ — **العقدة الواحدة.**
 *
 * السطح والوضوح والغطاء ثلاثةٌ تُقاس مضروبةً بعضها في بعض، ففرضُها في
 * عقدتين مختلفتين يجعل الوراثة تخلط قيمَ وضعَين في حسابٍ واحد. والبحثُ
 * في الملفّ كلّه كان يقبل ذلك صامتًا.
 */
function styleObjectPinning(page: string): string {
  const src = readFileSync(page, "utf8");
  const at = src.indexOf('"--surface"');
  expect(at, `${page} لم يعد يفرض سطحًا`).toBeGreaterThan(-1);
  return src.slice(src.lastIndexOf("{", at), src.indexOf("}", at) + 1);
}

function modeScrim(selector: string): number {
  const m = modeBlock(selector).match(/--hv-scrim-mix:\s*(\d+)%/);
  expect(m, `${selector} بلا نسبةِ غطاء`).not.toBeNull();
  return Number(m![1]) / 100;
}

/**
 * الوضوحُ النافذُ على الصفحتين العاريتين — **المثبَّت فيهما، لا الموروث.**
 *
 * الصفحتان تُثبّتانه مع السطح، فقراءةُ رمز الوضع هنا كانت ستقيس قيمةً لا
 * تصل إليهما — وتُخفي بالضبط العطل الذي وُضع هذا كلُّه لأجله.
 */
function filmOpacity(): number {
  const vals = BARE_PAGES.map((p) => {
    const m = readFileSync(p, "utf8").match(/"--hv-film-opacity"[^:]*:\s*"([\d.]+)"/);
    expect(m, `${p} لم يعد يُثبّت وضوح الفيلم`).not.toBeNull();
    return Number(m![1]);
  });
  expect(new Set(vals).size, "الصفحتان تُثبّتان وضوحين مختلفين — يلزم حسابان").toBe(1);
  return vals[0];
}

/**
 * نسبةُ الغطاء النافذة على الصفحتين الدائمتي الدكنة — **المثبَّتة فيهما.**
 *
 * صارت رمزًا كالوضوح للسبب نفسه: الأرضية حاصلُ ضربهما، فتثبيتُ أحدهما
 * وترْكُ الآخر لرمز الوضع يضع نصف المعادلة تحت وضعٍ ونصفها تحت آخر.
 */
function scrimRatio(): number {
  expect(ruleBody(".nx-hv-scrim {"), "نسبةٌ حرفيّة في قاعدة الغطاء").toContain(
    "var(--surface) var(--hv-scrim-mix)",
  );
  const vals = BARE_PAGES.map((p) => {
    // **في كائن الأسلوب نفسه الذي يفرض السطح** — لا في أيّ موضعٍ من الملفّ.
    // الثلاثة (السطح والوضوح والغطاء) عقدةٌ واحدة، وافتراقُها إلى عقدتين
    // يجعل الوراثة تخلط قيمَ وضعَين في حسابٍ واحد.
    const m = styleObjectPinning(p).match(/"--hv-scrim-mix"[^:]*:\s*"(\d+)%"/);
    expect(m, `${p} لا يُثبّت نسبة الغطاء مع السطح في العقدة نفسها`).not.toBeNull();
    return Number(m![1]) / 100;
  });
  expect(new Set(vals).size, "الصفحتان تُثبّتان نسبتين مختلفتين — يلزم حسابان").toBe(1);
  return vals[0];
}

/**
 * السطحُ الذي يقع الفيلم فوقه فعلًا في الصفحتين المكشوفتين.
 *
 * الصفحتان تفرضانه مضمّنًا (‏`--surface: #04070d`) لأنهما دائمتا الدكنة،
 * فقيمةُ `:root` ليست ما يُحسب عليه. ويُقرأ من الصفحة نفسها: تغييرُه
 * هناك يُعيد الحساب هنا.
 */
const BARE_PAGES = ["src/routes/-nx-agents-page.tsx", "src/routes/-rag-search-page.tsx"] as const;

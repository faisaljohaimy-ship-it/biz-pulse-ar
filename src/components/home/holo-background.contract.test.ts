/**
 * عقد خلفية النظام — **ساكنة، داكنة، بلا زر** (قرار المالك ٢٠٢٦/٠٨/٠٩).
 *
 * **لماذا انقلب هذا الملف رأسًا على عقب.** كان يحرس عكس ما يحرسه اليوم:
 * فيلمًا صامتًا بحلقة بلا لُحمة، ٩٦٠ إطارًا بسرعة ٠٫٣٠، وحارسًا دوريًّا
 * يعيد تشغيله كلما رُفض `play()` صامتًا، وزرَّ إيقافٍ دائم الظهور. أمر
 * المالك: «الخلفية تكون ثابتة وغامقة فقط، وشيل زر إيقاف الخلفية». فسقط
 * الفيلم، وسقط معه كل بند وُجد لأجله — واللُّحمة وعدد الإطارات ومسار
 * الصوت وأبعاد الترميز صارت أسئلةً عن ملفٍ لا يُحمَّل.
 *
 * **الملف لا يُحذف، ويحرس الواقع الجديد:** ما سقط بصمت لا يُلاحَظ. الفيلم
 * يعود بسطرٍ واحد، والزرُّ يعود بسطرين، وكلاهما يمرّ من tsc ومن البناء بلا
 * صوت — فهنا موضع الإمساك.
 *
 * وكل بند أدناه يسقط لو انعكس الكود: لا فحص يمرّ لأن شيئًا لم يوجد.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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

describe("① لا فيلم — ولا شيءَ مما وُجد لخدمته", () => {
  it("لا عنصر فيديو ولا إشارة إلى ملف الخلفية", () => {
    // `<video>` يعود بسطر، ويبدأ التحميل وفكّ الترميز من مُحلِّل HTML قبل
    // أي JS — أي أن عودته لا يمسكها شيء بعد سقوط هذا البند.
    expect(CODE).not.toContain("<video");
    expect(CODE).not.toMatch(/\.mp4/);
    expect(CODE).not.toMatch(/videoRef|HTMLVideoElement/);
  });

  it("لا منطق تشغيل ولا مؤقّتات ولا مستمعات وسائط", () => {
    // الحارس الدوري كان يُشغّل `resume` كل ثانيتين ويستمع لستة أحداث.
    // بقاء أيٍّ منها بعد ذهاب الفيلم عملٌ دوريّ على صفحةٍ ساكنة.
    for (const gone of [
      "setInterval",
      "playbackRate",
      ".play()",
      "visibilitychange",
      "addEventListener",
      "document.hidden",
    ]) {
      expect(CODE, `بقي ${gone} بعد سكون الخلفية`).not.toContain(gone);
    }
  });

  it("لا عيّنة لون حية — ولا انهيار في توهّجات البطاقات بذهابها", () => {
    // العيّنة كانت تقرأ لوحة 8×8 من الفيديو كل ٣٥٠م.ث وتكتب `--live-rgb`.
    expect(CODE).not.toMatch(/getImageData|createElement\("canvas"\)/);
    expect(CODE).not.toContain("--live-rgb");
    // ولأن الكاتب ذهب، فالمستهلكون الثلاثة يعيشون على قيمة السقوط وحدها —
    // وهي مرساة السماوي نفسها التي كانت العيّنة تمزج نحوها. نزعُ السقوط من
    // أيٍّ منهم يجعل `--live` بلا قيمة فينهار التوهّج إلى لا شيء، وهو ما
    // لا يمسكه tsc ولا البناء.
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

  it("لا قاعدة `.nx-hv-video` باقية في طبقة الأنماط", () => {
    // قاعدةٌ لعنصرٍ لا يُركَّب تُغري بإعادته، وتُبقي `object-fit` و`opacity`
    // موصوفَين لسطحٍ غير موجود.
    expect(SHEET).not.toContain(".nx-hv-video");
  });

  it("طبقات الخلفية بلا حركة — وهذا ما يُسقط موجب WCAG 2.2.2", () => {
    // البند يوجب مخرجًا للحركة **الدائمة**. لا حركة ⇐ لا موجِب ⇐ حذف الزر
    // استيفاءٌ لا تنازل. فإن عادت حركةٌ إلى هذه الطبقات عاد الموجِب معها،
    // وهذا الفحص هو ما يُلزم بإعادة المخرج قبل إعادة الحركة.
    expect(HV_RULES.length, "لا قواعد `.nx-hv` أصلًا").toBeGreaterThan(0);
    for (const rule of HV_RULES) {
      expect(rule, "حركة على طبقة الخلفية بلا مخرج").not.toMatch(
        /\b(animation|transition)(-[\w-]+)?\s*:/,
      );
    }
  });
});

describe("② لا زر إيقاف — ولا مفتاحًا يتيمًا في التخزين", () => {
  it("لا زر في الترميز ولا حالة تحفظ اختياره", () => {
    expect(CODE).not.toContain("<button");
    expect(CODE).not.toContain("aria-pressed");
    expect(CODE).not.toContain("localStorage");
    expect(CODE).not.toContain("nx-holo-bg");
    // ولا حالة أصلًا: المكوّن صار ناتجًا ثابتًا حرفيًّا.
    expect(CODE).not.toMatch(/useState|useEffect/);
  });

  it("لا قواعد `.nx-hv-toggle` في طبقة الأنماط", () => {
    // ست قواعد كانت: الرقاقة، التحويم، الضغط، حلقة التركيز، قلب الركن في
    // الإنجليزية، وأرضية اللمس ٤٤×٤٤. بقاؤها يُبقي ركنًا محجوزًا لعنصرٍ
    // ميت، ويصطدم يومًا بمُطلق فِن في الركن نفسه.
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

  it("الحركة الباقية في النظام تحتفظ بمخرجها الحيّ", () => {
    // نبضات الأيقونات لم تكن تعتمد على زر الخلفية وحده. ولأن كاتب الراية
    // ذهب، فمخرجها الوحيد اليوم هو تفضيل النظام — وسقوطه يترك حركةً دائمة
    // بلا مخرج البتّة، وهو ما يجعل هذا البند غير فارغ المعنى.
    // والسمة تبقى سطحَ تحكّم عاملًا لمن يكتبها برمجيًّا.
    const flag = SHEET.indexOf('html[data-nx-motion="off"] .nx-pulse-halo');
    expect(flag, "راية سكون الحركة لم تعد تُسكِت النبضات").toBeGreaterThan(-1);
    // وتفضيل النظام — المخرج الوحيد الباقي — يُسكِتها في الكتلة التالية له.
    const rm = SHEET.indexOf("@media (prefers-reduced-motion: reduce)", flag);
    expect(rm, "لا كتلة تفضيل نظام بعد الراية").toBeGreaterThan(-1);
    const body = SHEET.slice(rm, rm + 400);
    expect(body, "النبضات بلا مخرج بعد ذهاب الزرّ").toMatch(/\.nx-pulse-(halo|spark)/);
    expect(body).toMatch(/animation:\s*none/);
  });
});

describe("③ سطح داكن ثابت — معرَّف في الوضعين معًا (المواد ٣٢–٣٤)", () => {
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

  it("النسيج خافت يكسر التسطيح ولا يُشوّش الحبر", () => {
    // الطبقة الوحيدة فوق السطح. وضوحٌ مرتفع يجعلها ضجيجًا مقروءًا خلف
    // النصّ بدل نسيجٍ محسوس.
    const noise = SHEET.slice(SHEET.indexOf(".nx-hv-noise {"));
    const body = noise.slice(0, noise.indexOf("\n}"));
    const m = body.match(/opacity:\s*([\d.]+)/);
    expect(m, "`.nx-hv-noise` بلا وضوح معرَّف").not.toBeNull();
    expect(Number(m![1])).toBeLessThanOrEqual(0.08);
  });

  it("التفضيلان الوصوليان ما زالا مُحترمَين", () => {
    // «قلّل الشفافية» يُسقط النسيج، و«الألوان القسرية» تُسقط الطبقة كلها.
    // الموضع لا النصّ: القاعدة تقع داخل كتلة التفضيل لا خارجها.
    const noiseRule = SHEET.indexOf(".nx-hv-noise {", SHEET.indexOf(".nx-hv-noise {") + 1);
    expect(noiseRule, "لا قاعدة إخفاء ثانية للنسيج").toBeGreaterThan(-1);
    const trans = SHEET.lastIndexOf("@media (prefers-reduced-transparency: reduce)", noiseRule);
    expect(trans, "قاعدة إخفاء النسيج خارج كتلة «قلّل الشفافية»").toBeGreaterThan(-1);
    // الكتلة تُغلق قبل التالية: لو نُقلت القاعدة خارجها سقط البند.
    const after = SHEET.indexOf("@media (forced-colors: active)", trans);
    expect(noiseRule).toBeLessThan(after);
    expect(SHEET.slice(noiseRule, after)).toMatch(/display:\s*none/);

    const forced = SHEET.slice(after, SHEET.indexOf("\n}\n", after));
    expect(forced, "`.nx-hv` لا تُسقَط في الألوان القسرية").toMatch(/^\s*\.nx-hv,$/m);
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

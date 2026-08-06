/**
 * عقد خلفية الرئيسية — «متواصلة، بلا لُحمة، بوضوح كامل»
 * (قرار المالك ٢٠٢٦/٠٨/٠٦).
 *
 * ثلاثة مطالب هنا لا يكسر سقوطُها بناءً ولا اختبارَ عرض:
 *
 * ① **اللُّحمة**: مقطعٌ أوّله لا يشبه آخره يقطع قطعًا ظاهرًا كل دورة.
 *    لا يُرى إلا بانتظار دورة كاملة (٦٦ ثانية على سرعة ٠٫٣٠) — وهو أطول
 *    مما يصبر عليه فاحصٌ بشري. لذلك يُقاس الملف نفسه هنا لا الكود وحده.
 * ② **الاستمرار**: `play()` تُرفض صامتةً في حالات حقيقية، فتبقى الخلفية
 *    ساكنة بلا أثر يدلّ على السبب. الحارس الدوري هو ما يمنع ذلك.
 * ③ **الوضوح**: أي `opacity` أقل من ١ على الفيلم يُبطل المطلب في الوضع
 *    الذي كُتبت فيه القاعدة وحده — والقاعدة الساقطة كانت للجوال.
 */
import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ENGINE = readFileSync("src/components/home/HoloVideoEngine.tsx", "utf8");
const CSS = readFileSync("src/styles.css", "utf8");
/** التعليق يشرح الأرقام ويذكرها — الحارس يفحص الكود وحده. */
const CODE = ENGINE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

describe("① الفيلم المنشور — بندولٌ حقيقي لا مقطعًا خامًا", () => {
  const FILE = "public/holo-bg.mp4";

  it("موجود وضمن سقف الوسائط", () => {
    const bytes = statSync(FILE).size;
    expect(bytes).toBeGreaterThan(1_000_000);
    // سقف «أكبر أصل وسائط» في ميزانية الأداء ١٤ MiB.
    expect(bytes / 1024 / 1024).toBeLessThan(14);
  });

  it("لا مسار صوت — الخلفية صامتة بحكم التصميم", () => {
    // مسارٌ لا يُسمع أبدًا يظلّ يُحمَّل على شبكة المستخدم. قُرئ من صندوق
    // `hdlr` في الحاوية: `soun` حاضرة = ثمّة مسار صوت.
    const head = readFileSync(FILE).subarray(0, 200_000).toString("latin1");
    expect(head.includes("hdlr")).toBe(true); // الحاوية مقروءة أصلًا
    expect(head.includes("soun"), "الملف يحمل مسار صوت").toBe(false);
  });

  it("عدد الإطارات زوجي كما يقتضي البندول", () => {
    // بندولٌ من N إطارًا للأمام يعطي 2N−2 — وهو زوجي دائمًا. رقمٌ فردي
    // يعني أن الملف رُكِّب بطريقة أخرى وأن اللُّحمة لم تعد مضمونة.
    // (العدد المعتمد ٩٥٦ = 2×479 − 2.)
    const buf = readFileSync(FILE);
    const i = buf.indexOf(Buffer.from("stts", "latin1"));
    expect(i, "جدول التوقيت stts غير موجود").toBeGreaterThan(-1);
    const frames = buf.readUInt32BE(i + 12); // sample_count لأول مُدخَل
    expect(frames % 2, `عدد الإطارات ${frames} فردي — ليس بندولًا`).toBe(0);
    expect(frames).toBeGreaterThan(600);
  });
});

describe("② لا يتوقّف — والإيقاف المقصود وحده يُحترم", () => {
  it("السرعة ٠٫٣٠ ثابتة", () => {
    expect(CODE).toMatch(/const RATE = 0\.3\b/);
  });

  it("يحمل حارسًا يعيد التشغيل لا محاولةً واحدة تُبتلع", () => {
    // `void v.play().catch(() => {})` وحدها تعني: إن رُفضت، سكنت الخلفية
    // إلى الأبد ولا أحد يعلم.
    expect(CODE).toMatch(/setInterval\(resume/);
    expect(CODE).toMatch(/addEventListener\(ev, resume/);
    for (const ev of ["stalled", "pointerdown", "keydown"]) {
      expect(CODE, `الحارس لا يستيقظ على ${ev}`).toContain(`"${ev}"`);
    }
  });

  it("الحارس يحترم التبويب المخفي فلا يوقظ فيلمًا أُوقف عمدًا", () => {
    // بغير هذا يتصارع الحارس مع إيقاف البطارية كل ثانيتين.
    expect(CODE).toMatch(/if \(document\.hidden\) return/);
  });

  it("العنصر يُلتقط مرّة ويُربط ويُفكّ عليه هو نفسه", () => {
    // قراءة `videoRef.current` داخل التنظيف تقرأ ما صار إليه المرجع لا ما
    // رُبط عليه — فتبقى المستمعات معلّقة على العنصر القديم، ومع دوريّة كل
    // ثانيتين يصير التسريب تراكميًّا. رصده eslint أول مرة؛ وهذا يمنع عودته
    // لو عُطِّلت القاعدة يومًا.
    expect(CODE).toMatch(/const video = videoRef\.current;/);
    const cleanup = CODE.slice(CODE.indexOf("return () => {", CODE.indexOf("const video =")));
    expect(cleanup.slice(0, cleanup.indexOf("\n    };"))).not.toContain("videoRef.current");
  });

  it("يُنظّف كل ما ربطه عند التفكيك", () => {
    expect(CODE).toMatch(/clearInterval\(id\)/);
    expect(CODE).toMatch(/removeEventListener\(ev, resume\)/);
  });

  it("الحلقة والكتم وتشغيل الصفحة مثبّتة في الترميز", () => {
    for (const attr of ["loop", "muted", "playsInline"]) {
      expect(ENGINE, `السمة ${attr} مفقودة`).toContain(attr);
    }
  });

  it('لا `autoPlay` ولا `preload="auto"` — السرعة تُضبط قبل التشغيل', () => {
    // `autoPlay` يبدأ من مُحلِّل HTML قبل أي JS، و`playbackRate` لا تُضبط
    // إلا من JS — فكان الفيلم يعمل بسرعة ١٫٠ (٣٫٣ أضعاف المطلوب) حتى
    // الترطيب ثم يهبط فجأةً. ويبدأ كذلك لمن أوقفه صراحةً، ويسحب الملف
    // كاملًا على المسار الحرج ولو كان مُطفأً.
    const tag = ENGINE.slice(
      ENGINE.indexOf("<video"),
      ENGINE.indexOf("/>", ENGINE.indexOf("<video")),
    );
    expect(tag).not.toMatch(/\bautoPlay\b/);
    expect(tag).toContain('preload="metadata"');
    // و`resume` تضبط السرعة في السطر السابق للتشغيل لا بعده.
    const resume = CODE.slice(CODE.indexOf("const resume = ()"));
    const body = resume.slice(0, resume.indexOf("};"));
    expect(body.indexOf("playbackRate")).toBeLessThan(body.indexOf(".play()"));
  });

  it("الاختيار المحفوظ يُحترم قبل أول رسم لا بعد الترطيب", () => {
    // السكربت المانع يكتب `data-nx-motion="off"` قبل الرسم؛ وبلا قاعدة
    // تربطها بالفيلم كان من أوقف الخلفية يراها تعمل ثوانيَ عند كل فتح —
    // والزرّ هو آلية الوصول الوحيدة هنا (WCAG 2.2.2).
    expect(CSS).toContain('html[data-nx-motion="off"] .nx-hv-video');
  });

  it("لا يُركَّب أصلًا حين يُخفيه تفضيل المستخدم", () => {
    // الإخفاء في CSS بصريّ فقط: كان الملف يُحمَّل ويُفكّ ترميزه وتُقرأ منه
    // عيّنة اللون كل ٣٥٠م.ث لسطحٍ لا يراه أحد — وتظلّ `--live-rgb` تُبدّل
    // توهّج البطاقات بلا مصدر مرئي.
    expect(CODE).toContain("prefers-reduced-transparency: reduce");
    expect(CODE).toContain("forced-colors: active");
    expect(CODE).toMatch(/const active = !userOff && !suppressed/);
  });
});

describe("③ الوضوح ١ في الوضعين وعلى كل المقاسات", () => {
  it("لا تعتيم للفيلم في أي قاعدة", () => {
    // كانت `@media (max-width: 640px)` تخفضه إلى ٠٫٨٥ — على الشاشة التي
    // يُعرض عليها أكثر ما يُعرض.
    const rules = CSS.match(/\.nx-hv-video\s*\{[^}]*\}/g) ?? [];
    expect(rules.length).toBeGreaterThan(1);
    for (const r of rules) {
      const m = r.match(/opacity:\s*([\d.]+)/);
      if (m) expect(Number(m[1]), `تعتيم ${m[1]} على الفيلم`).toBe(1);
    }
  });

  it("قراءة الحبر يحرسها الغطاء لا تعتيم الفيلم", () => {
    // الغطاء يبقى — إسقاطه يجعل النص على مشهد متحرّك عالي التباين.
    expect(CSS).toContain(".nx-hv-veil");
    expect(CSS).toContain(".light .nx-hv-veil");
  });

  it("لا نصّ على الفيلم بلا حشوة تحته", () => {
    // الغطاء وحده لا يكفي لما لا زجاج تحته: سطران على الرئيسية كانا على
    // الفيلم مباشرةً، فيهبط تباينهما إلى ١٫٤٢:١ و١٫٩٧:١ حين يمرّ تحتهما
    // قوس النفق الساطع — والمطلوب ٤٫٥:١ (WCAG 1.4.3). العلاج حشوةٌ
    // وضبابٌ تحت النصّ، لا تعتيمٌ للفيلم يُبطل ما طلبه المالك.
    const PAGE = readFileSync("src/routes/-blueprint-page.tsx", "utf8");
    expect(PAGE).toContain("nx-bp-note");
    // ولا يعود ذلك السطر إلى أخفّ درجات الحبر.
    expect(PAGE).not.toMatch(/nx-bp-note[^"]*var\(--ink-3\)/);
    for (const cls of [".nx-bp-note", ".nx-bp-more"]) {
      const rule = CSS.slice(CSS.indexOf(`${cls} {`));
      expect(rule.slice(0, rule.indexOf("\n}")), `${cls} بلا حشوة`).toContain("backdrop-filter");
    }
  });

  it("تفضيل «قلّل الشفافية» يبقى مُحترمًا", () => {
    // مطلبٌ وصولي مستقل عن الوضوح: من طلب سطحًا صلبًا يحصل عليه.
    // الموضع لا النصّ: القاعدة تقع بين فتح كتلة «قلّل الشفافية» وبين
    // الكتلة التالية — فلو نُقلت خارجها سقط البند. (في الملف أكثر من كتلة
    // بهذا الاسم، فتُقرأ الأخيرة قبل `forced-colors`.)
    const rule = CSS.lastIndexOf(".nx-hv-video,\n  .nx-hv-noise");
    const opens = CSS.lastIndexOf("@media (prefers-reduced-transparency: reduce)", rule);
    const next = CSS.indexOf("@media (forced-colors: active)", opens);
    expect(rule, "قاعدة إخفاء الفيلم غير موجودة").toBeGreaterThan(-1);
    expect(opens, "لا كتلة «قلّل الشفافية» قبلها").toBeGreaterThan(-1);
    expect(rule).toBeLessThan(next);
  });
});

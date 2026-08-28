/**
 * المقدّمة السينمائية — حارس العقد (أمر المالك ٢٠٢٦/٠٨/٢٨).
 *
 * نصّ الأمر: «مقدمة ترحيبية وتعريفية للنظام مذهلة لمدة ٣٠ ثانية كمقدمة
 * سينمائية في بداية النظام قبل الصفحة الرئيسية… مع استخدام الموشن… لتحريك
 * شفتيه ويديه وعينيه وحركة جسمه… مع وجود زر لكتم الصوت الترحيبي».
 *
 * المنطق الخالص (التوقيت والنصّ والمِغلاف) مقيسٌ سلوكيًّا في
 * `intro-script.test.ts` و`voice-envelope.test.ts`. ما يُحرَس هنا هو ما لا
 * يظهر في jsdom: **البنية والمحظورات الدستورية** — أي مسارٍ صوتيّ اختير،
 * وأي بوابةٍ منعت الظهور، وأي حركةٍ تُبطَل عند طلب التخفيض.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
/** المصدر منزوع التعليقات: تعليقٌ يشرح محظورًا يمرّره زورًا. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const INTRO = "src/components/intro/SadeedCinematicIntro.tsx";
const ROOT = "src/routes/__root.tsx";

describe("① الصوت — صوت سَدِيد الخادمي وحده", () => {
  it("ينطق من نقطة TTS الخادمية، فيطابق الشات بوت بنيويًّا", () => {
    // sadeed-tts.ts يقفل SADEED_ELEVENLABS_VOICE_ID بلا مزوّد بديل، فما
    // يخرج من هذه النقطة هو صوت سَدِيد أو لا شيء. المطابقة بنيةٌ لا ضبط.
    expect(code(INTRO)).toContain("/api/public/sadeed-tts");
  });

  it("ولا `speechSynthesis` ولا صوت متصفّح في أي مسار", () => {
    const src = code(INTRO);
    expect(src, "صوت المتصفّح محظور بالعقيدة").not.toMatch(
      /speechSynthesis|SpeechSynthesisUtterance/,
    );
    expect(src, "لا يجوز تمرير صوتٍ بديل").not.toMatch(/voiceId/);
  });

  it("ولا مفتاح ولا سرّ في العميل", () => {
    expect(code(INTRO)).not.toMatch(/ELEVENLABS|api[_-]?key|Bearer\s/i);
  });

  it("ويمرّ من ناقل الصوت لا من `new Audio` طليقة", () => {
    // الناقل هو الممرّ الإجباري: بوابة الكتم فيه، فمصدرٌ يتجاوزه ينطق من
    // خلف الزرّ المكتوم.
    const src = code(INTRO);
    expect(src).toContain("SadeedAudioBus.acquire");
    expect(src).toContain("SadeedAudioBus.release");
    expect(src).toContain('"hero-soundtrack"');
  });
});

describe("② الكتم — زرٌّ واحد وحالةٌ واحدة", () => {
  it("يعيد استعمال زرّ الكتم القائم لا زرًّا ثانيًا", () => {
    // زرّان مستقلّان يفترقان: أحدهما يعرض «ناطق» بعد أن كتم الآخر.
    // **الفحص على التركيب لا على الاسم:** سطر الاستيراد وحده يُبقي الاسم
    // في الملف بعد نزع الزرّ من الشجرة — ثبت ذلك بحقنةٍ مرّت زورًا.
    expect(code(INTRO), "نُزع زرّ الكتم من الشجرة").toMatch(/<SadeedMuteToggle[\s/>]/);
  });

  it("ويفحص الكتم قبل طلب المقطع — لا تنزيل صوتٍ لن يُسمع", () => {
    // كذلك: الاستيراد يُبقي الاسم. المُلزِم هو **الخروج المبكر** نفسه.
    expect(code(INTRO), "سقط فحص الكتم السابق للطلب").toMatch(
      /if \(isSadeedVoiceMuted\(\)\) return;/,
    );
  });
});

describe("③ الظهور — الرئيسية، مرّةً، وبلا حركةٍ مفروضة", () => {
  it("لا تُركَّب إلا على الرئيسية", () => {
    const src = code(ROOT);
    expect(src).toMatch(/if \(!isHero\) return;/);
    expect(src).toMatch(/introOpen && <SadeedCinematicIntro/);
  });

  it("ومرّةً واحدة في الجلسة", () => {
    expect(code(ROOT)).toContain("hasSeenIntro");
    // sessionStorage لا localStorage: الأخير يمنعها إلى الأبد فتغيب عن العرض.
    expect(code("src/lib/sadeed/intro-seen.ts")).toContain("sessionStorage");
    expect(code("src/lib/sadeed/intro-seen.ts")).not.toContain("localStorage");
  });

  it("وتُتخطّى كليًّا عند طلب تخفيض الحركة", () => {
    const src = code(ROOT);
    expect(src).toContain("prefers-reduced-motion");
    expect(src, "لا بدّ من تعليمها مرئيةً وإلّا حاولت في كل تنقّل").toContain("markIntroSeen");
  });

  it("والقرار في أثرٍ لا في جسم المكوّن — sessionStorage لا وجود له على الخادم", () => {
    const src = code(ROOT);
    // قراءة التخزين أثناء التصيير تُنتج أول تصييرٍ يخالف الخادم.
    expect(src).toMatch(/useState\(false\);\s*useEffect\(\(\) => \{\s*if \(!isHero\)/);
  });
});

describe("④ الوصول — طبقةٌ يمكن الخروج منها", () => {
  it("طبقة حوارٍ معلنة باسمها العربي", () => {
    const src = read(INTRO);
    expect(src).toContain('role="dialog"');
    expect(src).toContain('aria-modal="true"');
    expect(src).toMatch(/aria-label="المقدّمة/);
  });

  it("وEscape يتخطّاها — لا حبس بلا مخرج لوحة مفاتيح", () => {
    expect(code(INTRO)).toMatch(/e\.key === "Escape"/);
  });

  it("وزرّ تخطٍّ ظاهر بنصّه لا بأيقونته وحدها", () => {
    expect(read(INTRO)).toContain("تخطّي المقدّمة");
  });

  it("وتُعيد تمرير الصفحة عند الإغلاق — لا صفحةٌ محبوسة بعد ذهابها", () => {
    const src = code(INTRO);
    expect(src).toContain('document.body.style.overflow = "hidden"');
    expect(src, "استعادة التمرير غائبة — الصفحة تبقى محبوسة").toMatch(
      /document\.body\.style\.overflow = prevOverflow/,
    );
  });
});

describe("⑤ الحركة — على المُركِّب وحده، وتسكن عند الطلب", () => {
  it("لا خاصية تُعيد التخطيط في حلقة الإطار", () => {
    const css = read("src/styles.css");
    const block = css.slice(css.indexOf(".sd-intro {"));
    const intro = block.slice(0, block.indexOf("@media (prefers-reduced-motion"));
    expect(intro, "خاصيةٌ تُعيد التخطيط داخل حلقة 60fps").not.toMatch(
      /\n\s*(width|height|top|left|margin|padding):/,
    );
  });

  it("والقيم تُمرَّر متغيّراتٍ من JS لا قيمًا نهائية", () => {
    // الأسلوب المضمّن يحمل متغيّرًا لا قيمة — قاعدة الوضعين.
    const src = read(INTRO);
    expect(src).toContain('["--sd-zoom" as string]');
    expect(src).toMatch(/setProperty\("--sd-mouth"/);
    expect(src).toMatch(/setProperty\("--sd-blink"/);
  });

  it("وطبقة التخفيض تُبطل كل حركةٍ في المقدّمة", () => {
    const css = read("src/styles.css");
    const rm = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(rm).toContain(".sd-intro-stage");
    expect(rm).toContain(".sd-intro-mouth");
    expect(rm).toContain(".sd-intro-eyes");
  });

  it("ولا لون حرفيّ خارج طبقة الرموز في نصّ المقدّمة", () => {
    // الحجاب والأرضية السينمائية استثناءٌ واعٍ (مسرحٌ أسود في الوضعين)،
    // أمّا النصّ والحدود فمن الرموز.
    const src = read(INTRO);
    expect(src).toContain("var(--ink)");
    expect(src).toContain("var(--hairline)");
    expect(src, "لون نصٍّ حرفيّ يكسر الوضعين").not.toMatch(/text-\[#[0-9a-f]{3,8}\]/i);
  });
});

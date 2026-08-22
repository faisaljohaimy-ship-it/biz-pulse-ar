/**
 * هولوغرام سَدِيد — حارس REQ-020 («تعديلات على النظام v3» فقرة 835:
 * «وضع هولوقرام تفاعلي لشخصية سديد»).
 *
 * ثلاثة شروط يحرسها هذا الملف، وكلها نصوص يمحوها تعديل لاحق بصمت دون أن
 * يلتقطها tsc أو eslint:
 *
 * 1. **طبقة الهولوغرام موجودة فوق الشخصية نفسها** — الإطار
 *    `sd-holo-frame` في المكوّن وطبقاته الأربع (تلوين، خطوط مسح، لمعة،
 *    توهج قاعدي) في `styles.css`، والزينة كلها `aria-hidden` فلا تُقرأ
 *    آليًّا. والمظهر **ساكن مكتمل**: لا طبقة منه خلف `:hover` — قاعدة
 *    المشروع أن ما يظهر بالتمرير وحده لا وجود له على الجوال (المادة ٣٢).
 *
 * 2. **الحركات الدورية تحت راية `prefers-reduced-motion`** — لمعة المسح
 *    اللانهائية هي ما يؤذي من طلب سكونًا، وسقوط كتلة الإيقاف لا يظهر في
 *    أي فحص نوعي.
 *
 * 3. **لا `fill="white"` في المكوّن** (المادة ٣٣): اللون الخام داخل SVG
 *    يعفي حامله من الوضعين — يُكتب `currentColor` أو لا يُكتب.
 *
 * ── لماذا يقرأ الحارس النص لا DOM ──
 * الشرط المحروس بنيوي (وجود صنف، وجود كتلة CSS، غياب نصّ محظور) لا سلوكي؛
 * وقراءة الملف تلتقطه في كل بيئة بلا متصفح — وهو نمط حرّاس المشروع
 * (`sadeed-stage-background.contract.test.ts` جاره الأقرب).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const COMPONENT_PATH = "src/components/sadeed/SadeedStagePresence.tsx";
const STYLES_PATH = "src/styles.css";

const read = (p: string) => readFileSync(p, "utf8");
/** التعليقات تُنزع: الحارس يقرأ ما يُنفَّذ، لا ما يُشرح عنه. */
const stripJs = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ");
const stripCss = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ");

const COMPONENT = stripJs(read(COMPONENT_PATH));
const CSS = stripCss(read(STYLES_PATH));

/** طبقات الهولوغرام الأربع + الإطار وهدف الإمالة. */
const HOLO_CLASSES = [
  "sd-holo-frame",
  "sd-holo-tilt",
  "sd-holo-base",
  "sd-holo-tint",
  "sd-holo-scanlines",
  "sd-holo-sweep",
] as const;

describe("هولوغرام سَدِيد التفاعلي (REQ-020)", () => {
  it("طبقة الهولوغرام حاضرة في SadeedStagePresence وكل زينتها aria-hidden", () => {
    for (const cls of HOLO_CLASSES) {
      expect(COMPONENT, `الصنف ${cls} غائب عن المكوّن — سقطت طبقة الهولوغرام`).toContain(cls);
    }

    // الزينة الصرفة لا تُقرأ آليًّا: كل span هولوغرامي يحمل aria-hidden.
    for (const cls of ["sd-holo-base", "sd-holo-tint", "sd-holo-scanlines", "sd-holo-sweep"]) {
      const tag = COMPONENT.match(new RegExp(`<span[^>]*className="${cls}"[^>]*/>`))?.[0] ?? "";
      expect(tag, `لم يُعثر على وسم ${cls} — تغيّر شكله فبطل الحارس`).not.toBe("");
      expect(tag, `الطبقة ${cls} بلا aria-hidden — زينة تُقرأ آليًّا`).toContain("aria-hidden");
    }

    // التفاعل إضافة فوق حالة ساكنة: الإمالة والنبضة معالجات مؤشر في المكوّن.
    expect(COMPONENT, "سقطت إمالة المؤشر — الهولوغرام لم يعد تفاعليًّا").toContain("onPointerMove");
    expect(COMPONENT, "سقطت نبضة النقر — الهولوغرام لم يعد تفاعليًّا").toContain("onPointerDown");
  });

  it("وأصنافه معرَّفة في styles.css بلونٍ من طبقة الرموز، بلا اشتراط تمرير", () => {
    for (const cls of HOLO_CLASSES) {
      expect(CSS, `القاعدة .${cls} غائبة عن styles.css`).toContain(`.${cls}`);
    }

    // اللون الهولوغرامي رمز لا قيمة مبعثرة: يُعرَّف مرة في طبقة رموز
    // البطاقة ويُستهلك بالاسم في كل طبقة.
    expect(CSS, "الرمز --sd-holo غير معرَّف — عاد اللون قيمًا خامًا مبعثرة").toMatch(/--sd-holo:/);
    for (const cls of ["sd-holo-base", "sd-holo-tint", "sd-holo-scanlines", "sd-holo-sweep"]) {
      const at = CSS.indexOf(`.${cls} {`);
      expect(at, `القاعدة .${cls} تغيّر شكلها فبطل الحارس`).toBeGreaterThan(-1);
      const block = CSS.slice(at, CSS.indexOf("}", at));
      expect(block, `الطبقة ${cls} لا تقرأ الرمز --sd-holo`).toContain("var(--sd-holo)");
    }

    // خطوط المسح الأفقية بنمطها المطلوب حرفيًّا.
    const scanAt = CSS.indexOf(".sd-holo-scanlines {");
    const scanBlock = CSS.slice(scanAt, CSS.indexOf("}", scanAt));
    expect(scanBlock, "خطوط المسح فقدت repeating-linear-gradient").toContain(
      "repeating-linear-gradient",
    );

    // الحالة الساكنة مكتملة: لا صنف هولوغرامي معلَّق على :hover — ما يظهر
    // بالتمرير وحده لا وجود له على الجوال.
    expect(CSS, "طبقة هولوغرام صارت خلف :hover — تختفي على الجوال (المادة ٣٢)").not.toMatch(
      /:hover[^{}]*\.sd-holo-|\.sd-holo-[\w-]*:hover/,
    );
  });

  it("والحركات الدورية تقف تحت prefers-reduced-motion", () => {
    const reduceBlocks = [...CSS.matchAll(/@media\s*\(prefers-reduced-motion:\s*reduce\)/g)];
    const covered = reduceBlocks.some((m) =>
      CSS.slice(m.index, m.index + 1200).includes(".sd-holo-sweep"),
    );
    expect(
      covered,
      "سقطت كتلة reduced-motion عن الهولوغرام — لمعة المسح اللانهائية تعمل لمن طلب سكونًا",
    ).toBe(true);
  });

  it("ولا fill أبيض خام في المكوّن (المادة ٣٣)", () => {
    expect(COMPONENT, 'fill="white" محظور — يُكتب currentColor').not.toMatch(
      /fill=["'](?:white|#fff(?:fff)?)["']/i,
    );
  });
});

/**
 * وهج شعار سَدِيد — طبقتان حول اللوحة لا على صورتها:
 * • الهالة من أمر الوهج (٢٠٢٦/١٠/١٨): «continuously luminous … slow continuous illumination
 *   cycle … Preserve the original artwork … Use efficient animation properties … Provide a
 *   reduced-motion alternative».
 * • اللمعة من أمر المالك ٢٠٢٦/١٠/١٨ بنصّه: «اجعل علامة سديد المشار اليها فالمرفق والموجودة في
 *   زاوية النظام العلوية تلمع باستمرار ذهاباً واياباً» — ينسخ فيها «occasional subtle luminous
 *   sweep» (عبورًا كل 14 ث و86٪ من الدورة سكون).
 *
 * ما يُحرس: الصورة لا تُمسّ؛ لا يتحرّك إلا `opacity` و`transform`؛ اللمعة ذهابٌ وإيابٌ دائم
 * (محطّتان بلا سكون، `infinite alternate`، عبورٌ ≤ 5 ث بلا تأخير، شفافيةٌ ≥ 0.9 طوال الدورة،
 * ونواةٌ لا تغادر اللوحة)؛ كل حركةٍ خلف تقليل الحركة ومفتاح السكون وزرّ «إيقاف الحركة» معًا؛
 * والبديل هالةٌ ساكنة بلا شريط؛ وألوان النظام تُخفي الطبقتين. والفحوص دوالّ تُجرَّب على
 * المزروع (المادة ٣٠).
 */
import { readFileSync } from "node:fs";
import postcss, { type AtRule, type Rule } from "postcss";
import { describe, expect, it } from "vitest";

const CSS = readFileSync("src/styles/brand-plate.css", "utf8");
const TSX = readFileSync("src/components/brand/SadeedPlateLockup.tsx", "utf8");
const GATE = "prefers-reduced-motion: no-preference";
/**
 * مفتاحا الجذر: السكون (`data-nx-motion`) وزرّ «إيقاف الحركة» على الرئيسية — السمة التي
 * يكتبها `HomeBrandRow` ويقرؤها `HoloVideoEngine` باسم `MOTION_PAUSED_ATTR` (WCAG 2.2.2).
 */
const SWITCHES = ['[data-nx-motion="off"]', '[data-nx-motion-paused="1"]'];
const KEYFRAMES = ["nx-plate-breathe", "nx-plate-sweep"];
const SWEEP = "nx-plate-sweep";
/** أطول عبورٍ مقبول (ث): «باستمرار» لا عبورٌ يطول حتى يصير سكونًا. */
const MAX_PASS_S = 5;
/** أدنى شفافية في أي محطّة: الشريط حاضرٌ طوال الدورة. */
const MIN_OPACITY = 0.9;
/** الغلاف بقدّ اللوحة ونواة الشريط في منتصفه: |الإزاحة| ≤ 50٪ تُبقي النواة على اللوحة. */
const MAX_SHIFT = 50;
/** أقصر مدى للذهاب والإياب (٪ من عرض اللوحة): من حافّةٍ إلى حافّة تقريبًا. */
const MIN_TRAVEL = 80;

const atChain = (n: postcss.Node) => {
  const out: string[] = [];
  for (let p = n.parent; p && p.type !== "root"; p = p.parent)
    if (p.type === "atrule") out.push(`@${(p as AtRule).name} ${(p as AtRule).params}`);
  return out;
};

/** خصائص تتحرّك في إطارات الوهج غير `opacity`/`transform`. */
function costlyFrames(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkAtRules("keyframes", (kf) => {
    if (!KEYFRAMES.includes(kf.params)) return;
    kf.walkDecls((d) => {
      if (d.prop !== "opacity" && d.prop !== "transform") out.push(`${kf.params}: ${d.prop}`);
    });
  });
  return out;
}

/** أوّل مركّبٍ في المحدِّد — `html:not(…):not(…)` قبل أوّل فراغ. */
const lead = (selector: string) => selector.trim().split(/\s+/)[0];

/** المحدِّد سطرًا واحدًا — المنسِّق يكسر المحدِّدات الطويلة على أسطر. */
const flat = (selector: string) => selector.replace(/\s+/g, " ").trim();

/**
 * مفتاح اللوحة نفسها: اختيار الزائر المحفوظ تحمله اللوحة في كل صفحة (`data-motion-paused`)،
 * لأن كاتب سمة الجذر (`HomeBrandRow`) لا يُركَّب إلا على الرئيسية.
 */
const PLATE_SWITCH = ".nx-plate-link[data-motion-known]:not([data-motion-paused])";

/** حركةٌ خارج بوابة التفضيل، أو على جذرٍ ينقصه أحد المفتاحين، أو على لوحةٍ بلا مفتاحها. */
function ungated(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkDecls(/^animation/, (d) => {
    const rule = d.parent as Rule;
    const gated =
      atChain(d).some((a) => a.includes(GATE)) &&
      rule.selectors.every((s) => {
        const head = lead(s);
        return (
          head.startsWith("html:") &&
          SWITCHES.every((sw) => head.includes(`:not(${sw})`)) &&
          flat(s).includes(PLATE_SWITCH)
        );
      });
    if (!gated) out.push(flat(rule.selector));
  });
  return out;
}

/** ما يُكتب على الصورة نفسها من فلترٍ أو حركة. */
function touchesArtwork(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkRules((r) => {
    if (!r.selectors.some((s) => s.includes(".nx-plate-img"))) return;
    r.walkDecls((d) => {
      if (/^(filter|animation|mix-blend-mode|opacity)/.test(d.prop))
        out.push(`${r.selector} ${d.prop}`);
    });
  });
  return out;
}

type Stop = { at: number; opacity: number; shift: number };

/** محطّات اللمعة: موضعها من الدورة، وشفافيتها، وإزاحتها الأفقية (٪ من عرض الغلاف). */
function sweepStops(css: string): Stop[] {
  const stops: Stop[] = [];
  postcss.parse(css).walkAtRules("keyframes", (kf) => {
    if (kf.params !== SWEEP) return;
    kf.each((node) => {
      if (node.type !== "rule") return;
      let opacity = Number.NaN;
      let shift = Number.NaN;
      node.walkDecls((d) => {
        if (d.prop === "opacity") opacity = Number(d.value);
        if (d.prop === "transform") {
          const m = /^translateX\((-?[\d.]+)%\)$/.exec(d.value.trim());
          shift = m ? Number(m[1]) : Number.NaN;
        }
      });
      for (const sel of node.selectors) {
        const at = sel === "from" ? 0 : sel === "to" ? 100 : Number.parseFloat(sel);
        stops.push({ at, opacity, shift });
      }
    });
  });
  return stops.sort((a, b) => a.at - b.at);
}

/**
 * ما يُسكِن اللمعة أو يُغيّبها: محطّاتٌ غير «من/إلى» (كل محطّة وسطى إمساك)، شفافيةٌ تخفت،
 * نواةٌ تخرج عن اللوحة (سكونٌ مقنّع: الشريط يدور خارجها)، أو مدىً لا يبلغ الحافّتين.
 */
function idleHold(css: string): string[] {
  const stops = sweepStops(css);
  const out: string[] = [];
  const ats = stops.map((s) => s.at).join("/");
  if (ats !== "0/100") out.push(`محطّات ${ats}`);
  for (const s of stops) {
    if (!(s.opacity >= MIN_OPACITY)) out.push(`شفافية ${s.opacity} عند ${s.at}%`);
    if (!(Math.abs(s.shift) <= MAX_SHIFT)) out.push(`إزاحة ${s.shift}% عند ${s.at}%`);
  }
  const shifts = stops.map((s) => s.shift);
  const travel = Math.max(...shifts) - Math.min(...shifts);
  if (!(travel >= MIN_TRAVEL)) out.push(`مدى ${travel}%`);
  return out;
}

/** تصريح حركة اللمعة: واحدٌ، عبورٌ ≤ 5 ث بلا تأخير، دائمٌ (`infinite`) يعود (`alternate`). */
function sweepFaults(css: string): string[] {
  const values: string[] = [];
  postcss.parse(css).walkDecls("animation", (d) => {
    if (d.value.split(/\s+/).includes(SWEEP)) values.push(d.value);
  });
  if (values.length !== 1) return [`تصريحات ${values.length}`];
  const tokens = values[0].split(/\s+/);
  const [pass = Number.NaN, delay = 0] = tokens
    .filter((t) => /^-?[\d.]+m?s$/.test(t))
    .map((t) => (t.endsWith("ms") ? Number.parseFloat(t) / 1000 : Number.parseFloat(t)));
  const out: string[] = [];
  if (!(pass > 0 && pass <= MAX_PASS_S)) out.push(`عبور ${pass}s`);
  if (delay > 0) out.push(`تأخير ${delay}s`);
  if (!tokens.includes("infinite")) out.push("غير دائمة");
  if (!tokens.some((t) => /^alternate(-reverse)?$/.test(t))) out.push("لا تعود");
  return out;
}

/** شفافية الشريط ساكنًا — قاعدته خارج كل @media، وهي ما يبقى حين تقف الحركة. */
function restingSheenOpacity(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkRules((r) => {
    if (r.parent?.type !== "root" || !r.selectors.includes(".nx-plate-sheen::after")) return;
    r.walkDecls("opacity", (d) => void out.push(d.value));
  });
  return out;
}

/** نسخةٌ من الملف بإطاراتٍ مزروعة لـ`nx-plate-sweep` مكان إطاراته. */
function plantFrames(css: string, frames: string): string {
  const root = postcss.parse(css);
  const planted = postcss.parse(`@keyframes ${SWEEP} { ${frames} }`).nodes[0];
  let n = 0;
  root.walkAtRules("keyframes", (kf) => {
    if (kf.params !== SWEEP) return;
    kf.replaceWith(planted);
    n++;
  });
  expect(n).toBe(1);
  return root.toString();
}

/** نسخةٌ بتصريح لمعةٍ مزروع مكان التصريح الحقيقي. */
function plantSweep(css: string, value: string): string {
  const planted = css.replace(
    "animation: nx-plate-sweep 3.4s ease-in-out infinite alternate;",
    `animation: ${value};`,
  );
  expect(planted).not.toBe(css);
  return planted;
}

/** مسحة R3 كما كانت حرفًا: عبورٌ في ~1.4 ث ثم سكونٌ حتى تمام 14 ث. */
const R3_FRAMES = `
  0%, 86% { opacity: 0; transform: translateX(-130%); }
  88% { opacity: 1; }
  96% { opacity: 0.9; transform: translateX(130%); }
  97%, 100% { opacity: 0; transform: translateX(130%); }`;

describe("وهج الشعار — حول الصورة لا عليها، رخيصٌ ومحكوم", () => {
  it("الصورة كما هي: لا فلتر ولا حركة ولا مزج عليها", () => {
    expect(touchesArtwork(CSS)).toEqual([]);
    expect(touchesArtwork(CSS + "\n.nx-plate-img { filter: brightness(1.2); }")).toHaveLength(1);
  });

  it("الهالة والمسحة طبقتان: ::before تحت الصورة، وغلافٌ بقدّ اللوحة يقصّ المسحة على الزوايا", () => {
    expect(CSS).toMatch(/\.nx-plate-link::before \{[^}]*z-index: -1;[^}]*box-shadow:/);
    expect(CSS).toMatch(/\.nx-plate-sheen \{[^}]*overflow: hidden;[^}]*border-radius: inherit;/);
    // عليه تُحسب الإزاحة: الغلاف بقدّ اللوحة، فـ50٪ منه نصف عرضها.
    expect(CSS).toMatch(/\.nx-plate-sheen::after \{[^}]*inset: 0;/);
    expect(TSX).toContain('<span aria-hidden className="nx-plate-sheen" />');
  });

  it("لا يتحرّك إلا opacity وtransform — ويسقط على إطارٍ يحرّك الظلّ أو موضع الخلفية", () => {
    expect(costlyFrames(CSS)).toEqual([]);
    const planted = CSS.replace("opacity: 0.95;", "opacity: 0.95;\n    box-shadow: 0 0 30px blue;");
    expect(planted).not.toBe(CSS);
    expect(costlyFrames(planted)).toEqual(["nx-plate-breathe: box-shadow"]);
    // لمعةٌ تُحرّك موضع التدرّج بدل الإزاحة: إعادة رسمٍ في كل إطار.
    const repaint = plantFrames(
      CSS,
      "from { opacity: 0.95; background-position: 0 0; } to { opacity: 0.95; background-position: 100% 0; }",
    );
    expect(costlyFrames(repaint)).toEqual([
      "nx-plate-sweep: background-position",
      "nx-plate-sweep: background-position",
    ]);
  });

  it("كل حركةٍ خلف تقليل الحركة ومفتاح السكون وزرّ «إيقاف الحركة» — ويسقط على حركةٍ مكشوفة", () => {
    expect(ungated(CSS)).toEqual([]);
    const animated = postcss.parse(CSS);
    let n = 0;
    animated.walkDecls(/^animation/, () => void n++);
    expect(n).toBe(2);
    // خارج بوابة التفضيل.
    expect(
      ungated(CSS + "\n.nx-plate-link::before { animation: nx-plate-breathe 6s infinite; }"),
    ).toEqual([".nx-plate-link::before"]);
    // داخل البوابة بمفتاح السكون وحده: زرّ «إيقاف الحركة» لا يوقفها.
    const noPause = CSS.replaceAll(':not([data-nx-motion-paused="1"])', "");
    expect(noPause).not.toBe(CSS);
    expect(ungated(noPause)).toHaveLength(2);
    // داخل البوابة بالزرّ وحده: مفتاح السكون لا يوقفها.
    const noSwitch = CSS.replaceAll(':not([data-nx-motion="off"])', "");
    expect(noSwitch).not.toBe(CSS);
    expect(ungated(noSwitch)).toHaveLength(2);
    // بلا مفتاح اللوحة: من أوقف الحركة على الرئيسية يراها تعود في كل صفحةٍ أخرى.
    const noPlate = CSS.replaceAll(PLATE_SWITCH, ".nx-plate-link");
    expect(noPlate).not.toBe(CSS);
    expect(ungated(noPlate)).toHaveLength(2);
    // بلا «قُرئ الاختيار»: الحركة تبدأ من أوّل إطار ثم تقف بعد الترطيب لمن أوقفها.
    const early = CSS.replaceAll("[data-motion-known]", "");
    expect(early).not.toBe(CSS);
    expect(ungated(early)).toHaveLength(2);
  });

  it("اختيار الإيقاف المحفوظ يُحترم في كل صفحة: مفتاح الرئيسية وحدثها نفساهما على اللوحة", () => {
    const ROW = readFileSync("src/components/home/HomeBrandRow.tsx", "utf8");
    const keyOf = (src: string, name: string) =>
      new RegExp(`const ${name} = "([^"]+)"`).exec(src)?.[1] ?? null;
    /** مفتاحٌ أو حدثٌ في اللوحة لا يطابق ما يكتبه زرّ الرئيسية — أو سمةٌ لا تُكتب على الرابط. */
    const drift = (plate: string): string[] => {
      const out: string[] = [];
      if (keyOf(plate, "SAVED_PAUSE_KEY") !== keyOf(ROW, "PAUSE_KEY")) out.push("المفتاح");
      if (keyOf(plate, "PAUSE_EVENT") !== keyOf(ROW, "MOTION_PAUSE_EVENT")) out.push("الحدث");
      if (!plate.includes("data-motion-paused={motionPaused || undefined}")) out.push("السمة");
      if (!plate.includes("data-motion-known={motionKnown || undefined}")) out.push("المعرفة");
      if (!/localStorage\.getItem\(SAVED_PAUSE_KEY\) === "paused"/.test(plate)) out.push("القراءة");
      if (!plate.includes("window.addEventListener(PAUSE_EVENT, follow)")) out.push("المتابعة");
      return out;
    };
    expect(keyOf(ROW, "PAUSE_KEY")).toBe("nx-brand-motion");
    expect(drift(TSX)).toEqual([]);
    // مزروع: مفتاحٌ آخر — اختيارٌ محفوظ لا تراه اللوحة.
    expect(drift(TSX.replace('"nx-brand-motion"', '"nx-motion"'))).toEqual(["المفتاح"]);
    // مزروع: حدثٌ آخر — ضغط الزرّ لا يبلغ اللوحة في الجلسة.
    expect(drift(TSX.replace('"nx:motion-pause"', '"nx:pause"'))).toEqual(["الحدث"]);
    // مزروع: الحال مقروءةٌ ولا تُكتب على الرابط — فلا تبلغ CSS.
    expect(drift(TSX.replace("data-motion-paused={motionPaused || undefined}", ""))).toEqual([
      "السمة",
    ]);
    // مزروع: لا يُعلَن متى قُرئ الاختيار — فتبقى اللمعة ساكنةً أبدًا أو تسبق الاختيار.
    expect(drift(TSX.replace("data-motion-known={motionKnown || undefined}", ""))).toEqual([
      "المعرفة",
    ]);
  });

  it("اللمعة تذهب وتعود بلا سكون: محطّتان، حاضرةٌ طوال الدورة، ونواتها على اللوحة", () => {
    expect(sweepStops(CSS)).toEqual([
      { at: 0, opacity: 0.95, shift: -50 },
      { at: 100, opacity: 0.95, shift: 50 },
    ]);
    expect(idleHold(CSS)).toEqual([]);
    // مسحة R3 نفسها: أربع محطّاتٍ وسطى وشفافيةٌ صفرٌ معظم الدورة.
    expect(idleHold(plantFrames(CSS, R3_FRAMES))).toContain("محطّات 0/86/88/96/97/100");
    // محطّتان بشفافيةٍ تخفت إلى الصفر: غيابٌ في كل طرف.
    expect(
      idleHold(
        plantFrames(
          CSS,
          "from { opacity: 0; transform: translateX(-50%); } to { opacity: 0.95; transform: translateX(50%); }",
        ),
      ),
    ).toEqual(["شفافية 0 عند 0%"]);
    // ±125٪: الشريط يدور خارج اللوحة معظم العبور — سكونٌ مقنّع عند كل منعطف.
    expect(
      idleHold(
        plantFrames(
          CSS,
          "from { opacity: 0.95; transform: translateX(-125%); } to { opacity: 0.95; transform: translateX(125%); }",
        ),
      ),
    ).toEqual(["إزاحة -125% عند 0%", "إزاحة 125% عند 100%"]);
    // اهتزازٌ في الوسط لا ذهابٌ وإياب.
    expect(
      idleHold(
        plantFrames(
          CSS,
          "from { opacity: 0.95; transform: translateX(-10%); } to { opacity: 0.95; transform: translateX(10%); }",
        ),
      ),
    ).toEqual(["مدى 20%"]);
  });

  it("تصريح اللمعة: دائمةٌ تعود (`infinite alternate`)، عبورها ≤ 5 ث بلا تأخير", () => {
    expect(sweepFaults(CSS)).toEqual([]);
    expect(sweepFaults(plantSweep(CSS, "nx-plate-sweep 3.4s ease-in-out infinite"))).toEqual([
      "لا تعود",
    ]);
    expect(sweepFaults(plantSweep(CSS, "nx-plate-sweep 3.4s ease-in-out 2 alternate"))).toEqual([
      "غير دائمة",
    ]);
    expect(
      sweepFaults(plantSweep(CSS, "nx-plate-sweep 14s ease-in-out infinite alternate")),
    ).toEqual(["عبور 14s"]);
    expect(
      sweepFaults(plantSweep(CSS, "nx-plate-sweep 3.4s ease-in-out 3s infinite alternate")),
    ).toEqual(["تأخير 3s"]);
    // تصريح R3 حرفًا.
    expect(sweepFaults(plantSweep(CSS, "nx-plate-sweep 14s linear 3s infinite"))).toEqual([
      "عبور 14s",
      "تأخير 3s",
      "لا تعود",
    ]);
  });

  it("البديل الساكن هالةٌ مرئية بلا شريط، والتنفّس أبطأ من حدّ الوميض", () => {
    expect(CSS).toMatch(/\.nx-plate-link::before \{[^}]*opacity: 0\.6;/);
    expect(CSS).toContain("animation: nx-plate-breathe 6.5s ease-in-out infinite;");
    // حين تقف الحركة يعود الشريط إلى قاعدته: لا يُرى، فلا شريطٌ متجمّدٌ على الصورة.
    expect(restingSheenOpacity(CSS)).toEqual(["0"]);
    expect(restingSheenOpacity(CSS + "\n.nx-plate-sheen::after { opacity: 0.9; }")).toEqual([
      "0",
      "0.9",
    ]);
  });

  it("ألوان النظام تُخفي الطبقتين وتُبقي حدّ الهدف", () => {
    const fc = CSS.slice(CSS.indexOf("@media (forced-colors: active)"));
    expect(fc).toMatch(/\.nx-plate-link::before,\s*\.nx-plate-sheen \{\s*display: none;/);
    expect(fc).toContain("outline: 1px solid CanvasText;");
  });
});

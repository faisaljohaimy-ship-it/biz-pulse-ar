/**
 * عقد حركة الرئيسية (أمر المالك ٢٠٢٦/١٠/١٧ — «ULTRA-PREMIUM CINEMATIC HOMEPAGE,
 * MOTION ENGINEERING»).
 *
 * الأمر نسخ قرار ٢٠٢٦/٠٨/٠٩ «بطاقات الرئيسية ساكنة» **في الدخول وحده**، وأبقى
 * ما كان القرار القديم يحرسه: لا طفو دائم ولا لمعة دائمة. وما يكسر الحركة لا
 * يراه tsc ولا البناء:
 *   • حركةٌ خارج بوابة التفضيل — فيراها من طلب السكون (WCAG 2.3.3)؛
 *   • دخولٌ يبدأ من العدم — فيتأخّر أكبر عنصرٍ مرسوم (LCP) ويُقرأ الرقم فارغًا؛
 *   • `both` بدل `backwards` — فتحتجز الحركة `translate` وتموت رفعة التمرير؛
 *   • `transform` — يمحو أي إزاحة على العنصر نفسه (المادة ٣٢)؛
 *   • `animation-timeline` قبل الاختصار — فيمحوه الاختصار ويسقط الظهور صامتًا؛
 *   • تأخيرٌ متتابع يتراكم — فينتظر آخر المؤشرات ما يُرى تعثّرًا لا إيقاعًا.
 *
 * والقراءة بمحلّل CSS (postcss) لا بنصّ: كل تصريحٍ يُقاس داخل كتلته الفعلية،
 * فلا ينجو بكلمةٍ في تعليق (المادة ٣٠، النمط الثالث). وكل فحصٍ دالّةٌ تُجرَّب
 * أولًا على انتهاكٍ مزروع: فحصٌ لم يُرَ يحمرّ لا يُثبت شيئًا حين يخضرّ.
 */
import { readFileSync } from "node:fs";
import postcss, {
  type AtRule,
  type ChildNode,
  type Declaration,
  type Node,
  type Rule,
} from "postcss";
import { describe, expect, it } from "vitest";

const MOTION = readFileSync("src/styles/home/home-motion.css", "utf8");
const PAGE = readFileSync("src/routes/-blueprint-page.tsx", "utf8");
const GLOBAL_CSS = readFileSync("src/styles.css", "utf8");
const LAYOUT = readFileSync("src/styles/home/home-layout.css", "utf8");
const BAND = readFileSync("src/components/home/HomeClosingBand.tsx", "utf8");
const REFERENCE = readFileSync("src/components/home/home-reference.ts", "utf8");

const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const GATE = "prefers-reduced-motion: no-preference";
const SWITCH = 'html:not([data-nx-motion="off"])';
/** أقصى انتظارٍ قبل أن يبدأ عنصرٌ حركته (مواصفة الحركة). */
const MAX_DELAY_MS = 360;

/* ── أدوات القراءة ───────────────────────────────────────────────────── */

/** نصوص القواعد الحاوية لعقدة — `@media …` و`@supports …` من الأقرب. */
function atChain(node: ChildNode): string[] {
  const out: string[] = [];
  for (let p = node.parent as Node | undefined; p && p.type !== "root"; p = p.parent as Node) {
    if (p.type === "atrule") out.push(`@${(p as AtRule).name} ${(p as AtRule).params}`);
  }
  return out;
}

/** تصريحات الحركة المسمّاة (لا `none`) داخل القواعد — لا داخل الإطارات. */
function animations(css: string): { rule: Rule; decl: Declaration }[] {
  const out: { rule: Rule; decl: Declaration }[] = [];
  postcss.parse(css).walkDecls((decl) => {
    if (decl.prop !== "animation" && decl.prop !== "animation-name") return;
    if (/^none\b/.test(decl.value.trim())) return;
    const rule = decl.parent;
    if (rule?.type !== "rule") return;
    out.push({ rule: rule as Rule, decl });
  });
  return out;
}

/** هل تصريح الحركة مربوطٌ بالتمرير (مخطّط زمني للعرض في القاعدة نفسها)؟ */
const scrollDriven = (rule: Rule) =>
  rule.nodes.some((n) => n.type === "decl" && n.prop === "animation-timeline");

/** الزمن بالمللي ثانية: `40ms` · `.12s` · `0.18s`. */
const ms = (t: string) => (t.endsWith("ms") ? parseFloat(t) : parseFloat(t) * 1000);

/** يقيّم تأخيرًا مكتوبًا — ثابتًا أو `calc(var(--nx-i, 0) * 40ms + 120ms)`. */
function delayMs(value: string, index: number): number {
  const expr = value
    .replace(/^calc\(|\)$/g, "")
    .replace(/var\(--nx-i,\s*0\)/g, String(index))
    .trim();
  return expr
    .split("+")
    .map((term) =>
      term
        .split("*")
        .map((f) => f.trim())
        .reduce((acc, f) => acc * (/[0-9.]+m?s$/.test(f) ? ms(f) : parseFloat(f)), 1),
    )
    .reduce((a, b) => a + b, 0);
}

/** قيمتا الزمن في الاختصار بترتيبهما (المدة ثم التأخير) — `calc()` قيمةٌ واحدة. */
function timesOf(value: string): string[] {
  return value.match(/calc\([^()]*(?:\([^()]*\)[^()]*)*\)|(?<![\w-])[0-9]*\.?[0-9]+m?s\b/g) ?? [];
}

/** عدد المؤشرات في المرجع — يُحسب منه أبعد تأخيرٍ متتابع. */
function kpiCount(reference: string): number {
  const at = reference.indexOf("  kpis: [");
  const end = reference.indexOf("\n  ],", at);
  return at === -1 || end === -1
    ? 0
    : (reference.slice(at, end).match(/^\s{6}id: "/gm) ?? []).length;
}

/* ── الفحوص نفسها — دوالّ تُعيد المخالفات، فتُجرَّب على المزروع ─────── */

/** ① كل حركةٍ مسمّاة خلف بوابة التفضيل ومفتاح السكون معًا. */
function optInViolations(css: string): string[] {
  return animations(css)
    .filter(
      ({ rule, decl }) =>
        !atChain(decl).some((a) => a.startsWith("@media") && a.includes(GATE)) ||
        !rule.selectors.every((s) => s.startsWith(SWITCH)),
    )
    .map(({ rule }) => rule.selector);
}

/** ② لا حركة دائمة، ولا `transform` يمحو إزاحة. */
function perpetualOrTransform(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkDecls((d) => {
    if (/^animation/.test(d.prop) && /\binfinite\b/.test(d.value))
      out.push(`${d.prop}: ${d.value}`);
    if (d.prop === "transform" && /\b(translate|scale)/.test(d.value))
      out.push(`transform: ${d.value}`);
  });
  return out;
}

/** ③ الإطار الأوّل مرئي: لا شفافية دون 0.5 ولا إخفاء في أي إطار. */
function hiddenFrames(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkAtRules("keyframes", (kf) => {
    kf.walkDecls((d) => {
      if (d.prop === "opacity" && parseFloat(d.value) < 0.5)
        out.push(`${kf.params}: opacity ${d.value}`);
      if (d.prop === "visibility" && d.value.trim() === "hidden") out.push(`${kf.params}: hidden`);
    });
  });
  return out;
}

/** ④ `backwards` وحدها، ومنحنى النظام للحركة الزمنية (`linear` للمربوطة بالتمرير). */
function fillOrEasingViolations(css: string): string[] {
  const out: string[] = [];
  for (const { rule, decl } of animations(css)) {
    if (decl.prop !== "animation") continue;
    if (!/\bbackwards\b/.test(decl.value) || /\b(both|forwards)\b/.test(decl.value)) {
      out.push(`${rule.selector}: fill`);
    }
    const easing = scrollDriven(rule) ? /\blinear\b/ : /var\(--nx-ease-out\)/;
    if (!easing.test(decl.value)) out.push(`${rule.selector}: easing`);
  }
  return out;
}

/** ⑤ المخطّط الزمني بعد الاختصار في القاعدة نفسها، والظهور بالتمرير بلا شفافية. */
function timelineViolations(css: string): string[] {
  const out: string[] = [];
  const root = postcss.parse(css);
  const frames = new Map<string, string>();
  root.walkAtRules("keyframes", (kf) => {
    frames.set(kf.params, kf.toString());
  });
  root.walkRules((rule) => {
    if (!scrollDriven(rule)) return;
    const props = rule.nodes.flatMap((n) => (n.type === "decl" ? [n.prop] : []));
    const shorthand = props.indexOf("animation");
    if (shorthand > props.indexOf("animation-timeline")) out.push(`${rule.selector}: order`);
    if (!atChain(rule).some((a) => a.startsWith("@supports") && a.includes("animation-timeline"))) {
      out.push(`${rule.selector}: unsupported browsers`);
    }
    for (const { decl } of animations(rule.toString())) {
      const name = decl.value.split(/\s+/).find((w) => frames.has(w));
      if (name && /opacity/.test(frames.get(name) ?? "")) out.push(`${rule.selector}: opacity`);
    }
  });
  return out;
}

/** ⑥ لا عنصر ينتظر أكثر من الحدّ — والمتتابع يُقاس عند آخر مؤشر. */
function lateStarts(css: string, kpis: number): string[] {
  const out: string[] = [];
  for (const { rule, decl } of animations(css)) {
    if (decl.prop !== "animation" || scrollDriven(rule)) continue;
    const delay = timesOf(decl.value)[1];
    if (!delay) continue;
    const worst = delayMs(delay, Math.max(0, kpis - 1));
    if (worst > MAX_DELAY_MS) out.push(`${rule.selector}: ${worst}ms`);
  }
  return out;
}

/* ── التجارب على المزروع (المادة ٣٠) ─────────────────────────────────── */

describe("الكواشف تحمرّ على انتهاكٍ مزروع (المادة ٣٠)", () => {
  it("حركةٌ خارج البوابة أو بلا مفتاح السكون تُلتقط", () => {
    const bare = `${MOTION}\n.nx-home-kpi-cell { animation: nxHomeRise 0.4s var(--nx-ease-out) backwards; }`;
    expect(optInViolations(bare)).toContain(".nx-home-kpi-cell");
    const unswitched = `${MOTION}\n@media (${GATE}) { .nx-home-map { animation: nxHomeSettle 0.4s var(--nx-ease-out) backwards; } }`;
    expect(optInViolations(unswitched)).toContain(".nx-home-map");
    // ذكر البوابة في تعليقٍ لا يُنجي قاعدةً خارجها.
    const commented = `${MOTION}\n/* @media (${GATE}) */ .x { animation: nxHomeRise 1s backwards; }`;
    expect(optInViolations(commented)).toContain(".x");
  });

  it("الدائم و`transform` يُلتقطان", () => {
    expect(perpetualOrTransform(MOTION.replace("0.42s", "0.42s infinite")).length).toBeGreaterThan(
      0,
    );
    expect(perpetualOrTransform(`${MOTION}\n.x { transform: translate(0, 10px); }`)).toContain(
      "transform: translate(0, 10px)",
    );
  });

  it("إطارٌ أوّل شفافٌ أو مخفيّ يُلتقط", () => {
    expect(hiddenFrames(MOTION.replace("opacity: 0.6;", "opacity: 0;"))).toEqual([
      "nxHomeRise: opacity 0",
    ]);
    expect(
      hiddenFrames(`${MOTION}\n@keyframes nxHomeGhost { from { visibility: hidden; } }`),
    ).toEqual(["nxHomeGhost: hidden"]);
  });

  it("`both` ومنحنى مرتجل يُلتقطان", () => {
    expect(fillOrEasingViolations(MOTION.replace("40ms) backwards", "40ms) both"))).toContain(
      `${SWITCH} .nx-home-kpi-cell: fill`,
    );
    expect(
      fillOrEasingViolations(
        // قاعدة الخريطة بعينها (البانر يستعمل الاسم والمدّة نفسيهما بلا تأخير).
        MOTION.replace(
          "nxHomeSettle 0.52s var(--nx-ease-out) 0.12s",
          "nxHomeSettle 0.52s ease 0.12s",
        ),
      ),
    ).toContain(`${SWITCH} .nx-home-map: easing`);
  });

  it("مخطّطٌ زمني قبل الاختصار، أو ظهورٌ بالشفافية، أو بلا `@supports` — يُلتقط", () => {
    const swapped = MOTION.replace(
      "animation: nxHomeLift linear backwards;\n      animation-timeline: view();",
      "animation-timeline: view();\n      animation: nxHomeLift linear backwards;",
    );
    expect(swapped).not.toBe(MOTION);
    expect(timelineViolations(swapped).some((v) => v.endsWith(": order"))).toBe(true);
    const faded = MOTION.replace("translate: 0 18px;", "translate: 0 18px;\n    opacity: 0.6;");
    expect(faded).not.toBe(MOTION);
    expect(timelineViolations(faded).some((v) => v.endsWith(": opacity"))).toBe(true);
    const unsupported = `${MOTION}\n.x { animation: nxHomeLift linear backwards; animation-timeline: view(); }`;
    expect(timelineViolations(unsupported)).toContain(".x: unsupported browsers");
  });

  it("تأخيرٌ متتابع يتجاوز الحدّ عند آخر مؤشر يُلتقط", () => {
    const slow = MOTION.replace(
      "0.42s var(--nx-ease-out) calc(var(--nx-i, 0) * 40ms)",
      "0.42s var(--nx-ease-out) calc(var(--nx-i, 0) * 90ms)",
    );
    expect(slow).not.toBe(MOTION);
    expect(lateStarts(slow, 7)).toEqual([`${SWITCH} .nx-home-kpi-cell: 540ms`]);
  });
});

/* ── العقد على الملفّ الحيّ ──────────────────────────────────────────── */

describe("حركة الرئيسية — اختيارٌ لمن لم يطلب السكون (WCAG 2.3.3)", () => {
  it("في الطبقة حركةٌ فعلًا — فلا تمرّ الفحوص على مجموعةٍ فارغة", () => {
    expect(animations(MOTION).length).toBeGreaterThanOrEqual(5);
    expect(kpiCount(REFERENCE)).toBe(7);
  });

  it("كل حركةٍ مسمّاة خلف `no-preference` ومفتاح `data-nx-motion`", () => {
    expect(optInViolations(MOTION)).toEqual([]);
  });

  it("لا حركة دائمة ولا `transform` (المادة ٣٢)", () => {
    expect(perpetualOrTransform(MOTION)).toEqual([]);
  });

  it("الإطار الأوّل مرئي (LCP) — والدخول يبدأ من شفافيةٍ جزئية لا من العدم", () => {
    expect(hiddenFrames(MOTION)).toEqual([]);
  });

  it("`backwards` وحدها ومنحنى النظام", () => {
    expect(fillOrEasingViolations(MOTION)).toEqual([]);
  });

  it("الظهور بالتمرير: خلف `@supports`، والمخطّط بعد الاختصار، وبلا شفافية", () => {
    let timelines = 0;
    postcss.parse(MOTION).walkDecls("animation-timeline", (d) => {
      if (d.value.trim() === "view()") timelines += 1;
    });
    expect(timelines).toBeGreaterThan(0);
    expect(timelineViolations(MOTION)).toEqual([]);
  });

  it(`لا عنصر ينتظر أكثر من ${MAX_DELAY_MS}ms — والمتتابع يُقاس عند آخر المؤشرات`, () => {
    expect(lateStarts(MOTION, kpiCount(REFERENCE))).toEqual([]);
  });

  it("الضغط استجابةٌ تبقى تحت تقليل الحركة — خارج البوابة", () => {
    const press: string[] = [];
    postcss.parse(MOTION).walkDecls("scale", (d) => {
      const rule = d.parent as Rule;
      if (
        rule.selector.includes(":active") &&
        !atChain(d).some((a) => a.includes("prefers-reduced-motion"))
      ) {
        press.push(rule.selector);
      }
    });
    expect(press.length).toBeGreaterThan(0);
  });

  it("الطبقة في حزمة الرئيسية المقتطَعة لا في الأنماط المشتركة", () => {
    expect(strip(PAGE)).toContain('import "@/styles/home/home-motion.css"');
    expect(GLOBAL_CSS).not.toMatch(/@keyframes\s+nxHome/);
  });
});

describe("الخاتمة — فعلٌ واضح بلا ادّعاء", () => {
  const CODE = strip(BAND);

  it("الفعل الأساسي يفتح لوحة سَدِيد الواحدة، والثاني اسمه من مرجع الأسماء", () => {
    expect(CODE).toContain("open({ focus: true })");
    expect(CODE).toContain('to="/sec"');
    expect(CODE).toContain('screenName("/sec", ar)');
  });

  it("لا رقم ولا نسبة مكتوبة في نصّها — لا عميل ولا شهادة مختلَقة", () => {
    // النصّ المرئي وحده: سلسلةٌ فيها حرفٌ عربي أو مسافة، وليست قيمة `className`
    // (أصناف الأدوات تحمل أرقامًا كـ`gap-2` ولا تُقرأ).
    const digits = (code: string) =>
      [...code.matchAll(/"[^"\n]*"|`[^`]*`/g)]
        .filter(
          (m) => !code.slice(Math.max(0, (m.index ?? 0) - 10), m.index).endsWith("className="),
        )
        .map((m) => m[0])
        .filter((s) => /[؀-ۿ]|\s/.test(s))
        .filter((s) => /[0-9٠-٩٪%]/.test(s));
    expect(digits(CODE.replace("جاهز لاتخاذ القرار؟", "٩٩٪ من العملاء جاهزون"))).toEqual([
      '"٩٩٪ من العملاء جاهزون"',
    ]);
    expect(digits(CODE)).toEqual([]);
  });

  it("الخاتمة بعد التحليلات وقبل الإفصاح، وأهدافها ≥ 44px", () => {
    const code = strip(PAGE);
    const ana = code.indexOf("<HomeAnalyticsRow />");
    const band = code.indexOf("<HomeClosingBand />");
    const footer = code.indexOf("<footer");
    expect(ana).toBeGreaterThan(-1);
    expect(band).toBeGreaterThan(ana);
    expect(footer).toBeGreaterThan(band);
    const cta = LAYOUT.slice(LAYOUT.indexOf(".nx-home-cta {"));
    expect(cta.slice(0, cta.indexOf("}"))).toContain("min-block-size: 44px");
  });
});

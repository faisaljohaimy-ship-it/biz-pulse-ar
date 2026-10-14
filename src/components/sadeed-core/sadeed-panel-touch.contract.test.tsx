/**
 * لوحة سَدِيد على اللمس وفي الوضع الآمن — حارس P0 ٢٠٢٦/١٠/١٤ (المشتبه #2).
 *
 * العطل: آيفون المالك يعرض صفحة سفاري القاتلة عند فتح سَدِيد. وقِيس على محاكاة
 * iPhone 14 Pro (‏DPR 3) بكتلتَي اللمس القائمتين: فتح اللوحة يرفع الحركات
 * الجارية من ٦ إلى ٦٥ (٦٤ مركَّبة، ~٢٠٢ ميغابايت سطوحًا حدًّا أعلى) لنحو ٣٠
 * ثانية بعد **كل** فتح — مصدرها `SadeedSignatureBackdrop` (طبقتا نصٍّ مائلتان
 * ‎852×1008‎ و١٤ صفًّا و١٢ حرفًا متحرّكًا)، ويرفع عناصر مرشّح الخلفية من ٢ إلى
 * ٦، أكبرها غطاءٌ بملء الشاشة يضبّب الفيلم الحيّ تحته.
 *
 * ما يحرسه هذا الملف:
 *
 *   ① كل عنصرٍ متحرّك في خلفية التوقيع يحمل صنفًا ثابتًا تبلغه الأنماط
 *      العامّة: `SIG_LAYER_CLASS` (لا يُرسم على اللمس/الآمن) أو
 *      `SIG_GLOW_CLASS` (ساكن). وصنفٌ يُضاف يومًا بحركةٍ بلا أحدهما يُسقطه.
 *   ② `styles.css` كما يراه المحلِّل: على اللمس طبقات التوقيع لا تُرسم والوهج
 *      ساكن، ولا مرشّح خلفية على الغطاء والنافذة وما فيها، والغطاء معتمٌ من
 *      الرمز؛ والوضع الآمن مثله. وسطح المكتب لا تمسّه قاعدة واحدة.
 *      **ونطاق `.sd-sig-layer` عامّ لا خاصٌّ باللوحة:** `/connect`
 *      (‏`routes/connect.tsx`، `<SadeedSignatureBackdrop intensity={1.2} />`)
 *      يفقد طبقات نصّ التوقيع كذلك على اللمس وفي الوضع الآمن (سطح المكتب لا
 *      يُمسّ — `desktopLeaks`). هذا الحارس يثبت السلوك القائم ولا يقرّره:
 *      حصره في `.sadeed-window .sd-sig-layer` إن كان على `/connect` أن يحتفظ
 *      بالتوقيع على الجوال **قرارٌ مفتوح للمالك أو المراجع**.
 *   ②ب الصفحة الرئيسية على اللمس — كتلتا الاستقرار الأوليان: حدّ الحركة بوزن
 *      المعرِّف `:not(#nx-coarse)` (يعلو حلقات `.nx-icon` و`[data-slot=button] > svg`
 *      اللانهائية `!important`)، و`body::after` مسمّى، والمزج عاديّ، والمرشّحات
 *      ساقطة عن الصور وSVG إلا خلفية البطاقة، والطبقات بملء الشاشة لا تُرسم،
 *      وحدود المناطق معوَّضة.
 *   ③ الفيلم يقف تحت اللوحة المفتوحة على اللمس وفي الوضع الآمن، ويُستأنف عند
 *      الإغلاق **إن كان يعمل حين أُوقف** (لا يُشغَّل فيلمٌ منعه الجهاز)، ولا
 *      يقف على سطح المكتب، ولا يُركَّب أصلًا في إقلاع الوضع الآمن؛
 *      و`SadeedCopilot` يكتب الإشارة التي يقرؤها `HoloVideoEngine` بالنصّ نفسه.
 *
 * المادة ٣٠: كل كاشفٍ هنا يُجرَّب أولًا على انتهاكٍ مزروع — أوّلها كتلتا
 * اللمس كما شُحنتا في b996d1e حرفيًّا.
 */
import { readFileSync } from "node:fs";
import { useEffect, useRef, type ComponentType } from "react";
import postcss, { type AtRule, type Container } from "postcss";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SIG_GLOW_CLASS,
  SIG_LAYER_CLASS,
  SadeedSignatureBackdrop,
} from "@/components/sadeed/SadeedSignatureBackdrop";
import {
  FILM_HOLD_QUERY,
  HoloVideoEngine,
  SADEED_PANEL_ATTR,
} from "@/components/home/HoloVideoEngine";
import { SAFE_MODE_CLASS } from "@/lib/sadeed/self-healing/crash-loop";

const CSS = readFileSync("src/styles.css", "utf8");
const COPILOT_SRC = readFileSync("src/components/sadeed-core/SadeedCopilot.tsx", "utf8");

/** التعليقات تُنزع قبل الفحص النصّي — الشرح يسمّي المحظور (المادة ٣٠ ③). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}
const COPILOT_CODE = stripComments(COPILOT_SRC);

/**
 * كتلتا اللمس والوضع الآمن كما شُحنت في b996d1e حرفيًّا — الانتهاك المزروع.
 * لا تذكر مرشّح الخلفية ولا خلفية التوقيع، فكل كاشفٍ في ② يحمرّ عليها.
 */
const B996D1E_CSS = `
html.safe-mode *,
html.safe-mode *::before,
html.safe-mode *::after {
  animation: none !important;
  transition: none !important;
  filter: none !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  box-shadow: none !important;
  will-change: auto !important;
  mix-blend-mode: normal !important;
}
@media (pointer: coarse) {
  body *:not(svg *):not(img) {
    filter: none !important;
  }
  body *,
  body *::before,
  body *::after {
    animation-iteration-count: 1 !important;
    will-change: auto !important;
  }
}
`;

/* ═══════════════════════════════════════════════════════════════════════
   أدوات المحلِّل
   ═══════════════════════════════════════════════════════════════════════ */

type Context = "coarse" | "safe";
type DeclOptions = { raw?: boolean; important?: boolean };

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

function isCoarseMedia(node: Container | undefined): boolean {
  return (
    node?.type === "atrule" &&
    (node as AtRule).name === "media" &&
    norm((node as AtRule).params) === FILM_HOLD_QUERY
  );
}

/**
 * هل في `css` قاعدةٌ في السياق المطلوب، أحدُ محدِّداتها `selector` (بعد نزع وزن
 * المعرِّف `:not(#nx-coarse)`)، تُعلن `prop` بقيمةٍ تطابق `value` و`!important`؟
 *
 * - `coarse`: القاعدة داخل `@media (pointer: coarse)`.
 * - `safe`: القاعدة في الجذر، ومحدِّدها يبدأ بـ`html.safe-mode`.
 *
 * `raw`: يُقارن المحدِّد كما كُتب — بوزن المعرِّف — حين يكون الوزن نفسه هو
 * المحروس. `important: false`: إعلانٌ عاديّ (تعويضٌ لا إسقاط).
 */
function declares(
  css: string,
  context: Context,
  selector: string,
  prop: string,
  value: RegExp,
  { raw = false, important = true }: DeclOptions = {},
): boolean {
  let found = false;
  postcss.parse(css).walkRules((rule) => {
    const inCoarse = isCoarseMedia(rule.parent as Container);
    if (context === "coarse" ? !inCoarse : rule.parent?.type !== "root") return;
    const selectors = rule.selectors.map((s) =>
      norm(raw ? s : s.replace(/:not\(#nx-coarse\)/g, "")),
    );
    if (!selectors.includes(selector)) return;
    rule.walkDecls(prop, (decl) => {
      // postcss يترك `important` غير معرَّف على الإعلان العاديّ — لا `false`.
      if (Boolean(decl.important) === important && value.test(norm(decl.value))) found = true;
    });
  });
  return found;
}

const SAFE = `html.${SAFE_MODE_CLASS}`;
const TOKEN_SCRIM = /^color-mix\(in srgb, var\(--background\) 8\d%, transparent\)$/;

/* ═══════════════════════════════════════════════════════════════════════
   ① كل حركةٍ في خلفية التوقيع تبلغها الأنماط العامّة
   ═══════════════════════════════════════════════════════════════════════ */

/** أصناف القواعد التي تحمل حركةً في `<style>` المكوّن (خارج تقليل الحركة). */
function animatedClasses(styleText: string): string[] {
  const out = new Set<string>();
  postcss.parse(styleText).walkRules((rule) => {
    if (rule.parent?.type !== "root") return;
    let moves = false;
    rule.walkDecls(/^animation(-name)?$/, (decl) => {
      if (!/^none\b/.test(decl.value)) moves = true;
    });
    if (!moves) return;
    for (const sel of rule.selectors) {
      const cls = sel.trim().match(/^\.([^\s.:[>+~]+)/)?.[1];
      if (cls) out.add(cls);
    }
  });
  return [...out];
}

/**
 * العناصر المتحرّكة التي **لا** تبلغها أنماط اللمس: لا هي داخل طبقةٍ تحمل
 * `SIG_LAYER_CLASS` (فلا تُرسم) ولا تحمل `SIG_GLOW_CLASS` (فتسكن).
 */
function uncoveredAnimated(root: Element): string[] {
  const styleText = [...root.querySelectorAll("style")].map((s) => s.textContent ?? "").join("\n");
  const classes = animatedClasses(styleText);
  expect(classes.length, "لا حركة مقروءة في المكوّن — الكاشف أعمى").toBeGreaterThan(0);
  const uncovered: string[] = [];
  for (const cls of classes) {
    for (const el of root.getElementsByClassName(cls)) {
      if (el.closest(`.${SIG_LAYER_CLASS}`)) continue;
      if (el.classList.contains(SIG_GLOW_CLASS)) continue;
      uncovered.push(cls);
    }
  }
  return uncovered;
}

describe("① خلفية التوقيع: كل عنصرٍ متحرّك يحمل صنفًا ثابتًا", () => {
  it("الكاشف يحمرّ على المكوّن بلا الأصناف الثابتة (المادة ٣٠)", () => {
    const { container } = render(<SadeedSignatureBackdrop />);
    // نسخة b996d1e: الطبقات نفسها بلا الصنفين.
    for (const el of [...container.querySelectorAll(`.${SIG_LAYER_CLASS}, .${SIG_GLOW_CLASS}`)]) {
      el.classList.remove(SIG_LAYER_CLASS, SIG_GLOW_CLASS);
    }
    const uncovered = uncoveredAnimated(container);
    // الصفوف والطبقتان المائلتان والحروف الطائرة والوهج كلّها مكشوفة.
    expect(uncovered.length).toBeGreaterThanOrEqual(14 + 2 + 12 + 1);
  });

  it("المكوّن: لا عنصر متحرّك خارج الصنفين — والطبقات الثقيلة كلّها تحت SIG_LAYER_CLASS", () => {
    const { container } = render(<SadeedSignatureBackdrop />);
    expect(uncoveredAnimated(container)).toEqual([]);
    // الطبقتان المائلتان وحقل الحروف — ثلاث طبقات بالضبط، والوهج واحد.
    expect(container.getElementsByClassName(SIG_LAYER_CLASS)).toHaveLength(3);
    expect(container.getElementsByClassName(SIG_GLOW_CLASS)).toHaveLength(1);
    // والتدرّج الشعاعيّ باقٍ على الحاوية — الهويّة التي تبقى على اللمس.
    const host = container.firstElementChild as HTMLElement;
    expect(host.getAttribute("style")).toMatch(/radial-gradient/);
    expect(host.classList.contains(SIG_LAYER_CLASS)).toBe(false);
  });

  it("بلا وهج (`glow={false}`) يبقى العقد قائمًا", () => {
    const { container } = render(<SadeedSignatureBackdrop glow={false} />);
    expect(uncoveredAnimated(container)).toEqual([]);
    expect(container.getElementsByClassName(SIG_GLOW_CLASS)).toHaveLength(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ② الأنماط كما يراها المحلِّل
   ═══════════════════════════════════════════════════════════════════════ */

/** المطلوب في السياقين — كلّ بندٍ [السياق، المحدِّد، الخاصية، القيمة]. */
const REQUIRED: Array<[Context, string, string, RegExp]> = [
  // (a) خلفية التوقيع ساكنة: الطبقات لا تُرسم، والوهج بلا حركة.
  ["coarse", `.${SIG_LAYER_CLASS}`, "display", /^none$/],
  ["coarse", `.${SIG_GLOW_CLASS}`, "animation", /^none$/],
  ["safe", `${SAFE} .${SIG_LAYER_CLASS}`, "display", /^none$/],
  ["safe", `${SAFE} *`, "animation", /^none$/],
  // (b) لا مرشّح خلفية على الغطاء والنافذة وما فيها.
  ...([".sadeed-chat-scrim", ".sadeed-window", ".sadeed-window *"] as const).flatMap(
    (sel) =>
      [
        ["coarse", sel, "backdrop-filter", /^none$/],
        ["coarse", sel, "-webkit-backdrop-filter", /^none$/],
      ] as Array<[Context, string, string, RegExp]>,
  ),
  ["safe", `${SAFE} *`, "backdrop-filter", /^none$/],
  ["safe", `${SAFE} *`, "-webkit-backdrop-filter", /^none$/],
  // والغطاء يعوَّض عن ضبابته بعتمةٍ من الرمز.
  ["coarse", ".sadeed-chat-scrim", "background", TOKEN_SCRIM],
  ["safe", `${SAFE} .sadeed-chat-scrim`, "background", TOKEN_SCRIM],
];

const label = ([ctx, sel, prop]: [Context, string, string, RegExp]) => `${ctx} · ${sel} · ${prop}`;

/**
 * القواعد التي تُسقط شيئًا من اللوحة **خارج** اللمس والوضع الآمن — أي على
 * سطح المكتب. يجب أن تكون صفرًا.
 */
function desktopLeaks(css: string): string[] {
  const leaks: string[] = [];
  postcss.parse(css).walkRules((rule) => {
    if (isCoarseMedia(rule.parent as Container)) return;
    for (const sel of rule.selectors.map(norm)) {
      if (!/sd-sig-(layer|glow)/.test(sel)) continue;
      if (sel.startsWith(`${SAFE} `)) continue;
      leaks.push(sel);
    }
  });
  return leaks;
}

describe("② styles.css: اللوحة على اللمس وفي الوضع الآمن", () => {
  it("الكاشف يحمرّ على كتلتَي b996d1e المزروعتين (المادة ٣٠)", () => {
    const missing = REQUIRED.filter(
      ([ctx, sel, prop, value]) => !declares(B996D1E_CSS, ctx, sel, prop, value),
    );
    // الباقي فيها هو ما كان الوضع الآمن يفعله أصلًا: حركةٌ ومرشّح خلفية عامّان.
    expect(missing.map(label)).toEqual(
      REQUIRED.filter(([ctx, sel]) => !(ctx === "safe" && sel === `${SAFE} *`)).map(label),
    );
  });

  it.each(REQUIRED.map((r) => [label(r), r] as const))("%s", (_name, [ctx, sel, prop, value]) => {
    expect(declares(CSS, ctx, sel, prop, value)).toBe(true);
  });

  it("نطاق `.sd-sig-layer` عامّ: `/connect` يركّب الخلفية نفسها — قرارٌ مفتوح للمالك (انظر الرأس)", () => {
    // يثبت أن ملاحظة النطاق في الرأس وفي `styles.css` ما زالت صادقة: إن كفّ
    // `/connect` عن تركيب الخلفية أو حُصرت القاعدة في النافذة، تُحدَّث الملاحظة.
    const connect = stripComments(readFileSync("src/routes/connect.tsx", "utf8"));
    expect(connect).toMatch(/<SadeedSignatureBackdrop\b/);
    expect(declares(CSS, "coarse", `.${SIG_LAYER_CLASS}`, "display", /^none$/)).toBe(true);
    expect(declares(CSS, "coarse", `.sadeed-window .${SIG_LAYER_CLASS}`, "display", /^none$/)).toBe(
      false,
    );
  });

  it("سطح المكتب لا تمسّه قاعدة — ويحمرّ على قاعدةٍ مزروعة خارج اللمس", () => {
    expect(desktopLeaks(`.${SIG_LAYER_CLASS} { display: none !important; }`)).toEqual([
      `.${SIG_LAYER_CLASS}`,
    ]);
    expect(desktopLeaks(CSS)).toEqual([]);
  });

  it("المحدِّدان يبلغان عناصر حقيقية في SadeedCopilot", () => {
    expect(COPILOT_CODE).toMatch(/className="sadeed-chat-scrim\b/);
    expect(COPILOT_CODE).toMatch(/"nexus-window sadeed-window\b/);
    // والخلفية داخل النافذة: هي ما يُعاد تركيبه عند كل فتح.
    expect(COPILOT_CODE).toMatch(
      /function SadeedPanelBackdrop[\s\S]*?<SadeedSignatureBackdrop \/>/,
    );
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ②ب الصفحة الرئيسية على اللمس — كتلتا الاستقرار الأوليان
   ═══════════════════════════════════════════════════════════════════════ */

/** وزن المعرِّف الذي يعلو كل قاعدةٍ صنفيّة `!important` (حلقات `.nx-icon`). */
const ID = ":not(#nx-coarse)";

/**
 * أكبر إصلاحات الرئيسية المقيسة — كلّ بندٍ [المحدِّد، الخاصية، القيمة، الخيارات].
 * المحدِّدات `raw` تُقارن بوزن المعرِّف: نزعُه يُعيد ٢٤ أيقونة تتنفّس بلا نهاية
 * لأن `!important` أمام `!important` تحسمه النوعية.
 */
type HomeReq = [selector: string, prop: string, value: RegExp, options: DeclOptions];

const HOME_REQUIRED: HomeReq[] = [
  // (a) لا حركة لانهائية: المحدِّد العامّ بوزن معرِّف، والعناصر الزائفة معه،
  //     و`body::after` (ليس من أبناء body) مسمّى بنفسه.
  ...[`body *${ID}`, `body *${ID}::before`, `body *${ID}::after`, `body${ID}::after`].flatMap(
    (sel) =>
      [
        [sel, "animation-iteration-count", /^1$/, { raw: true }],
        [sel, "will-change", /^auto$/, { raw: true }],
        [sel, "mix-blend-mode", /^normal$/, { raw: true }],
      ] satisfies HomeReq[],
  ),
  // (b) المرشّحات تسقط عن الصور وSVG كذلك — إلا خلفية البطاقة بالاسم (شرط صدق،
  //     المادة ٢٧، وتتاليها محسوبٌ في sadeed-stage-background.contract.test.ts).
  [`body *${ID}:not(.sd-stage-card > img)`, "filter", /^none$/, { raw: true }],
  [`body *${ID}::before`, "filter", /^none$/, { raw: true }],
  [`body *${ID}::after`, "filter", /^none$/, { raw: true }],
  [`body${ID}::after`, "filter", /^none$/, { raw: true }],
  // (c) الطبقات بملء الشاشة لا تُرسم.
  ...[
    `body${ID}::after`,
    ".nx-holo-ambience",
    ".nx-hv-aurora",
    ".nx-hv-grid",
    ".nx-hv-vignette",
    ".nx-hv-noise",
    ".aria-watermark",
  ].map((sel): HomeReq => [sel, "display", /^none$/, { raw: true }]),
  // (d) حدود المناطق تُعوَّض عن `drop-shadow` بالحدّ نفسه أعرض — تعويضٌ لا إسقاط.
  [".nx-arabia-province", "stroke-width", /^2$/, { important: false }],
  [".nx-arabia-province", "stroke-opacity", /^1$/, { important: false }],
];

const homeLabel = ([sel, prop]: HomeReq) => `coarse · ${sel} · ${prop}`;

/**
 * كتلة اللمس كما شُحنت في b996d1e حرفيًّا — الانتهاك المزروع لـ②ب. وفوقها نسخةٌ
 * من الكتلة الحالية **منزوعة الوزن**: تبقى المحدِّدات بعد النزع، فيُثبت أن
 * الكاشف يقرأ الوزن ولا يكتفي بالاسم.
 */
const PLANTED_HOME_BLOCKS = {
  b996d1e: `
@media (pointer: coarse) {
  body *:not(svg *):not(img) {
    filter: none !important;
  }
  body *,
  body *::before,
  body *::after {
    animation-iteration-count: 1 !important;
    will-change: auto !important;
  }
}
`,
  "بلا وزن المعرِّف": CSS.replaceAll(ID, ""),
};

describe("②ب styles.css: الصفحة الرئيسية على اللمس", () => {
  it("الكاشف يحمرّ على كتلة b996d1e المزروعة: كل بندٍ مفقود (المادة ٣٠)", () => {
    const present = HOME_REQUIRED.filter(([sel, prop, value, opts]) =>
      declares(PLANTED_HOME_BLOCKS.b996d1e, "coarse", sel, prop, value, opts),
    );
    expect(present.map(homeLabel)).toEqual([]);
  });

  it("والكاشف يحمرّ على الكتلة الحالية منزوعة وزن المعرِّف (المادة ٣٠)", () => {
    const planted = PLANTED_HOME_BLOCKS["بلا وزن المعرِّف"];
    expect(planted).not.toContain(ID);
    const present = HOME_REQUIRED.filter(
      ([sel, prop, value, opts]) =>
        opts.raw === true && declares(planted, "coarse", sel, prop, value, opts),
    );
    // كل بندٍ يحرس الوزن يسقط؛ و`display: none` على الأصناف المسمّاة لا وزن فيها.
    expect(present.map(homeLabel)).toEqual(
      HOME_REQUIRED.filter(([sel, , , opts]) => opts.raw === true && !sel.includes(ID)).map(
        homeLabel,
      ),
    );
  });

  it.each(HOME_REQUIRED.map((r) => [homeLabel(r), r] as const))(
    "%s",
    (_name, [sel, prop, value, opts]) => {
      expect(declares(CSS, "coarse", sel, prop, value, opts)).toBe(true);
    },
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   ③ الفيلم يقف تحت اللوحة المفتوحة
   ═══════════════════════════════════════════════════════════════════════ */

describe("③ الفيلم يقف تحت لوحة سَدِيد على اللمس وفي الوضع الآمن", () => {
  const originalMatchMedia = window.matchMedia;
  let pause: ReturnType<typeof vi.spyOn>;
  let play: ReturnType<typeof vi.spyOn>;
  let touch = false;
  let touchListeners: Array<() => void> = [];
  /**
   * حالة الفيلم كما يراها `video.paused` — jsdom لا يشغّل وسائط، فالحالة
   * صريحة: يعمل افتراضًا (تشغيلٌ تلقائيّ نجح)، و`pause()`/`play()` يقلبانها.
   */
  let playing = true;
  const root = document.documentElement;

  beforeEach(() => {
    touch = false;
    touchListeners = [];
    playing = true;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        get matches() {
          return query === FILM_HOLD_QUERY && touch;
        },
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_: string, fn: () => void) => {
          if (query === FILM_HOLD_QUERY) touchListeners.push(fn);
        },
        removeEventListener: (_: string, fn: () => void) => {
          touchListeners = touchListeners.filter((f) => f !== fn);
        },
        dispatchEvent: () => false,
      }),
    });
    vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(() => !playing);
    pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {
      playing = false;
    });
    play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => {
      playing = true;
      return Promise.resolve();
    });
  });

  afterEach(() => {
    root.removeAttribute(SADEED_PANEL_ATTR);
    root.classList.remove(SAFE_MODE_CLASS);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    vi.restoreAllMocks();
  });

  /** مراقب التبدّل يُبلَّغ في مهمّة دقيقة — تُفرَّغ قبل القراءة. */
  async function flush(): Promise<void> {
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  }

  async function setPanel(open: boolean): Promise<void> {
    if (open) root.setAttribute(SADEED_PANEL_ATTR, "open");
    else root.removeAttribute(SADEED_PANEL_ATTR);
    await flush();
  }

  /**
   * المسبار: يُركّب الطبقة، ثم `afterMount` (إن وُجد)، ويفتح اللوحة ثم يغلقها،
   * ويعدّ الإيقاف والاستئناف.
   */
  async function probe(
    Layer: ComponentType,
    afterMount?: () => Promise<void>,
  ): Promise<{ paused: number; resumed: number }> {
    const { container } = render(<Layer />);
    expect(container.querySelector("video"), "لا فيلم أصلًا — المسبار أجوف").not.toBeNull();
    await afterMount?.();
    await setPanel(true);
    const paused = pause.mock.calls.length;
    await setPanel(false);
    return { paused, resumed: play.mock.calls.length };
  }

  /** فيلم b996d1e: يعمل تحت اللوحة ما دام مركَّبًا — الانتهاك المزروع. */
  function PlantedFilm() {
    return <video className="nx-hv-film" autoPlay muted loop playsInline />;
  }

  /**
   * الإيقاف كما كان قبل الإصلاح: يُوقف عند الفتح ويستأنف عند **كل** إغلاق،
   * ولو لم يكن الفيلم يعمل — الانتهاك المزروع لفيلمٍ منعه الجهاز.
   */
  function PlantedAlwaysResume() {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
      const video = ref.current;
      if (!video) return;
      let held = false;
      const sync = () => {
        const hold = root.getAttribute(SADEED_PANEL_ATTR) === "open";
        if (hold === held) return;
        held = hold;
        if (hold) video.pause();
        else void video.play();
      };
      const observer = new MutationObserver(sync);
      observer.observe(root, { attributes: true, attributeFilter: [SADEED_PANEL_ATTR] });
      return () => observer.disconnect();
    }, []);
    return <video ref={ref} className="nx-hv-film" muted loop playsInline />;
  }

  it("المسبار يحمرّ على فيلمٍ لا يقف (المادة ٣٠)", async () => {
    touch = true;
    expect(await probe(PlantedFilm)).toEqual({ paused: 0, resumed: 0 });
  });

  it("اللمس: يقف عند الفتح ويُستأنف عند الإغلاق — مرّةً واحدة لكلٍّ", async () => {
    touch = true;
    expect(await probe(HoloVideoEngine)).toEqual({ paused: 1, resumed: 1 });
  });

  it("المسبار يحمرّ على إيقافٍ يستأنف كل إغلاق: فيلمٌ ساكن يُشغَّل (المادة ٣٠)", async () => {
    touch = true;
    playing = false;
    expect((await probe(PlantedAlwaysResume)).resumed).toBe(1);
  });

  it("فيلمٌ ساكن قبل الفتح (توفير الطاقة منع تشغيله): لا يُشغَّل عند الإغلاق", async () => {
    touch = true;
    playing = false;
    expect(await probe(HoloVideoEngine)).toEqual({ paused: 0, resumed: 0 });
  });

  it("الوضع الآمن يُدخل في أثناء الجلسة على سطح المكتب: يقف كذلك", async () => {
    expect(
      await probe(HoloVideoEngine, async () => {
        root.classList.add(SAFE_MODE_CLASS);
        await flush();
      }),
    ).toEqual({ paused: 1, resumed: 1 });
  });

  it("سطح المكتب: لا يُمسّ الفيلم", async () => {
    expect(await probe(HoloVideoEngine)).toEqual({ paused: 0, resumed: 0 });
  });

  it.each([
    ["سطح المكتب", false],
    ["اللمس", true],
  ])(
    "إقلاع الوضع الآمن (%s): لا عنصر فيلم أصلًا — ويحمرّ على فيلمٍ يُركَّب فيه (المادة ٣٠)",
    async (_name, onTouch) => {
      touch = onTouch;
      root.classList.add(SAFE_MODE_CLASS);
      const planted = render(<PlantedFilm />);
      expect(planted.container.querySelector("video")).not.toBeNull();
      planted.unmount();

      const { container } = render(<HoloVideoEngine />);
      await flush();
      expect(container.querySelector("video")).toBeNull();
      // والقشرة الساكنة باقية: الغطاء وطبقات العمق مرسومة.
      expect(container.querySelector(".nx-hv-scrim")).not.toBeNull();
    },
  );

  it("لوحةٌ مفتوحة قبل تركيب الفيلم: التشغيل التلقائيّ حين يصل يُوقف، ويُستأنف عند الإغلاق", async () => {
    touch = true;
    // التشغيل التلقائيّ لم يبدأ بعد: بيانات الفيلم لم تصل لحظة التركيب.
    playing = false;
    root.setAttribute(SADEED_PANEL_ATTR, "open");
    const { container } = render(<HoloVideoEngine />);
    await flush();
    expect(pause).not.toHaveBeenCalled();
    // وصلت البيانات فبدأ التشغيل التلقائيّ تحت اللوحة.
    playing = true;
    container.querySelector("video")?.dispatchEvent(new Event("play"));
    expect(pause).toHaveBeenCalledTimes(1);
    expect(play).not.toHaveBeenCalled();
    await setPanel(false);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("تبديل الجهاز في أثناء الجلسة واللوحة مفتوحة ينفذ في الاتجاهين", async () => {
    render(<HoloVideoEngine />);
    await setPanel(true);
    expect(pause).not.toHaveBeenCalled();
    touch = true;
    for (const fn of [...touchListeners]) fn();
    expect(pause).toHaveBeenCalledTimes(1);
    touch = false;
    for (const fn of [...touchListeners]) fn();
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("الفكّ ينزع المراقب: لا إيقاف بعد أن تُفكّ الطبقة", async () => {
    touch = true;
    const { unmount } = render(<HoloVideoEngine />);
    unmount();
    await setPanel(true);
    expect(pause).not.toHaveBeenCalled();
    expect(touchListeners).toHaveLength(0);
  });

  /** الكاتب: أثرٌ على `isOpen` يرفع الإشارة وينزعها عند الإغلاق والفكّ. */
  const WRITER =
    /useEffect\(\(\) => \{\s*if \(!isOpen\) return;\s*const root = document\.documentElement;\s*root\.setAttribute\("([\w-]+)", "open"\);\s*return \(\) => root\.removeAttribute\("([\w-]+)"\);\s*\}, \[isOpen\]\);/;

  it("SadeedCopilot يكتب الإشارة نفسها وينزعها — ويحمرّ على كاتبٍ بلا نزع (المادة ٣٠)", () => {
    const planted = `useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    root.setAttribute("data-sadeed-panel", "open");
  }, [isOpen]);`;
    expect(planted).not.toMatch(WRITER);
    const m = COPILOT_CODE.match(WRITER);
    expect(m, "SadeedCopilot لا يكتب إشارة اللوحة").not.toBeNull();
    expect(m?.[1]).toBe(SADEED_PANEL_ATTR);
    expect(m?.[2]).toBe(SADEED_PANEL_ATTR);
  });

  it("استعلام الإيقاف هو استعلام كتل اللمس في الأنماط", () => {
    let blocks = 0;
    postcss.parse(CSS).walkAtRules("media", (at) => {
      if (norm(at.params) === FILM_HOLD_QUERY) blocks += 1;
    });
    expect(blocks).toBeGreaterThanOrEqual(3);
  });
});

/**
 * عقد شريط «مزايا سَدِيد» وزرّ «إيقاف الحركة» الواحد (أمر المالك ٢٠٢٦/١٠/١٨ R3: «وكون
 * الشريط الإعلاني المتحرك باستمرار يعلو علامة سديد الموجودة فالمرفق»).
 *
 * الأمر نسخ «لا حركة دائمة» (M1) **لهذا الشريط وحده** — ومعه توهّجٌ ينجرف خلف إطار البانر
 * من موجّه المرحلة نفسها. وما يكسرهما لا يراه tsc ولا البناء:
 *   • سرعةٌ تُقرأ أو لا تُقرأ — أو مدّةٌ ثابتة فتتبدّل السرعة بطول المحتوى؛
 *   • فجوةٌ تظهر عند الوصلة على شاشةٍ أعرض من النسخة؛
 *   • حركةٌ لمن طلب السكون أو أطفأ الحركة أو في الوضع الآمن؛
 *   • زرّ إيقافٍ بلا حالةٍ مُعلنة، أو أصغر من 44px، أو ظاهرٌ حيث لا شيء يتحرّك؛
 *   • اختصار `animation` يعيد `animation-play-state` إلى `running` فيُبطل الإيقاف
 *     (وقع فعلًا: ضُغط الزرّ وبقي الشريط يجري — ٢٠٢٦/١٠/١٨)؛
 *   • نسخةٌ مطابقة يقرؤها القارئ مرّتين، أو منطقةٌ حيّة تُعلن ما لا يتبدّل؛
 *   • سطرٌ لا مصدر له، أو رقمٌ أو ادّعاءٌ أو اسم منطقة مكتوب.
 *
 * وكل كاشفٍ دالّةٌ تُجرَّب أولًا على انتهاكٍ مزروع (المادة ٣٠)، والقراءة بمحلّل CSS
 * لا بنصّ، والكود منزوع التعليقات.
 */
import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import postcss, { type AtRule, type ChildNode, type Node, type Rule } from "postcss";
import { act, fireEvent, render } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { REGIONS } from "@/lib/regions";
import {
  TICKER_LINES,
  TICKER_PX_PER_S,
  TICKER_SPEED_RANGE,
  buildTickerLines,
  regionsCountWord,
  type TickerLine,
} from "@/components/home/home-ticker-content";
import { HomeTicker, tickerLoop, type TickerLoop } from "@/components/home/HomeTicker";
import { HomeBrandRow, MOTION_PAUSE_EVENT } from "@/components/home/HomeBrandRow";

const SRC = readFileSync("src/components/home/HomeTicker.tsx", "utf8");
const ROW = readFileSync("src/components/home/HomeBrandRow.tsx", "utf8");
const CONTENT = readFileSync("src/components/home/home-ticker-content.ts", "utf8");
const CSS = readFileSync("src/styles/home/home-ticker.css", "utf8");
const BRAND_CSS = readFileSync("src/styles/home/home-brand.css", "utf8");

const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const CODE = strip(SRC);
const ROW_CODE = strip(ROW);
const CONTENT_CODE = strip(CONTENT);

const GATE = "prefers-reduced-motion: no-preference";
/** بوّابة الحركة الدائمة: مفتاح النظام والوضع الآمن معًا. */
const SWITCH = 'html:not([data-nx-motion="off"]):not(.safe-mode)';

/* ── أدوات القراءة ───────────────────────────────────────────────────── */

/** نصوص القواعد الحاوية — `@media …` من الأقرب. */
function atChain(node: ChildNode): string[] {
  const out: string[] = [];
  for (let p = node.parent as Node | undefined; p && p.type !== "root"; p = p.parent as Node) {
    if (p.type === "atrule") out.push(`@${(p as AtRule).name} ${(p as AtRule).params}`);
  }
  return out;
}

const inKeyframes = (node: ChildNode) => atChain(node).some((a) => a.startsWith("@keyframes"));

/** تصريحات القاعدة الأولى التي يطابق محدِّدُها `selector` حرفيًّا — داخل `@media` معيّن أو خارجها. */
function declsOf(css: string, selector: string, media: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(css).walkRules((rule) => {
    const flat = (s: string) => s.replace(/\s+/g, " ").trim();
    if (inKeyframes(rule) || !rule.selectors.some((s) => flat(s) === selector)) return;
    const chain = atChain(rule).filter((a) => a.startsWith("@media"));
    const where = chain.length === 0 ? null : chain.join(" ");
    if (media === null ? where !== null : !(where ?? "").includes(media)) return;
    rule.walkDecls((d) => {
      out[d.prop] = d.value.trim();
    });
  });
  return out;
}

const px = (v: string | undefined) => (v && /^\d+(\.\d+)?px$/.test(v) ? parseFloat(v) : NaN);

/* ── الكواشف — دوالّ تُعيد المخالفات، فتُجرَّب على المزروع ─────────────── */

/** ① السرعة داخل الحدّين. */
function speedViolations(speed: number, range = TICKER_SPEED_RANGE): string[] {
  const out: string[] = [];
  if (!(speed >= range.min)) out.push(`أبطأ من ${range.min}px/ث`);
  if (!(speed <= range.max)) out.push(`أسرع من ${range.max}px/ث`);
  return out;
}

/** ② الحلقة: سرعةٌ ثابتة مهما طال المحتوى، ولا فجوة على أيّ عرضٍ حتى 2560px. */
const LOOP_GRID = {
  copies: [280, 700, 1200, 2334, 3440],
  views: [312, 690, 1138, 1408, 1920, 2304, 2560],
};
function loopViolations(
  loop: (copy: number, view: number) => TickerLoop | null,
  speed = TICKER_PX_PER_S,
): string[] {
  const out: string[] = [];
  for (const copy of LOOP_GRID.copies) {
    for (const view of LOOP_GRID.views) {
      const l = loop(copy, view);
      if (!l) {
        out.push(`${copy}/${view}: لا حلقة`);
        continue;
      }
      if (l.copies < 2) out.push(`${copy}/${view}: نسخةٌ واحدة`);
      if ((l.copies - 1) * copy < view) out.push(`${copy}/${view}: فجوة`);
      if (Math.abs(l.seconds * speed - copy) > 0.01) out.push(`${copy}/${view}: سرعةٌ متبدّلة`);
    }
  }
  return out;
}

/** ③ كل حركةٍ مسمّاة خلف بوابة التفضيل والمفتاح والوضع الآمن، وعلى `[data-run]` وحده. */
function ungatedMotion(css: string, runAttr = "[data-run]"): string[] {
  const out: string[] = [];
  postcss.parse(css).walkDecls((d) => {
    if (d.prop !== "animation" && d.prop !== "animation-name") return;
    if (/^none\b/.test(d.value.trim()) || inKeyframes(d)) return;
    const rule = d.parent as Rule;
    const gated =
      atChain(d).some((a) => a.startsWith("@media") && a.includes(GATE)) &&
      rule.selectors.every((s) => s.startsWith(SWITCH) && s.includes(runAttr));
    if (!gated) out.push(rule.selector);
  });
  return out;
}

/** ④ لا اختصار `animation` لحركةٍ مسمّاة: يعيد `animation-play-state` فيغلب الإيقاف. */
function shorthandResets(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkDecls("animation", (d) => {
    if (!/^none\b/.test(d.value.trim()) && !inKeyframes(d)) out.push((d.parent as Rule).selector);
  });
  return out;
}

/** ⑤ قواعد الإيقاف: الزرّ، وخارج الإطار، والتركيز، والفأرة (تحت `hover: hover`). */
function missingPauses(css: string, target: string): string[] {
  const found = { paused: false, offscreen: false, focus: false, hover: false };
  postcss.parse(css).walkDecls("animation-play-state", (d) => {
    if (d.value.trim() !== "paused") return;
    const rule = d.parent as Rule;
    for (const s of rule.selectors) {
      if (!s.includes(target)) continue;
      if (s.includes("[data-paused]")) found.paused = true;
      if (s.includes("[data-offscreen]")) found.offscreen = true;
      if (s.includes(":focus-within")) found.focus = true;
      if (s.includes(":hover") && atChain(d).some((a) => a.includes("hover: hover")))
        found.hover = true;
    }
  });
  return Object.entries(found)
    .filter(([, v]) => !v)
    .map(([k]) => k);
}

/** ⑥ الحال الأساسية ساكنة، والحركة تُبدّلها داخل البوابة وحدها. */
function staticModeGaps(css: string): string[] {
  const out: string[] = [];
  const base = (sel: string) => declsOf(css, sel, null);
  const moving = (sel: string) => declsOf(css, `${SWITCH} ${sel}`, GATE);
  if (base('.nx-ticker-copy[aria-hidden="true"]').display !== "none")
    out.push("النسخ ظاهرة ساكنًا");
  if (base(".nx-ticker-toggle").display !== "none") out.push("الزرّ ظاهرٌ ساكنًا");
  if (base(".nx-ticker-view")["overflow-x"] !== "auto") out.push("القائمة الساكنة لا تُمرَّر");
  if (moving('.nx-ticker-copy[aria-hidden="true"]').display !== "flex")
    out.push("النسخ لا تظهر مع الحركة");
  if (moving(".nx-ticker-toggle").display !== "grid") out.push("الزرّ لا يظهر مع الحركة");
  if (moving(".nx-ticker-view").overflow !== "hidden") out.push("النافذة لا تقصّ مع الحركة");
  return out;
}

/** ⑦ أهداف اللمس: الزرّ ≥ 44px في البعدين، والشريط يتّسع له داخل حدّيه (≥ 46px). */
function targetGaps(css: string): string[] {
  const out: string[] = [];
  const toggle = declsOf(css, ".nx-ticker-toggle", null);
  if (!(px(toggle["min-inline-size"]) >= 44)) out.push("عرض الزرّ");
  if (!(px(toggle["min-block-size"]) >= 44)) out.push("ارتفاع الزرّ");
  if (!(px(declsOf(css, ".nx-ticker", null)["block-size"]) >= 46)) out.push("ارتفاع الشريط");
  return out;
}

/** ⑧ زرّ الإيقاف: زرٌّ حقيقي بحالةٍ مُعلنة واسمٍ ثابت، يُرسَم دائمًا (الإخفاء للـCSS). */
function pauseButtonGaps(code: string): string[] {
  const at = code.indexOf('className="nx-ticker-toggle');
  if (at === -1) return ["لا زرّ"];
  const button = code.slice(code.lastIndexOf("<button", at), code.indexOf("</button>", at));
  const out: string[] = [];
  for (const need of [
    'type="button"',
    "aria-pressed={paused}",
    "aria-label={pauseLabel}",
    "onClick={() => onPausedChange(!paused)}",
  ]) {
    if (!button.includes(need)) out.push(need);
  }
  if (!code.includes('"إيقاف الحركة"') || !code.includes('"Pause motion"')) out.push("الاسم");
  if (/\{\s*\w+\s*&&\s*\(\s*<button/.test(code)) out.push("يُركَّب بشرط JS — قفزة تخطيط");
  return out;
}

/** ⑨ النسخ المطابقة خارج الشجرة والتركيز، والمقروءة واحدة. */
function duplicateGaps(code: string): string[] {
  const tags = code.match(/<ul\b[^>]*>/g) ?? [];
  const out: string[] = [];
  if (tags.length !== 2) out.push(`وسوم <ul>: ${tags.length}`);
  const [read, dup] = tags;
  if (!read || /aria-hidden/.test(read)) out.push("المقروءة مخفية");
  if (!dup || !/\baria-hidden\b/.test(dup)) out.push("المطابقة بلا aria-hidden");
  if (!dup || !/\binert\b/.test(dup)) out.push("المطابقة بلا inert");
  return out;
}

/** ⑩ لا منطقة حيّة ولا حلقة JS: النصّ لا يتبدّل، والحركة على المُركِّب. */
const liveRegions = (code: string) =>
  code.match(/aria-live|role="(?:marquee|log|status|alert|timer)"/g) ?? [];
const jsLoops = (code: string) =>
  code.match(/requestAnimationFrame|setInterval|\.animate\(|style\.setProperty/g) ?? [];

/** ⑪ الاتجاه: العربية يمينًا (موجب)، والإنجليزية يسارًا (سالب) — نسخةٌ بالتمام. */
function directionGaps(css: string): string[] {
  const frames = new Map<string, string>();
  postcss.parse(css).walkAtRules("keyframes", (kf) => {
    kf.walkDecls("translate", (d) => {
      frames.set(kf.params, d.value.trim());
    });
  });
  const out: string[] = [];
  if (frames.get("nxTickerRtl") !== "calc(100% / var(--nx-ticker-n, 2)) 0") out.push("العربية");
  if (frames.get("nxTickerLtr") !== "calc(-100% / var(--nx-ticker-n, 2)) 0") out.push("الإنجليزية");
  return out;
}

/** ⑫ طبقة الرموز والوصول: لا لون نهائي ولا قناع ولا `transform`، والنصّ ≥ 12px. */
function styleViolations(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkDecls((d) => {
    if (/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(d.value)) out.push(`${d.prop}: ${d.value}`);
    if (/^(-webkit-)?mask/.test(d.prop)) out.push(d.prop);
    if (d.prop === "transform") out.push("transform");
    if (d.prop === "font-size" && !(px(d.value) >= 12)) out.push(`font-size: ${d.value}`);
  });
  return out;
}

/**
 * ⑫ب إيقاع الوصلة: لا حاشية ولا هامش على النسخة (الفراغ ملك ذيل البند وحده، فيتساوى
 * داخل النسخة وعبر الوصلة)، وهامش البداية على المسار، وفاصل البند الأخير يعود مع الحركة.
 */
function seamGaps(css: string): string[] {
  const out: string[] = [];
  const copy = declsOf(css, ".nx-ticker-copy", null);
  for (const [prop, value] of Object.entries(copy)) {
    if (/^(padding|margin)/.test(prop) && !/^0(px)?$/.test(value)) out.push(`النسخة: ${prop}`);
  }
  if (!(px(declsOf(css, ".nx-ticker-track", null)["margin-inline-start"]) > 0))
    out.push("هامش البداية");
  if (declsOf(css, `${SWITCH} .nx-ticker-item:last-child::after`, GATE).display !== "block")
    out.push("فاصل الوصلة");
  return out;
}

/** ⑬ السطور: صادقةٌ ومسنودة — بلا رقم ولا ادّعاء ولا اسم منطقة، ولكل مصدرٍ نصُّه على القرص. */
const DIGITS = /[0-9٠-٩۰-۹٪%]/;
const CLAIM =
  /عميل|عملاء|شريك|شركاء|شراكة|شهادة|معتمد|حاصل على|موثوق|ISO|certif|customer|client|partner|testimonial|trusted|vendor|award/i;
const REGION_WORDS = /الوسطى|الغربية|الشرقية|الجنوبية|Central|Western|Eastern|Southern/;
function lineViolations(lines: readonly TickerLine[]): string[] {
  const out: string[] = [];
  if (lines.length < 8 || lines.length > 12) out.push(`عدد السطور ${lines.length}`);
  if (new Set(lines.map((l) => l.id)).size !== lines.length) out.push("معرّفٌ مكرّر");
  for (const l of lines) {
    for (const text of [l.ar, l.en]) {
      if (!text.trim()) out.push(`${l.id}: فارغ`);
      if (DIGITS.test(text)) out.push(`${l.id}: رقم`);
      if (CLAIM.test(text)) out.push(`${l.id}: ادّعاء`);
      if (REGION_WORDS.test(text)) out.push(`${l.id}: اسم منطقة`);
    }
    if (l.sources.length === 0) out.push(`${l.id}: بلا مصدر`);
    for (const s of l.sources) {
      if (!existsSync(s.file)) out.push(`${l.id}: ${s.file} غائب`);
      else if (!readFileSync(s.file, "utf8").includes(s.anchor))
        out.push(`${l.id}: «${s.anchor}» زال`);
    }
  }
  return out;
}

/** ⑭ «الأربع» لا تُكتب إلا في دالّة العدد — والسطر يُشتقّ منها. */
function literalCounts(code: string): string[] {
  const fn = code.indexOf("function regionsCountWord");
  const body = fn === -1 ? "" : code.slice(fn, code.indexOf("\n}", fn));
  const all = code.match(/الأربع|\bfour\b/g) ?? [];
  const inFn = body.match(/الأربع|\bfour\b/g) ?? [];
  return all.length === inFn.length && inFn.length === 2
    ? []
    : [`خارج الدالّة: ${all.length - inFn.length}`];
}

/** ⑮ واجهة الإيقاف المجمَّدة بين المسارات: سمة الجذر تُكتب وتُحذف، والحدث يُطلق من أثرٍ على الحال. */
function freezeGaps(code: string): string[] {
  const out: string[] = [];
  for (const need of [
    'export const MOTION_PAUSE_EVENT = "nx:motion-pause";',
    'root.dataset.nxMotionPaused = "1";',
    "delete root.dataset.nxMotionPaused;",
    "window.dispatchEvent(new CustomEvent(MOTION_PAUSE_EVENT, { detail: { paused } }));",
  ]) {
    if (!code.includes(need)) out.push(need);
  }
  if (
    !/useEffect\(\(\) => \{\s*if \(known\) announcePause\(paused\);\s*\}, \[known, paused\]\);/.test(
      code,
    )
  )
    out.push("الأثر");
  return out;
}

/* ── التجارب على المزروع (المادة ٣٠) ─────────────────────────────────── */

describe("الكواشف تحمرّ على انتهاكٍ مزروع (المادة ٣٠)", () => {
  it("سرعةٌ دون الأرضية أو فوق السقف", () => {
    expect(speedViolations(39)).toHaveLength(1);
    expect(speedViolations(61)).toHaveLength(1);
    expect(speedViolations(24)).toEqual(["أبطأ من 40px/ث"]);
    expect(speedViolations(40)).toEqual([]);
    expect(speedViolations(60)).toEqual([]);
  });

  it("حلقةٌ بمدّةٍ ثابتة أو بنسختين دائمًا — فجوةٌ وسرعةٌ متبدّلة", () => {
    const fixed = loopViolations(() => ({ seconds: 60, copies: 2 }));
    expect(fixed.some((v) => v.endsWith("فجوة"))).toBe(true);
    expect(fixed.some((v) => v.endsWith("سرعةٌ متبدّلة"))).toBe(true);
    expect(loopViolations(() => null)).toHaveLength(
      LOOP_GRID.copies.length * LOOP_GRID.views.length,
    );
  });

  it("حركةٌ خارج البوابة، أو بلا الوضع الآمن، أو قبل `[data-run]`", () => {
    const bare = `${CSS}\n.nx-ticker-track { animation-name: nxTickerRtl; }`;
    expect(ungatedMotion(bare)).toContain(".nx-ticker-track");
    const noSafe = `${CSS}\n@media (${GATE}) { html:not([data-nx-motion="off"]) .nx-ticker-track[data-run] { animation-name: nxTickerRtl; } }`;
    expect(ungatedMotion(noSafe)).toHaveLength(1);
    const early = `${CSS}\n@media (${GATE}) { ${SWITCH} .nx-ticker-track { animation-name: nxTickerRtl; } }`;
    expect(ungatedMotion(early)).toEqual([`${SWITCH} .nx-ticker-track`]);
  });

  it("الاختصار الذي يُبطل الإيقاف، وقاعدة إيقافٍ محذوفة", () => {
    const short = `${CSS}\n@media (${GATE}) { ${SWITCH} .nx-ticker-track[data-run] { animation: nxTickerRtl 60s linear infinite; } }`;
    expect(shorthandResets(short)).toHaveLength(1);
    const noFocus = CSS.replace(".nx-ticker-view:focus-within .nx-ticker-track", ".nx-x");
    expect(noFocus).not.toBe(CSS);
    expect(missingPauses(noFocus, ".nx-ticker-track")).toEqual(["focus"]);
  });

  it("زرٌّ ظاهرٌ حيث لا حركة، أو أصغر من 44px، أو شريطٌ يضيق عنه", () => {
    const shown = CSS.replace(/(\.nx-ticker-toggle \{\s*)display: none;/, "$1display: grid;");
    expect(shown).not.toBe(CSS);
    expect(staticModeGaps(shown)).toContain("الزرّ ظاهرٌ ساكنًا");
    const small = CSS.replace("min-block-size: 44px;", "min-block-size: 40px;");
    expect(small).not.toBe(CSS);
    expect(targetGaps(small)).toEqual(["ارتفاع الزرّ"]);
    const thin = CSS.replace("block-size: 46px;", "block-size: 44px;");
    expect(thin).not.toBe(CSS);
    expect(targetGaps(thin)).toEqual(["ارتفاع الشريط"]);
  });

  it("زرٌّ بلا حالةٍ مُعلنة أو مشروطٌ بـJS", () => {
    const stateless = CODE.replace("aria-pressed={paused}", "");
    expect(stateless).not.toBe(CODE);
    expect(pauseButtonGaps(stateless)).toEqual(["aria-pressed={paused}"]);
    const gated = CODE.replace("<button", "{allowed && (<button").replace(
      "</button>",
      "</button>)}",
    );
    expect(pauseButtonGaps(gated)).toContain("يُركَّب بشرط JS — قفزة تخطيط");
  });

  it("نسخةٌ مطابقة يقرؤها القارئ أو يبلغها التركيز، ومنطقةٌ حيّة، وحلقة JS", () => {
    const readable = CODE.replace(
      /(<ul key=\{k\} className="nx-ticker-copy") aria-hidden inert>/,
      "$1>",
    );
    expect(readable).not.toBe(CODE);
    expect(duplicateGaps(readable)).toEqual(["المطابقة بلا aria-hidden", "المطابقة بلا inert"]);
    const focusable = CODE.replace(" aria-hidden inert>", " aria-hidden>");
    expect(duplicateGaps(focusable)).toEqual(["المطابقة بلا inert"]);
    expect(liveRegions(`${CODE}<div aria-live="polite" />`)).toHaveLength(1);
    expect(liveRegions(`${CODE}<div role="marquee" />`)).toHaveLength(1);
    expect(jsLoops(`${CODE}\nrequestAnimationFrame(tick);`)).toHaveLength(1);
  });

  it("حاشيةٌ على النسخة تكسر إيقاع الوصلة، وفاصلٌ لا يعود مع الحركة", () => {
    const padded = CSS.replace(
      /(\.nx-ticker-copy \{[^}]*?)list-style: none;/,
      "$1padding-inline-start: 16px;\n  list-style: none;",
    );
    expect(padded).not.toBe(CSS);
    expect(seamGaps(padded)).toEqual(["النسخة: padding-inline-start"]);
    const bare = CSS.replace(
      /(:not\(\.safe-mode\) \.nx-ticker-item:last-child::after \{\s*)display: block;/,
      "$1display: none;",
    );
    expect(bare).not.toBe(CSS);
    expect(seamGaps(bare)).toEqual(["فاصل الوصلة"]);
  });

  it("اتجاهٌ مقلوب، ولونٌ نهائي وقناعٌ ونصٌّ دون 12px", () => {
    const flipped = CSS.replace(
      "calc(100% / var(--nx-ticker-n, 2)) 0",
      "calc(-100% / var(--nx-ticker-n, 2)) 0",
    );
    expect(flipped).not.toBe(CSS);
    expect(directionGaps(flipped)).toEqual(["العربية"]);
    expect(styleViolations(`${CSS}\n.x { color: #fff; }`)).toEqual(["color: #fff"]);
    expect(styleViolations(`${CSS}\n.x { mask-image: linear-gradient(red, blue); }`)).toEqual([
      "mask-image",
    ]);
    expect(styleViolations(`${CSS}\n.x { font-size: 11px; }`)).toEqual(["font-size: 11px"]);
  });

  it("سطرٌ برقمٍ أو ادّعاءٍ أو اسم منطقة، ومصدرٌ زال نصّه", () => {
    const base = TICKER_LINES[0] as TickerLine;
    const planted: TickerLine[] = [
      ...TICKER_LINES,
      { ...base, id: "x1", ar: "٩٩٪ من العملاء يثقون بنا" },
      { ...base, id: "x2", ar: "الأمن الصناعي في الوسطى" },
      { ...base, id: "x3", sources: [{ file: "src/lib/domain.ts", anchor: "نصٌّ غير موجود" }] },
    ];
    const v = lineViolations(planted);
    expect(v).toEqual(
      expect.arrayContaining([
        "x1: رقم",
        "x1: ادّعاء",
        "x2: اسم منطقة",
        "x3: «نصٌّ غير موجود» زال",
      ]),
    );
  });

  it("«الأربع» مكتوبةً خارج دالّة العدد", () => {
    expect(literalCounts(CONTENT_CODE)).toEqual([]);
    const planted = CONTENT_CODE.replace(
      '"منظومة واحدة للأمن الصناعي في جميع المناطق"',
      '"منظومة واحدة للأمن الصناعي في المناطق الأربع"',
    );
    expect(planted).not.toBe(CONTENT_CODE);
    expect(literalCounts(planted)).toHaveLength(1);
  });

  it("واجهة الإيقاف بلا حذف السمة أو بلا أثرٍ على الحال", () => {
    const sticky = ROW_CODE.replace("delete root.dataset.nxMotionPaused;", "");
    expect(sticky).not.toBe(ROW_CODE);
    expect(freezeGaps(sticky)).toEqual(["delete root.dataset.nxMotionPaused;"]);
    const once = ROW_CODE.replace("}, [known, paused]);", "}, []);");
    expect(once).not.toBe(ROW_CODE);
    expect(freezeGaps(once)).toEqual(["الأثر"]);
  });
});

/* ── العقد على الملفّات الحيّة ───────────────────────────────────────── */

describe("الشريط — سرعةٌ مقروءة ثابتة، وحلقةٌ بلا فجوة (أمر المالك R3)", () => {
  it("السرعة بين 40 و60 بكسلًا في الثانية", () => {
    expect(TICKER_SPEED_RANGE).toEqual({ min: 40, max: 60 });
    expect(speedViolations(TICKER_PX_PER_S)).toEqual([]);
  });

  it("المدّة من عرض النسخة، والنسخ تملأ أيّ عرضٍ حتى 2560px", () => {
    expect(loopViolations(tickerLoop)).toEqual([]);
    expect(tickerLoop(0, 1408)).toBeNull();
    // والمكوّن يكتب المتغيّرين وحدهما (المادة ٣٣) ويرسم `copies − 1` نسخةً مطابقة.
    expect(CODE).toContain('["--nx-ticker-n" as string]: String(copies)');
    expect(CODE).toContain(
      '["--nx-ticker-s" as string]: loop ? `${loop.seconds.toFixed(2)}s` : undefined',
    );
    expect(CODE).toContain("Array.from({ length: copies - 1 }");
    expect(CSS).toContain("animation-duration: var(--nx-ticker-s, 60s);");
  });

  it("الوصلة لا تُرى: الإيقاع واحدٌ داخل النسخة وعبرها", () => {
    expect(seamGaps(CSS)).toEqual([]);
  });

  it("الاتجاه من اللغة: العربية يمينًا والإنجليزية يسارًا", () => {
    expect(directionGaps(CSS)).toEqual([]);
    expect(CODE).toContain('dir={ar ? "rtl" : "ltr"}');
    expect(
      declsOf(CSS, `${SWITCH} .nx-ticker[dir="ltr"] .nx-ticker-track[data-run]`, GATE)[
        "animation-name"
      ],
    ).toBe("nxTickerLtr");
  });
});

describe("الحركة اختيارٌ لا افتراض، وتقف بيد المستخدم (WCAG 2.2.2 · 2.3.3)", () => {
  it("في الطبقتين حركةٌ فعلًا — فلا تمرّ الفحوص على مجموعةٍ فارغة", () => {
    let named = 0;
    postcss.parse(`${CSS}\n${BRAND_CSS}`).walkDecls("animation-name", () => {
      named += 1;
    });
    expect(named).toBeGreaterThanOrEqual(3);
  });

  it("الشريط والتوهّج خلف البوابة والمفتاح والوضع الآمن، وبعد `[data-run]`", () => {
    expect(ungatedMotion(CSS)).toEqual([]);
    expect(ungatedMotion(BRAND_CSS)).toEqual([]);
  });

  it("خصائص مفصّلة لا الاختصار — فالإيقاف يغلب", () => {
    expect(shorthandResets(CSS)).toEqual([]);
    expect(shorthandResets(BRAND_CSS)).toEqual([]);
  });

  it("يقف بالزرّ وخارج الإطار وبالتركيز وبالفأرة، والتوهّج بالزرّ وخارج الإطار", () => {
    expect(missingPauses(CSS, ".nx-ticker-track")).toEqual([]);
    expect(missingPauses(BRAND_CSS, ".nx-brand-halo").sort()).toEqual(["focus", "hover"]);
  });

  it("الحال الأساسية ساكنة ومُمرَّرة، والحركة تُبدّلها داخل البوابة وحدها", () => {
    expect(staticModeGaps(CSS)).toEqual([]);
  });

  it("زرّ «إيقاف الحركة»: زرٌّ حقيقي بحالةٍ مُعلنة، ≥ 44px، في شريطٍ يتّسع له", () => {
    expect(pauseButtonGaps(CODE)).toEqual([]);
    expect(targetGaps(CSS)).toEqual([]);
  });

  it("واجهة الإيقاف المجمَّدة: السمة على الجذر والحدث، من أثرٍ على الحال", () => {
    expect(freezeGaps(ROW_CODE)).toEqual([]);
    expect(MOTION_PAUSE_EVENT).toBe("nx:motion-pause");
  });
});

describe("الوصول — قائمةٌ تُقرأ مرّةً واحدة، بلا منطقةٍ حيّة", () => {
  it("النسخ المطابقة `aria-hidden` و`inert`، ولا منطقة حيّة ولا حلقة JS", () => {
    expect(duplicateGaps(CODE)).toEqual([]);
    expect(liveRegions(CODE)).toEqual([]);
    expect(jsLoops(CODE)).toEqual([]);
  });

  it("المصيَّر: منطقةٌ مسمّاة قابلةٌ للتركيز، ونسخةٌ مقروءة واحدة، والزرّ يقلب الحال — بلا مخالفة axe", async () => {
    const calls: boolean[] = [];
    const { container, getByRole } = render(
      createElement(
        I18nProvider,
        null,
        createElement(HomeTicker, {
          paused: false,
          offscreen: false,
          ready: true,
          onPausedChange: (n: boolean) => calls.push(n),
        }),
      ),
    );
    const region = getByRole("region", { name: "مزايا سَدِيد" });
    expect(region.getAttribute("tabindex")).toBe("0");
    const lists = container.querySelectorAll("ul.nx-ticker-copy");
    expect(lists.length).toBeGreaterThanOrEqual(2);
    expect(lists[0].hasAttribute("aria-hidden")).toBe(false);
    expect(lists[0].querySelectorAll("li")).toHaveLength(TICKER_LINES.length);
    for (const dup of [...lists].slice(1)) {
      expect(dup.getAttribute("aria-hidden")).toBe("true");
      expect(dup.hasAttribute("inert")).toBe(true);
    }
    const button = getByRole("button", { name: "إيقاف الحركة" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(button);
    expect(calls).toEqual([true]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("CSS: لا لون نهائي ولا قناع ولا `transform`، والنصّ ≥ 12px، وبدائل القسري والطباعة", () => {
    expect(styleViolations(CSS)).toEqual([]);
    const forced = CSS.slice(CSS.indexOf("@media (forced-colors: active)"));
    expect(forced).toContain("border-color: CanvasText");
    expect(forced).toMatch(/forced-color-adjust: none;\s*background: CanvasText;/);
    expect(declsOf(CSS, ".nx-ticker", "print").display).toBe("none");
  });
});

describe("السطور — صادقةٌ اليوم، ومسنودة، وبلا رقمٍ إلا عدد المناطق كلمةً", () => {
  it("كل سطرٍ بلغتيه، بلا رقمٍ ولا ادّعاءٍ ولا اسم منطقة، ومصادره على القرص", () => {
    expect(lineViolations(TICKER_LINES)).toEqual([]);
  });

  it("«الأربع» من `REGIONS.length` وحده — وعلى غير الأربعة «جميع المناطق»", () => {
    expect(REGIONS.length).toBe(4);
    expect(regionsCountWord(4)).toEqual({ ar: "الأربع", en: "four" });
    expect(regionsCountWord(5)).toBeNull();
    expect(TICKER_LINES).toEqual(buildTickerLines(REGIONS.length));
    const four = buildTickerLines(4).find((l) => l.id === "regions");
    const five = buildTickerLines(5).find((l) => l.id === "regions");
    expect(four?.ar).toContain("الأربع");
    expect(four?.en).toContain("four");
    expect(five?.ar).not.toContain("الأربع");
    expect(five?.ar).toContain("جميع المناطق");
    expect(five?.en).toContain("all regions");
    expect(literalCounts(CONTENT_CODE)).toEqual([]);
  });

  it("لا وعد صوتٍ ولا HCIS: ما لا يصدق والخادم موقوف لا يُقال", () => {
    for (const l of TICKER_LINES) {
      expect(`${l.ar} ${l.en}`).not.toMatch(/صوت|voice|HCIS|الهيئة/i);
    }
  });
});

describe("الزرّ الواحد يوقف الصفّ والفيلم ويُحفظ (المصيَّر)", () => {
  afterEach(() => {
    localStorage.removeItem("nx-brand-motion");
    delete document.documentElement.dataset.nxMotionPaused;
  });

  it("يعلن الحال عند التركيب، ويكتب السمة ويحذفها مع كل ضغطة، ويستعيد المحفوظ", async () => {
    const events: boolean[] = [];
    const listen = (e: Event) => events.push((e as CustomEvent<{ paused: boolean }>).detail.paused);
    window.addEventListener(MOTION_PAUSE_EVENT, listen);
    try {
      const first = render(createElement(I18nProvider, null, createElement(HomeBrandRow)));
      await act(async () => {});
      expect(events).toEqual([false]);
      expect(document.documentElement.dataset.nxMotionPaused).toBeUndefined();
      const button = first.getByRole("button", { name: "إيقاف الحركة" });
      fireEvent.click(button);
      expect(events).toEqual([false, true]);
      expect(document.documentElement.dataset.nxMotionPaused).toBe("1");
      expect(localStorage.getItem("nx-brand-motion")).toBe("paused");
      expect(button.getAttribute("aria-pressed")).toBe("true");
      first.unmount();

      // زيارةٌ ثانية: المحفوظ يُستعاد ويُعلَن قبل أيّ حركة.
      events.length = 0;
      delete document.documentElement.dataset.nxMotionPaused;
      const second = render(createElement(I18nProvider, null, createElement(HomeBrandRow)));
      await act(async () => {});
      expect(events).toEqual([true]);
      expect(document.documentElement.dataset.nxMotionPaused).toBe("1");
      const again = second.getByRole("button", { name: "إيقاف الحركة" });
      expect(again.getAttribute("aria-pressed")).toBe("true");
      fireEvent.click(again);
      expect(events).toEqual([true, false]);
      expect(document.documentElement.dataset.nxMotionPaused).toBeUndefined();
      expect(localStorage.getItem("nx-brand-motion")).toBeNull();
    } finally {
      window.removeEventListener(MOTION_PAUSE_EVENT, listen);
    }
  });
});

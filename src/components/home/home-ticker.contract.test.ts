/**
 * عقد «شريط الإعلانات» وزرّ «إيقاف الحركة» الواحد (أمر المالك ٢٠٢٦/١٠/١٨ R3: «وكون الشريط الإعلاني
 * المتحرك باستمرار يعلو علامة سديد الموجودة فالمرفق»؛ وبنوده الحيّة بأمر ٢٠٢٦/١٠/٢٤: الحالة الأمنية
 * · الصيانة · البلاغات · المشاريع).
 *
 * الأمر نسخ «لا حركة دائمة» (M1) **لهذا الشريط وحده** — ومعه توهّجٌ ينجرف خلف إطار البانر
 * من موجّه المرحلة نفسها. وما يكسرهما لا يراه tsc ولا البناء:
 *   • سرعةٌ تُقرأ أو لا تُقرأ — أو مدّةٌ ثابتة فتتبدّل السرعة بطول المحتوى؛
 *   • فجوةٌ تظهر عند الوصلة على شاشةٍ أعرض من النسخة؛
 *   • حركةٌ لمن طلب السكون أو أطفأ الحركة أو في الوضع الآمن — ومنها نبضات البنود والرموز المتحرّكة؛
 *   • زرّ إيقافٍ بلا حالةٍ مُعلنة، أو أصغر من 44px، أو ظاهرٌ حيث لا شيء يتحرّك؛
 *   • اختصار `animation` يعيد `animation-play-state` إلى `running` فيُبطل الإيقاف
 *     (وقع فعلًا: ضُغط الزرّ وبقي الشريط يجري — ٢٠٢٦/١٠/١٨)؛
 *   • نسخةٌ مطابقة يقرؤها القارئ مرّتين، أو منطقةٌ حيّة تُعلن ما يتبدّل كل دقيقة؛
 *   • حركةٌ بخاصيةٍ غير مُركِّبة (تخطيط/رسم)، أو رمزٌ متحرّكٌ بلا نسخةٍ ساكنةٍ على القرص؛
 *   • بندٌ يحمل لونًا بلا شكلٍ وكلمة، أو الخطر والتحذير بنبرةٍ واحدة؛
 *   • مرجعٌ بلا شارة، أو غيابٌ يصير صفرًا، أو صيانةٌ تُستبدل بمرجع، أو اسمٌ يعبر من المشاريع.
 *
 * وأمر ٢٠٢٦/١٠/٢٥ («متواصل بدون توقف» + المظهر السينمائي) أضاف ما يحرسه هذا الملف أيضًا:
 *   • لا توقّفَ بالفأرة (ولا بنقرتها: التركيز بالنقر لا يجمّده) — يقف بزرّ الإيقاف وخارج الإطار
 *     وبتركيز لوحة المفاتيح وحده؛
 *   • وصلةٌ بلا قفزة: تغيّر المدّة (وصول الخطّ · تحديث القراءات · تغيّر العرض) لا يحرّك المسار
 *     (`carryLoopTime` · `retimeLoop`)، والمسار لا يُعاد تركيبه؛
 *   • طبقات الضوء (شفق · مذنّب · وميض · سداسيّ) داخل البوّابة، مُركِّبة، تختفي مع الإيقاف، وبوميضٍ آمنٍ
 *     (WCAG 2.3.1)؛ وملفّات الشفق على القرص؛ ولا قناعٌ على سلفٍ للمسار.
 *
 * وكل كاشفٍ دالّةٌ تُجرَّب أولًا على انتهاكٍ مزروع (المادة ٣٠)، والقراءة بمحلّل CSS
 * لا بنصّ، والكود منزوع التعليقات. وقواعد البنود نفسها في `home-ticker-status.test.ts`.
 */
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import postcss, { type AtRule, type ChildNode, type Node, type Rule } from "postcss";
import { act, fireEvent, render } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import {
  GLYPH_FOR_TONE,
  GLYPH_FOR_TREND,
  glyphForTrend,
  TICKER_GLYPHS,
  TICKER_GLYPH_NAMES,
  TICKER_GLYPH_SIZE,
  TICKER_LABELS,
  TICKER_PX_PER_S,
  TICKER_SPEED_RANGE,
} from "@/components/home/home-ticker-content";
import {
  carryLoopTime,
  HomeTicker,
  retimeLoop,
  tickerLoop,
  type TickerLoop,
} from "@/components/home/HomeTicker";
import { HomeBrandRow, MOTION_PAUSE_EVENT } from "@/components/home/HomeBrandRow";
import type { SecOverview } from "@/lib/sec.functions";
import type { CommandCenterState } from "@/lib/exec/command-center.functions";
import type { MaintSummary } from "@/lib/maintenance/maint-types";
import { summarizeProjects, type ProjectsSummary } from "@/lib/projects/projects-summary";

/**
 * القراءات المشتركة (`useHomeReads`) تُستبدل بحالةٍ نتحكّم بها: الشريط يقرأ من مفاتيح react-query
 * نفسها، فلا شبكة هنا ولا `QueryClient`. كل اختبارٍ يضبط `reads.current` ثم يرسم.
 */
type Q<T> = { data: T | undefined; isPending: boolean; isError: boolean };
const reads = vi.hoisted(() => ({
  current: null as null | Record<string, Q<unknown>>,
}));
vi.mock("@/components/home/home-reads", () => ({
  useHomeReads: () => reads.current,
}));

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

/**
 * ⑤ قواعد الإيقاف: خارج الإطار، وتركيز لوحة المفاتيح (`:focus-visible` — لا `:focus`/`:focus-within`
 * فالنقر بالفأرة يطابقهما فيجمّد الشريط). **والفأرة ممنوعة** (٢٠٢٦/١٠/٢٥): أي إيقافٍ بـ`:hover` على
 * الهدف يُبلَّغ `hover-pause`، وبتركيز النقر `mouse-focus-pause`. **ولا زرّ** (أمر ٢٠٢٦/١٠/٢٥ «أزل علامة
 * التوقف والاستمرار»): أي قاعدة إيقافٍ بـ`[data-paused]` على الشريط تُبلَّغ `button-pause`.
 */
function missingPauses(css: string, target: string): string[] {
  const found = { offscreen: false, focus: false };
  const bad = new Set<string>();
  postcss.parse(css).walkDecls("animation-play-state", (d) => {
    if (d.value.trim() !== "paused") return;
    const rule = d.parent as Rule;
    for (const s of rule.selectors) {
      if (!s.includes(target)) continue;
      if (s.includes("[data-paused]") && target.startsWith(".nx-ticker")) bad.add("button-pause");
      if (s.includes("[data-offscreen]")) found.offscreen = true;
      if (s.includes(":focus-visible")) found.focus = true;
      if (s.includes(":hover")) bad.add("hover-pause");
      if (/:focus(?!-visible)/.test(s)) bad.add("mouse-focus-pause");
    }
  });
  return [
    ...Object.entries(found)
      .filter(([, v]) => !v)
      .map(([k]) => k),
    ...bad,
  ];
}

/** ⑥ الحال الأساسية ساكنة، والحركة تُبدّلها داخل البوابة وحدها. */
function staticModeGaps(css: string): string[] {
  const out: string[] = [];
  const base = (sel: string) => declsOf(css, sel, null);
  const moving = (sel: string) => declsOf(css, `${SWITCH} ${sel}`, GATE);
  if (base('.nx-ticker-copy[aria-hidden="true"]').display !== "none")
    out.push("النسخ ظاهرة ساكنًا");
  if (base(".nx-ticker-view")["overflow-x"] !== "auto") out.push("القائمة الساكنة لا تُمرَّر");
  if (moving('.nx-ticker-copy[aria-hidden="true"]').display !== "flex")
    out.push("النسخ لا تظهر مع الحركة");
  if (moving(".nx-ticker-view").overflow !== "hidden") out.push("النافذة لا تقصّ مع الحركة");
  return out;
}

/** ⑦ ارتفاع الشريط يتّسع لكبسولته (≥ 46px داخل حدّيه). */
function targetGaps(css: string): string[] {
  const out: string[] = [];
  if (!(px(declsOf(css, ".nx-ticker", null)["block-size"]) >= 46)) out.push("ارتفاع الشريط");
  return out;
}

/**
 * ⑧ **لا زرّ إيقاف في الشريط** (أمر المالك ٢٠٢٦/١٠/٢٥ «اقم بإزالة علامة التوقف والاستمرار»): لا عنصر
 * `<button>`، ولا صنف الزرّ ولا خصائصه في الشيفرة، ولا قاعدةٌ له ولا `data-paused` في الـCSS.
 * (الشيفرة والـCSS تُمرَّران منزوعتَي التعليقات.)
 */
function pauseButtonGaps(code: string, css: string): string[] {
  const out: string[] = [];
  if (/<button\b/.test(code)) out.push("زرٌّ في الشريط");
  if (/nx-ticker-toggle/.test(code)) out.push("صنف الزرّ في الشيفرة");
  if (/onPausedChange|aria-pressed|pauseLabel|Pause motion|إيقاف الحركة|\bpaused\b/.test(code))
    out.push("بقايا الإيقاف في الشيفرة");
  if (/nx-ticker-toggle/.test(css)) out.push("قاعدة الزرّ في الـCSS");
  if (/data-paused/.test(css)) out.push("data-paused في الـCSS");
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

/**
 * ⑩ لا حلقة JS، ولا منطقة حيّة للبنود: الأرقام تتبدّل كل دقيقة فلا يُعلَن شيء. والاستثناء عقدةٌ
 * واحدة `role="status"` (مهذّبة ضمنًا) لإعلان «حرجة» وحدها — فلا `aria-live` صريح ولا غيرها.
 */
const liveRegions = (code: string) =>
  code.match(/aria-live|role="(?:marquee|log|alert|timer)"/g) ?? [];
const statusNodes = (code: string) => code.match(/role="status"/g) ?? [];
const jsLoops = (code: string) =>
  code.match(/requestAnimationFrame|setInterval|setTimeout|\.animate\(/g) ?? [];
/** الكتابة المباشرة على الأسلوب: متغيّر المدّة وحده (تصحيح الاستمرار) — لا عدد النسخ ولا قيمٌ نهائية. */
const styleWrites = (code: string) =>
  [...code.matchAll(/\.style\.setProperty\(\s*"([^"]+)"/g)].map((m) => m[1]);

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

/** المجلّد الذي تُقرأ منه الرموز على القرص. */
const GLYPH_DIR = "public/media/ticker";

/**
 * ⑬ الرموز: كل اسمٍ في الخريطة له ملفّاه (WebP متحرّك + SVG ساكن) على القرص، ومساراهما مشتقّان
 * من الاسم، والنبرات الأربع لكلٍّ رمزٌ مختلف (الخطر ≠ التحذير)، والاتجاهات الثلاثة كذلك.
 */
function glyphGaps(
  glyphs: Record<string, { anim: string; still: string }>,
  names: readonly string[],
  forTone: Record<string, string>,
  forTrend: Record<string, string>,
  exists: (path: string) => boolean = existsSync,
): string[] {
  const out: string[] = [];
  for (const name of names) {
    const g = glyphs[name];
    if (!g) {
      out.push(`${name}: غائب من الخريطة`);
      continue;
    }
    if (g.anim !== `/media/ticker/${name}.webp`) out.push(`${name}: مسار الحلقة`);
    if (g.still !== `/media/ticker/${name}.svg`) out.push(`${name}: مسار الساكن`);
    if (!exists(`${GLYPH_DIR}/${name}.webp`)) out.push(`${name}: ملف WebP غائب`);
    if (!exists(`${GLYPH_DIR}/${name}.svg`)) out.push(`${name}: ملف SVG غائب`);
  }
  for (const tone of ["danger", "warning", "ok", "info"]) {
    if (!names.includes(forTone[tone])) out.push(`نبرة ${tone}: رمزٌ مجهول`);
  }
  if (new Set(["danger", "warning", "ok", "info"].map((t) => forTone[t])).size !== 4) {
    out.push("نبرتان بالرمز نفسه");
  }
  if (new Set(["up", "down", "flat"].map((d) => forTrend[d])).size !== 3) {
    out.push("اتجاهان بالرمز نفسه");
  }
  return out;
}

/**
 * ⑬ب مفاتيح الحركة تلمس الخصائص المُركِّبة وحدها (`opacity`/`scale`/`translate`/`rotate`): حركةٌ
 * بـ`width`/`top`/`margin`/`background-color`… تُعيد التخطيط أو الرسم كل إطار. والمستثنى بأمر المالك
 * (٢٠٢٦/١٠/٢٤، الرموشن السينمائي) ثلاثٌ عابرةٌ داخل نصّ البند وحده: `filter` (الضباب 0.22em ثم `none`)
 * و`clip-path` (قصّ الكشف) و`--tk-n` (عدّادٌ زخرفيّ مسجَّل) — وكلٌّ منها محروسٌ بكاشفه أدناه.
 */
const KEYFRAME_PROPS = /^(opacity|scale|translate|rotate|filter|clip-path|--tk-n)$/;
function nonCompositorKeyframes(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkAtRules("keyframes", (kf) => {
    kf.walkDecls((d) => {
      if (!KEYFRAME_PROPS.test(d.prop)) out.push(`${kf.params}: ${d.prop}`);
    });
  });
  return out;
}

/** ⑬ب٢ مفاتيحنا (`nxTk*`) بنسبة الخطّ: لا بكسل في أيّ قيمة — فالحركة تكبر مع الحرف. */
function pxKeyframes(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkAtRules("keyframes", (kf) => {
    if (!kf.params.startsWith("nxTk")) return;
    kf.walkDecls((d) => {
      if (/\b\d*\.?\d+px\b/.test(d.value)) out.push(`${kf.params}: ${d.prop}: ${d.value}`);
    });
  });
  return out;
}

/**
 * ⑬ب٣ `filter` في مفاتيح الكشف وحدها، ضبابًا بـ`em` ينتهي بـ`none` (يحرّر الطبقة)؛ ولا `filter`
 * ولا `will-change` على أيّ قاعدةٍ عاديّة — فلا ضباب على المسار المتحرّك كلّه ولا طبقةَ دائمة.
 */
function filterGaps(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkDecls((d) => {
    if (d.prop === "will-change") out.push("will-change");
    if (d.prop === "filter" && !inKeyframes(d)) out.push(`قاعدة: ${(d.parent as Rule).selector}`);
  });
  postcss.parse(css).walkAtRules("keyframes", (kf) => {
    let blurs = 0;
    kf.walkDecls("filter", (d) => {
      const last = (d.parent as { selector?: string }).selector;
      if (last === "to" || last === "100%") {
        if (d.value.trim() !== "none") out.push(`${kf.params}: النهاية ${d.value}`);
      } else if (!/^blur\(\d*\.?\d+em\)$/.test(d.value.trim())) {
        out.push(`${kf.params}: ${d.value}`);
      } else blurs += 1;
    });
    if (kf.params.startsWith("nxTkReveal") && blurs !== 1) out.push(`${kf.params}: ضباب ${blurs}`);
  });
  return out;
}

/**
 * ⑬ب٤ سلامة الحرف العربي: لا `letter-spacing` ولا `word-spacing` ولا وزن/تباين خطٍّ متحرّك في أيّ
 * مفتاح — ولا `letter-spacing` مكتوبًا في الشريط أصلًا (يكسر الوصل والربط ويغيّر عرض النسخة المقيس).
 */
function arabicSafetyGaps(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkDecls((d) => {
    if (/^(letter-spacing|word-spacing)$/.test(d.prop))
      out.push(`${d.prop} في ${inKeyframes(d) ? "مفتاح" : (d.parent as Rule).selector}`);
    if (inKeyframes(d) && /^(font|text-transform|text-rendering)/.test(d.prop))
      out.push(`مفتاح: ${d.prop}`);
  });
  return out;
}

/** ⑬ب٥ لا شقّ لنصٍّ إلى حروف في الكود (عربيّه يُقرأ كلمةً/سطرًا فقط). */
function letterSplitting(code: string): string[] {
  return (
    code.match(
      /\.split\(\s*(?:""|''|\/\/|\/\(\?:\)\/|\/\(\?=\)\/)|\[\.\.\.\s*(?:label|word|text|item\.word|pick\([^)]*\))\s*\]|Array\.from\(\s*(?:label|word|text|pick\()|\.match\(\s*\/\.\/g?|\.charAt\(/g,
    ) ?? []
  );
}

/**
 * ⑬ب٦ الكشف السينمائي: ~720ms (600–800) بمنحنى `cubic-bezier(0.16, 1, 0.3, 1)`، وتتابع 70ms،
 * وبداية 0.35em/0.6/ضباب em، ونهاية `none`.
 */
const REVEAL_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
function revealGaps(css: string): string[] {
  const out: string[] = [];
  const entry = Object.entries(
    (() => {
      const found: Record<string, string> = {};
      postcss.parse(css).walkRules((rule) => {
        if (!rule.toString().includes("animation-name: nxTkReveal;")) return;
        rule.walkDecls((d) => {
          found[d.prop] = d.value.trim();
        });
      });
      return found;
    })(),
  );
  const get = (k: string) => entry.find(([p]) => p === k)?.[1];
  const ms = Number.parseFloat(get("animation-duration") ?? "NaN");
  if (!(ms >= 600 && ms <= 800) || !(get("animation-duration") ?? "").endsWith("ms"))
    out.push(`المدّة ${get("animation-duration")}`);
  if (get("animation-timing-function") !== REVEAL_EASE) out.push("المنحنى");
  if (get("animation-fill-mode") !== "backwards") out.push("fill-mode");
  if (!(get("animation-delay") ?? "").includes("var(--tk-step, 70ms)")) out.push("التتابع");
  let fromOk = false;
  postcss.parse(css).walkAtRules("keyframes", (kf) => {
    if (kf.params !== "nxTkReveal") return;
    const from: Record<string, string> = {};
    kf.walkRules("from", (r) =>
      r.walkDecls((d) => {
        from[d.prop] = d.value.trim();
      }),
    );
    fromOk =
      from.translate === "0 0.35em" &&
      from.opacity === "0.6" &&
      /^blur\(0?\.22em\)$/.test(from.filter ?? "");
  });
  if (!fromOk) out.push("حالة البداية");
  return out;
}

/** ⑬ب٧ الهالة: دورة ≥ 2 ث (≤ 1Hz)، وتفاوت عتمتها ≤ 0.25، وللخطر وحده. */
function breathGaps(css: string): string[] {
  const out: string[] = [];
  const props: Record<string, string> = {};
  let selector = "";
  postcss.parse(css).walkRules((rule) => {
    if (!rule.toString().includes("animation-name: nxTkBreath;")) return;
    selector = rule.selector;
    rule.walkDecls((d) => {
      props[d.prop] = d.value.trim();
    });
  });
  const dur = Number.parseFloat(props["animation-duration"] ?? "NaN");
  const period = props["animation-direction"] === "alternate" ? dur * 2 : dur;
  if (!(period >= 2)) out.push(`الدورة ${period}ث`);
  if (props["animation-iteration-count"] !== "infinite") out.push("ليست مستمرّة");
  if (!selector.includes('[data-tone="danger"]')) out.push("ليست للخطر وحده");
  const opac: number[] = [];
  postcss.parse(css).walkAtRules("keyframes", (kf) => {
    if (kf.params !== "nxTkBreath") return;
    kf.walkDecls("opacity", (d) => {
      opac.push(Number.parseFloat(d.value));
    });
  });
  if (opac.length !== 2 || Math.max(...opac) - Math.min(...opac) > 0.25) out.push("تفاوت العتمة");
  return out;
}

/**
 * ⑬ب٨ الحال الساكنة هي النهائية: لا قاعدةٌ عاديّة (خارج البوّابة والمفاتيح) تُخفي جزءًا أو تزيحه أو
 * تضبّبه أو تقصّه — فمن طلب السكون يرى البند كاملًا مقروءًا، والغطاء الزخرفيّ للعدّ غائب.
 */
const STATIC_PARTS =
  /^\.nx-tk-(?:glyph\[data-role="state"\]|label|word|fig|trend|badge|real|num|body)$/;
function staticStateGaps(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkRules((rule) => {
    if (inKeyframes(rule) || atChain(rule).some((a) => a.startsWith("@media"))) return;
    if (!rule.selectors.some((sel) => STATIC_PARTS.test(sel.trim()))) return;
    rule.walkDecls((d) => {
      if (d.prop === "opacity" && Number.parseFloat(d.value) < 1)
        out.push(`${rule.selector}: opacity`);
      if (/^(translate|filter|clip-path|visibility)$/.test(d.prop))
        out.push(`${rule.selector}: ${d.prop}`);
    });
  });
  if (declsOf(css, ".nx-tk-count", null).display !== "none") out.push("الغطاء ظاهر ساكنًا");
  return out;
}

/**
 * ⑬ج تبديل الرمز: ساكنًا المتحرّك مخفيّ (`display: none` فلا يُجلَب `loading="lazy"`)، والمتحرّك
 * يظهر والساكن يختفي داخل البوّابة وحدها وما دام الشريط غير موقوفٍ ولا خارج الإطار.
 */
function glyphSwapGaps(css: string): string[] {
  const out: string[] = [];
  if (declsOf(css, ".nx-tk-img-anim", null).display !== "none") out.push("المتحرّك ظاهرٌ ساكنًا");
  if (declsOf(css, ".nx-tk-img-still", null).display === "none") out.push("الساكن مخفيٌّ ساكنًا");
  const live = `${SWITCH} .nx-ticker:not([data-offscreen])`;
  if (declsOf(css, `${live} .nx-tk-img-anim`, GATE).display !== "block")
    out.push("المتحرّك لا يظهر داخل البوّابة");
  if (declsOf(css, `${live} .nx-tk-img-still`, GATE).display !== "none")
    out.push("الساكن يبقى مع المتحرّك");
  return out;
}

/** ⑬د النبرات: كل نبرةٍ برمزها من الطبقة، والخطر والتحذير لا يلتقيان في رمزٍ واحد. */
function toneGaps(css: string): string[] {
  const want: Record<string, string> = {
    danger: "var(--tone-rose)",
    warning: "var(--tone-amber)",
    ok: "var(--tone-emerald)",
    info: "var(--tone-blue)",
  };
  const out: string[] = [];
  for (const [tone, token] of Object.entries(want)) {
    if (declsOf(css, `.nx-tk[data-tone="${tone}"]`, null)["--tk-tone"] !== token)
      out.push(`${tone}: ${declsOf(css, `.nx-tk[data-tone="${tone}"]`, null)["--tk-tone"]}`);
  }
  return out;
}

/** ⑬هـ نبضات البنود تقف خارج الإطار كحركة المسار. */
function missingMotionPauses(css: string): string[] {
  const out: string[] = [];
  for (const target of [".nx-tk-ring", ".nx-tk-body::before", ".nx-tk-trend .nx-tk-glyph"]) {
    let ok = false;
    postcss.parse(css).walkDecls("animation-play-state", (d) => {
      if (d.value.trim() !== "paused") return;
      const rule = d.parent as Rule;
      if (
        rule.selectors.some(
          (sel) =>
            sel.includes(target) &&
            sel.includes("[data-offscreen]") &&
            !sel.includes("[data-paused]"),
        )
      )
        ok = true;
    });
    if (!ok) out.push(target);
  }
  return out;
}

/**
 * ⑭ العتبات في ملفٍّ واحد: قاعدة العرض المؤلَّفة (أنواع الحالة الأمنية) لا تتسرّب إلى غير
 * `home-ticker-status.ts` — فحيث تُكتب عتبةٌ ثانية تتفرّق الكلمة عن الرقم.
 */
function thresholdLeaks(files: ReadonlyMap<string, string>): string[] {
  const out: string[] = [];
  for (const [file, code] of files) {
    if (file.endsWith("home-ticker-status.ts")) continue;
    if (/POSTURE_THRESHOLDS|\bpostureOf\b|\bclassifyPosture\b/.test(code)) out.push(file);
  }
  return out;
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
    const noFocus = CSS.replace(".nx-ticker-view:focus-visible .nx-ticker-track", ".nx-x");
    expect(noFocus).not.toBe(CSS);
    expect(missingPauses(noFocus, ".nx-ticker-track")).toEqual(["focus"]);
  });

  it("إيقافٌ بالفأرة أو بتركيز النقر يُبلَّغ — الشريط متواصلٌ مع المؤشّر", () => {
    const hover = `${CSS}\n@media (hover: hover) { .nx-ticker-view:hover .nx-ticker-track { animation-play-state: paused; } }`;
    expect(missingPauses(hover, ".nx-ticker-track")).toEqual(["hover-pause"]);
    const within = CSS.replace(
      ".nx-ticker-view:focus-visible .nx-ticker-track",
      ".nx-ticker-view:focus-within .nx-ticker-track",
    );
    expect(missingPauses(within, ".nx-ticker-track")).toEqual(["focus", "mouse-focus-pause"]);
    const plain = CSS.replace(
      ".nx-ticker-view:focus-visible .nx-ticker-track",
      ".nx-ticker-view:focus .nx-ticker-track",
    );
    expect(missingPauses(plain, ".nx-ticker-track")).toEqual(["focus", "mouse-focus-pause"]);
  });

  it("زرٌّ يعود إلى الشريط، أو بقايا الإيقاف في الشيفرة والـCSS، أو شريطٌ يضيق", () => {
    expect(pauseButtonGaps(CODE, strip(CSS))).toEqual([]);
    const button = `${CODE}\n<button type="button" className="nx-ticker-toggle" aria-pressed={paused} />`;
    expect(pauseButtonGaps(button, strip(CSS))).toEqual([
      "زرٌّ في الشريط",
      "صنف الزرّ في الشيفرة",
      "بقايا الإيقاف في الشيفرة",
    ]);
    expect(pauseButtonGaps(`${CODE}\nonPausedChange(true)`, strip(CSS))).toEqual([
      "بقايا الإيقاف في الشيفرة",
    ]);
    expect(pauseButtonGaps(CODE, `${strip(CSS)}\n.nx-ticker-toggle { display: grid; }`)).toEqual([
      "قاعدة الزرّ في الـCSS",
    ]);
    expect(
      pauseButtonGaps(
        CODE,
        `${strip(CSS)}\n.nx-ticker[data-paused] .nx-ticker-track { color: red; }`,
      ),
    ).toEqual(["data-paused في الـCSS"]);
    // قاعدة إيقافٍ بالزرّ على المسار تُبلَّغ كذلك.
    const stuck = `${CSS}\n.nx-ticker[data-paused] .nx-ticker-track { animation-play-state: paused; }`;
    expect(missingPauses(stuck, ".nx-ticker-track")).toEqual(["button-pause"]);
    const thin = CSS.replace("block-size: 52px;", "block-size: 44px;");
    expect(thin).not.toBe(CSS);
    expect(targetGaps(thin)).toEqual(["ارتفاع الشريط"]);
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
    expect(statusNodes(`${CODE}<div role="status" />`)).toHaveLength(statusNodes(CODE).length + 1);
    expect(jsLoops(`${CODE}\nrequestAnimationFrame(tick);`)).toHaveLength(1);
    expect(styleWrites(`${CODE}\nel.style.setProperty("--nx-ticker-n", "9");`)).toEqual([
      "--nx-ticker-s",
      "--nx-ticker-n",
    ]);
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

  it("رمزٌ بلا ملفّ، أو بمسارٍ غير مشتقّ، أو نبرتان برمزٍ واحد", () => {
    const names = [...TICKER_GLYPH_NAMES];
    const base = TICKER_GLYPHS as Record<string, { anim: string; still: string }>;
    const gone = (path: string) => !path.endsWith("state-ok.svg") && existsSync(path);
    expect(
      glyphGaps(
        base,
        names,
        GLYPH_FOR_TONE,
        GLYPH_FOR_TREND,
        (path) => path !== `${GLYPH_DIR}/state-ok.svg`,
      ),
    ).toEqual(["state-ok: ملف SVG غائب"]);
    expect(gone(`${GLYPH_DIR}/state-ok.svg`)).toBe(false);
    const moved = {
      ...base,
      "trend-up": { anim: "/media/ticker/up.webp", still: base["trend-up"].still },
    };
    expect(glyphGaps(moved, names, GLYPH_FOR_TONE, GLYPH_FOR_TREND, () => true)).toEqual([
      "trend-up: مسار الحلقة",
    ]);
    expect(
      glyphGaps(
        base,
        names,
        { ...GLYPH_FOR_TONE, danger: "state-warning" },
        GLYPH_FOR_TREND,
        () => true,
      ),
    ).toEqual(["نبرتان بالرمز نفسه"]);
    expect(
      glyphGaps(base, names, GLYPH_FOR_TONE, { ...GLYPH_FOR_TREND, down: "trend-up" }, () => true),
    ).toEqual(["اتجاهان بالرمز نفسه"]);
    expect(
      glyphGaps({}, names, GLYPH_FOR_TONE, GLYPH_FOR_TREND, () => true).length,
    ).toBeGreaterThanOrEqual(names.length);
  });

  it("مفتاحُ حركةٍ بخاصيةٍ غير مُركِّبة", () => {
    expect(nonCompositorKeyframes(CSS)).toEqual([]);
    const planted = `${CSS}\n@keyframes bad { to { inline-size: 10px; background-color: red; } }`;
    expect(nonCompositorKeyframes(planted)).toEqual(["bad: inline-size", "bad: background-color"]);
  });

  it("بكسلٌ في مفاتيحنا، أو `filter` على قاعدةٍ أو طبقةٍ دائمة، أو ضبابٌ لا ينتهي بـ`none`", () => {
    expect(pxKeyframes(CSS)).toEqual([]);
    expect(pxKeyframes(`${CSS}\n@keyframes nxTkBad { from { translate: 0 4px; } }`)).toEqual([
      "nxTkBad: translate: 0 4px",
    ]);
    expect(filterGaps(CSS)).toEqual([]);
    expect(filterGaps(`${CSS}\n.nx-ticker-track { filter: blur(3px); }`)).toEqual([
      "قاعدة: .nx-ticker-track",
    ]);
    expect(filterGaps(`${CSS}\n.nx-tk-body { will-change: filter; }`)).toEqual(["will-change"]);
    const stuck = CSS.replace(
      /(@keyframes nxTkReveal \{[\s\S]*?)filter: none;/,
      "$1filter: blur(0);",
    );
    expect(stuck).not.toBe(CSS);
    expect(filterGaps(stuck)).toEqual(["nxTkReveal: النهاية blur(0)"]);
    const px = CSS.replace("blur(0.22em)", "blur(3px)");
    expect(filterGaps(px)).toEqual(["nxTkReveal: blur(3px)", "nxTkReveal: ضباب 0"]);
  });

  it("تباعدُ حروفٍ أو وزنٌ متحرّك أو شقٌّ لنصٍّ إلى حروف", () => {
    expect(arabicSafetyGaps(CSS)).toEqual([]);
    expect(arabicSafetyGaps(`${CSS}\n.nx-tk-label { letter-spacing: 0.04em; }`)).toEqual([
      "letter-spacing في .nx-tk-label",
    ]);
    expect(
      arabicSafetyGaps(`${CSS}\n@keyframes w { to { letter-spacing: 0; font-weight: 700; } }`),
    ).toEqual(["letter-spacing في مفتاح", "مفتاح: font-weight"]);
    expect(letterSplitting(CODE)).toEqual([]);
    for (const planted of [
      'label.split("").map((c) => <span>{c}</span>)',
      "[...label].map((c) => c)",
      "Array.from(word).map(f)",
      "text.split(/(?:)/)",
      "word.match(/./g)",
      "text.charAt(i)",
    ]) {
      expect(letterSplitting(`${CODE}\n${planted}`), planted).toHaveLength(1);
    }
  });

  it("كشفٌ بمدّةٍ أو منحنىً أو تتابعٍ أو بدايةٍ خارج المواصفة", () => {
    expect(revealGaps(CSS)).toEqual([]);
    const slow = CSS.replace("animation-duration: 720ms;", "animation-duration: 1500ms;");
    expect(slow).not.toBe(CSS);
    expect(revealGaps(slow)).toEqual(["المدّة 1500ms"]);
    const ease = CSS.replace(REVEAL_EASE, "ease");
    expect(ease).not.toBe(CSS);
    expect(revealGaps(ease)).toContain("المنحنى");
    const flat = CSS.replace(
      /(@keyframes nxTkReveal \{\s*from \{\s*opacity: 0\.6;\s*translate: )0 0\.35em/,
      "$10 0",
    );
    expect(flat).not.toBe(CSS);
    expect(revealGaps(flat)).toContain("حالة البداية");
  });

  it("هالةٌ أسرع من ثانيتين أو أشدّ تفاوتًا من 0.25 أو لغير الخطر", () => {
    expect(breathGaps(CSS)).toEqual([]);
    const fast = CSS.replace(
      "animation-duration: 1.6s;\n    animation-timing-function: ease-in-out;",
      "animation-duration: 0.4s;\n    animation-timing-function: ease-in-out;",
    );
    expect(fast).not.toBe(CSS);
    expect(breathGaps(fast)).toEqual(["الدورة 0.8ث"]);
    const harsh = CSS.replace(/(@keyframes nxTkBreath \{[\s\S]*?to \{\s*opacity: )0\.4/, "$11");
    expect(harsh).not.toBe(CSS);
    expect(breathGaps(harsh)).toEqual(["تفاوت العتمة"]);
    const everyone = CSS.replace(
      '.nx-tk[data-tone="danger"]\n    .nx-tk-glyph[data-role="state"]\n    .nx-tk-ring',
      ".nx-tk .nx-tk-ring",
    );
    expect(everyone).not.toBe(CSS);
    expect(breathGaps(everyone)).toContain("ليست للخطر وحده");
  });

  it("جزءٌ مخفيٌّ أو مزاحٌ أو مضبَّبٌ في الحال الساكنة، أو غطاء العدّ ظاهرٌ بلا حركة", () => {
    expect(staticStateGaps(CSS)).toEqual([]);
    expect(staticStateGaps(`${CSS}\n.nx-tk-word { opacity: 0.6; }`)).toEqual([
      ".nx-tk-word: opacity",
    ]);
    expect(staticStateGaps(`${CSS}\n.nx-tk-real { translate: 0 1em; }`)).toEqual([
      ".nx-tk-real: translate",
    ]);
    expect(staticStateGaps(`${CSS}\n.nx-tk-fig { filter: blur(1em); }`)).toEqual([
      ".nx-tk-fig: filter",
    ]);
    const shown = CSS.replace(/(\.nx-tk-count \{\s*)display: none;/, "$1display: block;");
    expect(shown).not.toBe(CSS);
    expect(staticStateGaps(shown)).toEqual(["الغطاء ظاهر ساكنًا"]);
  });

  it("المتحرّك ظاهرٌ ساكنًا، أو الساكن يبقى مع المتحرّك، أو بلا استثناء الإيقاف", () => {
    expect(glyphSwapGaps(CSS)).toEqual([]);
    const shown = CSS.replace(/(\.nx-tk-img-anim \{\s*)display: none;/, "$1display: block;");
    expect(shown).not.toBe(CSS);
    expect(glyphSwapGaps(shown)).toContain("المتحرّك ظاهرٌ ساكنًا");
    const both = CSS.replace(/(\.nx-tk-img-still \{\s*)display: none;/, "$1display: block;");
    expect(both).not.toBe(CSS);
    expect(glyphSwapGaps(both)).toEqual(["الساكن يبقى مع المتحرّك"]);
    const always = CSS.replaceAll(":not([data-offscreen])", "");
    expect(always).not.toBe(CSS);
    expect(glyphSwapGaps(always).length).toBeGreaterThan(0);
  });

  it("الخطر والتحذير بنبرةٍ واحدة، أو لونٌ خارج الطبقة", () => {
    expect(toneGaps(CSS)).toEqual([]);
    const merged = CSS.replace(
      /(\.nx-tk\[data-tone="danger"\] \{\s*--tk-tone: )var\(--tone-rose\)/,
      "$1var(--tone-amber)",
    );
    expect(merged).not.toBe(CSS);
    expect(toneGaps(merged)).toEqual(["danger: var(--tone-amber)"]);
  });

  it("نبضةٌ لا تقف خارج الإطار", () => {
    expect(missingMotionPauses(CSS)).toEqual([]);
    const loose = CSS.replace(".nx-ticker[data-offscreen] .nx-tk-ring,", ".nx-ticker .nx-tk-ring,");
    expect(loose).not.toBe(CSS);
    expect(missingMotionPauses(loose)).toEqual([".nx-tk-ring"]);
  });

  it("نبضة حلقة الخطر ونبضة الانتقال خارج البوّابة أو قبل `[data-run]`", () => {
    const bare = `${CSS}\n.nx-tk-ring { animation-name: nxTkRing; }`;
    expect(ungatedMotion(bare)).toContain(".nx-tk-ring");
    const early = `${CSS}\n@media (${GATE}) { ${SWITCH} .nx-tk-body::before { animation-name: nxTkFlashA; } }`;
    expect(ungatedMotion(early)).toEqual([`${SWITCH} .nx-tk-body::before`]);
  });

  it("عتبةٌ مكتوبة خارج وحدة الحالة", () => {
    const files = new Map([
      ["src/components/home/HomeTicker.tsx", CODE],
      ["src/components/home/home-ticker-status.ts", "export const POSTURE_THRESHOLDS = {}"],
    ]);
    expect(thresholdLeaks(files)).toEqual([]);
    files.set("src/components/home/HomeKpi.tsx", "if (postureOf(x) === 'stable') {}");
    expect(thresholdLeaks(files)).toEqual(["src/components/home/HomeKpi.tsx"]);
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
      '["--nx-ticker-s" as string]: seconds === null ? undefined : `${seconds.toFixed(2)}s`',
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

describe("الحركة اختيارٌ لا افتراض — بلا زرّ إيقاف (أمر ٢٠٢٦/١٠/٢٥؛ WCAG 2.2.2 · 2.3.3)", () => {
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

  it("يقف خارج الإطار وبتركيز لوحة المفاتيح — لا بالفأرة ولا بزرّ؛ والتوهّج كما كان", () => {
    expect(missingPauses(CSS, ".nx-ticker-track")).toEqual([]);
    expect(missingPauses(BRAND_CSS, ".nx-brand-halo").sort()).toEqual(["focus"]);
  });

  it("الحال الأساسية ساكنة ومُمرَّرة، والحركة تُبدّلها داخل البوابة وحدها", () => {
    expect(staticModeGaps(CSS)).toEqual([]);
  });

  it("لا زرّ إيقاف في الشريط، وارتفاعه يتّسع لكبسولته", () => {
    expect(pauseButtonGaps(CODE, strip(CSS))).toEqual([]);
    expect(targetGaps(CSS)).toEqual([]);
  });

  it("واجهة الإيقاف المجمَّدة: السمة على الجذر والحدث، من أثرٍ على الحال", () => {
    expect(freezeGaps(ROW_CODE)).toEqual([]);
    expect(MOTION_PAUSE_EVENT).toBe("nx:motion-pause");
  });
});

describe("الوصول — قائمةٌ تُقرأ مرّةً واحدة، ومنطقةٌ مهذّبة واحدة لـ«حرجة» وحدها", () => {
  it('النسخ المطابقة `aria-hidden` و`inert`، ولا `aria-live` ولا حلقة JS، وعقدة `role="status"` واحدة', () => {
    expect(duplicateGaps(CODE)).toEqual([]);
    expect(liveRegions(CODE)).toEqual([]);
    expect(jsLoops(CODE)).toEqual([]);
    // الكتابة المباشرة على الأسلوب: متغيّر المدّة وحده (وهو ما سيكتبه React بعدها بالقيمة نفسها).
    expect(styleWrites(CODE)).toEqual(["--nx-ticker-s"]);
    expect(statusNodes(CODE)).toHaveLength(1);
  });

  it("المصيَّر: منطقةٌ مسمّاة قابلةٌ للتركيز، ونسخةٌ مقروءة واحدة، بلا زرّ ولا طبقاتٌ زخرفيةٌ في الشجرة — بلا مخالفة axe", async () => {
    setReads({});
    const { container, getByRole, queryByRole } = renderTicker();
    const region = getByRole("region", { name: "شريط الإعلانات — الحالة التشغيلية" });
    expect(region.getAttribute("tabindex")).toBe("0");
    const lists = container.querySelectorAll("ul.nx-ticker-copy");
    expect(lists.length).toBeGreaterThanOrEqual(2);
    expect(lists[0].hasAttribute("aria-hidden")).toBe(false);
    expect(lists[0].querySelectorAll("li")).toHaveLength(4);
    for (const dup of [...lists].slice(1)) {
      expect(dup.getAttribute("aria-hidden")).toBe("true");
      expect(dup.hasAttribute("inert")).toBe(true);
    }
    expect(queryByRole("button")).toBeNull();
    expect(container.querySelector("[aria-pressed]")).toBeNull();
    // طبقتا الضوء الزخرفيتان: خارج شجرة الوصول، ولا بنود فيهما ولا نصّ.
    const fx = [...container.querySelectorAll(".nx-tk-fx")];
    expect(fx).toHaveLength(2);
    for (const el of fx) {
      expect(el.getAttribute("aria-hidden")).toBe("true");
      expect(el.textContent).toBe("");
    }
    expect(container.querySelectorAll("ul.nx-ticker-copy [class*='nx-tk-fx']")).toHaveLength(0);
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

/* ── البنود المصيَّرة: حيّ · مرجعي · فاشل ───────────────────────────── */

type Reads = Record<string, Q<unknown>>;
const okQ = <T>(data: T): Q<T> => ({ data, isPending: false, isError: false });
const failQ = <T>(): Q<T> => ({ data: undefined, isPending: false, isError: true });

type IncRow = { severity: string | null; status: string };
const secQ = (open: number, critical: number | null, rows: IncRow[]) =>
  okQ({
    sites: [],
    incidents: rows,
    patrols: [],
    visitors: [],
    contractors: [],
    permits: [],
    assets: [],
    cctv: [],
    counts: { incidents_open: open, incidents_critical: critical },
  } as unknown as SecOverview);
const stateQ = (pcts: Array<number | null>) =>
  okQ({
    source: "database",
    simulation: false,
    regions: pcts.map((p, i) => ({ region_id: `r${i}`, compliance_pct: p })),
  } as unknown as CommandCenterState);
const maintQ = (overdue: number, source: "database" | "export" = "database") =>
  okQ({
    source,
    exportDate: source === "export" ? "2026-09-02" : undefined,
    kpis: { open: 10, on_hold: 2, overdue },
    analytics: {},
  } as unknown as MaintSummary);
const projectsQ = (rows: Array<{ status: string; health: string | null }>): Q<ProjectsSummary> =>
  okQ(summarizeProjects(rows, "database"));

/** حالةٌ حيّةٌ سليمة افتراضًا، تُبدَّل منها خانةٌ أو أكثر. */
function setReads(over: Partial<Reads>) {
  reads.current = {
    sec: secQ(0, 0, []),
    state: stateQ([96, 94]),
    maint: maintQ(0),
    projects: projectsQ([{ status: "in-progress", health: "green" }]),
    ...over,
  };
}

function renderTicker(extra: Record<string, unknown> = {}) {
  return render(
    createElement(
      I18nProvider,
      null,
      createElement(HomeTicker, {
        offscreen: false,
        ready: true,
        ...extra,
      }),
    ),
  );
}

const readable = (c: HTMLElement) =>
  [...c.querySelectorAll("ul.nx-ticker-copy")[0].querySelectorAll("li")] as HTMLElement[];
const byKind = (c: HTMLElement, kind: string) =>
  readable(c).find((li) => li.dataset.kind === kind) as HTMLElement;
const words = (li: HTMLElement) => li.querySelector(".nx-tk-word")?.textContent;
const glyphOf = (li: HTMLElement, role: string) =>
  li.querySelector(`.nx-tk-glyph[data-role="${role}"]`)?.getAttribute("data-glyph");

describe("البنود الأربعة مصيَّرةً — كلمةٌ وشكلٌ وأرقامٌ وشارة", () => {
  beforeEach(() => localStorage.removeItem("locale"));
  afterEach(() => {
    localStorage.removeItem("locale");
    reads.current = null;
  });

  it("حيّ: أربعة بنود بترتيب الأمر، لكلٍّ كلمةٌ ورمزُ حالة، ولا شارة «مرجعي»", async () => {
    setReads({
      state: stateQ([90, 85]),
      sec: secQ(3, 0, [{ severity: "low", status: "open" }]),
      maint: maintQ(4),
    });
    const { container } = renderTicker();
    await act(async () => {});
    const lis = readable(container);
    expect(lis.map((li) => li.dataset.kind)).toEqual([
      "posture",
      "maintenance",
      "incidents",
      "projects",
    ]);
    for (const li of lis) {
      expect(words(li), li.dataset.kind).toBeTruthy();
      expect(li.querySelector('.nx-tk-glyph[data-role="state"]'), li.dataset.kind).not.toBeNull();
    }
    expect(container.querySelector(".nx-tk-badge")).toBeNull();
    // الحالة الأمنية: ٨٨ (متوسط ٩٠ و٨٥ مقرَّبًا) ⇒ تحت المراقبة، مثلث تحذير، واتجاهها لم يُقَس.
    const posture = byKind(container, "posture");
    expect(words(posture)).toBe("تحت المراقبة");
    expect(posture.dataset.tone).toBe("warning");
    expect(glyphOf(posture, "state")).toBe("state-warning");
    expect(posture.textContent).toContain("الامتثال العام");
    expect(posture.querySelector('[data-fig="compliance"] .nx-tk-num')?.textContent).toBe("88%");
    expect(glyphOf(posture, "trend")).toBe("trend-flat");
    expect(posture.querySelector(".nx-tk-pol")?.textContent).toBe("لم يُقَس");
    expect(posture.querySelector(".nx-tk-trend .nx-tk-num")).toBeNull();
    // الصيانة: متأخرات ٤ من ١٢ نشطة.
    const maintenance = byKind(container, "maintenance");
    expect(words(maintenance)).toBe("متأخرات");
    expect(maintenance.querySelector('[data-fig="active"] .nx-tk-num')?.textContent).toBe("12");
    expect(maintenance.querySelector('[data-fig="overdue"] .nx-tk-num')?.textContent).toBe("4");
    expect(maintenance.querySelector(".nx-tk-trend")).toBeNull();
    // البلاغات: مفتوحة ٣، حرجة ٠ مقيسة.
    const incidents = byKind(container, "incidents");
    expect(words(incidents)).toBe("تتطلب متابعة");
    expect(incidents.querySelector('[data-fig="critical"] .nx-tk-num')?.textContent).toBe("0");
    // المشاريع: جارية ١ سليمة.
    expect(words(byKind(container, "projects"))).toBe("منتظمة");
  });

  it("مرجعي: الشارة «مرجعي» على الحالة الأمنية والبلاغات، وسهماهما المقيسان بدلالتَيهما", async () => {
    setReads({ state: stateQ([null, null]), sec: failQ() });
    const { container } = renderTicker();
    await act(async () => {});
    const badged = readable(container).filter((li) => li.dataset.badge === "reference");
    expect(badged.map((li) => li.dataset.kind)).toEqual(["posture", "incidents"]);
    for (const li of badged) expect(li.querySelector(".nx-tk-badge")?.textContent).toBe("مرجعي");
    const posture = byKind(container, "posture");
    expect(words(posture)).toBe("مستقرة");
    expect(glyphOf(posture, "state")).toBe("state-ok");
    expect(glyphOf(posture, "trend")).toBe("trend-up");
    expect(posture.querySelector(".nx-tk-pol")?.textContent).toBe("إيجابي");
    // ارتفاع البلاغات سهمٌ لأعلى لكنه سلبي: أحمر لا أخضر (لون السهم يتبع الدلالة لا الاتجاه).
    const incidents = byKind(container, "incidents");
    expect(glyphOf(incidents, "trend")).toBe("trend-up-bad");
    expect(incidents.querySelector(".nx-tk-pol")?.textContent).toBe("سلبي");
    expect(incidents.querySelector('[data-fig="critical"]')).toBeNull();
    // والصيانة والمشاريع لا يُوسمان مرجعيَّين أبدًا.
    expect(byKind(container, "maintenance").dataset.badge).toBeUndefined();
    expect(byKind(container, "projects").dataset.badge).toBeUndefined();
  });

  it("القراءة الفاشلة: «تعذّر القراءة» بلا أرقام ولا شارة ولا مرجع بديل للصيانة والمشاريع", async () => {
    setReads({ maint: failQ(), projects: failQ() });
    const { container } = renderTicker();
    await act(async () => {});
    for (const kind of ["maintenance", "projects"]) {
      const li = byKind(container, kind);
      expect(words(li), kind).toBe("تعذّر القراءة");
      expect(li.dataset.read).toBe("error");
      expect(li.querySelector(".nx-tk-fig"), kind).toBeNull();
      expect(li.querySelector(".nx-tk-badge"), kind).toBeNull();
      expect(li.textContent, kind).not.toMatch(/[0-9٠-٩]/);
      expect(glyphOf(li, "state")).toBe("state-info");
    }
  });

  it("نسخة التصدير موسومة «تصدير SAP» لا «مرجعي»، وتاريخها في ملخّص القارئ", async () => {
    setReads({ maint: maintQ(1, "export") });
    const { container } = renderTicker();
    await act(async () => {});
    const li = byKind(container, "maintenance");
    expect(li.querySelector(".nx-tk-badge")?.textContent).toBe("تصدير SAP");
    expect(li.dataset.badge).toBe("export");
    expect(li.textContent).toContain("2026-09-02");
    expect(li.textContent).not.toContain("مرجعي");
  });

  it("الخطر مثمّنٌ والتحذير مثلثٌ والسليم دائرة — برمزٍ مختلفٍ لكل نبرة", async () => {
    setReads({
      state: stateQ([40]),
      sec: secQ(2, 1, [{ severity: "critical", status: "open" }]),
      maint: maintQ(3),
    });
    const { container } = renderTicker();
    await act(async () => {});
    expect(glyphOf(byKind(container, "posture"), "state")).toBe("state-danger");
    expect(glyphOf(byKind(container, "incidents"), "state")).toBe("state-danger");
    expect(glyphOf(byKind(container, "maintenance"), "state")).toBe("state-warning");
    expect(glyphOf(byKind(container, "projects"), "state")).toBe("state-ok");
  });

  it('الصور: `alt=""` بمقاسها الأصلي، المتحرّكة كسولة، والساكنة بجانبها لكل رمز', async () => {
    setReads({});
    const { container } = renderTicker();
    await act(async () => {});
    for (const box of container.querySelectorAll(".nx-tk-glyph")) {
      const name = box.getAttribute("data-glyph") as keyof typeof TICKER_GLYPHS;
      const anim = box.querySelector("img.nx-tk-img-anim") as HTMLImageElement;
      const still = box.querySelector("img.nx-tk-img-still") as HTMLImageElement;
      expect(anim.getAttribute("src")).toBe(TICKER_GLYPHS[name].anim);
      expect(still.getAttribute("src")).toBe(TICKER_GLYPHS[name].still);
      expect(anim.getAttribute("loading")).toBe("lazy");
      for (const img of [anim, still]) {
        expect(img.getAttribute("alt")).toBe("");
        expect(img.getAttribute("width")).toBe(String(TICKER_GLYPH_SIZE));
        expect(img.getAttribute("height")).toBe(String(TICKER_GLYPH_SIZE));
        expect(img.getAttribute("decoding")).toBe("async");
      }
    }
  });

  it("الإنجليزية: الأسماء والكلمات والشارة بلسانها، والمنطقة المسمّاة بالإنجليزية", async () => {
    localStorage.setItem("locale", "en");
    setReads({ state: stateQ([null]), sec: failQ() });
    const { container, getByRole } = renderTicker();
    await act(async () => {});
    getByRole("region", { name: "Announcements — operational status" });
    expect(byKind(container, "posture").textContent).toContain("Security posture:");
    expect(words(byKind(container, "posture"))).toBe("Stable");
    expect(byKind(container, "posture").querySelector(".nx-tk-badge")?.textContent).toBe(
      "Reference",
    );
    expect(byKind(container, "maintenance").textContent).toContain(TICKER_LABELS.maintenance.en);
    expect(byKind(container, "incidents").querySelector(".nx-tk-pol")?.textContent).toBe(
      "negative",
    );
    expect(container.querySelector(".nx-ticker")?.getAttribute("dir")).toBe("ltr");
  });

  it("ملخّص القارئ هو نصّ البند نفسه، ولا يحمل لونٌ وحده حالة: كلمة + رمز شكل في كل بند", async () => {
    setReads({ sec: failQ(), maint: failQ() });
    const { container } = renderTicker();
    await act(async () => {});
    for (const li of readable(container)) {
      expect(li.querySelector("strong.nx-tk-word")?.textContent?.length).toBeGreaterThan(0);
      expect(li.querySelectorAll("img.nx-tk-img-still").length).toBeGreaterThanOrEqual(1);
    }
    expect(byKind(container, "incidents").textContent).toContain("البلاغات:");
    expect(byKind(container, "posture").textContent).toContain("الاتجاه");
  });

  it("العدّ زخرفة: الغطاء `aria-hidden` فارغ، والرقم الحقيقي نصٌّ في الشجرة، والنصّ كلماتٌ لا حروف", async () => {
    setReads({ state: stateQ([90, 85]), maint: maintQ(4) });
    const { container } = renderTicker();
    await act(async () => {});
    const covers = container.querySelectorAll(".nx-tk-count");
    expect(covers.length).toBeGreaterThan(0);
    for (const c of covers) {
      expect(c.getAttribute("aria-hidden")).toBe("true");
      expect(c.textContent).toBe("");
    }
    const maintenance = byKind(container, "maintenance");
    const active = maintenance.querySelector('[data-fig="active"] .nx-tk-num') as HTMLElement;
    expect(active.querySelector(".nx-tk-real")?.textContent).toBe("12");
    expect(active.textContent).toBe("12");
    expect(active.style.getPropertyValue("--tk-to")).toBe("12");
    // الوحدة خارج الرقم الحقيقي فلا تُخفى معه، والنصّ كاملٌ في الشجرة.
    const posture = byKind(container, "posture");
    expect(posture.querySelector('[data-fig="compliance"] .nx-tk-num')?.textContent).toBe("88%");
    // لا حرفٌ عربيٌّ مفردٌ في عنصرٍ: الاسم والكلمة عقدتا نصٍّ كاملتان بلا أبناء.
    for (const li of readable(container)) {
      for (const sel of [".nx-tk-label", ".nx-tk-word"]) {
        const el = li.querySelector(sel) as HTMLElement;
        expect(el.children.length, `${li.dataset.kind} ${sel}`).toBe(0);
        expect(el.textContent!.length).toBeGreaterThan(1);
      }
      for (const el of li.querySelectorAll("span, strong, bdi")) {
        expect(el.textContent, `${li.dataset.kind}`).not.toMatch(/^[\u0600-\u06FF]$/);
      }
    }
  });

  it("بلا مخالفة axe في الحالات الثلاث: حيّ · مرجعي · فاشل", async () => {
    for (const over of [{}, { state: stateQ([null]), sec: failQ() }, { maint: failQ() }]) {
      setReads(over);
      const { container, unmount } = renderTicker();
      await act(async () => {});
      expect(await axe(container)).toHaveNoViolations();
      unmount();
    }
  });
});

describe("الانتقالات مصيَّرة — نبضةٌ عند تغيّر الصنف، وإعلانٌ مهذّب لـ«حرجة» وحدها", () => {
  afterEach(() => {
    reads.current = null;
  });

  it('عقدة `role="status"` موجودة فارغة، ولا يتبدّل نصّها إلا بانتقال الصنف الأمني إلى «حرجة»', async () => {
    setReads({ state: stateQ([96]) });
    const view = renderTicker();
    await act(async () => {});
    const status = view.container.querySelector('[role="status"]') as HTMLElement;
    expect(status.textContent).toBe("");
    const again = () =>
      view.rerender(
        createElement(
          I18nProvider,
          null,
          createElement(HomeTicker, {
            offscreen: false,
            ready: true,
          }),
        ),
      );
    const body = () => byKind(view.container, "posture").querySelector(".nx-tk-body");
    const first = body();
    // الرقم يتغيّر والصنف واحد ⇒ لا نبضة ولا إعلان، والجسم نفسه (لا إعادة تركيب).
    setReads({ state: stateQ([94]) });
    again();
    expect(status.textContent).toBe("");
    expect(byKind(view.container, "posture").dataset.flip).toBeUndefined();
    expect(body()).toBe(first);
    // مستقرة ← تحت المراقبة ⇒ نبضة، بلا إعلان.
    setReads({ state: stateQ([80]) });
    again();
    expect(byKind(view.container, "posture").dataset.flip).toBe("");
    // الجسم أُعيد تركيبه فبدأت حركاته من أولها، وبند البلاغات لم يُمسّ.
    const second = body();
    expect(second).not.toBe(first);
    expect(byKind(view.container, "incidents").dataset.flip).toBeUndefined();
    expect(status.textContent).toBe("");
    // ← حرجة ⇒ إعادة تركيبٍ جديدة (تُعاد الحركة) وإعلانٌ واحد.
    setReads({ state: stateQ([30]) });
    again();
    expect(byKind(view.container, "posture").dataset.flip).toBe("");
    expect(body()).not.toBe(second);
    expect(status.textContent).toBe("تنبيه: الحالة الأمنية صارت حرجة");
    // الرقم يهبط والصنف حرجة ⇒ النصّ نفسه لا يتبدّل (لا إعلان ثانٍ).
    setReads({ state: stateQ([20]) });
    again();
    expect(status.textContent).toBe("تنبيه: الحالة الأمنية صارت حرجة");
    // الخروج من «حرجة» يمحو الإعلان.
    setReads({ state: stateQ([95]) });
    again();
    expect(status.textContent).toBe("");
  });

  it("الوصول الأول للبيانات لا ينبض ولا يعلن ولو كان الصنف «حرجة»", async () => {
    setReads({ state: stateQ([10]) });
    const { container } = renderTicker();
    await act(async () => {});
    expect(container.querySelector('[role="status"]')?.textContent).toBe("");
    expect(container.querySelectorAll("[data-flip]")).toHaveLength(0);
  });
});

describe("الرموز والتسميات والمصدر — على القرص وفي الشيفرة", () => {
  it("لكل رمزٍ في الخريطة ملفّا WebP وSVG على القرص، والنبرات والاتجاهات بأشكالٍ مختلفة", () => {
    expect(TICKER_GLYPH_NAMES).toEqual([
      "state-danger",
      "state-warning",
      "state-ok",
      "state-info",
      "trend-up",
      "trend-down",
      "trend-flat",
      "trend-up-bad",
      "trend-down-good",
    ]);
    expect(
      glyphGaps(
        TICKER_GLYPHS as Record<string, { anim: string; still: string }>,
        TICKER_GLYPH_NAMES,
        GLYPH_FOR_TONE,
        GLYPH_FOR_TREND,
      ),
    ).toEqual([]);
    expect(TICKER_GLYPH_SIZE).toBe(64);
  });

  it("لون سهم الاتجاه يتبع الدلالة لا الاتجاه: لا أخضر لأعلى بجوار «سلبي»، ولا أحمر لأسفل بجوار «إيجابي»", () => {
    // الإيجابي أخضر في الاتجاهين، والسلبي أحمر في الاتجاهين.
    expect(glyphForTrend("up", "positive")).toBe("trend-up");
    expect(glyphForTrend("down", "positive")).toBe("trend-down-good");
    expect(glyphForTrend("up", "negative")).toBe("trend-up-bad");
    expect(glyphForTrend("down", "negative")).toBe("trend-down");
    // بلا دلالةٍ مقيسة (محايد/لم يُقَس) أو بلا اتجاه ⇐ السهم المحايد، لا لونٌ يدّعي حكمًا.
    for (const dir of ["up", "down"] as const) {
      expect(glyphForTrend(dir, "neutral")).toBe("trend-flat");
      expect(glyphForTrend(dir, "unmeasured")).toBe("trend-flat");
    }
    expect(glyphForTrend("flat", "positive")).toBe("trend-flat");
    // الألوان في ملفّات الأصول نفسها: الأخضر `#2fb36d` للجيّد والأحمر `#e5484d` للسيّئ.
    const fill = (name: string) =>
      /fill="(#[0-9a-f]{6})" stroke="\1" stroke-width="8"/i.exec(
        readFileSync(`${GLYPH_DIR}/${name}.svg`, "utf8"),
      )?.[1];
    expect(fill("trend-up")).toBe("#2fb36d");
    expect(fill("trend-down-good")).toBe("#2fb36d");
    expect(fill("trend-up-bad")).toBe("#e5484d");
    expect(fill("trend-down")).toBe("#e5484d");
  });

  it("رمزا الدلالة يحملان إيقاع أصليهما حرفيًّا: 18 إطارًا، 2000 ملّي ثانية، وثبات 583", () => {
    // مدد الإطارات من أجزاء ANMF في ملف WebP (بايت 12–14 من حمولة كل جزء).
    const durations = (name: string) => {
      const b = readFileSync(`${GLYPH_DIR}/${name}.webp`);
      const d: number[] = [];
      for (let pos = 12; pos + 8 <= b.length;) {
        const size = b.readUInt32LE(pos + 4);
        if (b.toString("ascii", pos, pos + 4) === "ANMF") d.push(b.readUIntLE(pos + 8 + 12, 3));
        pos += 8 + size + (size & 1);
      }
      return d;
    };
    for (const [derived, base] of [
      ["trend-up-bad", "trend-up"],
      ["trend-down-good", "trend-down"],
    ] as const) {
      const d = durations(derived);
      expect(d, `${derived}: إيقاعٌ غير إيقاع ${base}`).toEqual(durations(base));
      expect(d.length).toBe(18);
      expect(d.reduce((a, b) => a + b, 0)).toBe(2000);
      expect(Math.max(...d)).toBe(583);
    }
  });

  it("أسماء البنود الأربعة: الحالة الأمنية · الصيانة · البلاغات · المشاريع", () => {
    expect(TICKER_LABELS.posture.ar).toBe("الحالة الأمنية");
    expect(TICKER_LABELS.maintenance.ar).toBe("الصيانة");
    expect(TICKER_LABELS.incidents.ar).toBe("البلاغات");
    expect(TICKER_LABELS.projects.ar).toBe("المشاريع");
    for (const l of Object.values(TICKER_LABELS)) expect(l.en.length).toBeGreaterThan(0);
  });

  it("الرموشن السينمائي على الملفّ الحيّ: بنسبة الخطّ، ومُركِّب، وآمنٌ للعربية، ويقف ويُلغى إلى النهائيّ", () => {
    expect(nonCompositorKeyframes(CSS)).toEqual([]);
    expect(pxKeyframes(CSS)).toEqual([]);
    expect(filterGaps(CSS)).toEqual([]);
    expect(arabicSafetyGaps(CSS)).toEqual([]);
    expect(letterSplitting(CODE)).toEqual([]);
    expect(revealGaps(CSS)).toEqual([]);
    expect(breathGaps(CSS)).toEqual([]);
    expect(staticStateGaps(CSS)).toEqual([]);
    expect(ungatedMotion(CSS)).toEqual([]);
    // ما يحرس الوقف: الحركات العابرة تُلغى (`none`) في الموقوف وخارج الإطار، والعدّ يختفي غطاؤه.
    const stopped = `${SWITCH} .nx-ticker[data-offscreen] .nx-ticker-track[data-run]`;
    expect(declsOf(CSS, `${stopped} .nx-tk-real`, GATE)["animation-name"]).toBe("none");
    expect(declsOf(CSS, `${stopped} .nx-tk-word::after`, GATE)["animation-name"]).toBe("none");
    expect(declsOf(CSS, `${stopped} .nx-tk-count`, GATE).display).toBe("none");
    // الدخول للنسخة المقروءة وحدها (كلفة المسار): لا قاعدة دخولٍ على النسخ المطابقة.
    const first = `${SWITCH} .nx-ticker-track[data-run] .nx-ticker-copy:not([aria-hidden="true"]) .nx-tk-count`;
    expect(declsOf(CSS, first, GATE)["animation-name"]).toBe("nxTkCount");
    // الغطاء يبقى بعتمة 0 بعد العدّ (`both`): مع `backwards` كان يعود فوق الرقم الحقيقي بعدّادٍ صفر فيطمس
    // رقمه الأول (قِيس في المتصفّح: 2,284 ← «0,284»).
    expect(declsOf(CSS, first, GATE)["animation-fill-mode"], "الغطاء يعود بعد العدّ").toBe("both");
    // الأرقام بأرقامٍ متساوية العرض ووزنٍ ثابت: لا يهتزّ العدّ.
    const num = declsOf(CSS, ".nx-tk-num", null);
    expect(num["font-variant-numeric"]).toBe("tabular-nums");
    expect(num["font-weight"]).toBe("700");
  });

  it("الكاشفات الجديدة تُسقِط النسخ المطابقة: الدخول لا يُكتب إلا على `.nx-ticker-copy:not([aria-hidden])`", () => {
    const everywhere = CSS.replaceAll(
      '.nx-ticker-copy:not([aria-hidden="true"])\n    .nx-tk-count',
      ".nx-tk-count",
    );
    expect(everywhere).not.toBe(CSS);
    expect(
      declsOf(
        everywhere,
        `${SWITCH} .nx-ticker-track[data-run] .nx-ticker-copy:not([aria-hidden="true"]) .nx-tk-count`,
        GATE,
      )["animation-name"],
    ).toBeUndefined();
  });

  it("القراءات مشتركة: `useHomeReads` وحده — لا استعلامٌ ولا دالّة خادمٍ خاصة بالشريط", () => {
    expect(CODE).toContain("useHomeReads()");
    expect(CODE).not.toMatch(/useQuery\(|useServerFn\(|fetch\(|createServerFn/);
    expect(CONTENT_CODE).not.toMatch(/useQuery\(|fetch\(/);
  });

  it("العتبات وأنواع الحالة في `home-ticker-status.ts` وحده", () => {
    const files = new Map<string, string>();
    for (const f of readdirSync("src/components", { recursive: true }) as string[]) {
      if (!/\.(ts|tsx)$/.test(f) || /\.test\.|\.contract\./.test(f)) continue;
      files.set(`src/components/${f}`, strip(readFileSync(`src/components/${f}`, "utf8")));
    }
    expect(files.size).toBeGreaterThan(10);
    expect(thresholdLeaks(files)).toEqual([]);
  });

  it("لا لون ولا رقمٌ مكتوب في شيفرة الشريط: النبرة من الطبقة والأرقام من القراءات", () => {
    expect(CODE.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/g) ?? []).toEqual([]);
    expect(CODE.match(/\b(?:Math\.random|Date\.now)\b/g) ?? []).toEqual([]);
    expect(CONTENT_CODE.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });
});

describe("لا زرّ إيقاف في الصفّ، والتفضيل القديم يُمحى (أمر ٢٠٢٦/١٠/٢٥)", () => {
  beforeEach(() => setReads({}));
  afterEach(() => {
    reads.current = null;
    localStorage.removeItem("nx-brand-motion");
    delete document.documentElement.dataset.nxMotionPaused;
  });

  it("بلا زرّ، ويُمحى «paused» المحفوظ فلا يتجمّد شيءٌ بلا مخرج، ويُعلَن الحال «غير موقوف» مرّةً", async () => {
    localStorage.setItem("nx-brand-motion", "paused");
    const events: boolean[] = [];
    const listen = (e: Event) => events.push((e as CustomEvent<{ paused: boolean }>).detail.paused);
    window.addEventListener(MOTION_PAUSE_EVENT, listen);
    try {
      const view = render(createElement(I18nProvider, null, createElement(HomeBrandRow)));
      await act(async () => {});
      expect(view.queryByRole("button", { name: "إيقاف الحركة" })).toBeNull();
      expect(view.container.querySelector(".nx-ticker-toggle")).toBeNull();
      expect(localStorage.getItem("nx-brand-motion")).toBeNull();
      expect(events).toEqual([false]);
      expect(document.documentElement.dataset.nxMotionPaused).toBeUndefined();
      for (const el of view.container.querySelectorAll(".nx-ticker, .nx-home-brand")) {
        expect(el.hasAttribute("data-paused")).toBe(false);
      }
      expect(view.container.querySelector(".nx-ticker")).not.toBeNull();
    } finally {
      window.removeEventListener(MOTION_PAUSE_EVENT, listen);
    }
  });

  it("الصفّ لا يمرّر إيقافًا إلى الشريط: الخصائص `offscreen` و`ready` وحدهما", () => {
    expect(ROW_CODE).toContain("<HomeTicker offscreen={offscreen} ready={known} />");
    expect(ROW_CODE).not.toContain("onPausedChange");
    expect(ROW_CODE).toContain("localStorage.removeItem(PAUSE_KEY)");
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   ٢٠٢٦/١٠/٢٥ — «متواصل بدون توقف» والمظهر السينمائي
   ══════════════════════════════════════════════════════════════════════════ */

/** طبقات الضوء الجديدة: مفاتيحها لا تلمس إلا المُركِّب (بلا الاستثناءات الثلاثة المعلنة للبنود). */
const LIGHT_KEYFRAMES = [
  "nxTkComet",
  "nxTkGlint",
  "nxTkGem",
  "nxTkDrift",
  "nxTkSpin",
  "nxTkTwinkle",
  "nxTkShine",
] as const;
const LIVE = ":not([data-offscreen])";

/** ⑯ مفاتيح الضوء: `translate`/`opacity`/`scale`/`rotate` وحدها، وكلٌّ منها موجود. */
function lightKeyframeGaps(css: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  postcss.parse(css).walkAtRules("keyframes", (kf) => {
    if (!(LIGHT_KEYFRAMES as readonly string[]).includes(kf.params)) return;
    seen.add(kf.params);
    kf.walkDecls((d) => {
      if (!/^(translate|opacity|scale|rotate)$/.test(d.prop)) out.push(`${kf.params}: ${d.prop}`);
    });
  });
  for (const k of LIGHT_KEYFRAMES) if (!seen.has(k)) out.push(`${k}: غائب`);
  return out;
}

/**
 * ⑰ طبقات الضوء تُرسم مع الجري وحده: كل قاعدةٍ تسمّي أحد مفاتيحها (وقاعدة تبديل الشفق المتحرّك) تحمل
 * `:not([data-offscreen])` في كل محدِّداتها — فتختفي خارج الإطار بدل أن تتجمّد
 * نصفَ كنسٍ (والمتحرّك WebP لا يُوقَف إلا بتبديله بساكنه).
 */
function lightGateGaps(css: string): string[] {
  const out: string[] = [];
  const named = new Set<string>();
  postcss.parse(css).walkDecls("animation-name", (d) => {
    if (inKeyframes(d)) return;
    for (const name of d.value.split(",").map((n) => n.trim())) {
      if (!(LIGHT_KEYFRAMES as readonly string[]).includes(name)) continue;
      named.add(name);
      for (const sel of (d.parent as Rule).selectors) {
        if (!sel.includes(LIVE)) out.push(`${name}: ${sel.replace(/\s+/g, " ")}`);
      }
    }
  });
  for (const k of LIGHT_KEYFRAMES) if (!named.has(k)) out.push(`${k}: بلا حركة`);
  let swapped = false;
  postcss.parse(css).walkDecls("background-image", (d) => {
    if (d.value.trim() !== "var(--tk-live)") return;
    swapped = true;
    for (const sel of (d.parent as Rule).selectors) {
      if (!sel.includes(LIVE)) out.push(`الشفق المتحرّك: ${sel.replace(/\s+/g, " ")}`);
    }
  });
  if (!swapped) out.push("الشفق المتحرّك: بلا تبديل");
  return out;
}

/** أسرع مدّةٍ لحركةٍ مسمّاة بالثواني عبر قواعدها كلّها (والقوائم المفصولة بفاصلة تُقرأ بالموضع). */
function durationOf(css: string, name: string): number {
  let sec = Number.POSITIVE_INFINITY;
  postcss.parse(css).walkDecls("animation-name", (d) => {
    if (inKeyframes(d)) return;
    const at = d.value
      .split(",")
      .map((n) => n.trim())
      .indexOf(name);
    if (at === -1) return;
    d.parent?.walkDecls("animation-duration", (x) => {
      const list = x.value.split(",").map((n) => Number.parseFloat(n));
      const v = list[at] ?? list[0];
      if (v < sec) sec = v;
    });
  });
  return Number.isFinite(sec) ? sec : Number.NaN;
}

/**
 * ⑱ الوميض آمن (WCAG 2.3.1) وهادئ: دورةٌ ≥ 8 ث، وكنسٌ بين 0.9 و1.3 ث، وتفاوت إضاءةٍ ≤ 0.12 (نسبة المزج
 * في `--tk-glint` بالوضعين). والمذنّب دورته ≥ 6 ث.
 */
function glintGaps(css: string): string[] {
  const out: string[] = [];
  const period = durationOf(css, "nxTkGlint");
  if (!(period >= 8)) out.push(`دورة الوميض ${period}ث`);
  let idleEnd = Number.NaN;
  postcss.parse(css).walkAtRules("keyframes", (kf) => {
    if (kf.params !== "nxTkGlint") return;
    kf.walkRules((r) => {
      const stops = r.selector.split(",").map((x) => Number.parseFloat(x));
      if (stops.length === 2) idleEnd = stops[1];
    });
  });
  const sweep = ((100 - idleEnd) / 100) * period;
  if (!(sweep >= 0.9 && sweep <= 1.3)) out.push(`الكنس ${sweep}ث`);
  let swings = 0;
  postcss.parse(css).walkDecls("--tk-glint", (d) => {
    swings += 1;
    const pct = Number.parseFloat(/(\d+(?:\.\d+)?)%\s*,\s*transparent/.exec(d.value)?.[1] ?? "NaN");
    if (!(pct <= 12)) out.push(`تفاوت الإضاءة ${pct}%`);
  });
  if (swings !== 2) out.push(`تصريحا --tk-glint: ${swings}`);
  const comet = durationOf(css, "nxTkComet");
  if (!(comet >= 6)) out.push(`دورة المذنّب ${comet}ث`);
  return out;
}

/** ⑳ الطبقات الخرافية (٢٠٢٦/١٠/٢٥ — ب): كل دورةٍ دون عتبةٍ هادئة، فلا وميض ولا اهتزاز (WCAG 2.3.1). */
const FX_MIN_SECONDS: Record<string, number> = {
  nxTkShine: 6,
  nxTkTwinkle: 2,
  nxTkSpin: 3,
  nxTkDrift: 15,
};
function fxGaps(css: string): string[] {
  const out: string[] = [];
  for (const [name, min] of Object.entries(FX_MIN_SECONDS)) {
    const sec = durationOf(css, name);
    if (!(sec >= min)) out.push(`${name}: ${sec}ث < ${min}ث`);
  }
  return out;
}

/**
 * ⑳ب المذنّب السفلي بعكس العلويّ في اللغتين: قاعدة الإنجليزية تحمل بوّابة قاعدتها الأساس نفسها
 * (`[data-run]:not([data-offscreen])`) وإلا خسرت أمامها بالنوعيّة فسار المذنّبان باتجاهٍ واحد.
 */
function cometDirectionGaps(css: string): string[] {
  const out: string[] = [];
  let base = "";
  let ltr = "";
  postcss.parse(css).walkRules((rule) => {
    for (const sel of rule.selectors) {
      const flat = sel.replace(/\s+/g, " ");
      if (!flat.endsWith('.nx-tk-fx[data-fx="b"]::before')) continue;
      if (flat.includes('[dir="ltr"]')) ltr = flat;
      else if (flat.includes("[data-run]")) base = flat;
    }
  });
  if (!base) out.push("القاعدة الأساس");
  if (!ltr) out.push("قاعدة الإنجليزية");
  for (const need of ["[data-run]", ":not([data-offscreen])"]) {
    if (ltr && !ltr.includes(need)) out.push(`الإنجليزية بلا ${need}`);
  }
  return out;
}

/** ⑳ج القسري يُخفي الطبقات الخرافية بـ`display: none !important` (لا بالاسم وحده). */
function forcedHidesFx(css: string): string[] {
  const need = new Set([
    ".nx-tk-fx",
    ".nx-tk-body::after",
    '.nx-tk-glyph[data-role="state"]::after',
  ]);
  postcss.parse(css).walkAtRules("media", (m) => {
    if (!m.params.includes("forced-colors")) return;
    m.walkRules((r) => {
      let hides = false;
      r.walkDecls("display", (d) => {
        if (d.value.trim() === "none" && d.important) hides = true;
      });
      if (!hides) return;
      for (const sel of r.selectors) need.delete(sel.replace(/\s+/g, " ").trim());
    });
  });
  return [...need];
}

/** ⑳د المدار حول الدائرة (السليم) وحدها — لا حلقةٌ دائرية على المثمّن والمثلث والمعيّن. */
function orbitGaps(css: string): string[] {
  const out: string[] = [];
  let seen = false;
  postcss.parse(css).walkRules((rule) => {
    if (!rule.toString().includes("animation-name: nxTkSpin;")) return;
    for (const sel of rule.selectors) {
      if (!sel.includes('.nx-tk-glyph[data-role="state"]::after')) continue;
      seen = true;
      if (!sel.includes('[data-tone="ok"]')) out.push("المدار لغير السليم");
    }
  });
  if (!seen) out.push("لا مدار");
  return out;
}

const BACKDROPS = [
  "bg-aurora-dark-still.webp",
  "bg-aurora-dark.webp",
  "bg-aurora-light-still.webp",
  "bg-aurora-light.webp",
];
/**
 * ⑲ صور الشفق: الأربع بأسمائها، الساكنة في `--tk-still` والمتحرّكة في `--tk-live` وحدهما، وكلّها على القرص.
 */
function backdropGaps(css: string, exists: (path: string) => boolean = existsSync): string[] {
  const out: string[] = [];
  const found: string[] = [];
  postcss.parse(css).walkDecls((d) => {
    for (const m of d.value.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
      const url = m[1];
      if (!url.startsWith("/media/ticker/bg-")) {
        out.push(`${d.prop}: ${url}`);
        continue;
      }
      const file = url.slice("/media/ticker/".length);
      found.push(file);
      if (d.prop === "--tk-still" && !file.endsWith("-still.webp")) out.push(`still: ${file}`);
      if (d.prop === "--tk-live" && file.endsWith("-still.webp")) out.push(`live: ${file}`);
      if (d.prop !== "--tk-still" && d.prop !== "--tk-live") out.push(`${d.prop}: ${file}`);
      if (!exists(`public${url}`)) out.push(`غائب على القرص: ${file}`);
    }
  });
  if ([...new Set(found)].sort().join() !== BACKDROPS.join()) out.push(`الأسماء: ${found.join()}`);
  return out;
}

/** ⑲ب مقاس صورة الشفق من ترويسة WebP (VP8X): 1200×96، والساكنة خفيفة والمتحرّكة تحت 160 KB، وعتمة الطبقة بالمدى المقيس. */
function backdropFileGaps(root = "public/media/ticker"): string[] {
  const out: string[] = [];
  for (const file of BACKDROPS) {
    const path = `${root}/${file}`;
    if (!existsSync(path)) continue;
    const b = readFileSync(path);
    const still = file.endsWith("-still.webp");
    if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP")
      out.push(`${file}: ليس WebP`);
    if (b.toString("ascii", 12, 16) === "VP8X") {
      const [w, h] = [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
      if (w !== 1200 || h !== 96) out.push(`${file}: ${w}×${h}`);
    }
    if (b.length > (still ? 12_000 : 160_000)) out.push(`${file}: ${b.length} بايت`);
  }
  return out;
}

describe("٢٠٢٦/١٠/٢٥ — الكواشف تحمرّ على المزروع", () => {
  it("مفتاحُ ضوءٍ بخاصيةٍ غير مُركِّبة، أو مفتاحٌ محذوف", () => {
    expect(lightKeyframeGaps(CSS)).toEqual([]);
    expect(lightKeyframeGaps(`${CSS}\n@keyframes nxTkGem { to { inline-size: 3px; } }`)).toEqual([
      "nxTkGem: inline-size",
    ]);
    expect(lightKeyframeGaps(CSS.replace("@keyframes nxTkComet", "@keyframes nxTkCometX"))).toEqual(
      ["nxTkComet: غائب"],
    );
  });

  it("ضوءٌ يبقى مع الإيقاف أو خارج الإطار، أو شفقٌ متحرّكٌ يبقى", () => {
    expect(lightGateGaps(CSS)).toEqual([]);
    const loose = CSS.replace(
      ".nx-ticker[data-run]:not([data-offscreen])::after {\n    display: block;\n    animation-name: nxTkGlint;",
      ".nx-ticker[data-run]::after {\n    display: block;\n    animation-name: nxTkGlint;",
    );
    expect(loose).not.toBe(CSS);
    expect(lightGateGaps(loose)).toHaveLength(1);
    const stuck = CSS.replace(
      /(\.nx-ticker\[data-run\])(:not\(\[data-offscreen\]\))(::before \{\s*background-image: var\(--tk-live\))/,
      "$1$3",
    );
    expect(stuck).not.toBe(CSS);
    expect(lightGateGaps(stuck).some((g) => g.startsWith("الشفق المتحرّك"))).toBe(true);
  });

  it("وميضٌ أسرع، أو أشدّ إضاءةً، أو مذنّبٌ أسرع", () => {
    expect(glintGaps(CSS)).toEqual([]);
    const fast = CSS.replace("animation-duration: 9s;", "animation-duration: 2s;");
    expect(fast).not.toBe(CSS);
    expect(glintGaps(fast).length).toBeGreaterThan(0);
    const bright = CSS.replace("--nx-white) 9%, transparent", "--nx-white) 40%, transparent");
    expect(bright).not.toBe(CSS);
    expect(glintGaps(bright)).toEqual(["تفاوت الإضاءة 40%"]);
    const comet = CSS.replace("animation-duration: 7s;", "animation-duration: 3s;");
    expect(comet).not.toBe(CSS);
    expect(glintGaps(comet)).toEqual(["دورة المذنّب 3ث"]);
  });

  it("طبقةٌ خرافية أسرع من العتبة، أو مذنّبٌ سفليّ بقاعدةٍ لاتينية أضعف، أو مدارٌ دائريّ لغير السليم", () => {
    expect(fxGaps(CSS)).toEqual([]);
    const fastShine = CSS.replace("animation-duration: 8s;", "animation-duration: 1s;");
    expect(fastShine).not.toBe(CSS);
    expect(fxGaps(fastShine)).toEqual(["nxTkShine: 1ث < 6ث"]);
    const fastDust = CSS.replace("animation-duration: 46s, 5s;", "animation-duration: 46s, 0.3s;");
    expect(fastDust).not.toBe(CSS);
    expect(fxGaps(fastDust)).toEqual(["nxTkTwinkle: 0.3ث < 2ث"]);
    const fastOrbit = CSS.replace("animation-duration: 3.6s;", "animation-duration: 0.5s;");
    expect(fastOrbit).not.toBe(CSS);
    expect(fxGaps(fastOrbit)).toEqual(["nxTkSpin: 0.5ث < 3ث"]);

    expect(cometDirectionGaps(CSS)).toEqual([]);
    const weak = CSS.replace(
      '.nx-ticker[dir="ltr"][data-run]:not([data-offscreen])\n    .nx-tk-fx[data-fx="b"]::before',
      '.nx-ticker[dir="ltr"]\n    .nx-tk-fx[data-fx="b"]::before',
    );
    expect(weak).not.toBe(CSS);
    expect(cometDirectionGaps(weak)).toEqual([
      "الإنجليزية بلا [data-run]",
      "الإنجليزية بلا :not([data-offscreen])",
    ]);

    expect(orbitGaps(CSS)).toEqual([]);
    const everyone = CSS.replace(
      '\n    .nx-tk[data-tone="ok"]\n    .nx-tk-glyph[data-role="state"]::after {',
      '\n    .nx-tk-glyph[data-role="state"]::after {',
    );
    expect(everyone).not.toBe(CSS);
    expect(orbitGaps(everyone)).toEqual(["المدار لغير السليم"]);

    expect(forcedHidesFx(CSS)).toEqual([]);
    const soft = CSS.replace(
      /(\.nx-tk-fx,\s*\.nx-tk-body::after,[^}]*?)display: none !important;/,
      "$1display: none;",
    );
    expect(soft).not.toBe(CSS);
    expect(forcedHidesFx(soft).length).toBeGreaterThan(0);
  });

  it("صورة شفقٍ مفقودة، أو متحرّكةٌ في خانة الساكنة، أو مرجعٌ خارج الأسماء الأربعة", () => {
    const absent = (p: string) => !p.endsWith("bg-aurora-light.webp") && existsSync(p);
    expect(backdropGaps(CSS, (p) => p !== "public/media/ticker/bg-aurora-light.webp")).toEqual([
      "غائب على القرص: bg-aurora-light.webp",
    ]);
    expect(absent("public/media/ticker/bg-aurora-light.webp")).toBe(false);
    const swapped = CSS.replace(
      '--tk-still: url("/media/ticker/bg-aurora-light-still.webp");',
      '--tk-still: url("/media/ticker/bg-aurora-light.webp");',
    );
    expect(swapped).not.toBe(CSS);
    expect(backdropGaps(swapped, () => true)).toContain("still: bg-aurora-light.webp");
    expect(
      backdropGaps(`${CSS}\n.x { background: url("/media/ticker/bg-extra.webp"); }`, () => true),
    ).toContain("background: bg-extra.webp");
  });
});

describe("٢٠٢٦/١٠/٢٥ — المظهر السينمائي على الملفّ الحيّ", () => {
  it("طبقات الضوء مُركِّبة، داخل البوّابة، تقف خارج الإطار، ووميضها آمن", () => {
    expect(lightKeyframeGaps(CSS)).toEqual([]);
    expect(lightGateGaps(CSS)).toEqual([]);
    expect(glintGaps(CSS)).toEqual([]);
    expect(fxGaps(CSS)).toEqual([]);
    expect(cometDirectionGaps(CSS)).toEqual([]);
    expect(orbitGaps(CSS)).toEqual([]);
    expect(ungatedMotion(CSS)).toEqual([]);
    // اللوح ساكنًا بلا مذنّب ولا وميض (`display: none`)، وتُرسم داخل البوّابة وحدها.
    expect(declsOf(CSS, ".nx-ticker::after", null).display).toBe("none");
    expect(declsOf(CSS, ".nx-ticker-window::after", null).display).toBe("none");
  });

  it("صور الشفق الأربع على القرص: الساكنة افتراضًا والمتحرّكة داخل البوّابة وحدها", () => {
    expect(backdropGaps(CSS)).toEqual([]);
    expect(declsOf(CSS, ".nx-ticker::before", null).background).toContain("var(--tk-still)");
    expect(CSS).not.toMatch(/\.nx-ticker::before \{[^}]*--tk-live/);
  });

  it("صور الشفق: 1200×96، والساكنة ≤ 12 KB والمتحرّكة ≤ 160 KB، وعتمة الطبقة داكنًا 0.40–0.45 وفاتحًا 0.60–0.70", () => {
    expect(backdropFileGaps()).toEqual([]);
    const dir = mkdtempSync(join(tmpdir(), "tk-"));
    writeFileSync(join(dir, "bg-aurora-dark.webp"), Buffer.alloc(200_000));
    expect(backdropFileGaps(dir)).toEqual([
      "bg-aurora-dark.webp: ليس WebP",
      "bg-aurora-dark.webp: 200000 بايت",
    ]);
    const light = Number.parseFloat(declsOf(CSS, ".nx-ticker", null)["--tk-aurora"]);
    const dark = Number.parseFloat(declsOf(CSS, ".dark .nx-ticker", null)["--tk-aurora"]);
    expect(light).toBeGreaterThanOrEqual(0.6);
    expect(light).toBeLessThanOrEqual(0.7);
    expect(dark).toBeGreaterThanOrEqual(0.4);
    expect(dark).toBeLessThanOrEqual(0.45);
    expect(declsOf(CSS, ".nx-ticker::before", null).opacity).toBe("var(--tk-aurora)");
  });

  it("لا قناعٌ على سلفٍ للمسار: ذوبان الحافّتين طبقتان ساكنتان بلون الأرضية", () => {
    expect(styleViolations(CSS)).toEqual([]);
    const edge = declsOf(CSS, ".nx-ticker-window::before", null).background;
    expect(edge).toContain("var(--tk-base)");
    expect(declsOf(CSS, ".nx-ticker-window::before", null)["pointer-events"]).toBe("none");
    for (const sel of [".nx-ticker", ".nx-ticker-window", ".nx-ticker-view", ".nx-ticker-track"]) {
      const d = declsOf(CSS, sel, null);
      expect(
        Object.keys(d).filter((p) => /mask/.test(p)),
        sel,
      ).toEqual([]);
    }
  });

  it("الثيم من `.dark` وحدها على الرموز، والأرضية والشفق يتبدّلان معه", () => {
    const light = declsOf(CSS, ".nx-ticker", null);
    const dark = declsOf(CSS, ".dark .nx-ticker", null);
    for (const k of ["--tk-base", "--tk-still", "--tk-live", "--tk-glint", "--tk-comet"]) {
      expect(light[k], `فاتح ${k}`).toBeTruthy();
      expect(dark[k], `داكن ${k}`).toBeTruthy();
      expect(dark[k]).not.toBe(light[k]);
    }
    // لا صنف ثيمٍ في الترميز (المادة ٣٢): الشيفرة لا تذكر dark/light أصنافًا.
    expect(CODE).not.toMatch(/["'`]\s*(?:dark|light)\b[^"'`]*["'`]\s*:|classList/);
  });

  it("الطباعة تُخفي الشريط، والقسري يُخفي طبقات الضوء، وحلقة تركيز المنطقة داخل اللوح المقصوص", () => {
    expect(declsOf(CSS, ".nx-ticker", "print").display).toBe("none");
    const forced = CSS.slice(CSS.indexOf("@media (forced-colors: active)"));
    for (const sel of [".nx-ticker::before", ".nx-ticker::after", ".nx-ticker-window::after"]) {
      expect(forced).toContain(sel);
    }
    expect(forced).toMatch(/\.nx-tk-body,/);
    expect(declsOf(CSS, ".nx-ticker", null).overflow).toBe("hidden");
    expect(
      Number.parseFloat(declsOf(CSS, ".nx-ticker-view:focus-visible", null)["outline-offset"]),
    ).toBeLessThan(0);
    expect(forcedHidesFx(CSS)).toEqual([]);
  });

  it("الحضور الطباعي: 15px/1.2 للبند، كلمة الحالة 600، أرقامٌ متساوية العرض، وأرضية 12px محفوظة", () => {
    const item = declsOf(CSS, ".nx-ticker-item", null);
    expect(item["font-size"]).toBe("15px");
    expect(item["line-height"]).toBe("1.2");
    expect(declsOf(CSS, ".nx-tk-word", null)["font-weight"]).toBe("600");
    expect(declsOf(CSS, ".nx-tk-num", null)["font-variant-numeric"]).toBe("tabular-nums");
    expect(declsOf(CSS, ".nx-tk-badge", null)["font-size"]).toBe("12px");
    // الكبسولة بارتفاعٍ ثابت: وصول الخطّ لا يغيّره، وارتفاع الشريط قيمةٌ واحدة بلا قفزة.
    expect(px(declsOf(CSS, ".nx-tk-body", null)["block-size"])).toBeGreaterThanOrEqual(32);
    expect(declsOf(CSS, ".nx-tk-body", null)["border-radius"]).toBe("999px");
    expect(declsOf(CSS, ".nx-ticker", null)["block-size"]).toBe("52px");
  });

  it("السرعة 44 بكسلًا في الثانية — داخل المدى", () => {
    expect(TICKER_PX_PER_S).toBe(44);
    expect(speedViolations(TICKER_PX_PER_S)).toEqual([]);
  });
});

describe("٢٠٢٦/١٠/٢٥ — الاستمرار: مدّةٌ تتغيّر والمسار لا يقفز", () => {
  /** موضع المسار بالبكسل لوقتٍ محلّي (السرعة ثابتة) — النموذج الذي يجب أن يُحفَظ. */
  const pos = (localMs: number) => (localMs / 1000) * TICKER_PX_PER_S;

  it("`carryLoopTime` يحفظ الموضع بالبكسل لا نسبة التقدّم، ويلتفّ حين تقصر النسخة", () => {
    // بعد 3 دوراتٍ و5 ث، والنسخة تكبر 38 ← 44 ث: الموضع نفسه (5 ث)، لا 5×(44/38).
    expect(carryLoopTime(3 * 38_000 + 5_000, 38_000, 44_000)).toBe(5_000);
    expect(pos(carryLoopTime(3 * 38_000 + 5_000, 38_000, 44_000))).toBe(pos(5_000));
    // `T mod الجديدة` الخام قفزةٌ (هذا ما يفعله CSS وحده): يختلف عن الوقت المحلي.
    expect((3 * 38_000 + 5_000) % 44_000).not.toBe(5_000);
    // الدورة الأولى: يبقى كما هو.
    expect(carryLoopTime(1_234, 38_000, 44_000)).toBe(1_234);
    // النسخة تقصر دون الإزاحة الحالية: يلتفّ (قفزةٌ لازمة) ويبقى داخل الدورة.
    expect(carryLoopTime(30_000, 38_000, 20_000)).toBe(10_000);
    // مدخلاتٌ فاسدة: لا يغيّر شيئًا.
    expect(carryLoopTime(Number.NaN, 38_000, 44_000)).toBeNaN();
    expect(carryLoopTime(500, 0, 44_000)).toBe(500);
    expect(carryLoopTime(500, 38_000, 0)).toBe(500);
    // خاصيةٌ على شبكة: النتيجة في [0، الجديدة)، والموضع مصون ما دام الوقت المحلي دون الجديدة.
    for (const prev of [9_000, 38_000, 51_250]) {
      for (const next of [7_500, 38_000, 60_000]) {
        for (const t of [0, 1, 8_999, 37_999, 123_456, 999_999]) {
          const r = carryLoopTime(t, prev, next);
          expect(r).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThan(next);
          const local = t % prev;
          if (local < next) expect(r).toBe(local);
        }
      }
    }
  });

  it("`retimeLoop` يكتب متغيّر المدّة ويصحّح حركة المسار وحدها", () => {
    const written: Record<string, string> = {};
    const other = { animationName: "nxTkReveal", currentTime: 777 as number | null };
    const mine = { animationName: "nxTickerRtl", currentTime: 3 * 38_000 + 5_000 };
    const track = {
      style: { setProperty: (k: string, v: string) => (written[k] = v) },
      getAnimations: () => [other, mine],
    } as unknown as Parameters<typeof retimeLoop>[0];
    expect(retimeLoop(track, 38, 44)).toBe(true);
    expect(written).toEqual({ "--nx-ticker-s": "44.00s" });
    expect(mine.currentTime).toBe(5_000);
    expect(other.currentTime).toBe(777);
    // بلا حركةٍ قائمة (سكون): تُكتب المدّة ولا يُصحَّح شيء.
    const idle = {
      style: { setProperty: () => {} },
      getAnimations: () => [other],
    } as unknown as Parameters<typeof retimeLoop>[0];
    expect(retimeLoop(idle, 38, 44)).toBe(false);
    // متصفّحٌ بلا `getAnimations`.
    const bare = { style: { setProperty: () => {} } } as unknown as Parameters<
      typeof retimeLoop
    >[0];
    expect(retimeLoop(bare, 38, 44)).toBe(false);
  });

  describe("مصيَّرًا", () => {
    const observers: Array<() => void> = [];
    let copyW = 440;
    const clock = { currentTime: 0 as number };
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "getAnimations");

    beforeEach(() => {
      observers.length = 0;
      copyW = 440;
      clock.currentTime = 0;
      vi.stubGlobal(
        "ResizeObserver",
        class {
          constructor(cb: () => void) {
            observers.push(cb);
          }
          observe() {}
          disconnect() {}
        },
      );
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
        this: Element,
      ) {
        const width = this.classList.contains("nx-ticker-copy") ? copyW : 300;
        return { width, height: 50, top: 0, left: 0, right: width, bottom: 50 } as DOMRect;
      });
      Object.defineProperty(HTMLElement.prototype, "getAnimations", {
        configurable: true,
        value(this: HTMLElement) {
          return this.classList.contains("nx-ticker-track")
            ? [
                {
                  animationName: "nxTickerRtl",
                  get currentTime() {
                    return clock.currentTime;
                  },
                  set currentTime(v: number) {
                    clock.currentTime = v;
                  },
                },
              ]
            : [];
        },
      });
      setReads({});
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
      if (original) Object.defineProperty(HTMLElement.prototype, "getAnimations", original);
      else delete (HTMLElement.prototype as { getAnimations?: unknown }).getAnimations;
      reads.current = null;
    });

    it("تغيّر عرض النسخة (خطٌّ يصل · بنودٌ تتبدّل) يصحّح الزمن في نداء المراقب نفسه، لا بعد إيداع", async () => {
      const { container } = renderTicker();
      await act(async () => {});
      const track = container.querySelector(".nx-ticker-track") as HTMLElement;
      expect(track.style.getPropertyValue("--nx-ticker-s")).toBe("10.00s");
      expect(container.querySelector(".nx-ticker")?.hasAttribute("data-run")).toBe(true);
      // بعد ثلاث دوراتٍ و4 ث، تكبر النسخة 440 ← 880 (مدّة 20 ث).
      clock.currentTime = 3 * 10_000 + 4_000;
      copyW = 880;
      for (const cb of observers) cb();
      // قبل أن يُرسَم React أيَّ شيء: الزمن مصحَّحٌ والمتغيّر مكتوب.
      expect(clock.currentTime).toBe(4_000);
      expect(track.style.getPropertyValue("--nx-ticker-s")).toBe("20.00s");
      await act(async () => {});
      expect(track.style.getPropertyValue("--nx-ticker-s")).toBe("20.00s");
      // ثم تقصر 880 ← 110 (مدّة 2.5 ث): تلتفّ الإزاحة 4 ث حولها.
      copyW = 110;
      for (const cb of observers) cb();
      expect(clock.currentTime).toBe(1_500);
      expect(track.style.getPropertyValue("--nx-ticker-s")).toBe("2.50s");
      // وتغيّرٌ دون عتبة 0.01 ث لا يمسّ شيئًا.
      clock.currentTime = 777;
      copyW = 110.1;
      for (const cb of observers) cb();
      expect(clock.currentTime).toBe(777);
    });

    it("تحديث القراءات لا يعيد تركيب المسار ولا النسخ ولا البند؛ وتغيّر الصنف يعيد الجسم وحده", async () => {
      setReads({ state: stateQ([96]) });
      const view = renderTicker();
      await act(async () => {});
      const again = () =>
        view.rerender(
          createElement(
            I18nProvider,
            null,
            createElement(HomeTicker, {
              offscreen: false,
              ready: true,
            }),
          ),
        );
      const track = view.container.querySelector(".nx-ticker-track");
      const lists = [...view.container.querySelectorAll("ul.nx-ticker-copy")];
      const li = byKind(view.container, "posture");
      const body = li.querySelector(".nx-tk-body");
      // الرقم يتغيّر (تحديث قراءات) والصنف واحد.
      setReads({ state: stateQ([94]) });
      again();
      expect(view.container.querySelector(".nx-ticker-track")).toBe(track);
      expect([...view.container.querySelectorAll("ul.nx-ticker-copy")]).toEqual(lists);
      expect(byKind(view.container, "posture")).toBe(li);
      expect(byKind(view.container, "posture").querySelector(".nx-tk-body")).toBe(body);
      // الصنف يتغيّر: الجسم وحده يُعاد، والمسار والنسخ والبند باقية.
      setReads({ state: stateQ([40]) });
      again();
      expect(view.container.querySelector(".nx-ticker-track")).toBe(track);
      expect([...view.container.querySelectorAll("ul.nx-ticker-copy")]).toEqual(lists);
      expect(byKind(view.container, "posture")).toBe(li);
      expect(byKind(view.container, "posture").querySelector(".nx-tk-body")).not.toBe(body);
    });
  });
});

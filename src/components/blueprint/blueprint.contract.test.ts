/**
 * عقد المُخطَّط التنفيذي.
 *
 * كل بند هنا يحرس قاعدة يسهل خرقها بتعديل يبدو بريئًا ولا يلتقطه tsc ولا
 * eslint: لون يُكتب نهائيًّا فينجو من قلب الوضع، `transform` يمحو إزاحة،
 * صفر يحلّ محلّ غياب. الفحص يقرأ المصدر لأن أثر هذه الأخطاء لا يظهر إلا
 * بعد رسم في متصفح أو بعد قلب الثيم.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import postcss, { type AtRule, type ChildNode, type Node as CssNode } from "postcss";
import { describe, expect, it } from "vitest";
import { REGIONS, REGION_ACCENT_HEX } from "@/lib/regions";
import { HOME_REFERENCE } from "@/components/home/home-reference";

const read = (p: string) => readFileSync(p, "utf8");

const PANELS = read("src/components/blueprint/InstrumentPanels.tsx");
const PAGE = read("src/routes/-blueprint-page.tsx");
const CHROME = read("src/components/nav/SystemChrome.tsx");
const ROOT = read("src/routes/__root.tsx");

/** المداخل البنيوية في القشرة الواحدة: الشريط ولوحة الأوامر فيها، والجذر يركّبها. */
function entranceGaps(chrome: string, root: string): string[] {
  const out: string[] = [];
  for (const tag of ["<SystemSidebar />", "<CommandPalette />"])
    if (!chrome.includes(tag)) out.push(tag);
  if (!/<SystemChrome\b/.test(root)) out.push("root");
  return out;
}
const PULSE = read("src/components/pulse/PulseGlyph.tsx");
const CSS = read("src/styles.css");

/** طبقة المُخطَّط وحدها من styles.css — لئلا تُقاس قواعد غيرها.
 * الحدّ الأعلى واجب لا ترف: الشريحة كانت مفتوحة النهاية حين كان المُخطَّط
 * آخر طبقة في الملف، فلمّا أُلحقت طبقات الاتجاهات بعده صارت المفتوحة تقيس
 * قواعد غيرها وتُسقط العقد بذنب لم يرتكبه. */
const LAYER_START = CSS.indexOf("المُخطَّط التنفيذي — السطح الهندسي");
const LAYER_END = CSS.indexOf("اتجاه أ — «مركز المهام»", LAYER_START);
const LAYER = CSS.slice(LAYER_START, LAYER_END === -1 ? undefined : LAYER_END);

/* ══ سطح الرئيسية — «مركز القيادة» (أمر المالك ٢٠٢٦/١٠/١٣، المواصفة ١٠) ═══════
 *
 * الصفحة صارت غلافًا يركّب صفوفًا، لكلٍّ ملفّه: المؤشرات · الصدر (الخريطة ·
 * سَدِيد) · التشغيل · التحليلات. فما كان بندٌ يقرؤه في `PAGE` انتقل إلى حامله،
 * وبندٌ يقرأ الصفحة وحدها صار يمرّ أخضر على غلافٍ فارغ (المادة ٣٠). والسطح
 * يُجمع **بالتتبّع من الصفحة** لا بقائمةٍ تُكتب باليد: كل وحدةٍ من
 * `components/{home,map,sadeed}` تستوردها الصفحة أو ما تستورده — فصفٌّ جديد
 * يُركَّب فيها يدخل الفحص بنفسه، ولا سطحٌ ثانٍ ينجو (المادة ٣١).
 */

/** الكود بلا تعليقاته — الفحص على ما يُنفَّذ لا على شرحه (المادة ٣٠، النمط الثالث). */
const stripComments = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const HOME_SURFACE: ReadonlyMap<string, string> = (() => {
  const out = new Map<string, string>();
  const queue = ["src/routes/-blueprint-page.tsx"];
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (out.has(file)) continue;
    const src = read(file);
    out.set(file, src);
    for (const m of src.matchAll(/from "@\/components\/((?:home|map|sadeed)\/[\w.-]+)"/g)) {
      const hit = [".tsx", ".ts"]
        .map((ext) => `src/components/${m[1]}${ext}`)
        .find((f) => existsSync(f));
      if (hit) queue.push(hit);
    }
  }
  return out;
})();

/** أنماط الرئيسية — كل ملفٍّ في `styles/home/`، وما يُضاف إليها لاحقًا يدخل بنفسه. */
const HOME_CSS: ReadonlyMap<string, string> = new Map(
  readdirSync("src/styles/home")
    .filter((f) => f.endsWith(".css"))
    .map((f) => [`src/styles/home/${f}`, read(`src/styles/home/${f}`)] as const),
);

/** ملفّ من السطح باسمه — ويُسقط البند إن خرج من السطح، فلا يقرأ فراغًا. */
function surfaceFile(name: string): string {
  const hit = [...HOME_SURFACE.keys()].find((f) => f.endsWith(`/${name}`));
  expect(hit, `${name} خارج سطح الرئيسية — لم تعد الصفحة تركّبه`).toBeDefined();
  return HOME_SURFACE.get(hit as string) as string;
}

/** متن دالّةٍ مسمّاة حتى قوسها الختامي في أوّل السطر — `""` إن غابت. */
function fnBody(src: string, name: string): string {
  const at = src.search(new RegExp(`\\bfunction ${name}\\b`));
  if (at === -1) return "";
  const end = src.indexOf("\n}\n", at);
  return src.slice(at, end === -1 ? undefined : end + 2);
}

/** جسم كائنٍ ثابت مسمّى حتى `};` في أوّل السطر — `""` إن غاب. */
function objBody(src: string, name: string): string {
  const at = src.search(new RegExp(`\\bconst ${name}\\b`));
  if (at === -1) return "";
  const end = src.indexOf("\n};", at);
  return src.slice(at, end === -1 ? undefined : end + 3);
}

/**
 * وسوم JSX بخصائصها. نهاية الوسم أوّل `>` خارج الأقواس والنصوص — فلا يقطعه
 * سهمُ دالّةٍ داخل خاصية (`onClick={() => a > b}`) ولا مقارنةٌ في تعبير.
 * **والمسح يدخل الخصائص نفسها ولا يقفز فوقها:** عنصرٌ يُمرَّر خاصيةً
 * (`control={<Link …>}` في بطاقات التحليلات) وسمٌ كغيره — وقفزُه كان يُعمي الفحص
 * عن رابطٍ حيّ، وكشفه عدُّ الروابط بالمسح مقابل عدّها بالنصّ (بند المداخل أدناه).
 */
interface JsxTag {
  readonly name: string;
  readonly close: boolean;
  readonly self: boolean;
  readonly attrs: string;
  readonly at: number;
}
function jsxTags(code: string): JsxTag[] {
  const out: JsxTag[] = [];
  const re = /<(\/?)([A-Za-z][\w.]*)/g;
  for (let m = re.exec(code); m; m = re.exec(code)) {
    let i = re.lastIndex;
    let depth = 0;
    let quote: string | null = null;
    for (; i < code.length; i++) {
      const c = code[i];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'" || (c === "`" && depth > 0)) {
        quote = c;
      } else if (c === "{") {
        depth++;
      } else if (c === "}") {
        depth--;
      } else if (c === ">" && depth === 0) {
        break;
      }
    }
    const attrs = code.slice(re.lastIndex, i);
    out.push({
      name: m[2],
      close: m[1] === "/",
      self: attrs.trimEnd().endsWith("/"),
      attrs,
      at: m.index,
    });
  }
  return out;
}

/** أعمق تعشيشٍ للروابط في ملفّ ورصيدها في آخره — `<a>` داخل `<a>` يفكّكه المتصفح بصمت. */
function anchorNesting(code: string): { depth: number; balance: number } {
  let depth = 0;
  let balance = 0;
  for (const t of jsxTags(code)) {
    if (t.name !== "Link" && t.name !== "a") continue;
    if (t.close) balance--;
    else if (!t.self) depth = Math.max(depth, ++balance);
  }
  return { depth, balance };
}

/** عناصر تفاعلية بطبعها — ما سواها بـ`onClick` سطحٌ صامت لا يبلغه التبويب ولا القارئ. */
const INTERACTIVE = new Set(["a", "button", "input", "select", "textarea", "summary", "option"]);
const silentClicks = (code: string) =>
  jsxTags(code)
    .filter(
      (t) =>
        !t.close &&
        /^[a-z]/.test(t.name) &&
        !INTERACTIVE.has(t.name) &&
        /(?:^|\s)onClick=/.test(t.attrs),
    )
    .map((t) => `<${t.name}>`);

/** جذر ما تعيده الدالّة — `null` إن تعدّدت الإعادات (فرعٌ قد يعيد غير الجذر). */
function rootOf(body: string): string | null {
  if ((body.match(/\breturn\b/g) ?? []).length !== 1) return null;
  return /\breturn\s*\(\s*<([A-Za-z][\w.]*)/.exec(body)?.[1] ?? null;
}

/** داخل `@media (forced-colors: active)`؟ */
function inForcedColors(node: ChildNode): boolean {
  for (let p: CssNode | undefined = node.parent; p && p.type !== "root"; p = p.parent) {
    if (p.type === "atrule" && /forced-colors/.test((p as AtRule).params)) return true;
  }
  return false;
}

/** آخر مركّبٍ في المحدِّد — العنصر الذي تقع عليه القاعدة فعلًا. */
const lastCompound = (selector: string) =>
  selector
    .trim()
    .split(/\s*[\s>+~]\s*/)
    .pop() ?? "";

/** تصريحات كل قاعدةٍ تسمّي المحدِّد بعينه — خارج الوضع القسري، أو داخله. */
function declsOf(css: string, selector: string, forced = false): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  postcss.parse(css).walkRules((rule) => {
    if (inForcedColors(rule) !== forced) return;
    if (!rule.selectors.some((s) => s.trim() === selector)) return;
    for (const n of rule.nodes) if (n.type === "decl") out.push([n.prop, n.value]);
  });
  return out;
}

/** تصريحات الصنف في حال السكون: كل قاعدةٍ يقع آخر مركّبها عليه بلا شبه صنف. */
function restDecls(css: string, cls: string): Array<[string, string]> {
  const tail = new RegExp(`^\\.${cls}(?:\\[[^\\]]*\\])*$`);
  const out: Array<[string, string]> = [];
  postcss.parse(css).walkRules((rule) => {
    if (inForcedColors(rule)) return;
    if (!rule.selectors.some((s) => tail.test(lastCompound(s)))) return;
    for (const n of rule.nodes) if (n.type === "decl") out.push([n.prop, n.value]);
  });
  return out;
}

/** بالبكسل: `44px` · `2.75rem` — `null` لغير ذلك. */
const px = (value: string): number | null => {
  const m = /^([\d.]+)(px|rem)$/.exec(value.trim());
  return m ? Number(m[1]) * (m[2] === "rem" ? 16 : 1) : null;
};

/** أرضية اللمس (المواصفة §3.7) — أرضية `a[href]` العامّة على المؤشّر الخشن. */
const TOUCH_FLOOR_PX = 44;

/** قاعدةٌ تُنزل الهدف تحت أرضية اللمس: سقفُ ارتفاعٍ أو أرضيةٌ أدنى منها. */
const floorBreaches = (css: string, cls: string) =>
  restDecls(css, cls)
    .filter(([prop]) => /^(?:min-|max-)?(?:block-size|height)$/.test(prop))
    .filter(([, value]) => {
      const v = px(value);
      return v !== null && v < TOUCH_FLOOR_PX;
    })
    .map(([prop, value]) => `${prop}: ${value}`);

/** مخفيٌّ في السكون فلا يظهر إلا بالتمرير — وما يظهر بالتمرير وحده لا وجود له على اللمس. */
const hiddenAtRest = (css: string, cls: string) =>
  restDecls(css, cls)
    .filter(
      ([p, v]) =>
        (p === "opacity" && parseFloat(v) < 0.6) ||
        (p === "visibility" && v.trim() === "hidden") ||
        (p === "display" && v.trim() === "none"),
    )
    .map(([p, v]) => `${p}: ${v}`);

/** فواصل القيمة في مستواها الأعلى — فاصلة `color-mix(…, …)` الداخلية ليست فاصلة ظلّ. */
function topLevelSplit(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    else if (value[i] === ")") depth--;
    else if (value[i] === "," && depth === 0) {
      out.push(value.slice(from, i));
      from = i + 1;
    }
  }
  out.push(value.slice(from));
  return out.map((s) => s.trim());
}

/** علامات الحال التي لا يحملها اللون: حلقةٌ خارجية · إطار · خطّ · وزن · عرضُ حدّ. */
function nonColourCues(decls: Array<[string, string]>): string[] {
  const cues: string[] = [];
  for (const [prop, value] of decls) {
    if (
      prop === "box-shadow" &&
      topLevelSplit(value).some((s) => /^0\s+0\s+0\s+[\d.]*[1-9]/.test(s))
    )
      cues.push("حلقة خارجية");
    if (/^outline(?:-width)?$/.test(prop) && !/^(?:none|0)\b/.test(value.trim())) cues.push("إطار");
    if (/^text-decoration(?:-line)?$/.test(prop) && /underline|overline/.test(value))
      cues.push("خطّ");
    if (prop === "font-weight") cues.push("وزن");
    if (/^border(?:-[a-z]+)*-width$/.test(prop)) cues.push("عرض حدّ");
  }
  return cues;
}

/** المحدِّدات التي يرسمها الوضع القسري بـ`Highlight` — الحال الباقية حين تسقط ألوان المؤلّف. */
function forcedHighlights(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkRules((rule) => {
    if (!inForcedColors(rule)) return;
    const marked = rule.nodes.some(
      (n) =>
        n.type === "decl" &&
        /^background(?:-color)?$/.test(n.prop) &&
        /\bHighlight\b/.test(n.value),
    );
    if (marked) out.push(...rule.selectors.map((s) => s.trim()));
  });
  return out;
}

/* ── فحوص اللكنة والاسم والامتثال والترتيب — دوالّ تُجرَّب على المزروع ─────── */

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** أسماء المناطق من المصدر الواحد نفسه — باللسانين، مختصرةً وكاملة. */
const REGION_WORDS = REGIONS.flatMap((r) => [r.shortAr, r.shortEn, r.labelAr, r.labelEn]);

/** اسم منطقةٍ مكتوبٌ نصًّا: بين علامتي تنصيص، أو نصًّا في JSX. */
function writtenRegionNames(code: string): string[] {
  const alt = REGION_WORDS.map(escapeRe).join("|");
  return code.match(new RegExp(`(["'\`])(?:${alt})\\1|>\\s*(?:${alt})\\s*<`, "g")) ?? [];
}

/** كل إسنادٍ لـ`--region-tint` في الترميز — قيمتُه كما كُتبت. */
const regionTints = (code: string) =>
  [...code.matchAll(/["']--region-tint["'](?:\s+as\s+string)?\]?\s*[:,]\s*([^,}\n)]+)/g)].map((m) =>
    m[1].trim(),
  );
/** لكنةٌ لا تأتي من `REGION_ACCENT_HEX`. */
const foreignTints = (code: string) =>
  regionTints(code).filter((v) => !v.startsWith("REGION_ACCENT_HEX["));
/** لكنة منطقةٍ منسوخةٌ سداسيًّا خارج `regions.ts`. */
const ACCENT_HEXES = Object.values(REGION_ACCENT_HEX).map((h) => h.toLowerCase());
const copiedAccents = (text: string) => ACCENT_HEXES.filter((h) => text.toLowerCase().includes(h));

/** مقارنةٌ بعتبةٍ عددية على قيمة امتثالٍ أو نسبة — بأيّ اسمٍ حملها. */
const complianceThresholds = (code: string) =>
  code.match(
    /\b\w*(?:compliance|[pP]ct)\w*(?:\[[^\]\n]*\]|\.(?!length\b)\w+)*\s*[<>]=?\s*-?\d|\d\s*[<>]=?\s*\w*(?:compliance|[pP]ct)\w*/g,
  ) ?? [];
/** غياب الامتثال صفرًا: `?? 0`، أو اختبار حضوره بـ`> 0` (والصفر قياس). */
const complianceZeroes = (code: string) =>
  code.match(/\w*compliance\w*(?:\[[^\]\n]*\]|\.\w+)*\s*(?:\?\?\s*0\b|>\s*0\b)/g) ?? [];
/** أيّ مقارنةٍ بعددٍ حرفيّ — في متنٍ قيمتُه نفسُها نسبةُ الامتثال. */
const numericComparisons = (body: string) =>
  body.match(/(?<![=<>!-])[<>]=?\s*-?\d+(?:\.\d+)?\b/g) ?? [];
/** علامة حكمٍ في متنٍ لا يقرأ `severity` الخادم — حكمٌ بلا مصدر. */
const unsourcedVerdicts = (body: string) =>
  /\.severity\b/.test(body)
    ? []
    : (body.match(/STAT_TONES|data-verdict=|data-status=|<VerdictGlyph|<StatusChip/g) ?? []);
/** رموز الحكم: لا يلبسها لونُ هويّة. */
const VERDICT_TONE =
  /--(?:tone|stage|sd)-(?:emerald|amber|rose|ruby|green|red)\b|success|warning|danger/;

/** خرائط الشدّة ⇄ الحكم في ملفّ، ومدخل `unmeasured` في كلٍّ منها. */
function severityMaps(code: string): Array<{ name: string; unmeasured: string | null }> {
  const out: Array<{ name: string; unmeasured: string | null }> = [];
  for (const m of code.matchAll(/const (\w+)\s*:\s*Record<RiskSeverity,[^=]*=\s*\{/g)) {
    const start = (m.index ?? 0) + m[0].length;
    const end = code.indexOf("\n};", start);
    const body = code.slice(start, end === -1 ? undefined : end);
    out.push({
      name: m[1],
      unmeasured: /\bunmeasured:\s*(\{[^}]*\}|[^,\n]+)/.exec(body)?.[1] ?? null,
    });
  }
  return out;
}
/** معاملات كل نداءٍ لدالّةٍ مسمّاة (`.filter(…)`) بأقواسها المتوازنة — لا حتى أوّل `)`. */
function callArgs(code: string, method: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`\\.${method}\\(`, "g");
  for (let m = re.exec(code); m; m = re.exec(code)) {
    let depth = 1;
    let i = re.lastIndex;
    for (; i < code.length && depth > 0; i++) {
      if (code[i] === "(") depth++;
      else if (code[i] === ")") depth--;
    }
    out.push(code.slice(re.lastIndex, i - 1));
  }
  return out;
}
/** مرشّحٌ يُسقط غير المقيس من القائمة — يطويه بدل أن يعرضه. */
const foldsUnmeasured = (code: string) =>
  callArgs(code, "filter").filter((a) => a.includes("unmeasured"));

/** الغياب يُصدر حكمًا: براءةً أو تحذيرًا أو خطرًا — أو لا يُقال أصلًا. */
const absenceVerdict = (entry: string | null) =>
  entry === null ||
  !/"(?:neutral|default)"/.test(entry) ||
  /"(?:healthy|success|ok|warning|danger)"/.test(entry);

/** رقاقةٌ محايدة تستعير لون حكم. */
function neutralToneLeaks(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkRules((rule) => {
    if (!rule.selectors.some((s) => s.includes('[data-status="neutral"]'))) return;
    rule.walkDecls((d) => {
      if (VERDICT_TONE.test(d.value)) out.push(`${rule.selector} { ${d.prop}: ${d.value} }`);
    });
  });
  return out;
}

/** رابط مدخل المنطقة في متن حامله: الرابط إلى `/sec`. */
const regionLink = (body: string) =>
  jsxTags(body).find((t) => !t.close && t.name === "Link" && /\bto="\/sec"/.test(t.attrs));
/** نواقص رابط المنطقة: الوجهة ومنطقتها والاختيار العام والاسم المقروء. */
function regionLinkGaps(attrs: string, id: string): string[] {
  const need: Array<[string, RegExp]> = [
    ["الوجهة /sec", /\bto="\/sec"/],
    ["منطقة المدخل في البحث", new RegExp(`search=\\{\\{ region: ${escapeRe(id)} \\}\\}`)],
    ["الاختيار العام قبل الانتقال", /\bonClick=\{/],
    ["الاسم المقروء", /\baria-label=\{/],
  ];
  return need.filter(([, re]) => !re.test(attrs)).map(([what]) => what);
}

/** نواقص رابط السجل في رأس البطاقة المشتركة: حلقة التركيز · الظهور · السهم · التعشيش. */
function riskEntryGaps(card: string): string[] {
  const tags = jsxTags(card);
  const first = tags.findIndex((t) => !t.close && t.name === "Link" && /\bto=\{to\}/.test(t.attrs));
  if (first === -1) return ["لا رابط في رأس البطاقة"];
  const open = tags[first];
  // الإغلاق المطابق لا أوّل `</Link>`: رابطٌ معشَّش يُغلق قبله فيقصّ ما بعده.
  let depth = 0;
  let end = card.length;
  for (const t of tags.slice(first)) {
    if (t.name !== "Link") continue;
    if (!t.close) {
      if (!t.self) depth++;
    } else if (--depth === 0) {
      end = t.at;
      break;
    }
  }
  const inner = card.slice(open.at + 1, end);
  const gaps: string[] = [];
  if (!/className="[^"]*\bnx-home-more\b/.test(open.attrs)) gaps.push("حلقة التركيز المشتركة");
  if (/\b(?:opacity-0|invisible|hidden|sr-only)\b/.test(open.attrs)) gaps.push("مخفيّ حتى التمرير");
  if (!/<ChevronLeft\b/.test(inner)) gaps.push("السهم");
  if (/<(?:Link|a)\b/.test(inner)) gaps.push("رابطٌ داخل رابط");
  return gaps;
}

/** ما بقي من سجلّ المخاطر المحذوف وبطاقاته المجمّعة (V4 · V5). */
const RISK_RESIDUE: ReadonlyArray<readonly [string, RegExp]> = [
  ["زرّ السجل الكامل", /افتح سجل المخاطر الكامل|Open the full risk register/],
  ["رابط /risk", /\bto(?:=|:\s*)["']\/risk["']/],
  ["جدول السجل أو بطاقاته", /nx-risk-(?:table|scroll|ref|title|card|region)\b/],
  ["الفرز الكامل للسجل", /\bsortedRiskRows\b/],
  ["ملاحظة بلا إسناد", /بلا إسناد لمنطقة في المصدر/],
  ["عدّادات التجميع", /\bcountBy(?:Severity|Region)\b/],
  ["بطاقات «حسب الشدّة»", /حسب الشدّ?ة/],
  ["تجميع المخاطر", /(?:ال)?مخاطر حسب/],
];
const riskResidue = (code: string) =>
  RISK_RESIDUE.filter(([, re]) => re.test(code)).map(([what]) => what);
/** سقف قائمة «أبرز المخاطر» الحيّة — `null` إن لم يُسقَف (فهو السجلّ كلّه). */
const riskListCap = (body: string): number | null => {
  const m = /\.slice\(0,\s*(\d+)\)/.exec(body);
  return m ? Number(m[1]) : null;
};

/** صفوف الرئيسية بترتيبها (المواصفة §4.0): المؤشرات ← الصدر ← التشغيل ← التحليلات ← الإفصاح. */
const ROW_SEQUENCE = [
  "<HomeKpiRow />",
  'className="nx-home-hero"',
  "<HomeMapCard />",
  "<HomeSadeedCard />",
  "<HomeOpsRow />",
  "<HomeAnalyticsRow />",
  "<footer",
] as const;
/** مواضع تنكسر فيها السلسلة: غائبٌ، أو مكرّر، أو سابقٌ لما قبله. */
function orderBreaks(code: string, sequence: readonly string[]): string[] {
  const out: string[] = [];
  const at = sequence.map((n) => code.indexOf(n));
  sequence.forEach((n, i) => {
    if (at[i] === -1) out.push(`${n} غائب`);
    else if (code.indexOf(n, at[i] + 1) !== -1) out.push(`${n} مكرّر`);
    else if (i > 0 && at[i - 1] !== -1 && at[i] < at[i - 1])
      out.push(`${n} قبل ${sequence[i - 1]}`);
  });
  return out;
}
/** ترتيب الصفحة، والخريطة وسَدِيد **داخل** الصدر: يُغلق بعدهما وقبل صفّ التشغيل. */
function rowOrderBreaks(page: string): string[] {
  const out = orderBreaks(page, ROW_SEQUENCE);
  const sadeed = page.indexOf("<HomeSadeedCard />");
  const close = page.indexOf("</div>", sadeed);
  if (sadeed > -1 && !(close > sadeed && close < page.indexOf("<HomeOpsRow />"))) {
    out.push("سَدِيد خارج الصدر");
  }
  return out;
}
/** أداة `order-*` تفصل ترتيب العرض عن ترتيب DOM. */
const orderUtilities = (code: string) =>
  code.match(/(?:^|[\s"'`])(?:(?:sm|md|lg|xl|2xl):)?order-(?:\d+|first|last|none)\b/gm) ?? [];
/** حاويات الترتيب وأبناؤها المباشرون — الصفوف والبطاقات بعينها. */
const ARRANGEMENT = [
  "nx-home-arrange",
  "nx-home-hero",
  "nx-home-quad",
  "nx-home-kpis",
  "nx-home-kpi-cell",
  "nx-home-map",
  "nx-home-sadeed",
  "nx-ops-card",
  "nx-ana-card",
  "nx-home-close",
  "nx-home-brand",
  "nx-ticker",
  "nx-brand-stage",
  "nx-brand",
];
/**
 * لا استثناء بعد اليوم: لوحة الشعار خرجت من صفّ الهوية إلى رأس الشريط الجانبي (٢٠٢٦/١٠/١٨، R4)،
 * فسقط ترتيبها البصريّ فوق البانر — والصفّ شريطٌ ثم بانرٌ بترتيب DOM نفسه.
 */
const ARRANGEMENT_ALLOWED = new Set<string>();
/**
 * مسارات الشبكة بلا حدٍّ أدنى صفري، أو موضعٌ فيزيائي، على شبكات الصفوف المسمّاة —
 * `repeat(n, minmax(0, …))` و`minmax(0, …)` وحدهما مقبولان.
 */
function unsafeGridTracks(css: string, grids: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  postcss.parse(css).walkRules((rule) => {
    const grid = grids.find((g) => rule.selectors.some((s) => s.trim() === g));
    if (!grid) return;
    seen.add(grid);
    for (const n of rule.nodes) {
      if (n.type !== "decl") continue;
      if (n.prop === "left" || n.prop === "right") out.push(`${grid}: ${n.prop}`);
      if (n.prop !== "grid-template-columns") continue;
      const rest = n.value
        .replace(/repeat\(\s*\d+\s*,\s*/g, "")
        .replace(/minmax\(0,\s*[^)]*\)/g, "")
        .replace(/[\s)]/g, "");
      if (rest !== "") out.push(`${grid}: ${n.value}`);
    }
  });
  for (const g of grids) if (!seen.has(g)) out.push(`${g}: غير معرَّفة`);
  return out;
}

/** قاعدةٌ تُعيد ترتيب الصفوف أو البطاقات بصريًّا: `order` · عكسٌ · `dense` · تموضعٌ في الشبكة. */
function arrangementReorders(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkRules((rule) => {
    const hits = rule.selectors.filter((s) => {
      const last = lastCompound(s);
      return (
        !last.includes("::") && ARRANGEMENT.some((c) => new RegExp(`\\.${c}(?![\\w-])`).test(last))
      );
    });
    if (hits.length === 0) return;
    for (const n of rule.nodes) {
      if (n.type !== "decl") continue;
      if (
        n.prop === "order" ||
        (n.prop === "flex-direction" && /reverse/.test(n.value)) ||
        (n.prop === "grid-auto-flow" && /dense/.test(n.value)) ||
        /^grid-(?:area|row|column)(?:-start|-end)?$/.test(n.prop)
      ) {
        out.push(`${hits.join(", ")} { ${n.prop}: ${n.value} }`);
      }
    }
  });
  return out;
}

describe("المُخطَّط — المادة ٣٣: لا لون نهائي خارج طبقة الرموز", () => {
  it("لا لون سداسي مكتوب في أي مكوّن", () => {
    // الاستثناء الوحيد المسموح: مثال في تعليق يشرح محوّل الثلاثي.
    for (const [name, src] of [
      ["InstrumentPanels", PANELS],
      ["blueprint-page", PAGE],
    ] as const) {
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], `${name} يكتب لونًا نهائيًّا`).toEqual([]);
    }
  });

  it("لهجات المناطق تأتي من regions.ts وحده", () => {
    // كان الشطر الأول على `RegionRosette` — حُذفت ٢٠٢٦/٠٨/٠٩ بأمر المالك —
    // ثم على بطاقات المناطق في الصفحة نفسها، وقد نسخها مع الصدر الثلاثي قرار
    // المالك ٢٠٢٦/١٠/١٣ (المواصفة ١٠ §٢). والقاعدة باقية بنصّها (المواصفة §3.6):
    // الأسماء والترتيب واللكنات من `regions.ts` وحده، ولون المنطقة يبلغ CSS
    // متغيّرًا `--region-tint` لا قيمة. فتُفحص حيث صارت: سطح الرئيسية كلّه
    // وأنماطه — لا الصفحة وحدها، وهي اليوم غلافٌ بلا منطقة (المادة ٣١).
    const carriers = [...HOME_SURFACE].filter(
      ([, src]) => regionTints(stripComments(src)).length > 0,
    );
    // حاملا اللكنة اليوم: أعمدة «الأداء الأمني للمناطق» والخريطة — ولا حلقة فوق فراغ.
    expect(carriers.map(([file]) => file)).toEqual(
      expect.arrayContaining([
        "src/components/home/HomeAnalyticsRow.tsx",
        "src/components/map/ArabianPeninsulaMap.tsx",
      ]),
    );
    for (const [file, src] of carriers) {
      const code = stripComments(src);
      expect(code, `${file} لا يستورد اللكنات من المصدر الواحد`).toMatch(
        /import \{[^}]*\bREGION_ACCENT_HEX\b[^}]*\} from "@\/lib\/regions"/,
      );
      expect(code, `${file} لا يرتّب المناطق بـREGIONS`).toContain("REGIONS.map");
      expect(foreignTints(code), `${file} يمرّر لكنةً من غير المصدر`).toEqual([]);
    }
    // لا اسم منطقة مكتوب نصًّا، ولا لكنةٌ منسوخة — في أي ملفّ من السطح أو أنماطه.
    expect(HOME_SURFACE.size, "سطح الرئيسية لم يُقرأ").toBeGreaterThan(5);
    expect(HOME_CSS.size, "أنماط الرئيسية لم تُقرأ").toBeGreaterThan(3);
    for (const [file, src] of HOME_SURFACE) {
      const code = stripComments(src);
      expect(writtenRegionNames(code), `${file} يكتب اسم منطقة نصًّا`).toEqual([]);
      expect(copiedAccents(code), `${file} ينسخ لكنة منطقة`).toEqual([]);
    }
    for (const [file, css] of HOME_CSS) {
      expect(copiedAccents(stripComments(css)), `${file} ينسخ لكنة منطقة`).toEqual([]);
    }

    // والفحوص تحمرّ على المزروع (المادة ٣٠): لكنةٌ مكتوبة بدل المصدر، واسمٌ نصًّا.
    const ana = surfaceFile("HomeAnalyticsRow.tsx");
    const planted = ana.replace("REGION_ACCENT_HEX[region.id]", '"#22D3EE"');
    expect(planted).not.toBe(ana);
    expect(foreignTints(stripComments(planted))).toEqual(['"#22D3EE"']);
    expect(copiedAccents(stripComments(planted))).toEqual(["#22d3ee"]);
    expect(writtenRegionNames('<Chip label="الوسطى" />')).toHaveLength(1);
    expect(writtenRegionNames("<span>الشرقية</span>")).toHaveLength(1);
    expect(writtenRegionNames("{ar ? region.shortAr : region.shortEn}")).toEqual([]);
  });

  it("الأسلوب المضمّن يمرّر متغيّرات لا قيمًا نهائية", () => {
    // `style={{ background: "#22D3EE" }}` يعفي حامله من كل قاعدة عامة بصمت.
    for (const src of [PANELS, PAGE]) {
      for (const inline of src.match(/style=\{\{[^}]*\}\}/g) ?? []) {
        expect(inline, "أسلوب مضمّن يحمل قيمة نهائية").toMatch(/--[a-z-]+/);
      }
    }
  });

  it("لا تعبئة بيضاء نهائية (white / #fff / #ffffff) — الرسم يتبع الحبر", () => {
    // النمط الحرفي `fill="white"` وحده كان يترك الصيغ السداسية تفلت.
    for (const src of [PANELS, PAGE]) {
      expect(src).not.toMatch(/fill=["'](?:white|#f{3}|#f{6})["']/i);
    }
  });
});

describe("المُخطَّط — المادة ٣٢: الحركة بخصائص مستقلّة", () => {
  it("لا transform: scale/translate في طبقة المُخطَّط", () => {
    // `transform` يمحو أي إزاحة سابقة على العنصر نفسه؛ الخصائص المستقلّة
    // تتركّب معها. وهي قاعدة Remotion نفسها لمن يكتب حركة قابلة للتحرير.
    expect(LAYER).not.toMatch(/transform:\s*(scale|translate)/);
  });

  it("الدخول يستعمل منحنى النظام لا منحنى مرتجلًا", () => {
    expect(LAYER).toContain("var(--nx-ease-out)");
  });

  it("تقليل الحركة يوقفها عند حالتها النهائية لا عند العدم", () => {
    // الالتقاط على **قاعدة الوسائط** لا على ذكر اسمها: أول ورودٍ للسلسلة في
    // الطبقة هو تعليقٌ في ترويستها، فالقطع عنده كان يُدخل نصَّ التعليقات في
    // المقيس — ويمرّ الشرط بكلمةٍ مكتوبة في شرحٍ لا بقاعدةٍ نافذة.
    // **وانقلب البند ثانيةً في اليوم نفسه.** كان يشترط وجود الكتلة مطلقًا،
    // ثم حُذف الشفق وخيطه وحزمتاه — آخرُ حركةٍ تلقائية في الطبقة — فصار
    // يشترط علاجًا لداءٍ زال، وسقط على غيابه. فيُفحص **الشرط لا السطر**: ما
    // دامت في الطبقة حركةٌ تلقائية مسمّاة وجب لها مخرج، ولا حركة ⇐ لا مخرج
    // مطلوبًا ولا كتلة فارغة تبقى إغراءً بإضافةٍ بلا مراجعة. وهو غير فارغ
    // المعنى: إعادة أيّ `animation: nxBp…` بلا كتلة تُسكِتها تُسقطه.
    const code = LAYER.replace(/\/\*[\s\S]*?\*\//g, "");
    const automatic = [...code.matchAll(/animation:\s*([A-Za-z][\w-]*)/g)]
      .map((m) => m[1])
      .filter((n) => n !== "none");
    const at = code.indexOf("@media (prefers-reduced-motion");
    if (automatic.length === 0) {
      expect(at, "كتلة تخفيف حركة بلا حركة تُسكِّنها").toBe(-1);
      return;
    }
    expect(at, `حركة تلقائية (${[...new Set(automatic)].join(", ")}) بلا مخرج`).toBeGreaterThan(-1);
    const block = code.slice(at);
    expect(block).toContain("animation: none");
    // **سقط من هذا البند ثلاثة شروط ٢٠٢٦/٠٨/٠٩، لا تخفيفًا بل لزوال موضوعها.**
    // كانت `opacity: 1` و`translate: none` و`stroke-dashoffset: 0` إنقاذًا
    // لقوس وردة المناطق: رسمٌ يبدأ شفافًا مزاحًا بـ`dashoffset` كامل، فإلغاء
    // حركته بلا إنقاذ يتركه غير مرسوم إلى الأبد. حُذفت الوردة بأمر المالك،
    // ولم يبقَ في الطبقة عنصرٌ تبدأ حالتُه الأولى من العدم — الشفق والخيط
    // والحزمتان كلّها مرئية قبل حركتها وبعدها، فتسكينها يكفي.
    // ويبقى الشرط الحيّ الوحيد أعلاه: حركةٌ دائمة بلا تسكين خرقٌ وصولي.
    expect(block).not.toContain("stroke-dashoffset");
  });

  it("بطاقات الرئيسية لا تطفو دائمًا ولا تلمع دائمًا — والدخول المتدرّج يحكمه عقد حركة الرئيسية (قرار المالك ٢٠٢٦/١٠/١٧)", () => {
    // **كان اسمه «بطاقات الرئيسية ساكنة: لا دخول متدرّج ولا طفو دائم» (قرار
    // المالك ٢٠٢٦/٠٨/٠٩)، ونُسخ شطر الدخول وحده** بأمر المالك ٢٠٢٦/١٠/١٧
    // («ULTRA-PREMIUM CINEMATIC HOMEPAGE, MOTION ENGINEERING…» — المواصفة ١٠ §2.2،
    // البند M1): دخولٌ متدرّج وظهورٌ متتابع على الرئيسية، و«Perpetual float and
    // perpetual shimmer stay forbidden». فلم يعد «لا دخول متدرّج» قاعدة، والحارس الحاكم
    // للحركة الجديدة هو `src/components/home/home-motion.contract.test.ts` على
    // `src/styles/home/home-motion.css` (بأسماء `nxHome*`، خلف بوابة التفضيل).
    // وما بقي هنا صحيحٌ كما كان ولم يُنسخ: الطفو الدائم واللمعة الدائمة ممنوعان،
    // وطبقة المُخطَّط لا تعيد `nxBpRise` ولا `nxBpFloat` — والدخول الجديد ليس منهما.
    //
    // الحارس على الإسناد لا على الاسم: ذكر `nxBpRise` في تعليق يشرح الإزالة
    // مسموح، وإعادته إلى `animation` هي العودة الممنوعة.
    expect(LAYER).not.toMatch(/animation:\s*nxBp(Rise|Float)\b/);
    expect(LAYER).not.toMatch(/@keyframes\s+nxBp(Rise|Float)\b/);
    // ولا لمعةَ عابرة دائمة على البطاقة نفسها — الطبقة الحاملة أُزيلت أصلًا.
    // المحدِّد يُقاس في أول سطره لا في أي موضع: ذِكره داخل تعليق ليس عودةً له.
    expect(LAYER).not.toMatch(/^\s*\.nx-bp-card::before/m);
    // والسكون لا يبلغ التغذية الراجعة: انتقال المقياس عند التمرير والضغط
    // استجابةٌ للمستخدم، وحذفه ضررٌ وصولي لا تحسين.
    const float = LAYER.slice(LAYER.indexOf(".nx-bp-float {"));
    expect(float.slice(0, float.indexOf("\n}"))).toContain("transition: scale");
    expect(LAYER).toContain(".nx-bp-float:hover");
    expect(LAYER).toContain(".nx-bp-float:active");
  });
});

describe("المُخطَّط — الوضعان يعملان معًا", () => {
  it("للهجات نسخةٌ فاتحة مقيّدة بالصنف لا بالجذر — ولا قاعدة لبطاقةٍ زالت", () => {
    // كان يقرأ `.light .nx-home-region` (شعيرة بطاقة المنطقة المستطيلة، وقبلها
    // `.nx-bp-region` في الوردة المحذوفة ٢٠٢٦/٠٨/٠٩). **نسخ قرار المالك
    // ٢٠٢٦/١٠/١٣ عمودَ بطاقات المناطق** (المواصفة ١٠ §2: «the triad … and its
    // order contract»)، فلم يبق للصنف حاملٌ في الشيفرة وحُذفت قواعده
    // (٢٠٢٦/١٠/١٨). والحذف يُحرَس كما تُحرَس الإضافة: قاعدةٌ بلا حامل تعود
    // سطحًا حيًّا بأوّل لصق — وحارسٌ يطلبها يُبقيها ميّتةً إلى الأبد.
    expect(CSS).not.toMatch(/\.nx-home-region(?![\w-])/);
    // أيقونات اللوحات والمناطق صارت دوائر نبض (٢٠٢٦/٠٨/٠٦)، وطبقتها في
    // آخر الملف لا داخل طبقة المُخطَّط — فيُفحص المصدر كلّه لا الشريحة.
    // نفس الدرس المسجَّل هنا لرسوم المُخطَّط: اللكنة تُمزج نحو الحبر على
    // الأبيض وإلا صارت حاضرة غير مقروءة.
    expect(CSS).toMatch(/\.light\s+\.nx-pulse-icon\s*\{[^}]*--pulse-ink/);
  });

  it("الألوان القسرية والشفافية المخفَّضة محسوبتان", () => {
    expect(LAYER).toContain("forced-colors: active");
    expect(LAYER).toContain("prefers-reduced-transparency");
    // في الوضع القسري يُعاد الرسم إلى ألوان النظام بدل أن يختفي.
    expect(LAYER.slice(LAYER.indexOf("forced-colors: active"))).toContain("CanvasText");
  });
});

describe("المُخطَّط — المادة ٢٧: الصدق العددي", () => {
  it("الخطورة غير المقيسة لا تُمنح براءة — ولا تحذيرًا", () => {
    // العطل الذي أُصلح: `toSeverity` كانت تكتب `score ?? 0` ثم تصنّف، فصفٌّ
    // بلا أولوية **وبلا درجة** يهبط إلى `low` ⇒ نغمة `success` ⇒ دائرة
    // خضراء وكلمة «سليم». حكمُ سلامةٍ مصنوعٌ من صفرٍ ملفَّق — وهو أخطر من
    // رقمٍ خاطئ لأنه يُقرأ طمأنينة.
    //
    // ولا يكفي رفعه إلى `medium`: الكهرماني حكمُ «تحذير»، وهو مصنوعٌ من
    // الغياب نفسه. فالغياب حالةٌ ثالثة تُقال: `unmeasured` بنغمة محايدة.
    const RISK = read("src/lib/exec/risk-board.functions.ts");
    const code = RISK.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
    expect(code, "درجة غائبة تُستبدل بصفر ثم تُصنَّف").not.toMatch(
      /score\s*(?:\?\?|:contentReference)\s*0|typeof score === "number" \? score : 0/,
    );
    expect(code, "الغياب لا يُعاد حالةً صريحة").toMatch(/return "unmeasured"/);

    // والنغمة محايدة لا خضراء ولا كهرمانية — وإلّا عاد الحكم من باب آخر.
    // **انتقلت الخريطة من الصفحة إلى حاملها الجديد** (أمر المالك ٢٠٢٦/١٠/١٣،
    // المواصفة ١٠ §4.6): رقاقة الشدّة في قائمة «أبرز المخاطر» بصفّ التشغيل.
    // ويُمسح السطح كلّه لا ملفٌّ واحد (المادة ٣١): كل خريطة `Record<RiskSeverity,…>`
    // فيه تُبقي `unmeasured` محايدًا — فلا تُولد خريطةٌ ثانية تحكم من الغياب.
    const maps = [...HOME_SURFACE].flatMap(([file, src]) =>
      severityMaps(stripComments(src)).map((m) => ({ file, ...m })),
    );
    expect(maps.length, "لم تُقرأ خريطة الشدّة — تغيّر شكلها فبطل الحارس").toBeGreaterThan(0);
    for (const m of maps) {
      expect(absenceVerdict(m.unmeasured), `${m.file} · ${m.name}: ${m.unmeasured}`).toBe(false);
    }
    const OPS = stripComments(surfaceFile("HomeOpsRow.tsx"));
    // وكلمتها «لم يُقَس» من المرجع الواحد، ولا كلمة حكمٍ تُقرأ لها على القارئ.
    expect(OPS).toMatch(
      /unmeasured:\s*\{\s*status:\s*"neutral",\s*ar:\s*CHANGE_NOT_MEASURED_AR\s*\}/,
    );
    expect(objBody(OPS, "VERDICT_AR")).toMatch(/\bneutral:\s*null/);
    // ومعروضةٌ لا مطويّة: عددها خبرٌ عن جودة البيانات — لها رتبةٌ في الفرز، ولا
    // مرشّحٌ يُسقطها من القائمة.
    expect(OPS).toMatch(/SEVERITY_ORDER[^=]*=\s*\[[^\]]*"unmeasured"/);
    expect(callArgs(OPS, "filter").length, "لم يُقرأ مرشّحٌ واحد — بطل الفحص").toBeGreaterThan(0);
    expect(foldsUnmeasured(OPS), "مرشّحٌ يطوي غير المقيس").toEqual([]);
    // ورقاقتها المحايدة (حدٌّ متقطّع) لا تستعير لون حكم في أي ملفّ أنماط.
    expect([...HOME_CSS.values()].some((css) => css.includes('[data-status="neutral"]'))).toBe(
      true,
    );
    for (const [file, css] of HOME_CSS) expect(neutralToneLeaks(css), file).toEqual([]);

    // يحمرّ على المزروع (المادة ٣٠): براءةٌ أو تحذيرٌ للغياب، ولونُ حكمٍ على المحايد.
    for (const verdict of ["healthy", "warning"]) {
      const planted = OPS.replace(
        'unmeasured: { status: "neutral"',
        `unmeasured: { status: "${verdict}"`,
      );
      expect(planted).not.toBe(OPS);
      expect(severityMaps(planted).some((m) => absenceVerdict(m.unmeasured))).toBe(true);
    }
    const folded = OPS.replace(
      "[...(risk.data?.rows ?? [])]",
      '[...(risk.data?.rows ?? [])].filter((r) => r.severity !== "unmeasured")',
    );
    expect(folded).not.toBe(OPS);
    expect(foldsUnmeasured(folded)).toEqual(['(r) => r.severity !== "unmeasured"']);
    expect(
      neutralToneLeaks(
        '.nx-ops-chip[data-status="neutral"] { --ops-chip-bg: var(--stage-emerald); }',
      ),
    ).toHaveLength(1);
  });

  it("الغياب يُقرأ نصًّا ولا يُستبدل بصفر", () => {
    expect(PAGE).toContain("لم يُقَس");
    expect(PANELS).toContain("notMeasured");
    // لا `?? 0` على أي عدّاد معروض: الصفر قياسٌ، والغياب ليس صفرًا.
    expect(PAGE).not.toMatch(/counters\?\.\w+\s*\?\?\s*0/);
  });

  it("حالة المنطقة تُقرأ من الخادم ولا تُشتقّ من رقم الامتثال", () => {
    // كان هنا حارسٌ على قوس الوردة («لا يُرسم لمنطقة لم تُقَس»). ذهبت
    // الوردة ٢٠٢٦/٠٨/٠٩، والقاعدة التي كان يخدمها — لا شكلَ لغياب — انتقلت
    // إلى بطاقات المناطق: قوس دائرة النبض محروس أدناه، والحالة النصّية
    // محروسة هنا.
    //
    // والخطر الجديد أن تُشتقّ الحالة من `compliance_pct` بعتبات مؤلَّفة
    // («فوق ٩٠ سليم») فتُعرض حكمًا كأنه قياس. المصدر الوحيد المسموح هو
    // `severity` القادم من الخادم، وغيابُ الصفّ يُقرأ «لم يُقَس» لا «سليم».
    //
    // **نُسخ الشطر الإيجابي بقرار المالك ٢٠٢٦/١٠/١٣ (المواصفة ١٠ §٢):** شارة
    // الحالة (`REGION_SEVERITY_TONE` و«لا صفّ ⇐ لم يُقَس») كانت على بطاقات المناطق
    // في الصدر الثلاثي، وذهب الصدر ببطاقاته. ولا تعرض الرئيسية اليوم حالةً لمنطقة:
    // يحمل المنطقةَ عمودُ «الأداء الأمني للمناطق» وفقاعةُ الخريطة، وكلاهما رقمٌ
    // بلون هويّة المنطقة لا حكم. فيُحرس الباقي حيث صار: لا حكم من عتبةٍ على
    // الامتثال، ولا صفر مكان غيابه — في السطح كلّه (المادة ٣١).
    for (const [file, src] of HOME_SURFACE) {
      const code = stripComments(src);
      expect(complianceThresholds(code), `${file} يشتقّ حكمًا من عتبة امتثال`).toEqual([]);
      expect(complianceZeroes(code), `${file} يقرأ غياب الامتثال صفرًا`).toEqual([]);
    }
    // وفي حاملَي الامتثال لكل منطقة بعينهما — هناك `value` نفسه هو النسبة، فلا
    // مقارنةَ بعددٍ أصلًا، ولا علامة حكمٍ إلا من `severity` الخادم.
    const regions = fnBody(stripComments(surfaceFile("HomeAnalyticsRow.tsx")), "RegionsCard");
    const bubble = fnBody(stripComments(surfaceFile("ArabianPeninsulaMap.tsx")), "RegionBubble");
    for (const [name, body] of [
      ["RegionsCard", regions],
      ["RegionBubble", bubble],
    ] as const) {
      expect(body, `${name} غير موجود — تغيّر حامل الامتثال فبطل الحارس`).not.toBe("");
      expect(numericComparisons(body), `${name} يقارن الامتثال بعتبة`).toEqual([]);
    }
    expect(unsourcedVerdicts(regions), "عمود المنطقة يحمل حكمًا بلا severity").toEqual([]);
    // والغياب «لم يُقَس» نصًّا — لا صفرٌ ولا شريطٌ فارغ يوهم بصفر.
    expect(regions).toMatch(/value === null \? notMeasured/);
    expect(regions).toMatch(
      /value !== null \? \(\s*<span aria-hidden className="nx-ana-region-bar">/,
    );
    expect(bubble).toMatch(/compliance === undefined \? notMeasured/);
    expect(stripComments(surfaceFile("HomeMapCard.tsx"))).toMatch(/row\.compliance_pct !== null/);
    // ولون الشريط هويّة المنطقة لا حكمٌ بعتبة («لونٌ يتبدّل عند عتبةٍ حكمٌ مؤلَّف»).
    const fill = declsOf(
      HOME_CSS.get("src/styles/home/home-analytics.css") ?? "",
      ".nx-ana-region-fill",
    );
    expect(fill.some(([p, v]) => /^background/.test(p) && v.includes("var(--region-tint)"))).toBe(
      true,
    );
    expect(fill.filter(([, v]) => VERDICT_TONE.test(v))).toEqual([]);

    // يحمرّ على المزروع (المادة ٣٠): عتبةٌ على الامتثال، وصفرٌ مكان غيابه، وحكمٌ
    // مشتقّ داخل حامله حيث النسبة اسمها `value`.
    expect(
      complianceThresholds('const tone = row.compliance_pct >= 90 ? "success" : "warning";'),
    ).toHaveLength(1);
    expect(complianceZeroes("pct: row.compliance_pct ?? 0")).toHaveLength(1);
    const planted = regions.replace(
      "const value = inPeriod ? chosen.value : null;",
      'const value = inPeriod ? chosen.value : null;\nconst verdict = value !== null && value >= 90 ? "healthy" : "warning";',
    );
    expect(planted).not.toBe(regions);
    expect(numericComparisons(planted)).toEqual([">= 90"]);
    expect(unsourcedVerdicts(`${regions}<StatusChip status="healthy" />`)).toEqual(["<StatusChip"]);
    expect(
      declsOf(
        ".nx-ana-region-fill { background: var(--tone-emerald); }",
        ".nx-ana-region-fill",
      ).filter(([, v]) => VERDICT_TONE.test(v)),
    ).toHaveLength(1);
  });

  it("«منجز اليوم» لا يُختلق له صفر في المسار الحيّ", () => {
    // العطل: لا عمود في القاعدة يحمل عدد المنجز للوكيل، فكُتب `done_today: 0`
    // لكل وكيل ثم جُمعت الأصفار — فعُرض «0» قياسًا لم يقع، ورسم له قوسُ
    // الدائرة الجديد. الجمع صار عبر `sumMeasured`: لا قياس ⇐ null.
    const FN = read("src/lib/exec/command-center.functions.ts");
    expect(FN).not.toMatch(/done_today:\s*0\b/);
    expect(FN).toContain("sumMeasured");
    expect(FN).not.toMatch(/done_today:\s*agents\.reduce/);
  });

  // **حُذف بند «نسبة الشكل مشتقّة من الرقم المعروض»** ٢٠٢٦/٠٨/١١.
  // انتقل مرّتين تبعًا لموضوعه — من لوحات المؤشّرات إلى دائرة نبض المنطقة —
  // ثم حُذفت الدائرة من بطاقات المناطق بأمر المالك، ولم يبقَ **مستهلكٌ واحد**
  // يمرّر `ratio` في المشروع كلّه (`AgentPulseIcon` لا يمرّرها).
  //
  // والقاعدة نفسها **ليست بلا حارس**: هي مكتوبة داخل `PulseGlyph` ومحروسة
  // ببند «القوس لا يُرسم بلا قياس» أدناه — وذلك موضعها الصحيح، إذ تصحّ هناك
  // لكل سطحٍ يستوردها. وإبقاء بندٍ يفحص مستهلكًا لا وجود له يمرّ أخضر على
  // العدم، وهو أسوأ من غيابه.
});

describe("المُخطَّط — الوصول", () => {
  it("الرسوم مخفاة عن القارئات لأن أرقامها مكتوبة إلى جوارها", () => {
    expect(PANELS).toContain("aria-hidden");
    // دائرة النبض تُخفي نفسها ما لم تُعطَ وصفًا، ولا موضع على الرئيسية
    // يعطيها وصفًا — لأن الرقم والاسم إلى جوارها يقولان ما تقوله. العدّ
    // السابق لعلامات aria-hidden كان يقيس كم رسمًا في الملف لا أن كلًّا
    // منها مخفيّ، فسقط بحذف الرسوم الهندسية وهي لم تكن الضمانة.
    expect(PULSE).toMatch(/"aria-hidden": true/);
    for (const src of [PANELS, PAGE]) {
      expect(src).not.toMatch(/<PulseGlyph[^>]*\slabel=/);
    }
  });

  it("مداخل المناطق روابط لمعلومات كل منطقة وتبلغ أرضية اللمس", () => {
    // **كان اسمه «بطاقات المناطق روابط…» وحامله بطاقات الصدر الثلاثي في الصفحة**،
    // ونسخها قرار المالك ٢٠٢٦/١٠/١٣ (المواصفة ١٠ §٢). والقاعدة باقية في حاملَيها
    // الجديدين (المواصفة §4.4 و§4.7): أعمدة «الأداء الأمني للمناطق» وفقاعات
    // المناطق على الخريطة — كلٌّ رابطٌ إلى `/sec` بمنطقته. وكانت الوجهة القمرة
    // الموحّدة (قرار ٢٠٢٦/٠٨/٠٤) حتى حُجبت /nx-cockpit بأمر المالك ٢٠٢٦/٠٨/١٢ —
    // فصارت مظلّة الأمن الصناعي، والاختيار العام (`setRegion`) قبل الانتقال هو ما
    // يفتح الشاشة على منطقة المدخل.
    //
    // **وسقطت أرضية ٨٠px (`min-h-20`)** مع البطاقة المستطيلة التي وُضعت لها (أمر
    // المالك ٢٠٢٦/٠٨/٠٩ — منسوخٌ بالقرار نفسه). والباقي أرضية اللمس ذاتها (§3.7):
    // المدخل مرساةٌ فتبلغه أرضية `a[href]` العامّة (44px لمسًا · 40px فأرة — يحرسها
    // «كل رابط على الصفحة…» أدناه)، ولا قاعدةٌ في أنماط الرئيسية تُنزله دونها.
    const ana = stripComments(surfaceFile("HomeAnalyticsRow.tsx"));
    const map = stripComments(surfaceFile("ArabianPeninsulaMap.tsx"));
    const carriers = [
      {
        name: "أعمدة الأداء",
        body: fnBody(ana, "RegionsCard"),
        id: "region.id",
        label: "region.labelAr",
        cls: "nx-ana-region",
      },
      {
        name: "فقاعات الخريطة",
        body: fnBody(map, "RegionBubble"),
        id: "id",
        label: "labelAr",
        cls: "nx-arabia-bubble",
      },
    ];
    for (const c of carriers) {
      expect(c.body, `${c.name}: الحامل غير موجود`).not.toBe("");
      const link = regionLink(c.body);
      expect(link, `${c.name}: لا رابط إلى /sec`).toBeDefined();
      expect(regionLinkGaps(link?.attrs ?? "", c.id), c.name).toEqual([]);
      expect(c.body, `${c.name}: الاسم المقروء لا يقول «افتح {المنطقة}»`).toContain(
        `ar ? \`افتح \${${c.label}}`,
      );
      expect(link?.attrs, `${c.name}: الصنف المقيس غير موجود`).toMatch(
        new RegExp(`className="[^"]*\\b${c.cls}\\b`),
      );
      for (const [file, css] of HOME_CSS) {
        expect(floorBreaches(css, c.cls), `${c.name} · ${file}`).toEqual([]);
      }
    }
    // والاختيار العام: العمود يكتبه بنفسه، والفقاعة تتلقّاه من حلقة REGIONS.
    expect(regionLink(carriers[0].body)?.attrs).toContain("onClick={() => setRegion(region.id)}");
    expect(ana).toMatch(/const cols = REGIONS\.map\(\(region\) =>/);
    expect(regionLink(carriers[1].body)?.attrs).toContain("onClick={onGo}");
    expect(map).toMatch(
      /\{REGIONS\.map\(\(r\) => \{[\s\S]*?<RegionBubble\b[\s\S]*?onGo=\{\(\) => setRegion\(r\.id\)\}/,
    );

    // يحمرّ على المزروع (المادة ٣٠): رابطٌ بلا اختيارٍ عام، وقاعدةٌ تقصّ الهدف.
    const attrs = regionLink(carriers[0].body)?.attrs ?? "";
    const planted = attrs.replace("onClick={() => setRegion(region.id)}", "");
    expect(planted).not.toBe(attrs);
    expect(regionLinkGaps(planted, "region.id")).toEqual(["الاختيار العام قبل الانتقال"]);
    expect(
      floorBreaches(
        ".nx-ana-regions > li .nx-ana-region { max-block-size: 2rem; }",
        "nx-ana-region",
      ),
    ).toEqual(["max-block-size: 2rem"]);
  });

  it("مدخلٌ دائم الظهور بسهم إلى سجل المخاطر الأمنية — في رأس «أبرز المخاطر» (REQ-022)", () => {
    // أمر المالك الحرفي (فقرة 846): «حذف سجل المخاطر ووضع سهم في الكاردز
    // يوديه لسجل المخاطر الأمنية».
    //
    // **كان اسمه «بطاقة المنطقة تحمل مدخلًا…» وحامله بطاقات المناطق في الصدر
    // الثلاثي**، ونسخها قرار المالك ٢٠٢٦/١٠/١٣ (المواصفة ١٠ §٢) — ونُسخ معها قيدان
    // كانا لها وحدها: «الرابط داخل حلقة بطاقات المناطق» والاسم المقروء لكل منطقة.
    // وحلّت محلّها قائمة «أبرز المخاطر» برأسٍ يحمل «عرض الكل» وسهمه إلى `/sec/risks`
    // (المواصفة §4.6) — فالسهم إلى السجل في البطاقة التي تعرض المخاطر نفسها.
    // والقيود الباقية تُحرس عليه، ويسهل خرقها بتعديل بريء لا يلتقطه tsc:
    // ① الرابط في رأس بطاقة المخاطر، ووجهتها السجل.
    // ② لا <a> داخل <a> — رأس البطاقة أخٌ لصفوفها لا أبٌ لها، وفي السطح كلّه
    //    لا في البطاقة وحدها (المادة ٣١): تعشيشه HTML غير صالح يفكّكه المتصفح بصمت.
    // ③ ظاهر دائمًا (قاعدة الجوال): لا إخفاء كاملًا يكشفه التمرير، وهدفه ≥ 44px.
    // ④ حلقة تركيزٍ ظاهرة من القاعدة المشتركة خارج الطبقات (`.nx-home-more`) —
    //    لا أدوات `focus-visible:outline-*` تخسر أمام `:where(…):focus-visible`.
    const OPS = stripComments(surfaceFile("HomeOpsRow.tsx"));
    const risks = fnBody(OPS, "TopRisksCard");
    const card = fnBody(OPS, "OpsCard");
    expect(risks, "بطاقة «أبرز المخاطر» غير موجودة").not.toBe("");
    expect(card, "البطاقة المشتركة غير موجودة").not.toBe("");
    // ①
    expect(risks).toContain('"أبرز المخاطر"');
    expect(risks).toMatch(/<OpsCard\b[\s\S]*?\bto="\/sec\/risks"/);
    expect(riskEntryGaps(card)).toEqual([]);
    // والبطاقة معنونة، فغرض «عرض الكل» مقروءٌ من سياقه (WCAG 2.4.4).
    expect(card).toMatch(/<section\s+aria-labelledby=\{id\}/);
    // ②
    for (const [file, src] of HOME_SURFACE) {
      if (!file.endsWith(".tsx")) continue;
      const { depth, balance } = anchorNesting(stripComments(src));
      expect(balance, `${file}: قراءة الروابط غير متوازنة — بطل الفحص`).toBe(0);
      expect(depth, `${file}: رابطٌ داخل رابط`).toBeLessThanOrEqual(1);
    }
    // ③
    const opsCss = HOME_CSS.get("src/styles/home/home-ops.css") ?? "";
    const floors = restDecls(opsCss, "nx-ops-more")
      .filter(([p]) => p === "min-block-size" || p === "min-height")
      .map(([, v]) => px(v) ?? 0);
    expect(Math.max(0, ...floors), "هدف رابط السجل دون أرضية اللمس").toBeGreaterThanOrEqual(
      TOUCH_FLOOR_PX,
    );
    for (const [file, css] of HOME_CSS) {
      for (const cls of ["nx-home-more", "nx-ops-more", "nx-ops-more-face"]) {
        expect(hiddenAtRest(css, cls), `${file} · .${cls} مخفيّ حتى التمرير`).toEqual([]);
      }
    }
    // ④
    expect(CSS).toMatch(/\.nx-home-more:focus-visible[^{]*\{[^}]*outline:\s*2px solid/);
    const ringKilled = (css: string) =>
      declsOf(css, ".nx-ops-more:focus-visible").filter(
        ([p, v]) => p.startsWith("outline") && /^(?:none|0)\b/.test(v.trim()),
      );
    for (const [file, css] of HOME_CSS) {
      expect(ringKilled(css), `${file} يمحو حلقة التركيز`).toEqual([]);
    }

    // يحمرّ على المزروع (المادة ٣٠): رابطٌ مخفيّ حتى التمرير، وسهمٌ منزوع،
    // وتعشيشٌ، وقاعدةُ إخفاء.
    const hidden = card.replace(
      'className="nx-home-more nx-ops-more"',
      'className="nx-home-more nx-ops-more opacity-0"',
    );
    expect(hidden).not.toBe(card);
    expect(riskEntryGaps(hidden)).toEqual(["مخفيّ حتى التمرير"]);
    const arrowless = card.replace(/<ChevronLeft\b[^>]*\/>/, "");
    expect(arrowless).not.toBe(card);
    expect(riskEntryGaps(arrowless)).toEqual(["السهم"]);
    const nested = card.replace(/<ChevronLeft\b/, '<Link to="/sec/risks">x</Link><ChevronLeft');
    expect(nested).not.toBe(card);
    expect(riskEntryGaps(nested)).toEqual(["رابطٌ داخل رابط"]);
    expect(ringKilled(".nx-ops-more:focus-visible { outline: none; }")).toHaveLength(1);
    expect(anchorNesting('<Link to="/a"><Link to="/b">x</Link></Link>').depth).toBe(2);
    expect(hiddenAtRest(".nx-ops-card .nx-ops-more { opacity: 0; }", "nx-ops-more")).toEqual([
      "opacity: 0",
    ]);
  });

  it("الحالة النشطة لا تُقال باللون وحده", () => {
    // شارة نصّية كانت تصحب التمييز اللوني — «الحالية» على بطاقة المنطقة الفاعلة
    // في الصدر الثلاثي (`active && (`)، ونسخها مع بطاقاتها قرار المالك ٢٠٢٦/١٠/١٣
    // (المواصفة ١٠ §٢). والمنطقة الفاعلة اليوم رقاقةٌ مضغوطة في شريط الخريطة
    // (§4.4: «focus/highlight, aria-pressed»)، افتراضها منطقة النظام الفاعلة
    // (`useRegion`). والقاعدة نفسها باقية (WCAG 1.4.1 · المواصفة §3.5) — عمى الألوان
    // لا يلغي القراءة: الحال تُعلَن للقارئ (`aria-pressed`)، وتُرى بعلامةٍ غير اللون
    // (حلقةٌ خارجية حول القرص)، وتبقى في الوضع القسري حين تسقط ألوان المؤلّف.
    const PRESSED = '.nx-arabia .nx-arabia-tab[aria-pressed="true"]';
    const map = stripComments(surfaceFile("ArabianPeninsulaMap.tsx"));
    expect(map).toContain('const focus: RegionId | "all" = picked ?? regionId;');
    expect(map).toContain('["all", ...REGIONS.map((r) => r.id)]');
    const chip = jsxTags(map).find(
      (t) => !t.close && t.name === "button" && /className="nx-arabia-tab"/.test(t.attrs),
    );
    expect(chip, "رقاقة المنطقة غير موجودة").toBeDefined();
    expect(chip?.attrs).toContain("aria-pressed={focus === id}");
    const mapCss = HOME_CSS.get("src/styles/home/home-map.css") ?? "";
    const pressed = declsOf(mapCss, PRESSED);
    expect(pressed.length, "قاعدة الرقاقة المضغوطة غير موجودة").toBeGreaterThan(0);
    expect(nonColourCues(pressed), "المضغوطة تُقال باللون وحده").not.toEqual([]);
    // وكل حالٍ نشطة على الخريطة تبقى في الوضع القسري: الرقاقة والتبويب الحاليّ.
    expect(forcedHighlights(mapCss)).toEqual(
      expect.arrayContaining([PRESSED, '.nx-home-map-view[aria-current="true"]']),
    );

    // يحمرّ على المزروع (المادة ٣٠): حلقةٌ تُنزع فيبقى اللون وحده، ووضعٌ قسريٌّ
    // يُسقط الرقاقة من تمييزه.
    const ringless = postcss.parse(mapCss);
    ringless.walkRules((rule) => {
      if (rule.selector !== PRESSED || inForcedColors(rule)) return;
      rule.walkDecls("box-shadow", (d) => {
        d.value = "inset 0 0 0 1px currentColor";
      });
    });
    expect(ringless.toString()).not.toBe(mapCss);
    expect(nonColourCues(declsOf(ringless.toString(), PRESSED))).toEqual([]);
    const unforced = postcss.parse(mapCss);
    unforced.walkRules((rule) => {
      if (!inForcedColors(rule) || !rule.selectors.some((s) => s.trim() === PRESSED)) return;
      rule.selectors = rule.selectors.filter((s) => s.trim() !== PRESSED);
    });
    expect(unforced.toString()).not.toBe(mapCss);
    expect(forcedHighlights(unforced.toString())).not.toContain(PRESSED);
  });

  /**
   * المداخل — WCAG 2.2 §2.4.5، وهو البند الذي سقط فعلًا.
   *
   * العطل الذي يحرسه هذا البند ليس «صفر روابط» — كانت اثني عشر — بل أن
   * **كلّها** كانت إمّا إلى أسطح خارج القشرة (`/nx-*`) أو مشروطةً ببيانات
   * (بطاقات الشذوذ تنطوي حين لا انحراف). فالحارس على الطبقة **غير المشروطة**.
   *
   * **وتغيّرت الأرض تحته.** كُتب والرئيسية خارج القشرة بلا شريطٍ جانبي، فلم
   * يبقَ مدخلًا إلا ما تكتبه الصفحة. ثم رُكّب الشريط فيها (أمر المالك
   * ٢٠٢٦/٠٩/٢٩)، وصار يسارًا في «مركز القيادة» (٢٠٢٦/١٠/١٣، القرار D5) ومعه
   * لوحة الأوامر والترويسة — فعاد «تعدّد الطرق»: الشريط من `SYSTEM_NAV`
   * (يحرسه `system-nav.contract`)، ثم المؤشرات السبعة وروابط رؤوس البطاقات
   * وطبقات الخريطة في الصفحة نفسها.
   */
  it("مداخل الرئيسية غير المشروطة مراسٍ فعليّة لا سطوحٌ صامتة", () => {
    // **كان اسمه «مدخل الرئيسية الباقي مرساةٌ فعليّة…» وحامله بطاقة المنطقة** —
    // آخر طبقة مداخل لا تسقط ببيانات بعد حذف «لوحة المؤشرات التنفيذية»
    // (٢٠٢٦/٠٨/١٠) و«مداخل النظام» في التذييل (٢٠٢٦/٠٨/١١). ونسخ بطاقاتِ المناطق
    // قرارُ المالك ٢٠٢٦/١٠/١٣ (المواصفة ١٠ §٢)، والطبقة غير المشروطة اليوم صفّ
    // المؤشرات السبعة: سجلٌّ ثابت يُرسم في كل حال — تحميلًا وخطأً وحياةً.
    //
    // وما يُحرَس هو هو: الطريق **مرساةٌ** (`<Link>`) لا `<div onClick>`. والفرق
    // ليس تجميليًّا: غير المرساة لا يبلغها التبويب ولا قارئ الشاشة.
    const kpi = stripComments(surfaceFile("HomeDashboard.tsx"));
    const row = fnBody(kpi, "HomeKpiRow");
    const card = fnBody(kpi, "KpiCard");
    expect(row, "صفّ المؤشرات غير موجود").not.toBe("");
    expect(row).toMatch(/kpis\.map\(\(k(?:,\s*\w+)?\) =>\s*\(\s*<li\b[^>]*>\s*<KpiCard\b/);
    expect(rootOf(card), "بطاقة المؤشر لم تعد رابطًا في كل حال — سقطت الطبقة الثابتة").toBe("Link");
    // والمداخل البنيوية — الشريط ولوحة الأوامر (زرّ البحث) — **في القشرة الواحدة** لا في الصفحة
    // (٢٠٢٦/١٠/١٨، «اجعل جميع صفحات النظام بنفس تخطيط وهيئة الصفحة الرئيسية»): `SystemChrome`
    // يركّبهما، والجذر يركّبه مرّةً لكل مسار.
    const page = stripComments(PAGE);
    expect(entranceGaps(CHROME, ROOT)).toEqual([]);
    // يحمرّ على المزروع: قشرةٌ بلا لوحة أوامر، أو جذرٌ لا يركّبها.
    expect(entranceGaps(CHROME.replace("<CommandPalette />", ""), ROOT)).toEqual([
      "<CommandPalette />",
    ]);
    expect(entranceGaps(CHROME, ROOT.replace(/<SystemChrome\b/g, "<Fragment"))).toEqual(["root"]);
    // ولا مدخل مبنيّ على عنصرٍ غير تفاعلي — في السطح كلّه لا الصفحة وحدها
    // (المادة ٣١). والقارئ رأى كل وسم: عدد الروابط بالمسح يساوي عددها بالنصّ.
    const files = [...HOME_SURFACE.keys()].filter((f) => f.endsWith(".tsx"));
    expect(files.length, "سطح الرئيسية لم يُقرأ").toBeGreaterThan(5);
    for (const file of files) {
      const code = stripComments(HOME_SURFACE.get(file) as string);
      expect(silentClicks(code), `${file}: مدخلٌ على عنصرٍ صامت`).toEqual([]);
      const scanned = jsxTags(code).filter((t) => !t.close && t.name === "Link").length;
      expect(scanned, `${file}: لم يقرأ المسح كل الروابط`).toBe(
        (code.match(/<Link\b/g) ?? []).length,
      );
    }

    // يحمرّ على المزروع (المادة ٣٠): بطاقةٌ صارت عنصرًا صامتًا، ونقرٌ على غير المرساة.
    const planted = card.replace(/return \(\s*<Link\b/, "return (\n    <div");
    expect(planted).not.toBe(card);
    expect(rootOf(planted)).toBe("div");
    expect(silentClicks('<div className="x" onClick={() => a > b && go()}>')).toEqual(["<div>"]);
    expect(silentClicks("<li onClick={go}>")).toEqual(["<li>"]);
    expect(silentClicks('<button type="button" onClick={go}>')).toEqual([]);
    // والمسح يرى ما يُمرَّر خاصيةً: نقرٌ صامت ورابطٌ داخل `control={…}`.
    expect(silentClicks("<AnaCard control={<span onClick={go}>x</span>} />")).toEqual(["<span>"]);
    expect(anchorNesting('<Link to="/a"><AnaCard control={<Link to="/b" />} /></Link>').depth).toBe(
      1,
    );
    expect(
      anchorNesting('<Link to="/a"><AnaCard control={<Link to="/b">x</Link>} /></Link>').depth,
    ).toBe(2);
  });

  it("كل رابط على الصفحة يبلغ أرضية اللمس وله حلقة تركيز ظاهرة", () => {
    // الضامن الحقيقي أن المداخل مراسٍ لا أن صنفًا يفرض ارتفاعًا: طبقة
    // الأرضيات تعطي كل `a[href]` ٤٤px على المؤشّر الخشن و٤٠px على الدقيق،
    // وهما أرضيتا `ui-audit` نفسها، والقاعدتان خارج الطبقات فتعلوان أدوات
    // Tailwind.
    expect(CSS).toMatch(/@media \(pointer: coarse\)[\s\S]{0,300}?min-block-size:\s*44px/);
    expect(CSS).toMatch(/@media \(pointer: fine\)[\s\S]{0,200}?min-block-size:\s*40px/);

    // والرقاقات — إن وُجدت — تحمل الأرضية صراحةً كذلك: حزامٌ فوق حمّالة.
    // (كانت ثمانيَ رقاقة تذييل + رقاقة سجلّ المخاطر؛ ثم حُذفت الأخيرة مع
    // لوحة «سجل المخاطر» بأمر المالك V4 — فقرة 846 — ٢٠٢٦/٠٨/٢٤، فلم تبقَ
    // على الصفحة رقاقة. شرطُ العدد أُسقط لزوال موضوعه لا تخفيفًا: الحلقة
    // باقية تُلزم أول رقاقة تعود، والأرضية غير المشروطة تحرسها قاعدتا
    // المؤشّر أعلاه وأرضية رابط السجل في بند REQ-022 (كانت `min-h-11` على سهم
    // بطاقة المنطقة، وصارت `.nx-ops-more` ≥ 44px في رأس «أبرز المخاطر» —
    // المواصفة ١٠ §٢).
    const chips = [...PAGE.matchAll(/className="nx-bp-card inline-flex ([^"]*)"/g)].map(
      (m) => m[1],
    );
    for (const cls of chips) {
      expect(cls).toContain("min-h-[44px]");
      expect(cls).toContain("focus-visible:outline");
    }
    expect(PAGE).not.toContain("focus:outline-none");
  });
});

/**
 * أيقونات الرئيسية — دوائر نبض (قرار المالك ٢٠٢٦/٠٨/٠٦).
 *
 * البنود هنا تحرس ما يسهل خسرانه في أول تعديل جمالي لاحق: أن القوس قياسٌ
 * لا زينة، وأن حالة الوكيل تُقرأ بلا لون، وأن للحركة الدائمة مفتاحًا.
 */
describe("المُخطَّط — أيقونات الرئيسية دوائر نبض", () => {
  it("كل أيقونة تأتي من مصدر الرسم الواحد", () => {
    // مصدر واحد لسطحين: الرئيسية ومركز القيادة. نسختان من نفس الشكل تعني
    // أن أول تعديل على إحداهما يفتح فجوة لا يراها أحد.
    expect(PANELS).toContain("PulseGlyph");
    // **ولم تعد الرئيسية مستهلكًا**: حُذفت دوائر بطاقات الوكلاء ٢٠٢٦/٠٨/٠٩
    // ودوائر المناطق ٢٠٢٦/٠٨/١١، كلاهما بأمر المالك. فالقاعدة تُفحص على
    // المستهلكين الباقين — والمقصود بها ألّا تُنسَخ الدائرة يدويًّا في سطحٍ
    // جديد بدل استيراد المصدر.
    const consumers = ["src/components/digital-humans/AgentPulseIcon.tsx"];
    for (const f of consumers) {
      expect(read(f), `${f} لا يستورد مصدر الرسم`).toContain("@/components/pulse/PulseGlyph");
    }
  });

  it("القوس لا يُرسم بلا قياس (المادة ٢٧)", () => {
    // دائرة تنبض ⇐ «حيّة». قوس مرسوم ⇐ «قِيست وبلغت كذا». قوسٌ كامل مكان
    // الغياب أسوأ من صفرٍ مكانه: يُقرأ اكتمالًا لم يحدث.
    // القاعدة **داخل المكوّن** لا في مستهلكيه: هناك تُكتب مرّة وتصحّ لكل
    // سطحٍ يستوردها. (وكان البند يفحص مستهلكًا على الرئيسية، فسقط بحذفه —
    // وموضعُه الصحيح هو المصدر.)
    expect(PULSE).toMatch(/const measured = ratio !== null/);
    expect(PULSE).toMatch(/\{measured && \(/);
  });

  it("حالة الوكيل تُقال بالشكل لا باللون وحده", () => {
    // كان الحارس على بطاقات «الوكلاء على المناوبة» في الرئيسية، وقد أُزيلت
    // ٢٠٢٦/٠٨/٠٩ بقرار المالك. القاعدة نفسها لم تُنسخ: هي مطبَّقة في مستهلك
    // الرسم الباقي — أيقونة الوكيل في مركز القيادة — فانتقل الحارس إليه بدل
    // أن يُفرَّغ. الحلقة المتقطّعة تقول ما لا يقوله اللون وحده (WCAG 1.4.1).
    expect(read("src/components/digital-humans/AgentPulseIcon.tsx")).toMatch(
      /dashedRing=\{state === "error"\}/,
    );
  });

  it("الإيقاعات متفاوتة فلا تخفق الأيقونات دفعةً واحدة", () => {
    // إيقاع واحد على عدّة عناصر = وميض متزامن يقرأه المستخدم إنذارًا.
    //
    // **انقلب هذا البند ثلاث مرّات**، وكلّها لأن حامله كان يُحذف: أرقامٌ
    // مصرَّحة في ثلاث لوحات مؤشّرات، ثم إيقاعٌ مشتقٌّ من ترتيب بطاقات
    // المناطق (`0.86 + i * 0.11`)، وقد حُذفت الدوائر منها ٢٠٢٦/٠٨/١١ بأمر
    // المالك. والحامل الباقي `BEAT_SECONDS` في أيقونة الوكيل: خريطةُ حالات،
    // فالإيقاع يتبع **الحالة** لا الترتيب.
    //
    // والقاعدة لم تتغيّر: حالتان متجاورتان لا تخفقان معًا. وهنا `thinking`
    // و`searching` تتعمّدان التساوي (حالتان لا تظهران معًا)، فالشرط أن
    // **يبقى في الخريطة تفاوتٌ حقيقي** لا أن تتساوى كلّها عند رقم واحد.
    const icon = read("src/components/digital-humans/AgentPulseIcon.tsx");
    const at = icon.indexOf("const BEAT_SECONDS");
    expect(at, "خريطة الإيقاعات غير موجودة — تغيّر شكلها فبطل الحارس").toBeGreaterThan(-1);
    const beats = [...icon.slice(at, icon.indexOf("};", at)).matchAll(/:\s*([\d.]+)/g)].map((m) =>
      Number(m[1]),
    );
    expect(beats.length, "لا إيقاع مقروء").toBeGreaterThan(2);
    expect(new Set(beats).size, `كل الحالات على إيقاع واحد: ${beats.join(" · ")}`).toBeGreaterThan(
      1,
    );
  });

  it("النبض ذهابٌ وإياب — الضوء والهالة على إيقاع واحد", () => {
    // قرار المالك ٢٠٢٦/٠٨/٠٦. `alternate` وحدها لا تكفي: بغير `ease-in-out`
    // يرتدّ الضوء عند الطرف ارتدادًا حادًّا بدل أن يهدأ ويعود، وبغير توحيد
    // المنحنى والمدّة بين الطبقتين تُقرأ حركتان متجاورتان لا حركة واحدة.
    for (const name of ["nxPulseRun", "nxPulseHalo"]) {
      expect(CSS, `${name} لا تذهب وتعود`).toMatch(
        new RegExp(`animation: ${name} var\\(--pulse-beat[^;]*ease-in-out infinite alternate`),
      );
    }
    // ومع `alternate` تكون الإطارات طرفين لا ثلاثة: إطارٌ أخيرٌ مساوٍ
    // للأول يُنتج دورةً مزدوجة الطول نصفها ساكن.
    const halo = CSS.slice(CSS.indexOf("@keyframes nxPulseHalo"));
    expect(halo.slice(0, halo.indexOf("\n}"))).not.toContain("100%");
  });

  it("للحركة الدائمة الباقية مخرجٌ حيّ (WCAG 2.2.2)", () => {
    // **انقلب هذا الحارس بقرار المالك ٢٠٢٦/٠٨/٠٩.** كان يشترط زرّ إيقاف
    // الخلفية (`data-nx-motion` من `HoloVideoEngine`) مفتاحًا واحدًا يُسكِت
    // الصفحة كلّها. ثم أُمر بخلفية ساكنة داكنة وبحذف الزر، فذهب الفيلم
    // وذهب معه كاتبُ الراية — وبقي الحارس يطلب سطرًا نُقض قصدًا.
    //
    // والقاعدة التي وُجد لأجلها لم تسقط: **حركة دائمة بلا مخرج** خرقٌ
    // وصولي. فما زالت نبضات الأيقونات تعمل بلا توقّف، ومخرجها اليوم هو
    // تفضيل النظام. فيُفحص المخرج حيث صار، لا حيث كان.
    // **الكتلة بعينها لا بقيّة الملف.** في `styles.css` أربعون كتلة
    // `prefers-reduced-motion`؛ فقراءة ما بعد أولها تلتقط نبضةً تُسكَت في
    // كتلةٍ أخرى بعيدة، ويمرّ الفحص حتى لو نُزعت النبضة من كتلتها. جُرّب
    // ذلك فعلًا: نزعُ `.nx-pulse-halo` من كتلتها لم يُسقط الصيغة السابقة —
    // فأُعيدت بمطابقة أقواس تقرأ كل كتلة على حدة.
    const blocks: string[] = [];
    const OPEN = "@media (prefers-reduced-motion: reduce)";
    for (let i = CSS.indexOf(OPEN); i > -1; i = CSS.indexOf(OPEN, i + 1)) {
      let depth = 0;
      for (let j = CSS.indexOf("{", i); j < CSS.length; j++) {
        if (CSS[j] === "{") depth++;
        else if (CSS[j] === "}" && --depth === 0) {
          blocks.push(CSS.slice(i, j + 1));
          break;
        }
      }
    }
    expect(blocks.length, "لا كتلة تخفيف حركة أصلًا").toBeGreaterThan(0);
    // كتلةٌ واحدة على الأقل تُسكِت نبضة الهالة صراحةً داخل حدودها.
    const silenced = blocks.some((b) => /\.nx-pulse-halo[^{}]*\{[^{}]*animation:\s*none/.test(b));
    expect(silenced, "نبضة الهالة الدائمة بلا مخرج في أي كتلة تخفيف").toBe(true);
    // والسمة تبقى سطح تحكّم عاملًا لمن يكتبها برمجيًّا (إعدادات المستخدم
    // مثلًا) — القاعدة باقية وإن ذهب زرّها.
    expect(CSS).toContain('html[data-nx-motion="off"] .nx-pulse-spark');
  });

  it("سمة الحالة مُنَمذَجة فلا تصطدم بقاعدة عامة", () => {
    // `[data-state="active"]` قاعدة عامة لمؤشّر التبويب النشط ترسم
    // `box-shadow: inset 0 -2px 0` — وحالة الوكيل اسمها `active` أيضًا،
    // فمرّرها المكوّن أوّل مرة في `data-state` فظهر شريط سماوي تحت كل
    // أيقونة وكيل عامل. الاسم المُنَمذَج يُنهي التصادم من أصله.
    expect(PULSE).toContain("data-pulse-state={dataState}");
    expect(PULSE).not.toMatch(/\sdata-state=/);
    expect(CSS).toContain('.nx-pulse-icon[data-pulse-state="error"]');
    expect(CSS).not.toContain(".nx-pulse-icon[data-state=");
  });

  it("لكنة الأيقونة صريحة لا رمزًا لا يتبع الوضع", () => {
    // قياس حيّ: `var(--tone-cyan)` يعطي القيمة نفسها في الوضعين لأن كتلة
    // `:root, .light, .dark` تفرض درجات الوضع الفاتح على `.dark` أيضًا.
    // فلا يجوز تمرير `--tone-*` لكنةً للأيقونة: باهتة على الكحلي، ولو
    // صُحِّحت للأبيض فوق ذلك لهبطت كل اللكنات إلى ما يقارب الأسود معًا.
    // كان الحارس على ثلاثيّ `AGENT_PULSE_RGB` في بطاقات «الوكلاء على
    // المناوبة»، وقد أُزيلت هي وثلاثيّها ٢٠٢٦/٠٨/٠٩ بقرار المالك. القاعدة
    // أوسع من حاملها: أي لكنة تُمرَّر لدائرة نبض على هذه الصفحة تبقى ممنوعة
    // من رموز `--tone-*`، ولكنات المناطق تأتي قيمًا صريحة من regions.ts.
    expect(PAGE).not.toMatch(/accent=\{`?var\(--tone-/);
    // والعلاج يبقى واحدًا لكل اللكنات — لا استثناء يُفلت أيقونةً منه.
    expect(CSS).not.toContain("nx-pulse-icon--themed");
  });

  it("الوضع القسري يبلغ نسخ .light أيضًا", () => {
    // ثبت بالقياس الحيّ: كتلة forced-colors كانت تفرض لون النظام بنوعيّة
    // (0,1,0)، ونسخ `.light` نوعيّتها (0,2,0) فتعلوها مهما تأخّر ترتيب
    // المصدر — فبقي القوس أزرق في وضعٍ وُضع لإزالة الألوان. الإدراج الصريح
    // هو ما يغلقها، ولا يلتقط سقوطَه tsc ولا lint ولا لقطة شاشة عادية.
    const family = CSS.slice(CSS.indexOf(".nx-pulse-icon {"));
    const forced = family.slice(family.indexOf("forced-colors: active"));
    for (const sel of [".light .nx-pulse-arc", ".light .nx-pulse-spark", ".light .nx-pulse-disc"]) {
      expect(forced, `${sel} خارج كتلة الألوان القسرية`).toContain(sel);
    }
  });
});

/**
 * صدر الرئيسية — ثلاثة أعمدة (أمر المالك ٢٠٢٦/٠٨/٠٩).
 *
 * «اعد الصفحة الرئيسية للنظام بطاقات كما كانت مسبقاً واضف المناطق الاربع
 * فاليمين مستطيلة وسديد فالمنتصف وتحليلات سديد + التنبيهات فاليسار»، وسُئل
 * عن الوردة الدائرية فأجاب «تحذف».
 */
describe("الرئيسية — شبكات الصفوف وترتيبها", () => {
  it("الأعمدة منطقية لا فيزيائية، وكل مسارٍ بحدٍّ أدنى صفري — على الشبكات الحيّة", () => {
    // الصفحة `rtl`: «اليمين» هو `start` و«اليسار» هو `end`. كتابتهما
    // `left`/`right` تثبّت التخطيط على اتجاه واحد فينقلب المعنى في الاتجاه
    // الآخر — والخطأ لا يظهر إلا بعد قلب اللغة، ولا يلتقطه tsc ولا jsdom.
    // القياس على الطبقة **منزوعةَ التعليقات**: شرحُ القاعدة أطول منها، فنافذةٌ
    // بعدد أحرف تقع كلّها داخل التعليق وتُسقط قاعدةً سليمة — أو تُمرّر كلمةً
    // مكتوبة في شرحٍ لا في قاعدة نافذة. كلا الخطأين يقرأه المرء «فحصًا مرّ».
    // (كان موضوعه الصدر الثلاثي `.nx-home-triad` — نسخه قرار المالك ٢٠٢٦/١٠/١٣
    // بصفّ الصدر (الخريطة · سَدِيد) وصفّي التشغيل والتحليلات، المواصفة ١٠ §2
    // و§4.0؛ فتبع الحارس موضوعه إلى الشبكات الحيّة، وحُذفت قاعدة الثلاثي بلا
    // حامل ٢٠٢٦/١٠/١٨.) وبغير `minmax(0, …)` يتمدّد العمود بمحتواه (جدولٌ أو
    // شريطٌ منزلق) فيدفع الصفحة إلى تمرير أفقي على ٣٩٠px — وهو ما يقيسه `ui-audit`.
    const layout = HOME_CSS.get("src/styles/home/home-layout.css") ?? "";
    expect(unsafeGridTracks(layout, [".nx-home-hero", ".nx-home-quad"])).toEqual([]);
    expect(CSS).not.toMatch(/\.nx-home-triad(?![\w-])/);
    // ويحمرّ على المزروع (المادة ٣٠): مسارٌ بلا حدٍّ صفري، وموضعٌ فيزيائي، وشبكةٌ غائبة.
    const bare = layout.replace(
      "grid-template-columns: minmax(0, 5fr) minmax(0, 2fr);",
      "grid-template-columns: 5fr 2fr;",
    );
    expect(bare).not.toBe(layout);
    expect(unsafeGridTracks(bare, [".nx-home-hero"])).toEqual([".nx-home-hero: 5fr 2fr"]);
    expect(unsafeGridTracks(`${layout}\n.nx-home-quad { left: 0; }`, [".nx-home-quad"])).toEqual([
      ".nx-home-quad: left",
    ]);
    expect(unsafeGridTracks(layout, [".nx-home-gone"])).toEqual([".nx-home-gone: غير معرَّفة"]);
  });

  it("ترتيب DOM هو ترتيب العرض: المؤشرات ← الصدر (الخريطة ← سَدِيد) ← التشغيل ← التحليلات", () => {
    // **كان اسمه «… المناطق ← سَدِيد ← توصياته»** وموضوعه الصدر الثلاثي: «سَدِيد
    // في المنتصف، وتوصياته على يسار بطاقته» (المالك ٢٠٢٦/٠٨/١٠). ونسخ الصدرَ وعقدَ
    // ترتيبه نصًّا قرارُ المالك ٢٠٢٦/١٠/١٣ (المواصفة ١٠ §٢: «the triad … and its
    // order contract»)، فسقطت شروطه الثلاثة: المناطق قبل المساعد، والمساعد قبل
    // التوصيات، والتوصيات داخل الصدر — لا تخفيفًا بل لزوال موضوعها.
    //
    // والقاعدة التي خدمها باقية بنصّها (المواصفة §3.7: «Keyboard reachable in
    // visual order»): التكديس على الجوال هو ترتيب DOM نفسه، فلو رُتّبت الصفوف أو
    // البطاقات بـ`order` لانفصل التبويب عن الرسم بلا أن يسقط tsc ولا eslint ولا
    // أيّ فحصٍ آخر. وبقرار D5 صار الترتيب **يسارًا ← يمينًا كما في الصورة** تحت
    // `dir="ltr"` — فالأسبق في DOM يُرسم أيسر، ووقوع سَدِيد **بعد** الخريطة هو
    // معنى «يمينها»، لا تفصيلًا تقنيًّا. ولو انعكس السطران لانقلب الجانبان بصمت.
    const page = stripComments(PAGE);
    expect(rowOrderBreaks(page)).toEqual([]);
    // الحاويات ترتيبٌ `ltr` (D5)، والبطاقات تعلن لغتها في ملفّاتها.
    expect(page).toMatch(/<div dir="ltr" className="nx-home-arrange\b/);
    expect(stripComments(surfaceFile("HomeDashboard.tsx"))).toMatch(
      /<ul dir="ltr" className="nx-home-kpis"/,
    );
    // وداخل الصفّين: البطاقات بترتيب الصورة يسارًا ← يمينًا (§4.6 · §4.7).
    for (const [file, fn, cards] of [
      [
        "HomeOpsRow.tsx",
        "HomeOpsRow",
        ["<TopRisksCard", "<ActiveIncidentsCard", "<FieldPatrolsCard", "<CameraTilesCard"],
      ],
      [
        "HomeAnalyticsRow.tsx",
        "HomeAnalyticsRow",
        ["<RegionsCard", "<IncidentsRisksCard", "<IncidentTypesCard", "<SystemsCard"],
      ],
    ] as const) {
      const body = fnBody(stripComments(surfaceFile(file)), fn);
      expect(body, `${fn} غير موجود`).toMatch(/<div dir="ltr" className="nx-home-quad\b/);
      expect(orderBreaks(body, cards), file).toEqual([]);
    }
    // ولا أداةٌ ولا قاعدة تفصل العرض عن DOM — في السطح كلّه وأنماطه (المادة ٣١).
    for (const [file, src] of HOME_SURFACE) {
      expect(orderUtilities(stripComments(src)), `${file}: أداة order-*`).toEqual([]);
    }
    for (const [file, css] of HOME_CSS) {
      const reorders = arrangementReorders(css).filter((r) => !ARRANGEMENT_ALLOWED.has(r));
      expect(reorders, `${file}: ترتيبٌ بصريّ على الصفوف`).toEqual([]);
    }
    // وصفّ الهوية بلا ترتيبٍ بصريّ، وما يُركَّز فيه بترتيب DOM: منطقة الشريط (تمرير بالأسهم في
    // السكون، وإيقافٌ بالتركيز) ثم زرّ إيقاف الحركة — والبانر نفسه بلا عنصرٍ يُركَّز.
    const brandCss = HOME_CSS.get("src/styles/home/home-brand.css") ?? "";
    expect(arrangementReorders(brandCss)).toEqual([]);
    expect(arrangementReorders(`${brandCss}\n.nx-ticker { order: 1 }`)).toEqual([
      ".nx-ticker { order: 1 }",
    ]);
    const brandRow = stripComments(surfaceFile("HomeBrandRow.tsx"));
    const ticker = stripComments(surfaceFile("HomeTicker.tsx"));
    const focusables = (code: string) => code.match(/<(?:Link|a|button)\b/g) ?? [];
    const focusStops = (code: string) => code.match(/tabIndex=\{?["']?0\b/g) ?? [];
    expect(focusables(brandRow)).toEqual([]);
    expect(focusables(ticker)).toEqual(["<button"]);
    expect(focusStops(brandRow), "عنصرٌ قابلٌ للتركيز في البانر").toEqual([]);
    expect(focusStops(ticker)).toHaveLength(1);
    expect(ticker).toMatch(/className="nx-ticker-view" role="region"[^>]*tabIndex=\{0\}/);
    expect(focusStops(`${ticker}\n<span tabIndex={0} />`)).toHaveLength(2);
    expect(focusables(`${brandRow}\n<a href="/x">x</a>`)).not.toEqual([]);

    // يحمرّ على المزروع (المادة ٣٠): الصدر مقلوبًا، وأداة `order-*`، وقاعدة
    // ترتيبٍ على بطاقة الصدر، و`dense` على الشبكة.
    const swapped = page.replace(
      /<HomeMapCard \/>(\s*)<HomeSadeedCard \/>/,
      "<HomeSadeedCard />$1<HomeMapCard />",
    );
    expect(swapped).not.toBe(page);
    expect(rowOrderBreaks(swapped)).toEqual(["<HomeSadeedCard /> قبل <HomeMapCard />"]);
    expect(orderUtilities('<div className="grid lg:order-2">')).toHaveLength(1);
    const layout = HOME_CSS.get("src/styles/home/home-layout.css") ?? "";
    expect(
      arrangementReorders(`${layout}\n.nx-home-hero > .nx-home-sadeed { order: -1; }`),
    ).toEqual([".nx-home-hero > .nx-home-sadeed { order: -1 }"]);
    expect(arrangementReorders(`${layout}\n.nx-home-quad { grid-auto-flow: dense; }`)).toHaveLength(
      1,
    );
  });

  it("الشذوذ ولوحات المؤشّرات الثلاث محذوفة من الرئيسية بلا تركة", () => {
    // أمر المالك ٢٠٢٦/٠٨/١٠: حذف أيقونة وبطاقات كشف الشذوذ وبطاقة الوكلاء
    // النشطين من الصفحة الرئيسية. والحذف يُحرَس كما تُحرَس الإضافة: استيرادٌ
    // باقٍ أو تركيبٌ باقٍ يعيدان السطح بأول لصقٍ لاحق — وقد عاد فعلًا مرةً
    // بعد دمجٍ على `main` لم يُلحِظ الحذف.
    // القياس على الكود **منزوعَ التعليقات**: توثيقُ الحذف نفسه يذكر الاسمين،
    // فمطابقة النصّ الخام تُسقط الحارس على شرحٍ لا على سطح.
    // والقياس على **السطح كلّه** لا على ملفّ الصفحة وحده: الصفحة اليوم غلافٌ
    // فوق صفوفٍ في ملفّاتها، وسطحٌ محذوف يعود من داخل صفٍّ كما يعود منها (المادة ٣١).
    const code = [...HOME_SURFACE.values()].map(stripComments).join("\n");
    expect(code).not.toContain("SadeedAnomalyStrip");
    expect(code, "عادت تحليلات الاستخدام إلى الرئيسية").not.toContain("SadeedUsageAnalytics");
    // اللوحات الثلاث: «الوكلاء النشطون» ثم «بانتظار الاعتماد» و«منجز اليوم».
    // ومعها `InstrumentPanel` نفسه — مكوّنٌ مستورَدٌ بلا مستهلك يُعاد تركيبه
    // لأنه «موجود».
    expect(code).not.toMatch(/agents_active|الوكلاء النشطون/);
    expect(code).not.toMatch(/proposals_pending|بانتظار الاعتماد/);
    expect(code).not.toMatch(/done_today|منجز اليوم/);
    expect(code).not.toContain("InstrumentPanel");
    // الحذف حذفُ عرضٍ من الرئيسية لا إلغاءُ سطح: المكوّنان يبقيان حيَّين في
    // صفحة تحليلات سَدِيد، وعدّاد الوكلاء في `/nx-ops` و`/nx-flow`.
    expect(read("src/routes/_authenticated/sadeed-analytics.tsx")).toContain("<SadeedAnomalyStrip");
  });

  it("المخاطر على الرئيسية قائمة «أبرز المخاطر» — لا سجلّ كامل ولا بطاقات مجمّعة (V4 · V5)", () => {
    // الشقّ الأول (أمر المالك V4 · فقرة 846): الجدول التفصيلي وترويسته وزرّ
    // «افتح سجل المخاطر الكامل» وسطر المخاطر بلا إسناد — محذوفة بلا تركة.
    // الشقّ الثاني (**جولة V5** · مراجعة العميل): حُذفت معها البطاقات الأربع
    // «حسب الشدّة» وشبكة «حسب المنطقة». وكلا الحذفين باقٍ.
    //
    // **كان اسمه «… بطاقةٌ واحدة بسهم» (V5)، ونُسخ ذلك البديل** بقرار المالك
    // ٢٠٢٦/١٠/١٣ (المواصفة ١٠ §٢: «the single risk card (V5) → replaced by the
    // mockup's «أبرز المخاطر» list») — فسقط شرط `riskRows.length` (إجمالي البطاقة
    // الواحدة)، وسقط معه شرط `recommendations`: توصيات سَدِيد كانت في الصدر
    // الثلاثي المنسوخ بالقرار نفسه. والحارس على البديل المعتمد: قائمةٌ قصيرة بسقف
    // الصورة (أربعة صفوف)، كي لا يعود السجلّ إلى الرئيسية في ثوبٍ آخر.
    //
    // والمحذوف يُمسح في السطح كلّه (المادة ٣١)، منزوعَ التعليقات: توثيق الحذف يذكر
    // الأسماء، فمطابقة النصّ الخام تُسقط الحارس على شرحٍ لا على سطح.
    for (const [file, src] of HOME_SURFACE) {
      expect(riskResidue(stripComments(src)), `${file}: تركة سجلّ المخاطر`).toEqual([]);
    }
    for (const [file, css] of HOME_CSS) {
      expect(riskResidue(stripComments(css)), `${file}: أنماط السجل المحذوف`).toEqual([]);
    }
    const OPS = stripComments(surfaceFile("HomeOpsRow.tsx"));
    const risks = fnBody(OPS, "TopRisksCard");
    expect(risks, "بطاقة «أبرز المخاطر» غير موجودة").not.toBe("");
    // و«حسب المنطقة» داخل حامل المخاطر: «الامتثال حسب المنطقة» في صفّ التحليلات
    // اسمُ مقياس امتثالٍ صادق (المواصفة §4.7)، لا شبكةُ مخاطر.
    const regionGrid = (body: string) => body.includes("حسب المنطقة");
    expect(regionGrid(risks), "عادت شبكة «حسب المنطقة»").toBe(false);
    // البديل المعتمد حاضر: قائمةٌ بسقف الصورة، ورأسُها وكلُّ صفٍّ فيها إلى السجل.
    expect(riskListCap(risks), "قائمة المخاطر بلا سقف — عاد السجل كاملًا").toBe(4);
    expect(HOME_REFERENCE.risks.rows).toHaveLength(4);
    expect((risks.match(/\bto="\/sec\/risks"/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(OPS).toMatch(/const \{[^}]*\brisk\b[^}]*\} = useHomeReads\(\);/);
    expect(OPS).toContain("<TopRisksCard ar={ar} risk={risk} />");
    expect(stripComments(PAGE)).toContain("<HomeOpsRow />");
    // والحذف حذفُ عرضٍ لا إلغاءُ مصدر: `getRiskBoard` نفسه بالمفتاح نفسه يغذّي
    // القائمة ومؤشر «المخاطر الحرجة» معًا (رقمٌ واحد، طلبٌ واحد).
    const reads = stripComments(surfaceFile("home-reads.ts"));
    expect(reads).toContain("getRiskBoard");
    expect(reads).toMatch(/queryKey: \["blueprint-risk-board"\]/);

    // يحمرّ على المزروع (المادة ٣٠): قائمةٌ بلا سقف، وتركةٌ تعود.
    const uncapped = risks.replace(/\.slice\(0, 4\)/, "");
    expect(uncapped).not.toBe(risks);
    expect(riskListCap(uncapped)).toBeNull();
    expect(riskResidue('const by = countBySeverity(rows); <Link to="/risk" />')).toEqual([
      "رابط /risk",
      "عدّادات التجميع",
    ]);
    expect(riskResidue("<h3>حسب الشدّة</h3> <h3>المخاطر حسب المنطقة</h3>")).toEqual([
      "بطاقات «حسب الشدّة»",
      "تجميع المخاطر",
    ]);
    expect(riskResidue(".nx-risk-table { display: grid; }")).toEqual(["جدول السجل أو بطاقاته"]);
    expect(regionGrid(`${risks}<h3>حسب المنطقة</h3>`)).toBe(true);
  });

  it("الوردة وأثر الفرجار محذوفان بلا تركة", () => {
    // الحذف يُحرَس كما تُحرَس الإضافة: مكوّنٌ مُصدَّر بلا مستهلك يُعاد
    // استيراده لأنه «موجود»، وصنفٌ باقٍ في CSS بلا حاملٍ يعود سطحًا حيًّا
    // بأول لصقٍ لاحق.
    expect(existsSync("src/components/blueprint/RegionRosette.tsx")).toBe(false);
    expect(PAGE).not.toContain("RegionRosette");
    for (const sel of [
      ".nx-bp-rosette",
      ".nx-bp-region",
      ".nx-bp-region-btn",
      ".nx-bp-region-name",
      ".nx-bp-track",
      ".nx-bp-spoke",
      ".nx-bp-arc",
      ".nx-bp-arc-tip",
      ".nx-bp-hub",
      ".nx-bp-hub-ring",
      ".nx-bp-art",
      ".nx-bp-halo",
      ".nx-bp-orbit",
      ".nx-bp-sadeed-halo",
      ".nx-bp-sadeed-btn",
      ".nx-bp-compass",
      // وطبقة الفن التالية لها في الأمر نفسه (٢٠٢٦/٠٨/٠٩): الشفق المخروطي
      // وخيطه وحزمتا الضوء. أربع هالات تدور خلف السطح كانت تُقرأ بوصلةً
      // ثانية بعد حذف الأولى.
      ".nx-bp-aurora",
      ".nx-bp-ribbon",
      ".nx-bp-beam",
    ]) {
      expect(CSS.indexOf(`${sel} {`), `${sel} بقي في الأنماط بلا حامل`).toBe(-1);
    }
    // والإطارات معها: قاعدةٌ ذهبت وإطارها باقٍ تركةٌ تُغري بإعادتها.
    for (const kf of ["nxBpAurora", "nxBpRibbon", "nxBpBeam"]) {
      expect(CSS.indexOf(`@keyframes ${kf}`), `${kf} بقي بلا مستهلك`).toBe(-1);
    }
    // ولا حاملَ في الترميز: الصنف يعود سطحًا حيًّا بأول لصق.
    for (const cls of ["nx-bp-aurora", "nx-bp-ribbon", "nx-bp-beam", "nx-bp-compass"]) {
      expect(PAGE, `${cls} عاد إلى الصفحة`).not.toMatch(
        new RegExp(`className=["'\`][^"'\`]*\\b${cls}\\b`),
      );
    }
    // و«عبارتها» في الأمر نفسه: وصف الميتا كان يقول «على بوصلة واحدة …
    // والامتثال مقروءًا طولَ قوس» — يصف سطحًا لم يعد موجودًا.
    for (const route of ["src/routes/blueprint.tsx", "src/routes/index.tsx"]) {
      expect(read(route)).not.toContain("بوصلة");
    }
  });

  it("`nxBpSpin` باقٍ: مستهلكه خارج طبقة المُخطَّط", () => {
    // درسٌ من هذه الجلسة: الإطار كان يُشغّل هالة الوردة، وله مستهلك ثانٍ
    // في هالة قلب المسرح. حذفه مع حامله الأول يوقف حركةً حيّة في سطحٍ آخر
    // بلا أن يسقط بناءٌ ولا فحص — فالإطار المفقود لا يُخطئ، يُهمَل بصمت.
    expect(CSS).toContain("@keyframes nxBpSpin");
    expect(CSS).toMatch(/animation: nxBpSpin \d+s linear infinite;/);
  });
});

describe("المُخطَّط — الاقتطاع من حزمة الدخول", () => {
  it("ملف المسار لا يصدّر الصفحة", () => {
    // تصديرها من ملف المسار يُبطل اقتطاع الموجّه ويُعيدها إلى حزمة الدخول،
    // وميزانية الأداء تحت السقف بهامش ضيّق.
    const route = read("src/routes/blueprint.tsx");
    expect(route).toContain('from "./-blueprint-page"');
    expect(route).not.toMatch(/export\s+(function|const)\s+BlueprintPage/);
  });
});

describe("المُخطَّط — أرضيّتا القراءة واللمس", () => {
  /**
   * سقط رابط المسرح في فحص الإنتاج (`scripts/ui-audit.mjs`)، وقيس محليًّا في
   * متصفح حقيقي على ٣٧٥ و٣٩٠ و٧٦٨ و١٤٤٠ و١٩٢٠ قبل التصحيح: ١٤٦×٣٤.
   *
   * (كان هنا بندٌ ثانٍ يحرس لافتات العدّادات عند ١٢px — سقطت معها لأن شريط
   * `.nx-bp-counter` نفسه حُذف بقرار المالك ٢٠٢٦/٠٨/٠٩. البند أدناه يحرس
   * الحذف نفسه: أرضيةُ قراءةٍ لسطحٍ غير موجود حراسةٌ لفراغ.)
   *
   * الفحص هنا على النصّ لا على التخطيط — jsdom لا يقيس شيئًا من هذا،
   * وميدانُ القياس الحقيقي هو `ui-audit`. قيمته أنه يمنع العودة الصامتة
   * بين تشغيلين للفحص الميداني، لا أنه يُغني عنه.
   */
  const rule = (selector: string) => {
    const at = CSS.indexOf(`${selector} {`);
    expect(at, `القاعدة ${selector} غير موجودة`).toBeGreaterThan(-1);
    return CSS.slice(at, CSS.indexOf("\n}", at));
  };

  it("رابط المسرح ≥ ٤٤px — أرضية الإبهام والمؤشّر معًا", () => {
    const h = rule(".nx-bp-more").match(/min-block-size:\s*([\d.]+)px/);
    expect(h, "لا ارتفاع أدنى مصرَّح").not.toBeNull();
    expect(Number(h![1])).toBeGreaterThanOrEqual(44);
  });

  it("الفحص الميداني يقيس نصّ SVG بمقياس رسمه لا بوحدات viewBox", () => {
    // وردة المناطق viewBox 260 تُرسم في 343–430px، فـ 10.5px مصرَّحة تظهر
    // 13.85–17.37px. قراءة المصرَّح وحده كانت تُسقط أربع لافتات سليمة في كل
    // مقاس — وتُخفي في المقابل نصًّا صغيرًا حقيقيًّا داخل SVG مصغَّر.
    const audit = read("scripts/ui-audit.mjs");
    expect(audit).toContain("getScreenCTM");
    expect(audit).toMatch(/parseFloat\(cs\.fontSize\) \* scale/);
  });

  it("الفحص الميداني: توقيع الإخفاء لا صِغَر القاصّ — يُعفي من القصّ، ويُقاس به الهدف مركَّزًا", () => {
    // العنوان المخفيّ في الرئيسية (`sr-only` وفيه span الاسمين) كان يُقاس على
    // صندوقه ذي البكسل الواحد فيسقط ‏101px في المقاسات الثمانية (٢٠٢٦/١٠/١٧).
    // الاستثناء **توقيعان بأعيانهما** لا أكثر: `inset()` عامّةً يُعمي الفحص عن
    // الكشف بالقصّ (منحنيات المؤشرات تبدأ `inset(0 100% 0 0)`)، واستثناءٌ بالحجم
    // يُعميه عن بطاقةٍ انهارت إلى 1px بخطأ. جُرّب الاتجاهان في متصفّح حقيقي.
    //
    // ورابط التخطّي (`.nx-skip-link`) أسقط فحص الإنتاج #523 في ٥٦/٥٦ (٢٠٢٦/١٠/١٨): قِيس ساكنًا
    // 1×1 وهو بتصميمه مخفيٌّ حتى التركيز. فأرضيّة الهدف تقيس المخفيّ بالتوقيع **مركَّزًا** —
    // لا تُعفيه — وأرضيّة الخطّ لا تُعفي شيئًا.
    const audit = read("scripts/ui-audit.mjs");
    const SIGNATURE =
      'ps.clipPath === "inset(50%)" || /^rect\\(0(px)?,? ?0(px)?,? ?0(px)?,? ?0(px)?\\)$/.test(ps.clip)';
    const condition = (src: string) =>
      /const underHidingSignature = \(el\) => \{[\s\S]*?const ps = getComputedStyle\(p\);\s*if \(([\s\S]*?)\) \{\s*return true;/
        .exec(src)?.[1]
        .replace(/\s+/g, " ")
        .trim() ?? null;
    const sized = (src: string) => /\.(?:width|height)\s*<=?\s*\d/.test(src);
    const textFloor = (src: string) =>
      src.slice(src.indexOf("if (ownText"), src.indexOf("const inlineTextLink"));
    const targetFloor = (src: string) =>
      src.slice(src.indexOf("const isControl"), src.indexOf("const clipperOf"));
    const clipCheck = (src: string) => src.slice(src.indexOf("const clipperOf"));
    expect(condition(audit)).toBe(SIGNATURE);
    expect(sized(audit), "استثناءٌ بالحجم").toBe(false);
    expect(clipCheck(audit)).toContain("if (underHidingSignature(el)) continue;");
    expect(targetFloor(audit)).toMatch(
      /if \(isControl && underHidingSignature\(el\)\) \{\s*el\.focus\(\{ preventScroll: true \}\);/,
    );
    expect(targetFloor(audit)).toContain("el.blur();");
    expect(targetFloor(audit), "أرضية الهدف لا تتخطّى المخفيّ").not.toContain("continue");
    expect(textFloor(audit), "أرضية الخطّ لا تُعفي المخفيّ").not.toContain("underHidingSignature");
    // يحمرّ على المزروع (المادة ٣٠): أيّ `inset()` · أيّ `clip-path` · استثناءٌ بالحجم ·
    // تخطّي الهدف المخفيّ · قياسه بلا تركيز · إعفاء نصّه من أرضية الخطّ.
    const anyInset = audit.replace(
      'ps.clipPath === "inset(50%)"',
      'ps.clipPath.startsWith("inset(")',
    );
    const anyClip = audit.replace('ps.clipPath === "inset(50%)"', 'ps.clipPath !== "none"');
    const bySize = audit.replace(
      "if (underHidingSignature(el)) continue;",
      "if (underHidingSignature(el) || r.width < 2) continue;",
    );
    const skipsTarget = audit.replace(
      "if (isControl && underHidingSignature(el)) {",
      "if (isControl && underHidingSignature(el)) {\n      continue;",
    );
    const noFocus = audit.replace("el.focus({ preventScroll: true });", "");
    const textExempt = audit.replace(
      "if (ownText) {",
      "if (ownText && !underHidingSignature(el)) {",
    );
    for (const planted of [anyInset, anyClip]) {
      expect(planted).not.toBe(audit);
      expect(condition(planted)).not.toBe(SIGNATURE);
    }
    expect(bySize).not.toBe(audit);
    expect(sized(bySize)).toBe(true);
    expect(skipsTarget).not.toBe(audit);
    expect(targetFloor(skipsTarget)).toContain("continue");
    expect(noFocus).not.toBe(audit);
    expect(targetFloor(noFocus)).not.toMatch(/el\.focus\(/);
    expect(textExempt).not.toBe(audit);
    expect(textFloor(textExempt)).toContain("underHidingSignature");
  });

  it("شريط العدّادات ومسطرة الوحدة محذوفان بلا تركة (قرار المالك ٢٠٢٦/٠٨/٠٩)", () => {
    // الحذف يُحرَس كما تُحرَس الإضافة: صنفٌ باقٍ في CSS بلا حاملٍ في الترميز
    // يعود سطحًا حيًّا بأول لصقٍ لاحق، ومكوّنٌ مُصدَّر بلا مستهلك يُعاد
    // استيراده لأنه «موجود». الأرقام نفسها تبقى في لوحات `.nx-bp-panel`.
    expect(PAGE).not.toContain("nx-bp-counters");
    expect(PAGE).not.toContain("nx-bp-counter");
    expect(PAGE).not.toContain("MeasureRail");
    expect(PANELS).not.toMatch(/export\s+function\s+MeasureRail/);
    for (const sel of [".nx-bp-counters", ".nx-bp-counter", ".nx-bp-rail"]) {
      expect(CSS.indexOf(`${sel} {`), `${sel} بقي في الأنماط بلا حامل`).toBe(-1);
    }
  });
});

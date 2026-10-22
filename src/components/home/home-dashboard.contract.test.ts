/**
 * عقد لوحة الرئيسية — «مركز القيادة» (أمر المالك ٢٠٢٦/٠٩/٢٩ «تفعيل جميع
 * الأيقونات»، ثم ٢٠٢٦/١٠/١٣ «طبّق هذا الشكل بالتمام والكمال»).
 *
 * أعطالٌ لا يراها tsc ولا البناء: رابطٌ إلى مسارٍ محجوب أو «قريباً» (المسار
 * نصّ)، ورقمٌ غائب يُعرض صفرًا (`?? 0`)، وسهمُ تغيّرٍ مرجعيٌّ فوق رقمٍ حيّ،
 * و**لوحةٌ تعذّر تحميلها تقول «لا بلاغات» بصيغة الحقيقة** — قاسه حارس
 * الجودة بإسقاط الخادم، والمؤشر فوقها يقول عن العدد نفسه «لم يُقَس».
 *
 * **يقرأ صفوف الرئيسية كلّها لا ملفًّا واحدًا** — ومنها صفّ الهوية (المادة ٣١؛ والمواصفة
 * `docs/design/10-home-command-center-prompt.md` §6.3 و§8): لوحات التشغيل وأسئلة
 * سَدِيد السريعة حُذفت من `HomeDashboard.tsx` (٢٠٢٦/١٠/١٧) بعد أن خلفتها
 * `HomeMapCard` و`HomeOpsRow` و`HomeAnalyticsRow` و`HomeSadeedCard` — وحارسٌ
 * يقرأ الملف القديم وحده يخضرّ على سطحٍ لم يعد يُرسم.
 *
 * وما نسخه المالك صراحةً (المواصفة §2، والقراران N2 وN3) لا يُحذف حارسه
 * صامتًا: يُعلَّق بتعليقٍ يسمّي القرار، ويُحرس بديله في موضعه.
 *
 * وكل فحصٍ دالّةٌ تُجرَّب أولًا على انتهاكٍ مزروع (المادة ٣٠): فحصٌ لم
 * يُرَ يحمرّ لا يُثبت شيئًا حين يخضرّ.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import postcss, { type AtRule, type Root } from "postcss";
import { describe, expect, it } from "vitest";
import { isRouteHidden } from "@/lib/nav/hidden-routes";
import { SADEED_PORTRAIT_SIZE, SADEED_PORTRAIT_SRC } from "@/lib/sadeed/portrait";
import { HOME_IMAGES, ILLUSTRATIVE_LABEL } from "./home-images";
import { refKpi } from "./home-reference";

/** أبعاد WebP من ترويسته (VP8X · VP8L · VP8) — أبعاد الملف لا ما يُكتب عنه. */
function webpDims(bytes: Buffer): { width: number; height: number } {
  const chunk = bytes.toString("latin1", 12, 16);
  if (chunk === "VP8X")
    return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
  }
  return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
}

const read = (f: string) => readFileSync(f, "utf8");
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/* ── المصادر: صفوف الرئيسية كلّها (المادة ٣١) ─────────────────────────── */

const HOME = "src/components/home";
/**
 * كل ملفٍّ يرسم صفًّا على `/` أو يقرّر ما يُرسم — ومنها المرجع وبيان الصور: أسماء
 * المقاييس الحيّة وأوسمة الصور تُكتب هناك لا في المكوّنات. **وما ليس هنا عمدًا:**
 * فيلم الخلفية (`HoloVideoEngine`، D6) ومكوّنات سَدِيد المشتركة التي تركّبها بطاقته
 * (`SadeedStagePresence` وأخواتها — مشتركةٌ مع `/assistant` ولها حرّاسها؛ وفي
 * `SadeedStagePresence` لونٌ سداسيٌّ سابقٌ لهذا العمل `bg-[#04070F]` دَينٌ مسجَّل).
 */
const ROW_FILES = [
  "HomeDashboard.tsx", // المؤشرات السبعة
  "HomeMapCard.tsx", // الصدر يسارًا
  "HomeSadeedCard.tsx", // الصدر يمينًا
  "HomeOwnerAgents.tsx", // مدخلا سديد وFNN للمالك، ضمن قواعد الصفوف نفسها
  "HomeOpsRow.tsx", // التشغيل
  "PatrolRouteMap.tsx", // رسم الدوريات داخل التشغيل
  "HomeAnalyticsRow.tsx", // التحليلات
  "home-primitives.tsx", // البطاقة والحالات الثلاث والحلقة
  "home-reads.ts", // القراءات المشتركة
  "home-reference.ts", // أرقام الصورة وأسماء المقاييس الحيّة (N2)
  "home-images.ts", // بيان الصور التوضيحية (N3)
  "HomeBrandRow.tsx", // صفّ الهوية (§2.3) — تحت قواعد الصفوف كلّها، واستثناؤه في N3 مسمّى
];
/** الخاتمة (٢٠٢٦/١٠/١٧) تُقرأ متى وُجد ملفّها — ووجوده يُلزم الصفحة بتركيبها. */
const HAS_CLOSING = existsSync(`${HOME}/HomeClosingBand.tsx`);
const SOURCES: Readonly<Record<string, string>> = Object.fromEntries(
  [...ROW_FILES, ...(HAS_CLOSING ? ["HomeClosingBand.tsx"] : [])].map((f) => [
    f,
    strip(read(`${HOME}/${f}`)),
  ]),
);
const CODE = Object.values(SOURCES).join("\n");
/** المكوّنات وحدها — بلا المرجع الذي تسكنه `chooseLive` نفسها. */
const COMPONENTS = Object.entries(SOURCES).filter(([f]) => f.endsWith(".tsx"));
const src = (f: string): string => {
  const s = SOURCES[f];
  if (s === undefined) throw new Error(`لا مصدر مقروء: ${f}`);
  return s;
};
const TREE = read("src/routeTree.gen.ts");
const CSS = read("src/styles.css");
const HOME_CSS = readdirSync("src/styles/home")
  .filter((f) => f.endsWith(".css"))
  .sort()
  .map((f) => read(`src/styles/home/${f}`))
  .join("\n");
const PAGE = read("src/routes/-blueprint-page.tsx");
const PAGE_CODE = strip(PAGE);
/** مُصيِّر بطاقة الخريطة — يرسم أرقامها وروابطها وتنبيهها، فيُمسح بالقواعد نفسها. */
const MAP = strip(read("src/components/map/ArabianPeninsulaMap.tsx"));

/* ── أدوات القراءة ─────────────────────────────────────────────────────── */

const idx = (m: { index?: number }) => m.index ?? -1;

/** النصّ من قوسٍ مفتوح (`{` أو `(`) إلى نظيره، شاملًا. */
function balanced(code: string, open: number): string {
  const o = code[open];
  const c = o === "(" ? ")" : "}";
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === o) depth++;
    else if (code[i] === c && --depth === 0) return code.slice(open, i + 1);
  }
  return code.slice(open);
}

/** أقرب قوسَي كائنٍ أو كتلةٍ يحيطان بموضع. */
function enclosing(code: string, pos: number): string {
  let depth = 0;
  for (let i = pos; i >= 0; i--) {
    if (code[i] === "}") depth++;
    else if (code[i] === "{") {
      if (depth === 0) return balanced(code, i);
      depth--;
    }
  }
  return "";
}

type Fn = { name: string; start: number; end: number; body: string };
/** دوالّ المستوى الأعلى بمداها — حتى الدالّة التالية (وما بينهما من ثوابت). */
function functions(code: string): Fn[] {
  const heads = [...code.matchAll(/^(?:export )?function (\w+)/gm)];
  return heads.map((m, i) => {
    const start = idx(m);
    const end = i + 1 < heads.length ? idx(heads[i + 1]) : code.length;
    return { name: m[1], start, end, body: code.slice(start, end) };
  });
}
const fnBody = (code: string, name: string) =>
  functions(code).find((f) => f.name === name)?.body ?? "";

/** يزرع انتهاكًا في نسخةٍ من المصدر — ويحمرّ إن لم يجد موضعه: مرساةٌ قديمة لا تزرع شيئًا. */
function plant(code: string, from: string, to: string): string {
  expect(code, `مرساة الزرع: ${from.slice(0, 48)}`).toContain(from);
  return code.replace(from, to);
}

const parsed = new Map<string, Root>();
function parse(css: string): Root {
  let root = parsed.get(css);
  if (!root) {
    root = postcss.parse(css);
    parsed.set(css, root);
  }
  return root;
}
/** الموضوع: آخر مركّبٍ في المحدِّد — ما تقع عليه القاعدة فعلًا. */
const subject = (sel: string) =>
  sel
    .trim()
    .split(/\s*[\s>+~]\s*/)
    .pop() ?? "";
const classRe = (cls: string) => new RegExp(`\\.${cls}(?![\\w-])`);

/* ── الفحوص نفسها — دوالّ تُعيد المخالفات، فتُجرَّب على المزروع ─────── */

/** عدد مرّات رسم متغيّرٍ ابنًا في JSX (`>{name}<`) — لا تصريحه ولا تمريره خاصيّةً. */
const jsxChild = (code: string, name: string) =>
  (code.match(new RegExp(`>\\s*\\{${name}\\}\\s*<`, "g")) ?? []).length;

/** مواضع استعمال الشارة خارج سطور الاستيراد — الاستيراد وحده لا يرسم شيئًا. */
const badgeUses = (code: string) =>
  (
    code
      .replace(/import\s*(?:type\s*)?\{[^}]*\}\s*from\s*"[^"]+";?/g, "")
      .match(/\bSIMULATION_BADGE_AR\b/g) ?? []
  ).length;

/** كل وجهة مكتوبة: `to="/x"` في JSX و`to: "/x"` في السجلات. */
function destinations(code: string): string[] {
  const out = new Set<string>();
  for (const m of code.matchAll(/\bto(?:=|:\s*)"(\/[^"]*)"/g)) out.add(m[1]);
  return [...out];
}
function comingSoon(d: string): boolean {
  const base = d.slice(1).replace(/\//g, ".");
  return [
    `src/routes/_authenticated/${base}.tsx`,
    `src/routes/_authenticated/${base}.index.tsx`,
    `src/routes/${base}.tsx`,
    `src/routes/${base}.index.tsx`,
  ]
    .filter((f) => existsSync(f))
    .some((f) => readFileSync(f, "utf8").includes("coming_soon"));
}
const deadDestinations = (code: string) =>
  destinations(code).filter((d) => !TREE.includes(`'${d}'`) || isRouteHidden(d) || comingSoon(d));
/** وجهةٌ محسوبة تفلت من القياس على شجرة المسارات: قالبٌ أو جمعُ نصوص. */
const computedDestinations = (code: string) => [
  ...(code.match(/\bto=\{(?![\w.]+\})[^}]*\}/g) ?? []),
  ...(code.match(/\bto:\s*`/g) ?? []),
];
/** سجلّ المؤشرات السبعة في `HomeDashboard.tsx`. */
function kpiRegistry(code: string): string {
  const at = code.indexOf("const kpis: Kpi[]");
  return at === -1 ? "" : code.slice(at, code.indexOf("];", at));
}

/**
 * انتظارٌ يسبق الخطأ: كل `isPending` يحسمه خطؤه أولًا — فرعًا سابقًا
 * (`if (q.isError) …; if (q.isPending)` أو `q.isError ? … : q.isPending`)، أو
 * استثناءً صريحًا (`q.isPending && !q.isError`)، أو مُدخَلًا إلى `statusOf`
 * التي ترتّبهما. وإلا دار هيكلٌ فوق خطأ — تحميلٌ لا ينتهي (المادة ١٤).
 */
function pendingBeforeError(code: string): string[] {
  const bad: string[] = [];
  for (const m of code.matchAll(/\b(\w+)\.isPending\b/g)) {
    const q = m[1];
    const at = idx(m);
    const before = code.slice(Math.max(0, at - 160), at);
    const after = code.slice(at, at + 80);
    const ok =
      new RegExp(`^${q}\\.isPending\\s*&&\\s*!${q}\\.isError\\b`).test(after) ||
      new RegExp(`if \\(${q}\\.isError\\)[^;]*;\\s*if \\($`).test(before) ||
      new RegExp(`${q}\\.isError\\s*\\?[^:]*:\\s*$`).test(before) ||
      /statusOf\(\{\s*isPending:\s*[\w.|\s]*$/.test(before);
    if (!ok) bad.push(code.slice(Math.max(0, at - 40), at + 30).trim());
  }
  return bad;
}

/**
 * لوحةٌ تقرأ الفراغ قبل الخطأ. ثلاثة مواضع: الشكل القديم حرفيًّا؛ والتفرّع
 * المشترك (`PanelBody`) متى بقي — خطأ ← تحميل ← فراغ؛ وبطاقات الصفوف: «لا صفوف»
 * لا يُقال إلا داخل فرع القراءة الحيّة الواصلة (`mode === "live"` · `live && …`).
 */
function emptyBeforeError(code: string): string[] {
  const bad: string[] = [];
  // الشكل القديم حرفيًّا: `q.isPending ? <Loading/> : cond ? <Empty>` بلا خطأ.
  for (const m of code.matchAll(/\{(\w+)\.isPending \? \(\s*<Loading[^]*?<Empty>/g)) bad.push(m[1]);
  const pb = code.indexOf("function PanelBody");
  if (pb !== -1) {
    const body = code.slice(pb);
    // الفروع نفسها لا ذكرُ الحقول: `isPending` يسبق `isError` في نوع المعامل.
    const e = body.indexOf("if (q.isError)");
    const l = body.indexOf("if (q.isPending)");
    const f = body.indexOf("if (isEmpty)");
    if (!(e > -1 && e < l && l < f)) bad.push("PanelBody");
  }
  for (const f of functions(code)) {
    for (const m of f.body.matchAll(/<EmptyLive\b/g)) {
      const modes = [...f.body.slice(0, idx(m)).matchAll(/mode === "(\w+)"/g)];
      if (modes[modes.length - 1]?.[1] !== "live") bad.push(`${f.name}: EmptyLive`);
    }
    for (const m of f.body.matchAll(/className="nx-ana-empty"/g)) {
      const before = f.body.slice(Math.max(0, idx(m) - 160), idx(m));
      if (!/\blive && [^?]*\?\s*\(\s*<p\s*$/.test(before)) bad.push(`${f.name}: nx-ana-empty`);
    }
  }
  return bad;
}

/**
 * خطأٌ بلا إعادة: بطاقةٌ تُعلن تعذّر قراءةٍ (`failed={q.isError}`) ولا تطلب
 * **القراءة نفسها** في `onRetry` — زرٌّ يُضغط فلا يحدث شيء. و`failed={false}`
 * بطاقةٌ لا تقرأ شيئًا (مرجعٌ دائم) فلا خطأ لها ولا إعادة.
 */
function retryGaps(code: string): string[] {
  const bad: string[] = [];
  for (const m of code.matchAll(/\bfailed=\{(?!false\})/g)) {
    const failed = balanced(code, idx(m) + "failed=".length);
    const reads = [...failed.matchAll(/\b(\w+)\.isError\b/g)].map((r) => r[1]);
    const o = code.indexOf("onRetry={", idx(m));
    const retry = o === -1 || o - idx(m) > 300 ? "" : balanced(code, o + "onRetry=".length);
    if (reads.length === 0) bad.push(failed);
    for (const q of reads) if (!retry.includes(`${q}.refetch()`)) bad.push(`${failed} ⇐ ${q}`);
  }
  return bad;
}

/** إعادة الخريطة تطلب كل قراءةٍ تحسم حالها أو حال إحصاءاتها. */
function mapRetryGaps(code: string): string[] {
  const reads = new Set(
    [...code.matchAll(/statusOf\((\w+)\)|\b(\w+)\.isError\b/g)].map((m) => m[1] ?? m[2]),
  );
  const o = code.indexOf("onRetry={", code.indexOf("<ArabianPeninsulaMap"));
  const retry = o === -1 ? "" : balanced(code, o + "onRetry=".length);
  return [...reads].filter((q) => !retry.includes(`${q}.refetch()`));
}

/**
 * قراءةٌ يحسم بها مؤشرٌ حاله ولا يعيد طلبَها شيءٌ في الصفوف: المؤشر بطاقةٌ-رابط
 * لا تحمل زرًّا، فإعادته تنبيهٌ ظاهر في الصفحة نفسها على المفتاح المشترك.
 */
function unretriedKpiReads(registry: string, code: string): string[] {
  const retried = new Set([...code.matchAll(/\b(\w+)\.refetch\(\)/g)].map((m) => m[1]));
  return [...registry.matchAll(/status: statusOf\((\w+)\)/g)]
    .map((m) => m[1])
    .filter((q) => !retried.has(q));
}

/** تنبيه تعذّرٍ بلا زرٍّ يستدعي الإعادة ويقول «أعد المحاولة». */
function alertsWithoutRetry(code: string): string[] {
  const bad: string[] = [];
  for (const m of code.matchAll(/role="alert"/g)) {
    const end = code.indexOf("</div>", idx(m));
    const block = code.slice(idx(m), end === -1 ? idx(m) + 600 : end);
    if (!/<button\b[^>]*onClick=\{onRetry\}/.test(block) || !block.includes("أعد المحاولة")) {
      bad.push(block.slice(0, 60));
    }
  }
  return bad;
}

/** الغياب صفرًا: بديلٌ بـ`??` أو `||` إلى الصفر على أي قراءة (المادة ٢٧، وN2 «لا `?? 0` أبدًا»). */
const zeroForAbsence = (code: string) => code.match(/(?:\?\?|\|\|)\s*0(?![\w.])/g) ?? [];

/** كتل فرع المرجع (`mode === "reference") { … }`) بمداها. */
const referenceBlocks = (code: string) =>
  [...code.matchAll(/mode === "reference"\)\s*\{/g)].map((m) => {
    const open = idx(m) + m[0].length - 1;
    return [open, open + balanced(code, open).length] as const;
  });
/**
 * كل قراءةٍ لتغيّرٍ أو منحنى (`x.change` · `x.series`) بموضع نقطتها — قراءةُ عضوٍ
 * لا نقاطُ النشر (`...series`).
 */
const decorationReads = (code: string) =>
  [...code.matchAll(/[\w$)\]]\.(?:change|series)\b/g)].map((m) => idx(m) + 1);
/**
 * زينةٌ مرجعية فوق رقمٍ حيّ (قرار N2): قراءةُ `.change` أو `.series` لا تأتي من
 * `chooseLive` (`chosen.…` — تعيدهما `null` للحيّ، ويحرسها `home-reference.test.ts`)
 * ولا تقع في سياقٍ مرجعيّ بالبناء: فرع `mode === "reference"`، أو كائنٌ يصرّح
 * `simulated: HOME_REFERENCE.…`، أو بطاقةٌ مرجعية دائمًا (`sim="all"` بلا `liveOf`).
 */
function liveDecorations(code: string): string[] {
  const blocks = referenceBlocks(code);
  const fns = functions(code);
  return decorationReads(code)
    .filter((at) => {
      if (/\bchosen$/.test(code.slice(Math.max(0, at - 6), at))) return false;
      if (blocks.some(([s, e]) => s < at && at < e)) return false;
      if (/\bsimulated:\s*HOME_REFERENCE\./.test(enclosing(code, at))) return false;
      const owner = fns.find((f) => f.start <= at && at < f.end);
      return !(owner && /\bsim="all"/.test(owner.body) && !/\bliveOf\./.test(owner.body));
    })
    .map((at) => code.slice(Math.max(0, at - 30), at + 8).trim());
}
/** سهم تغيّرٍ لا يُشتقّ من اتجاه تغيّرٍ (`x.dir === "up" ? ↑ : ↓`) — رقمٌ مرسومٌ باليد. */
function freeArrows(code: string): number {
  const body = code
    .replace(/^import\s+"[^"]*";?$/gm, "")
    .replace(/^import[\s\S]*?from\s*"[^"]*";?$/gm, "");
  const all = (body.match(/\b(?:Arrow|Trending)(?:Up|Down)\b/g) ?? []).length;
  const paired = (
    body.match(
      /\b\w+\.dir === "up"\s*\?\s*(?:<ArrowUp\b[^>]*\/>|ArrowUp)\s*:\s*(?:<ArrowDown\b[^>]*\/>|ArrowDown)/g,
    ) ?? []
  ).length;
  return all - 2 * paired;
}

const videos = (code: string) => code.match(/<video\b/g) ?? [];
/**
 * صورةٌ من خارج بيانها (N3): `<img>` لا تأخذ مصدرها وأبعادها ونصّها البديل
 * وكسلها من مدخلٍ في `HOME_IMAGES` — فلا وسم «صورة توضيحية» ولا وزنٌ محسوب.
 */
function unmanifestedImages(code: string): string[] {
  const tags = code.match(/<img\b[^>]*>/g) ?? [];
  const bad = tags.filter(
    (t) =>
      !["src", "width", "height", "alt", "loading"].every((a) =>
        new RegExp(`\\b${a}=\\{img\\.${a}\\}`).test(t),
      ),
  );
  const bound = (code.match(/\bconst img = HOME_IMAGES\[/g) ?? []).length;
  if (bound < tags.length) bad.push(`${tags.length - bound} <img> بلا HOME_IMAGES`);
  return bad;
}
/**
 * البطاقات المصوّرة ووسمها (N3): الدالّة التي ترسم صورةً (`<img>` · `<Thumb>` ·
 * `<PatrolRouteMap>`) وبطاقتها معًا تمرّر `caption` بـ`ILLUSTRATIVE_LABEL`.
 */
const illustratedCards = (code: string) =>
  functions(code)
    .filter(
      (f) =>
        /<(?:img|Thumb|PatrolRouteMap)\b/.test(f.body) &&
        /<(?:OpsCard|AnaCard|Panel)\b/.test(f.body),
    )
    .map((f) => ({
      name: f.name,
      labelled: /\bcaption=\{[^}]*\bILLUSTRATIVE_LABEL\b/.test(f.body),
    }));

/** الصفر غيابًا في الامتثال: `> 0` · بديل `??`/`||` · اختبار صدقٍ على النسبة. */
const complianceAsAbsence = (code: string) =>
  code.match(
    /compliance_pct\s*(?:>=?\s*0\b|\?\?|\|\||&&|\?(?![?.]))|!\s*[\w?.]*\bcompliance_pct\b/g,
  ) ?? [];
/**
 * شريطٌ بلا قياس: امتلاءٌ (`--bar-pct`) لا يقع في الفرع المقيس من شرط
 * `!== null` القريب — الغياب نصٌّ، لا شريطٌ يوهم بصفر.
 */
function barWithoutMeasure(code: string): string[] {
  const bad: string[] = [];
  for (const m of code.matchAll(/--bar-pct/g)) {
    const before = code.slice(Math.max(0, idx(m) - 600), idx(m));
    const gate = Math.max(before.lastIndexOf("!== null ? ("), before.lastIndexOf("!== null && ("));
    if (gate === -1 || before.slice(gate).includes(") : (")) bad.push(before.slice(-80));
  }
  return bad;
}

type Spec = readonly [number, number, number];
const cmpSpec = (x: Spec, y: Spec) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
/** نوعية المحدِّد — «تُحسب لا تُفترض» (قواعد الوضعين، البند ٤). */
function specificity(selector: string): Spec {
  let ids = 0;
  let classes = 0;
  let tags = 0;
  const rest = selector
    .replace(/:where\((?:[^()]|\([^()]*\))*\)/g, "")
    .replace(/:(?:not|is|has)\(((?:[^()]|\([^()]*\))*)\)/g, (_m, inner: string) => {
      const best = inner
        .split(",")
        .map((s) => specificity(s))
        .reduce<Spec>((a, b) => (cmpSpec(b, a) > 0 ? b : a), [0, 0, 0]);
      ids += best[0];
      classes += best[1];
      tags += best[2];
      return "";
    });
  ids += (rest.match(/#[\w-]+/g) ?? []).length;
  classes += (rest.match(/\.[\w-]+|\[[^\]]*\]|(?<!:):(?!:)[\w-]+/g) ?? []).length;
  tags += (rest.match(/(?:^|[\s>+~])[a-zA-Z][\w-]*|::[\w-]+/g) ?? []).length;
  return [ids, classes, tags];
}
const PAINT =
  /^(?:background(?:-color|-image)?|border(?:-(?:block|inline|top|right|bottom|left)(?:-(?:start|end))?)?(?:-(?:color|width|style))?|outline(?:-(?:color|width|style))?|box-shadow)$/;
const paints = (v: string) => !/^(?:transparent|none|0(?:px)?)$/i.test(v.trim());
const family = (p: string) => /^(?:background|border|outline|box-shadow)/.exec(p)?.[0] ?? p;
/**
 * مسارٌ يُرسم للغياب: قاعدةٌ تلوّن الشريط (خلفيةً أو حدًّا أو ظلًّا) وتصل نائب
 * الغياب الموسوم `data-absent`، ولا تغلبها قاعدة غيابٍ تُخفي الخاصية نفسها في
 * سياقها — بنوعيةٍ أعلى، أو مساويةٍ بعدها في الملف.
 */
function paintedAbsentTrack(css: string, cls = "nx-ana-region-bar"): string[] {
  type R = {
    sel: string;
    spec: Spec;
    ctx: string;
    order: number;
    absent: boolean;
    decls: [string, string][];
  };
  const rules: R[] = [];
  parse(css).walkRules((rule) => {
    const decls: [string, string][] = [];
    rule.walkDecls((d) => {
      if (PAINT.test(d.prop)) decls.push([d.prop, d.value]);
    });
    if (decls.length === 0) return;
    let ctx = "";
    let p = rule.parent;
    while (p && p.type !== "root") {
      if (p.type === "atrule") ctx = `@${(p as AtRule).name} ${(p as AtRule).params} ${ctx}`.trim();
      p = p.parent;
    }
    for (const sel of rule.selectors) {
      const s = subject(sel);
      if (!classRe(cls).test(s) || /:not\(\[data-absent\]\)/.test(s)) continue;
      const absent = /\[data-absent\]/.test(s);
      rules.push({
        sel: sel.trim(),
        spec: specificity(sel),
        ctx,
        order: rules.length,
        absent,
        decls,
      });
    }
  });
  const bad: string[] = [];
  for (const g of rules.filter((r) => !r.absent)) {
    for (const [prop, value] of g.decls) {
      if (!paints(value)) continue;
      const hidden = rules.some(
        (a) =>
          a.absent &&
          (a.ctx === "" || a.ctx === g.ctx) &&
          a.decls.some(([q, v]) => (q === prop || q === family(prop)) && !paints(v)) &&
          (cmpSpec(a.spec, g.spec) > 0 || (cmpSpec(a.spec, g.spec) === 0 && a.order > g.order)),
      );
      if (!hidden) bad.push(`${g.ctx ? `${g.ctx} ` : ""}${g.sel} { ${prop}: ${value} }`);
    }
  }
  return bad;
}

/** حضورٌ مدّعى: «على رأس العمل» عددٌ لا مصدر له — المسجَّل حرّاس المواقع. */
const onDutyClaims = (code: string) => code.match(/على رأس العمل/g) ?? [];
/**
 * المجموع الحيّ قبل وصول القراءة (بطاقة توزيع الأنواع): الانتظار لا يستثني
 * الخطأ، أو الحياة لا تشترط الوصول بلا خطأ، أو العدّ خارج فرع الحياة.
 */
function liveTotalUngated(body: string): string[] {
  const bad: string[] = [];
  if (!/const busy = (\w+)\.isPending && !\1\.isError;/.test(body)) bad.push("busy");
  if (!/const live = !busy && !(\w+)\.isError && liveOf\.\w+\(\1\.data\);/.test(body)) {
    bad.push("live");
  }
  const gate = body.indexOf("if (live) {");
  const block = gate === -1 ? "" : balanced(body, gate + "if (live) ".length);
  if (!block.includes("total = rows.length")) bad.push("total");
  return bad;
}
/**
 * عنوان بطاقةٍ يحمل عددًا بلا شرط «جاهزة»: `${…}` · `fmt…(` · `.length` في
 * `title` البطاقة (مباشرةً، أو عبر `const title` في دالّتها) — فيُقرأ «آخر ٠» عند السقوط.
 */
function countedTitles(code: string): string[] {
  const bad: string[] = [];
  const fns = functions(code);
  for (const m of code.matchAll(/<(?:OpsCard|AnaCard|Panel)\b/g)) {
    const t = code.indexOf("title={", idx(m));
    if (t === -1 || t - idx(m) > 300) continue;
    let expr = balanced(code, t + "title=".length);
    if (/^\{\s*title\s*\}$/.test(expr)) {
      const owner = fns.find((f) => f.start <= idx(m) && idx(m) < f.end);
      expr = /const title =([^;]+);/.exec(owner?.body ?? "")?.[1] ?? "";
    }
    if (/\$\{|\bfmt\w*\(|\.length\b/.test(expr) && !/=== "ready"/.test(expr)) {
      bad.push(expr.trim().slice(0, 80));
    }
  }
  return bad;
}
const readinessBox = (code: string) => code.match(/executive_readiness|الجاهزية التنفيذية/g) ?? [];

const hexColours = (code: string) => code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
/**
 * أسلوبٌ مضمّن بقيمةٍ نهائية (المادة ٣٣): كائن `style` فيه مفتاحٌ ليس متغيّرًا
 * (`--x`) — ولو جاور متغيّرًا. والكائن يُقرأ بقوسيه لا حتى أول `}`: قالبٌ داخله
 * (`${…}`) كان يُخرج الأسلوب متعدّد الأسطر من الفحص كلّه.
 */
function finalInline(code: string): string[] {
  const bad: string[] = [];
  for (const m of code.matchAll(/\bstyle=\{\{/g)) {
    const obj = balanced(code, idx(m) + "style={".length);
    const keys = [
      ...obj
        .slice(1, -1)
        .matchAll(/(?:^|[{,])\s*(?:\[\s*"([^"]*)"[^\]]*\]|"([^"]*)"|([A-Za-z_$][\w$]*))\s*:/g),
    ].map((k) => k[1] ?? k[2] ?? k[3]);
    if (keys.length === 0 || keys.some((k) => !k.startsWith("--"))) bad.push(obj);
  }
  return bad;
}
const deadFocus = (code: string) => code.match(/focus-visible:outline/g) ?? [];
/** هل القاعدة التي تسمّي المحدِّد داخل `@layer`؟ `null` حين لا توجد. */
function layered(css: string, selector: string): boolean | null {
  let found: boolean | null = null;
  postcss.parse(css).walkRules((rule) => {
    if (found !== null || !rule.selectors.some((s) => s.trim() === selector)) return;
    let p = rule.parent;
    found = false;
    while (p && p.type !== "root") {
      if (p.type === "atrule" && (p as AtRule).name === "layer") found = true;
      p = p.parent;
    }
  });
  return found;
}
const regionPulse = (code: string) => code.match(/<RegionPulseMap\b|\/RegionPulseMap"/g) ?? [];
/** اسم منطقةٍ مكتوب — نصًّا أو JSX أو قالبًا؛ المرجع الوحيد `regions.ts` (§3.6). */
const regionNames = (code: string) => code.match(/الوسطى|الغربية|الشرقية|الجنوبية/g) ?? [];

/**
 * ترتيب الصفحة (المواصفة §4.0): العنوان ← المؤشرات ← الصدر (الخريطة ثم سَدِيد)
 * ← التشغيل ← التحليلات ← الخاتمة (متى وُجدت) ← الإفصاح. يعيد الغائب والمكرَّر
 * وما خرج عن موضعه، والصدر إن لم يضمّ بطاقتيه.
 */
function pageOrder(page: string, withClosing: boolean): string[] {
  const steps = [
    "<h1",
    "<HomeKpiRow",
    "nx-home-hero",
    "<HomeMapCard",
    "<HomeSadeedCard",
    "<HomeOpsRow",
    "<HomeAnalyticsRow",
    ...(withClosing ? ["<HomeClosingBand"] : []),
    "<footer",
  ];
  const bad: string[] = [];
  let last = -1;
  for (const s of steps) {
    const at = page.indexOf(s);
    if (at === -1) {
      bad.push(`غائب: ${s}`);
      continue;
    }
    if (page.indexOf(s, at + s.length) !== -1) bad.push(`مكرَّر: ${s}`);
    if (at < last) bad.push(`خارج موضعه: ${s}`);
    last = Math.max(last, at);
  }
  // الخريطة وسَدِيد داخل حاوية الصدر، والتشغيل بعد إغلاقها.
  const hero = page.indexOf("nx-home-hero");
  const close = hero === -1 ? -1 : page.indexOf("</div>", hero);
  const sadeed = page.indexOf("<HomeSadeedCard");
  if (!(sadeed !== -1 && sadeed < close && close < page.indexOf("<HomeOpsRow"))) bad.push("الصدر");
  return bad;
}
/** سطوحٌ حُذفت (المواصفة §2 · ٢٠٢٦/١٠/١٧) — لا تعود باسمها. */
const removedSurfaces = (code: string) =>
  code.match(/\bHomeOperations\b|\bSadeedQuickAsk\b|nx-home-triad|nx-risk-heading/g) ?? [];

/** كل حجمٍ مصرَّح لصنفٍ هو موضوع القاعدة (ومنه داخل الاستعلامات) — غير البكسل `NaN`. */
function fontSizes(css: string, cls: string): number[] {
  const out: number[] = [];
  parse(css).walkRules((rule) => {
    if (!rule.selectors.some((s) => classRe(cls).test(subject(s)))) return;
    rule.walkDecls("font-size", (d) => {
      const m = /^([\d.]+)px$/.exec(d.value.trim());
      out.push(m ? Number(m[1]) : Number.NaN);
    });
  });
  return out;
}
/**
 * نصوص SVG بحجمها المرئي: الحجم المصرَّح × (عرض الرسم ÷ عرض viewBox). عرض
 * الرسم من أداة `size-N` (×4px)؛ وما لا يُعرف عرضه أو حجمه `NaN` — يفشل مغلقًا.
 */
function svgTexts(code: string, css: string): { cls: string; px: number }[] {
  const out: { cls: string; px: number }[] = [];
  for (const svg of code.matchAll(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/g)) {
    const vb = /viewBox="0 0 ([\d.]+) [\d.]+"/.exec(svg[1]);
    const size = /className="[^"]*\bsize-(\d+)\b/.exec(svg[1]);
    const scale = vb && size ? (Number(size[1]) * 4) / Number(vb[1]) : Number.NaN;
    for (const t of svg[2].matchAll(/<text\b[^>]*?className="([\w-]+)/g)) {
      const sizes = fontSizes(css, t[1]);
      out.push({ cls: t[1], px: sizes.length ? Math.min(...sizes) * scale : Number.NaN });
    }
  }
  return out;
}

/* ── المزروع أولًا (المادة ٣٠) ─────────────────────────────────────────── */

describe("كل فحصٍ يحمرّ على انتهاكه المزروع", () => {
  it("الوجهة الميتة: غير موجودة · محجوبة · «قريباً» — والمحسوبة", () => {
    expect(deadDestinations('<Link to="/people" /> { to: "/mission-control" } to="/team"')).toEqual(
      ["/people", "/mission-control", "/team"],
    );
    expect(computedDestinations("<Link to={`/sec/${id}`} />")).toHaveLength(1);
    expect(computedDestinations('<Link to={"/sec/" + id} /> { to: `/x` }')).toHaveLength(2);
    expect(computedDestinations("<Link to={k.to} /> <Link to={to} />")).toEqual([]);
  });

  it("الصفر بدل الغياب — على أي قراءة", () => {
    expect(zeroForAbsence("value: counts?.incidents_open ?? 0")).toHaveLength(1);
    expect(zeroForAbsence("k?.cctv_health ?? 0, (x || 0)")).toHaveLength(2);
    expect(zeroForAbsence("Math.max(0, n) ?? null")).toEqual([]);
    const planted = plant(
      src("HomeDashboard.tsx"),
      "value: counts ? counts.incidents_open : null,",
      "value: counts?.incidents_open ?? 0,",
    );
    expect(zeroForAbsence(planted)).toHaveLength(1);
  });

  it("السلسلة المختلقة: زينةٌ مرجعية فوق رقمٍ حيّ، وسهمٌ بلا اتجاه تغيّر", () => {
    expect(liveDecorations("function K(){ const change = ref.change; }")).toHaveLength(1);
    expect(
      liveDecorations("function K(){ const c = chosen.change; const s = chosen.series; }"),
    ).toEqual([]);
    const ops =
      'function C(){ if (mode === "live") { const a = ref.total.change; } else if (mode === "reference") { const b = ref.total.change; } }';
    expect(liveDecorations(ops)).toHaveLength(1);
    const bubbles = (flag: string) =>
      `function M(){ return R.map((r) => ({ value: r.value, change: r.change, simulated: ${flag} })); }`;
    expect(liveDecorations(bubbles("false"))).toHaveLength(1);
    expect(liveDecorations(bubbles("HOME_REFERENCE.map.is_simulation"))).toEqual([]);
    expect(
      liveDecorations('function C(){ const s = ref.series; return <AnaCard sim="all" />; }'),
    ).toEqual([]);
    expect(
      liveDecorations(
        'function C(){ const l = liveOf.sec(d); const s = ref.series; return <AnaCard sim="all" />; }',
      ),
    ).toHaveLength(1);
    // والمصدر الحقيقي: المؤشر يأخذ تغيّره من المرجع لا من `chooseLive` ⇐ أحمر.
    const planted = plant(
      src("HomeDashboard.tsx"),
      "const change = chosen.change;",
      "const change = ref.change;",
    );
    expect(liveDecorations(planted)).toHaveLength(1);
    expect(freeArrows('<ArrowUp aria-hidden />{"4%"} <TrendingUp />')).toBe(2);
    expect(
      freeArrows('{c.dir === "up" ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />}'),
    ).toBe(0);
    expect(freeArrows('const A = change.dir === "up" ? ArrowUp : ArrowDown;')).toBe(0);
  });

  it("الصورة من خارج بيانها، والبطاقة المصوّرة بلا وسمها، والفيديو", () => {
    expect(videos("<video muted />")).toHaveLength(1);
    expect(unmanifestedImages('<img src="/a.png" alt="" />')).not.toEqual([]);
    const fromManifest =
      "const img = HOME_IMAGES[k]; <img src={img.src} width={img.width} height={img.height} alt={img.alt} loading={img.loading} />";
    expect(unmanifestedImages(fromManifest)).toEqual([]);
    const ops = src("HomeOpsRow.tsx");
    expect(unmanifestedImages(plant(ops, "src={img.src}", 'src="/home/x.webp"'))).toHaveLength(1);
    const cams = plant(fnBody(ops, "CameraTilesCard"), "caption={ILLUSTRATIVE_LABEL}", "");
    expect(illustratedCards(cams)).toEqual([{ name: "CameraTilesCard", labelled: false }]);
  });

  it("الامتثال: الصفر غيابًا، والشريط بلا قياس، والمسار المرسوم للغياب", () => {
    for (const bad of [
      "compliance_pct > 0",
      "compliance_pct ?? 0",
      "row.compliance_pct ? a : b",
      "!row.compliance_pct",
      "row.compliance_pct && bar",
    ]) {
      expect(complianceAsAbsence(bad), bad).toHaveLength(1);
    }
    expect(
      complianceAsAbsence("row && row.compliance_pct !== null ? row.compliance_pct : null"),
    ).toEqual([]);
    const zeroIsAbsent = plant(
      src("HomeDashboard.tsx"),
      "if (r.compliance_pct !== null)",
      "if (r.compliance_pct > 0)",
    );
    expect(complianceAsAbsence(zeroIsAbsent)).toHaveLength(1);
    // الشريط: الشكلان القديم والجديد سليمان، والامتلاء بلا شرطٍ أو في فرع الغياب أحمر.
    const fill = 'style={{ ["--bar-pct" as string]: x }}';
    expect(barWithoutMeasure(`{pct !== null && (<span><span ${fill} /></span>)}`)).toEqual([]);
    expect(
      barWithoutMeasure(`{v !== null ? (<span ${fill} />) : (<span data-absent="" />)}`),
    ).toEqual([]);
    expect(barWithoutMeasure(`<span ${fill} />`)).toHaveLength(1);
    expect(barWithoutMeasure(`{v !== null ? (<span />) : (<span ${fill} />)}`)).toHaveLength(1);
    const ungated = plant(
      src("HomeAnalyticsRow.tsx"),
      "{value !== null ? (",
      "{value === value ? (",
    );
    expect(barWithoutMeasure(ungated)).toHaveLength(1);
    // نائب الغياب: يُرسم مسارًا إن غلبت قاعدةٌ ملوِّنة قاعدةَ إخفائه.
    const base =
      ".nx-ana-region-bar { background: var(--a); } .nx-ana-region-bar[data-absent] { background: transparent; }";
    expect(paintedAbsentTrack(base)).toEqual([]);
    expect(paintedAbsentTrack(".nx-ana-region-bar { background: var(--a); }")).toHaveLength(1);
    expect(
      paintedAbsentTrack(`${base} .dark .nx-ana-region-bar { background: var(--b); }`),
    ).toHaveLength(1);
    expect(
      paintedAbsentTrack(
        `${base} .dark .nx-ana-region-bar:not([data-absent]) { background: var(--b); }`,
      ),
    ).toEqual([]);
    expect(
      paintedAbsentTrack(
        `${base} .dark .nx-ana-region-bar { background: var(--b); } .dark .nx-ana-region-bar[data-absent] { background: transparent; }`,
      ),
    ).toEqual([]);
    expect(
      paintedAbsentTrack(
        `${base} @media (forced-colors: active) { .nx-ana-region-bar { border: 1px solid CanvasText; } }`,
      ),
    ).toHaveLength(1);
    // والملف الحقيقي: قاعدتاه الملوِّنتان مقصورتان على المقيس (`:not([data-absent])`)،
    // ونزعُ القصر عن إحداهما يُحمّره — زرعٌ في الملف نفسه لا في مثالٍ مكتوب.
    const unscopedDark = plant(
      HOME_CSS,
      ".dark .nx-ana-region-bar:not([data-absent]) {",
      ".dark .nx-ana-region-bar {",
    );
    expect(paintedAbsentTrack(unscopedDark)).toHaveLength(1);
  });

  it("الحالات الثلاث: الانتظار قبل الخطأ، والفراغ خارج الحياة، والخطأ بلا إعادة", () => {
    expect(
      pendingBeforeError(
        'function m(q){ if (q.isPending) return "l"; if (q.isError) return "e"; }',
      ),
    ).toHaveLength(1);
    expect(pendingBeforeError("const busy = sec.isPending;")).toHaveLength(1);
    expect(
      pendingBeforeError('h.isPending ? "checking" : h.isError ? "unknown" : "ready"'),
    ).toHaveLength(1);
    expect(
      pendingBeforeError(
        'const busy = s.isPending && !s.isError; q.isError ? "e" : q.isPending ? "l" : "r"; statusOf({ isPending: a.isPending || b.isPending, isError: a.isError || b.isError })',
      ),
    ).toEqual([]);
    const swapped = plant(
      src("HomeOpsRow.tsx"),
      'if (q.isError) return "reference";\n  if (q.isPending) return "loading";',
      'if (q.isPending) return "loading";\n  if (q.isError) return "reference";',
    );
    expect(pendingBeforeError(swapped)).toHaveLength(1);

    const old = `{sec.isPending ? (\n <Loading ar={ar} />\n ) : rows.length === 0 ? (\n <Empty>x</Empty>`;
    const good = "function PanelBody(){ if (q.isError) if (q.isPending) if (isEmpty) }";
    const swappedBody = "function PanelBody(){ if (q.isPending) if (q.isError) if (isEmpty) }";
    expect(emptyBeforeError(old + good)).toEqual(["sec"]);
    expect(emptyBeforeError(swappedBody)).toEqual(["PanelBody"]);
    expect(
      emptyBeforeError(
        'function C(){ if (mode === "reference") { b = <EmptyLive>x</EmptyLive>; } }',
      ),
    ).toEqual(["C: EmptyLive"]);
    expect(
      emptyBeforeError(
        'function C(){ return busy ? (<Wait />) : total === 0 ? (\n<p className="nx-ana-empty">x</p>) : null; }',
      ),
    ).toEqual(["C: nx-ana-empty"]);
    const emptyOnError = plant(
      src("HomeOpsRow.tsx"),
      '} else if (mode === "live") {',
      '} else if (mode === "reference") {',
    );
    expect(emptyBeforeError(emptyOnError)).toEqual(["TopRisksCard: EmptyLive"]);

    expect(retryGaps("<OpsCard failed={sec.isError} onRetry={() => undefined} />")).toHaveLength(1);
    expect(
      retryGaps(
        "<AnaCard failed={a.isError || b.isError} onRetry={() => { void a.refetch(); }} />",
      ),
    ).toHaveLength(1);
    expect(retryGaps("<AnaCard failed={false} onRetry={() => undefined} />")).toEqual([]);
    const wrongRead = plant(
      src("HomeOpsRow.tsx"),
      "onRetry={() => void risk.refetch()}",
      "onRetry={() => void sec.refetch()}",
    );
    expect(retryGaps(wrongRead)).toHaveLength(1);
    expect(alertsWithoutRetry('<div role="alert"><span>تعذّر</span></div>')).toHaveLength(1);
    const noButton = plant(
      src("HomeOpsRow.tsx"),
      '<button type="button" onClick={onRetry} className="nx-home-retry nx-ops-retry">',
      "<span>",
    );
    expect(alertsWithoutRetry(noButton)).toHaveLength(1);
    expect(
      mapRetryGaps(
        "statusOf(sec) statusOf(execKpis) <ArabianPeninsulaMap onRetry={() => { void sec.refetch(); }} />",
      ),
    ).toEqual(["execKpis"]);
    const mapNoExec = plant(src("HomeMapCard.tsx"), "void execKpis.refetch();", "");
    expect(mapRetryGaps(mapNoExec)).toEqual(["execKpis"]);
    expect(unretriedKpiReads("status: statusOf(maint),", CODE)).toEqual(["maint"]);
    expect(unretriedKpiReads("status: statusOf(sec),", CODE)).toEqual([]);
  });

  it("العنوان المعدود قبل القراءة، والمجموع الحيّ بلا شرطه", () => {
    const gated =
      '<Panel id="c" title={statusOf(sec) === "ready" ? `فئات (${fmtNum(rows.length, ar)})` : "فئات"} />';
    expect(countedTitles(gated)).toEqual([]);
    expect(
      countedTitles('<Panel id="c" title={`آخر ${fmtNum(rows.length, ar)} بلاغًا`} />'),
    ).toHaveLength(1);
    expect(
      countedTitles(
        'function C(){ const title = `أنواع (${fmt(total)})`; return <AnaCard id="t" title={title} />; }',
      ),
    ).toHaveLength(1);
    const types = fnBody(src("HomeAnalyticsRow.tsx"), "IncidentTypesCard");
    expect(
      liveTotalUngated(
        plant(
          types,
          "const live = !busy && !sec.isError && liveOf.secIncidents(sec.data);",
          "const live = liveOf.secIncidents(sec.data);",
        ),
      ),
    ).toEqual(["live"]);
    expect(
      liveTotalUngated(
        plant(types, "const busy = sec.isPending && !sec.isError;", "const busy = sec.isPending;"),
      ),
    ).toEqual(["busy"]);
  });

  it("اسم المنطقة المكتوب، والخريطة القديمة، والحضور المدّعى، والسطوح المحذوفة", () => {
    expect(regionNames('"الوسطى" <span>المنطقة الشرقية</span> `الغربية` الجنوبية')).toHaveLength(4);
    expect(
      regionPulse('<RegionPulseMap /> import { X } from "@/components/map/RegionPulseMap";'),
    ).toHaveLength(2);
    expect(onDutyClaims("الحرّاس على رأس العمل")).toHaveLength(1);
    expect(readinessBox("executive_readiness · الجاهزية التنفيذية")).toHaveLength(2);
    expect(deadFocus('className="focus-visible:outline-2"')).toHaveLength(1);
    expect(
      removedSurfaces("<HomeOperations /> <SadeedQuickAsk /> nx-home-triad nx-risk-heading"),
    ).toHaveLength(4);
  });

  it("اللون النهائي والأسلوب النهائي", () => {
    expect(hexColours('className="text-[#22d3ee]"')).toHaveLength(1);
    expect(finalInline('style={{ color: "red" }}')).toHaveLength(1);
    expect(finalInline('style={{ ["--x" as string]: "red" }}')).toHaveLength(0);
    expect(finalInline('style={{ ["--x" as string]: 1, color: "red" }}')).toHaveLength(1);
    // متعدّد الأسطر بقالبٍ داخله — كان يفلت من الفحص كلّه.
    expect(finalInline("style={{\n  width: `${n}%`,\n}}")).toHaveLength(1);
    expect(finalInline('style={{\n  ["--bar-pct" as string]: `${n}%`,\n}}')).toHaveLength(0);
  });

  it("ترتيب الصفحة: الغائب والمكرَّر وما خرج عن موضعه", () => {
    const page = (closing: string) =>
      `<h1 /> <HomeKpiRow /> <div className="nx-home-hero"> <HomeMapCard /> <HomeSadeedCard /> </div> <HomeOpsRow /> <HomeAnalyticsRow /> ${closing} <footer />`;
    expect(pageOrder(page(""), false)).toEqual([]);
    expect(pageOrder(page("<HomeClosingBand />"), true)).toEqual([]);
    expect(pageOrder(page(""), true)).toEqual(["غائب: <HomeClosingBand"]);
    const swapped = plant(
      plant(PAGE_CODE, "<HomeOpsRow />", "@@"),
      "<HomeAnalyticsRow />",
      "<HomeOpsRow />",
    ).replace("@@", "<HomeAnalyticsRow />");
    expect(pageOrder(swapped, HAS_CLOSING)).toContain("خارج موضعه: <HomeAnalyticsRow");
    const sadeedOut = plant(PAGE_CODE, "<HomeSadeedCard />", "").replace(
      "<HomeOpsRow />",
      "<HomeSadeedCard />\n<HomeOpsRow />",
    );
    expect(pageOrder(sadeedOut, HAS_CLOSING)).toContain("الصدر");
    expect(pageOrder(`${PAGE_CODE}\n<HomeKpiRow />`, HAS_CLOSING)).toContain("مكرَّر: <HomeKpiRow");
  });
});

/* ── ثم المصدر الحقيقي ─────────────────────────────────────────────────── */

describe("كل أيقونة ومؤشر ولوحة يفتح شاشةً حيّة", () => {
  it("تسع وجهات مختلفة على الأقل — كلها حيّة", () => {
    // المؤشرات السبعة بسبع وجهات؛ والخريطة تضيف المرافق ونقاط الدخول والمخطط
    // الصناعي والخريطة التنفيذية والأمن الصناعي، والتحليلات مركز التكاملات؛
    // والتشغيل وسَدِيد والخاتمة تشارك غيرها وجهاتها.
    expect(destinations(CODE).length).toBeGreaterThanOrEqual(9);
    expect(deadDestinations(CODE)).toEqual([]);
    expect(computedDestinations(CODE)).toEqual([]);
    // ولكل صفٍّ يرسم روابط وجهةٌ مقيسة — لا صفّ يفلت من الفحص (المادة ٣٠).
    for (const f of [
      "HomeDashboard.tsx",
      "HomeMapCard.tsx",
      "HomeSadeedCard.tsx",
      "HomeOpsRow.tsx",
      "HomeAnalyticsRow.tsx",
      ...(HAS_CLOSING ? ["HomeClosingBand.tsx"] : []),
    ]) {
      expect(destinations(src(f)).length, f).toBeGreaterThan(0);
    }
    // وسجلّ المؤشرات وحده سبع وجهاتٍ مختلفة — مؤشرٌ بلا وجهته أيقونةٌ ميتة.
    expect(new Set(destinations(kpiRegistry(src("HomeDashboard.tsx")))).size).toBe(7);
  });
});

describe("الحالات الثلاث — المادة ١٤", () => {
  it("الخطأ قبل التحميل قبل الفراغ، ومعه إعادة المحاولة", () => {
    // مواضع الانتظار والفراغ موجودةٌ فعلًا قبل أن يُحكم عليها (المادة ٣٠).
    expect((CODE.match(/\b\w+\.isPending\b/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect(pendingBeforeError(CODE)).toEqual([]);
    expect((CODE.match(/<EmptyLive\b/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((CODE.match(/className="nx-ana-empty"/g) ?? []).length).toBeGreaterThan(0);
    expect(emptyBeforeError(CODE)).toEqual([]);
    // كان: `<PanelBody` ≥ ٥ — كل لوحة تمرّ بالتفرّع الواحد. **مُعلَّق بقرار
    // المالك N2** (٢٠٢٦/١٠/١٤) والطبقة ٤ «بيانات لا تفرغ»: الخطأ لم يعد لوحةً
    // فارغة بزرّ، بل المرجعُ الموسوم «محاكاة» ومعه تنبيهٌ وإعادة — في بطاقتي
    // الصفوف (`OpsCard` بـ`modeOf` · `AnaCard`)، ولا صفّ يركّب `PanelBody` بعد.
    // فالبديل: كل بطاقةٍ تقرأ تُعلن خطأ قراءتها، وتعيد طلبها هي، بزرٍّ وكلمة.
    const failing = CODE.match(/\bfailed=\{(?!false\})/g) ?? [];
    expect(failing.length).toBeGreaterThanOrEqual(7);
    expect(retryGaps(CODE)).toEqual([]);
    // الخريطة: حالها من قراءتين وإحصاءاتها من ثالثة — وإعادتها تطلبها كلّها.
    expect(src("HomeMapCard.tsx")).toMatch(/<ArabianPeninsulaMap[\s\S]*?onRetry=\{/);
    expect((src("HomeMapCard.tsx").match(/statusOf\(/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(mapRetryGaps(src("HomeMapCard.tsx"))).toEqual([]);
    const alerts = CODE.match(/role="alert"/g) ?? [];
    expect(alerts.length).toBeGreaterThanOrEqual(3);
    expect(alertsWithoutRetry(CODE)).toEqual([]);
    // والمؤشر بطاقةٌ-رابط لا تحمل زرًّا: كل قراءةٍ يحسم بها مؤشرٌ حاله تُعاد من
    // تنبيهٍ ظاهر في الصفحة نفسها (المفاتيح مشتركة — `home-reads.ts`).
    const registry = kpiRegistry(src("HomeDashboard.tsx"));
    expect(registry.match(/status: statusOf\(\w+\)/g) ?? []).toHaveLength(7);
    expect(unretriedKpiReads(registry, CODE)).toEqual([]);
  });

  it("المؤشر يفصل التحميل والخطأ عن «لم يُقَس»", () => {
    // حال القراءة ودالّتها في اللبنات المشتركة منذ «الأساس» (٢٠٢٦/١٠/١٣): الخطأ
    // يُحسم قبل الانتظار، فلا يُقرأ تعذّرٌ تحميلًا لا ينتهي.
    const primitives = src("home-primitives.tsx");
    expect(primitives).toMatch(/type ReadStatus = "loading" \| "error" \| "ready"/);
    expect(primitives).toMatch(/q\.isError \? "error" : q\.isPending \? "loading" : "ready"/);
    const kpi = src("HomeDashboard.tsx");
    expect(kpi).toMatch(
      /import \{[^}]*\bstatusOf\b[^}]*\} from "@\/components\/home\/home-primitives"/,
    );
    expect(kpi).toContain("تعذّر التحميل");
    // كل مؤشر يحمل حال قراءته — لا مؤشر يُقرأ «لم يُقَس» وهو ينتظر.
    const registry = kpiRegistry(kpi);
    expect(registry.match(/\bid: "/g)?.length).toBe(7);
    expect(registry.match(/status: statusOf\(/g)?.length).toBe(7);
    // والحيّ لا يبلغ `chooseLive` إلا من قراءةٍ جاهزة (N2): الانتظار هيكلٌ بلا رقم،
    // والخطأ مرجعٌ موسوم يُقال سببه — لا رقمٌ حيّ من أيٍّ منهما.
    expect(kpi).toMatch(
      /chooseLive\(\s*k\.status === "ready" \? k\.value : null,\s*k\.status === "ready" && k\.live,/,
    );
    expect(kpi).toMatch(/\{loading \? \(\s*<span aria-hidden className="nx-home-skeleton/);
  });
});

describe("الصدق العددي — المادة ٢٧", () => {
  it("لا صفر بدل الغياب", () => {
    expect(zeroForAbsence(CODE)).toEqual([]);
  });

  // كان: «ولا سلسلة مختلقة» — كلمات `sparkline|delta|trend` محظورة (D2: لا تاريخ
  // مقيس لأي مؤشر). **نسخه قرار المالك N2** (٢٠٢٦/١٠/١٤ «محاكاة موسومة
  // مطابقة»): كل سهمٍ ومنحنى رسمته الصورة يُعرض من المرجع تحت شارة «محاكاة».
  // فالحظر اللفظي معلَّق، وبديله ما بقي من القاعدة: لا زينة مرجعية فوق رقمٍ حيّ،
  // ولا سهم لا يُشتقّ من تغيّر، ولا رقمٌ مرجعي بلا شارة.
  it("ولا سلسلة مختلقة: لا تغيّرٌ ولا منحنًى مرجعيّ فوق رقمٍ حيّ (N2)", () => {
    const reads = COMPONENTS.flatMap(([f, c]) => decorationReads(c).map(() => f));
    expect(reads.length).toBeGreaterThanOrEqual(5);
    for (const [f, c] of COMPONENTS) expect(liveDecorations(c), f).toEqual([]);
    // أسهم التغيّر مرسومةٌ فعلًا (المؤشرات · المناطق · الدوريات) قبل الحكم عليها.
    expect((CODE.match(/\.dir === "up"\s*\?\s*<?ArrowUp\b/g) ?? []).length).toBeGreaterThanOrEqual(
      3,
    );
    expect(freeArrows(CODE)).toBe(0);
    // «ولا رقمٌ مرجعي بلا شارة»: الشارة تُرسم لا تُستورد — سطر الاستيراد وحده
    // كان يُخضِر الفحص ولو حُذف الرسم (tsc وeslint لا يريان الاستيراد الميّت هنا).
    for (const f of ["HomeDashboard.tsx", "HomeOpsRow.tsx", "HomeAnalyticsRow.tsx"]) {
      expect(badgeUses(src(f)), f).toBeGreaterThan(0);
    }
    // والرسم نفسه لا التصريح: شارة المؤشر ابنُ JSX (`>{badge}<`)، وكلمة الخريطة
    // كذلك — التصريح وتمرير الخاصيّة (`simWord={simWord}`) لا يرسمان شيئًا.
    expect(src("HomeDashboard.tsx")).toMatch(/const badge = ar \? SIMULATION_BADGE_AR\b/);
    expect(jsxChild(src("HomeDashboard.tsx"), "badge")).toBeGreaterThan(0);
    expect(MAP).toMatch(/const simWord = ar \? "مرجعي" : "Reference";/);
    expect(jsxChild(MAP, "simWord")).toBeGreaterThan(0);
  });

  it("والفحص يحمرّ حين يبقى الاستيراد ويُحذف الرسم (المادة ٣٠)", () => {
    const ops = plant(src("HomeOpsRow.tsx"), '{ar ? SIMULATION_BADGE_AR : "Reference"}', "{null}");
    expect(badgeUses(ops)).toBe(0);
    const kpi = plant(
      src("HomeDashboard.tsx"),
      'const badge = ar ? SIMULATION_BADGE_AR : "Reference";',
      'const badge = "";',
    );
    expect(badgeUses(kpi)).toBe(0);
    // وحذفُ الشارة المرسومة مع بقاء تصريحها، أو حذفُ كلمة الخريطة مع بقاء تمريرها.
    const chipless = plant(
      src("HomeDashboard.tsx"),
      `{!loading && simulated && (\n        <span aria-hidden className="nx-home-kpi-sim">\n          {badge}\n        </span>\n      )}`,
      "",
    );
    expect(badgeUses(chipless)).toBeGreaterThan(0);
    expect(jsxChild(chipless, "badge")).toBe(0);
    const bubbleless = plant(
      MAP,
      `{bubble.simulated && (\n        <span aria-hidden className="nx-arabia-sim">\n          {simWord}\n        </span>\n      )}`,
      "",
    );
    expect(jsxChild(bubbleless, "simWord")).toBe(0);
  });

  // كان: «ولا صورة كاميرا» — `<img>`/`<video>` محظوران (D3: بطاقات حالة بلا صور).
  // **نسخه قرار المالك N3** (٢٠٢٦/١٠/١٤ «صور توضيحية موسومة»). فحظر `<img>`
  // معلَّق، وبديله: كل صورةٍ من بيانها وحده بأبعادها ونصّها البديل وكسلها،
  // والوسم «صورة توضيحية — لا بثّ مرتبط» ظاهرٌ على بطاقتها، والفيديو باقٍ محظورًا
  // في الصفوف (الفيلم خلف التصميم وحده، D6).
  it("الشخصية صورة الشات بوت نفسها — ثابتٌ واحد بأبعاد الملف الحقيقية (أمر المالك ٢٠٢٦/١٠/١٨)", () => {
    // «قم بتعديل الصوره لسديد بنفس الصورة الموجودة فالشات بوت» — لا قصّةٌ مشتقّة ولا نسخةٌ منسوخة.
    const manifest = src("home-images.ts");
    const bound = (code: string) =>
      /\bpersona:\s*\{[^}]*\bsrc:\s*SADEED_PORTRAIT_SRC\s*,/.test(code);
    const sized = (code: string) =>
      /\bpersona:\s*\{[^}]*\bwidth:\s*SADEED_PORTRAIT_SIZE\.width\s*,\s*height:\s*SADEED_PORTRAIT_SIZE\.height\b/.test(
        code,
      );
    expect(HOME_IMAGES.persona.src).toBe(SADEED_PORTRAIT_SRC);
    expect(bound(manifest), "الشخصية بنصٍّ منسوخ لا بالثابت المشترك").toBe(true);
    expect(sized(manifest), "الشخصية بأبعادٍ مرسومة لا بأبعاد الملف").toBe(true);
    expect(webpDims(readFileSync(`public${SADEED_PORTRAIT_SRC}`))).toEqual({
      ...SADEED_PORTRAIT_SIZE,
    });
    expect(
      readdirSync("public/home").filter((f) => /^persona/i.test(f)),
      "قصّةٌ مشتقّة",
    ).toEqual([]);
    // يحمرّ على المزروع (المادة ٣٠): نصٌّ منسوخ، وقصّةٌ مشتقّة، وعرضٌ مرسوم.
    const literal = manifest.replace(/src:\s*SADEED_PORTRAIT_SRC/, 'src: "/sadeed-portrait.webp"');
    expect(literal).not.toBe(manifest);
    expect(bound(literal)).toBe(false);
    expect(
      bound(manifest.replace(/src:\s*SADEED_PORTRAIT_SRC/, 'src: "/home/persona-sadeed-294.webp"')),
    ).toBe(false);
    expect(sized(manifest.replace(/width:\s*SADEED_PORTRAIT_SIZE\.width/, "width: 147"))).toBe(
      false,
    );
  });

  it("ولا صورة كاميرا: الصور توضيحيةٌ موسومة من بيانها، ولا فيديو (N3)", () => {
    // صفّ الهوية مستثنًى بنصّ قرار المالك (المواصفة ١٠ §2.3: B2 «As is» وB3
    // «Water motion»): لوحتاه علامة المالك كما هي لا صورٌ توضيحية، وحلقة الماء
    // فيلمٌ صامت فوقهما — ولهما حارسهما (`home-brand.contract.test.ts`). والاستثناء
    // محصورٌ عددًا: صورةٌ وفيلمٌ واحدان في مكوّن اللوحة، وما عداه تحت N3 كاملًا.
    const BRAND = "HomeBrandRow.tsx";
    expect((src(BRAND).match(/<img\b/g) ?? []).length).toBe(1);
    expect(videos(src(BRAND))).toHaveLength(1);
    const CODE = Object.entries(SOURCES)
      .filter(([f]) => f !== BRAND)
      .map(([, c]) => c)
      .join("\n");
    expect(videos(CODE)).toEqual([]);
    expect((CODE.match(/<img\b/g) ?? []).length).toBeGreaterThan(0);
    expect(unmanifestedImages(CODE)).toEqual([]);
    const images = Object.entries(HOME_IMAGES);
    expect(images.length).toBeGreaterThan(0);
    for (const [key, img] of images) {
      expect(img.alt, key).toContain("صورة توضيحية");
      // الشخصية وحدها صورة الشات بوت نفسها (أمر المالك ٢٠٢٦/١٠/١٨، R2) — بالثابت المشترك.
      if (key === "persona") expect(img.src, key).toBe(SADEED_PORTRAIT_SRC);
      else expect(img.src, key).toMatch(/^\/home\/[\w-]+\.webp$/);
    }
    // صور اللقطات (كاميرا · خطر · حادث) تحمل الوسم كاملًا، وهي تحت الطيّ فكسولة.
    const shots = images.filter(([key]) => /^(?:cam|risk|incident)-/.test(key));
    expect(shots.length).toBeGreaterThan(0);
    for (const [key, img] of shots) {
      expect(img.alt, key).toContain(ILLUSTRATIVE_LABEL);
      expect(img.loading, key).toBe("lazy");
    }
    expect(ILLUSTRATIVE_LABEL).toContain("لا بثّ مرتبط");
    const cards = illustratedCards(CODE);
    expect(cards.length).toBeGreaterThanOrEqual(4);
    expect(cards.filter((c) => !c.labelled).map((c) => c.name)).toEqual([]);
    // بطاقة الكاميرات تُبقي الوسم ظاهرًا في كل حال — تحميلًا وخطأً وحياةً.
    const ops = src("HomeOpsRow.tsx");
    expect(fnBody(ops, "CameraTilesCard")).toMatch(/caption=\{ILLUSTRATIVE_LABEL\}/);
    expect(ops).toMatch(/\{caption && <p className="nx-ops-caption">\{caption\}<\/p>\}/);
  });

  it("الامتثال: الصفر قياسٌ لا غياب، ولا شريط بلا قياس", () => {
    expect(complianceAsAbsence(CODE)).toEqual([]);
    // كل صفٍّ يقرأ نسبة الامتثال يحسم غيابها بـ`!== null` لا `> 0`: متوسط
    // المؤشر، والخريطة، وأداء المناطق.
    const readers = Object.entries(SOURCES).filter(([, c]) => c.includes("compliance_pct"));
    expect(readers.map(([f]) => f)).toEqual(
      expect.arrayContaining(["HomeDashboard.tsx", "HomeMapCard.tsx", "HomeAnalyticsRow.tsx"]),
    );
    for (const [f, c] of readers) expect(c, f).toMatch(/compliance_pct !== null/);
    // كان: `{pct !== null && (` في لوحة «الامتثال حسب المنطقة» المحذوفة؛ وموضع
    // القاعدة اليوم أعمدة «أداء المناطق»: الامتلاء في الفرع المقيس وحده، وفرع
    // الغياب نائبٌ موسوم `data-absent` بلا امتلاء.
    expect((CODE.match(/--bar-pct/g) ?? []).length).toBeGreaterThan(0);
    expect(barWithoutMeasure(CODE)).toEqual([]);
    expect(src("HomeAnalyticsRow.tsx")).toMatch(
      /\) : \(\s*<span aria-hidden className="nx-ana-region-bar" data-absent="" \/>/,
    );
  });

  it("ولا مسارَ فارغًا للغياب في أي وضع — الداكن والألوان القسرية", () => {
    // نائب الغياب شفّافٌ بقاعدته؛ وأي قاعدةٍ تلوّن الشريط وتصله وتغلب قاعدة
    // إخفائه ترسم للغياب مسارًا فارغًا يُقرأ صفرًا (المادة ٢٧) — والوضع الثاني
    // سطح صحّةٍ لا قشرة، ونوعية المحدِّد تُحسب لا تُفترض (قواعد الوضعين، ٤).
    // والموضوع موجودٌ قبل الحكم: الشريط ملوَّنٌ بقاعدته، ونائب الغياب شفّافٌ بقاعدته.
    expect(HOME_CSS).toMatch(/\.nx-ana-region-bar\s*\{[^}]*\bbackground:/);
    expect(HOME_CSS).toMatch(
      /\.nx-ana-region-bar\[data-absent\]\s*\{[^}]*background:\s*transparent/,
    );
    expect(paintedAbsentTrack(HOME_CSS)).toEqual([]);
  });

  it("المصدر المكتوب يطابق ما يُعدّ", () => {
    // `assets_offline` يعدّ `offline || degraded` — يُقرأ من العدّاد نفسه لا من تعليق.
    expect(src("HomeDashboard.tsx")).toContain("أصول حالتها غير متصلة أو متدهورة");
    expect(read("src/lib/sec.functions.ts")).toMatch(
      /assets_offline:\s*\w+\.filter\(\s*\(\w+\) => \w+\.status === "offline" \|\| \w+\.status === "degraded",?\s*\)/,
    );
    // والاسم الحيّ للأفراد انتقل إلى المرجع (`liveLabelAr`، N2) ويقرؤه المؤشر
    // بـ`labelOf`: حرّاسٌ مسجَّلون على المواقع (`guards_count`) — لا حضورٌ فعلي.
    expect(refKpi("guards").liveLabelAr).toBe("حرّاس المواقع");
    expect(refKpi("assets").liveLabelAr).toBe("أصول خارج الخدمة");
    expect(src("HomeDashboard.tsx")).toMatch(/labelOf\(ref, simulated\)/);
    expect(src("HomeDashboard.tsx")).toMatch(/\.guards_count\b/);
    expect(onDutyClaims(CODE)).toEqual([]);
  });

  it("عنوان فئات البلاغات لا يحمل عددًا قبل وصول القراءة", () => {
    // كان العنوان «فئات أحدث البلاغات (N)» مشروطًا بـ`statusOf(sec) === "ready"` في
    // اللوحة المحذوفة — عند السقوط كان يُقرأ «آخر ٠ بلاغًا»، صفرٌ هو غياب. وموضعه
    // اليوم بطاقة «توزيع أنواع الحوادث»: عنوانها نصٌّ ثابت، والعدد في قلب الحلقة
    // من قراءةٍ واصلةٍ حيّةٍ بلا خطأ — وإلا فالمرجع الموسوم «محاكاة».
    const types = fnBody(src("HomeAnalyticsRow.tsx"), "IncidentTypesCard");
    expect(types).toContain('id="nx-home-incident-types"');
    expect(liveTotalUngated(types)).toEqual([]);
    // ولا عنوان بطاقةٍ في الصفوف يُدرج عددًا بلا شرط «جاهزة».
    expect((CODE.match(/<(?:OpsCard|AnaCard|Panel)\b/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect(countedTitles(CODE)).toEqual([]);
  });

  it("«الجاهزية التنفيذية» لا تعود — حذف المالك صندوقها ٢٠٢٦/٠٨/٢٠", () => {
    expect(readinessBox(CODE)).toEqual([]);
  });
});

describe("طبقة الرموز — المواد ٣٣ و٣٤ وWCAG §1.4.11", () => {
  it("لا لون سداسي ولا أسلوب مضمّن بقيمة نهائية", () => {
    expect(hexColours(CODE)).toEqual([]);
    expect((CODE.match(/\bstyle=\{\{/g) ?? []).length).toBeGreaterThan(0);
    expect(finalInline(CODE)).toEqual([]);
  });

  it("حلقة التركيز بقاعدةٍ تغلب القاعدة العامة — لا بأدوات ميتة", () => {
    // أدوات `focus-visible:outline-*` تخسر أمام `:where(…):focus-visible`
    // غير المطبَّقة في طبقة، فوجودها هنا إيهامٌ بحلقةٍ لا تُرسم.
    expect(deadFocus(CODE)).toEqual([]);
    const at = CSS.indexOf(".nx-home-kpi:focus-visible,");
    expect(at, "لا قاعدة تركيز للوحة").toBeGreaterThan(-1);
    const rule = CSS.slice(at, CSS.indexOf("}", at));
    expect(rule).toContain(".nx-home-more:focus-visible");
    expect(rule).toContain(".nx-home-retry:focus-visible");
    // صفوف مركز القيادة تركّز صفوفها وأزرارها بـ`nx-focus-ring`.
    expect(rule).toContain(".nx-focus-ring:focus-visible");
    expect(rule).toContain("outline: 2px solid var(--tone-cyan)");
    // خارج الطبقات حقًّا — يُقرأ من شجرة المحلِّل لا من مواضع النصّ: في
    // الملف طبقاتٌ بعدها وقبلها، والموضع وحده لا يقول أين أُغلقت.
    expect(layered(CSS, ".nx-home-kpi:focus-visible")).toBe(false);
    // والفحص نفسه يرى الطبقة حين تكون (المادة ٣٠).
    expect(
      layered(
        "@layer utilities { .nx-home-kpi:focus-visible { outline: 0 } }",
        ".nx-home-kpi:focus-visible",
      ),
    ).toBe(true);
  });

  it("الخريطة خريطة شبه الجزيرة المولَّدة، والمناطق من `regions.ts`", () => {
    // أمر المالك ٢٠٢٦/٠٩/٢٩: «اجعل إحداثيات الموقع رسمة خريطة شبه الجزيرة» —
    // وموضعها اليوم بطاقة الصدر (`HomeMapCard`)، لا لوحات `HomeDashboard` المحذوفة.
    expect(src("HomeMapCard.tsx")).toContain("<ArabianPeninsulaMap");
    expect(regionPulse(CODE)).toEqual([]);
    expect(CODE).toContain("REGIONS.map");
    expect(src("HomeMapCard.tsx")).toMatch(/\bof REGIONS\b|\bREGIONS\.map\b/);
    // لا اسم منطقةٍ في أي صفّ — لا نصًّا مقتبسًا ولا JSX ولا قالبًا.
    expect(regionNames(CODE)).toEqual([]);
  });
});

describe("الرئيسية تركّب اللوحة وتُفصح بصدق", () => {
  // كان: «المؤشرات تحت العنوان واللوحات بعد الصدر الثلاثي» — الصدر الثلاثي ثم
  // `<HomeOperations />` قبل بطاقة المخاطر (`nx-risk-heading`). **نسخته المواصفة
  // 10 §2** («الصدر الثلاثي وعقد ترتيبه» · «بطاقة المخاطر الواحدة V5»)، وحُذفت
  // `HomeOperations` (٢٠٢٦/١٠/١٧) بعد أن خلفتها الصفوف. فالحاكم ترتيب §4.0،
  // والخاتمة (٢٠٢٦/١٠/١٧) بعد التحليلات وقبل الإفصاح.
  it("المؤشرات تحت العنوان، ثم الصدر (الخريطة · سَدِيد)، فالتشغيل والتحليلات والخاتمة قبل الإفصاح", () => {
    expect(pageOrder(PAGE_CODE, HAS_CLOSING)).toEqual([]);
    expect(removedSurfaces(PAGE_CODE + CODE)).toEqual([]);
  });

  it("سطر الإفصاح يذكر البيانات المرجعية ولا يدّعي الحياة وحدها (المادة ٦)", () => {
    expect(PAGE_CODE).toContain("وإلا فمن بياناتٍ مرجعية مدمجة");
    expect(PAGE_CODE, "عاد السطر يدّعي أن كل رقم حيّ").not.toContain(
      "الأرقام من مصدر النظام الحيّ. ",
    );
  });
});

describe("السطح الثاني — المادة ٣١", () => {
  it("مُصيِّر الخريطة يخضع لقواعد الصفوف: وجهاتٌ حيّة، ولا صفر، ولا لون ولا أسلوب نهائي، ولا اسم منطقة", () => {
    // `HomeMapCard` يمرّر وجهاته وأرقامه إلى `ArabianPeninsulaMap` فيرسمها هناك —
    // وقاعدةٌ تُفحص في البطاقة وحدها تفلت في مُصيِّرها.
    expect(destinations(MAP).length).toBeGreaterThan(0);
    expect(deadDestinations(MAP)).toEqual([]);
    expect(computedDestinations(MAP)).toEqual([]);
    expect(zeroForAbsence(MAP)).toEqual([]);
    expect(hexColours(MAP)).toEqual([]);
    expect((MAP.match(/\bstyle=\{\{/g) ?? []).length).toBeGreaterThan(0);
    expect(finalInline(MAP)).toEqual([]);
    expect(regionNames(MAP)).toEqual([]);
    expect(deadFocus(MAP)).toEqual([]);
    expect(videos(MAP)).toEqual([]);
    expect(unmanifestedImages(MAP)).toEqual([]);
    // وتنبيه تعذّر المواقع فيه بزرّ الإعادة وكلمتها.
    expect((MAP.match(/role="alert"/g) ?? []).length).toBeGreaterThan(0);
    expect(alertsWithoutRetry(MAP)).toEqual([]);
  });
});

/* ── نصّ الحلقة يُرى مضروبًا في نسبة رسمها إلى viewBox ───────────────── */

describe("نصوص الحلقة فوق أرضية 12px مرئيًّا (ui-audit)", () => {
  it("الفحص يحمرّ على المزروع: 12px داخل viewBox 120 مرسوم 112px", () => {
    const seeded = `<svg viewBox="0 0 120 120" className="size-28 shrink-0"><text x="1" className="x">a</text></svg>`;
    const [t] = svgTexts(seeded, ".x { font-size: 12px; }");
    expect(t.px).toBeCloseTo(11.2, 5);
    // وما لا يُعرف عرض رسمه أو حجمه يفشل مغلقًا لا يُفترض.
    const unsized = `<svg viewBox="0 0 120 120" className="w-full"><text className="x">a</text></svg>`;
    expect(svgTexts(unsized, ".x { font-size: 40px; }")[0].px).toBeNaN();
    const sizes = fontSizes(
      ".x { font-size: 11px; } @container c (max-width: 1px) { .x { font-size: 1rem; } }",
      "x",
    );
    expect(sizes).toEqual([11, Number.NaN]);
  });

  it("الوسم والقيمة يُريان ≥12px", () => {
    // الحلقة الحيّة (توزيع الأنواع): الرقم والوسم HTML فوق الرسم لا `<text>` داخله —
    // فالحجم المصرَّح هو المرئي، في كل استعلامٍ حاوٍ يصغّر الحلقة.
    for (const cls of ["nx-ana-donut-num", "nx-ana-donut-cap"]) {
      expect(src("HomeAnalyticsRow.tsx")).toContain(`className="${cls}"`);
      const sizes = fontSizes(HOME_CSS, cls);
      expect(sizes.length, cls).toBeGreaterThan(0);
      for (const px of sizes) expect(px, cls).toBeGreaterThanOrEqual(12);
    }
    // وكل `<text>` في SVG الصفوف يُقاس بعد نسبة viewBox — ومنه حلقة اللبنات
    // المشتركة (`Donut`) بصنفيها؛ ولا `<text>` يفلت من الاستخراج.
    const texts = svgTexts(CODE, `${CSS}\n${HOME_CSS}`);
    expect(texts).toHaveLength((CODE.match(/<text\b/g) ?? []).length);
    for (const t of texts) expect(t.px, t.cls).toBeGreaterThanOrEqual(12);
  });
});

/* ── الهدف عرضًا كما ارتفاعًا (ui-audit ٢٠٢٦/١٠/١٧) ───────────────────── */

const MAP_CSS = read("src/styles/home/home-map.css");

/**
 * عناصر «إحصائيات سريعة» روابطُ بكلمةٍ قصيرة («المواقع» · «المرافق»): ارتفاعها
 * من رمز الهدف وعرضها كان من كلمتها، فقاس الفحص الميداني 40×66 على المقاسات
 * اللمسية الخمسة (الأرضية 44). القاعدة: العرض الأدنى من الرمز نفسه
 * (`--arabia-hit`: 40 بالفأرة · 44 باللمس) لا رقمًا ثانيًا — ولا قاعدةٌ لاحقة
 * تعيده إلى عرض الكلمة بأي صيغة (منطقية أو فيزيائية، وبأي لاحقة على المحدِّد:
 * الروابط نفسها تحمل `[data-link]`)، ولا رمزٌ ينخفض تحت 44 باللمس.
 */
function quickItemHit(css: string): string[] {
  const out: string[] = [];
  let anchored = false;
  parse(css).walkRules((rule) => {
    if (!rule.selectors.some((s) => classRe("nx-arabia-quick-item").test(subject(s)))) return;
    rule.walkDecls(/^min-(?:inline-size|width)$/, (d) => {
      if (d.value === "var(--arabia-hit)") anchored = true;
      else out.push(`${rule.selector} { ${d.prop}: ${d.value} }`);
    });
  });
  if (!anchored) out.unshift("لا عرض أدنى لعنصر الإحصائية من رمز الهدف");
  let coarse = Number.NaN;
  parse(css).walkAtRules("media", (at) => {
    if (!/pointer:\s*coarse/.test(at.params)) return;
    at.walkDecls("--arabia-hit", (d) => {
      coarse = parseFloat(d.value);
    });
  });
  if (!(coarse >= 44)) out.push(`--arabia-hit باللمس: ${coarse}`);
  return out;
}

describe("أهداف اللمس عرضًا كما ارتفاعًا (ui-audit)", () => {
  it("الفحص يحمرّ على المزروع: عرض الكلمة · خاصيّة فيزيائية · لاحقة الرابط · رمزٌ منخفض", () => {
    const word = plant(
      MAP_CSS,
      "min-inline-size: var(--arabia-hit);\n  min-block-size: var(--arabia-hit);\n  padding: 3px 2px;",
      "min-inline-size: 0;\n  min-block-size: var(--arabia-hit);\n  padding: 3px 2px;",
    );
    expect(quickItemHit(word)).toEqual([
      "لا عرض أدنى لعنصر الإحصائية من رمز الهدف",
      ".nx-arabia-quick-item { min-inline-size: 0 }",
    ]);
    const physical = `${MAP_CSS}\n.nx-arabia-quick-list > .nx-arabia-quick-item { min-width: 0; }`;
    expect(quickItemHit(physical)).toEqual([
      ".nx-arabia-quick-list > .nx-arabia-quick-item { min-width: 0 }",
    ]);
    const linked = `${MAP_CSS}\n.nx-arabia-quick-item[data-link] { min-inline-size: 0; }`;
    expect(quickItemHit(linked)).toEqual([
      ".nx-arabia-quick-item[data-link] { min-inline-size: 0 }",
    ]);
    const token = plant(MAP_CSS, "--arabia-hit: 44px;", "--arabia-hit: 40px;");
    expect(quickItemHit(token)).toEqual(["--arabia-hit باللمس: 40"]);
    expect(quickItemHit(".nx-arabia-quick-item { display: flex; }")).toHaveLength(2);
  });

  it("عنصر «إحصائيات سريعة» لا يقلّ عرضه عن رمز الهدف، والرمز ≥ 44 باللمس", () => {
    expect(quickItemHit(HOME_CSS)).toEqual([]);
  });
});

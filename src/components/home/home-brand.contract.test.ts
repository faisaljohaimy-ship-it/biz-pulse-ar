/**
 * عقد صفّ الهوية على الرئيسية: شريط «مزايا سَدِيد» ثم لوحة سَدِيد بعرض العمود، وفوقها فيلمها
 * السينمائي بموسيقاه **في حاويته نفسها**، والاسم والسطر **نصًّا حقيقيًّا**، ثم «الجوهرة» (أوامر
 * المالك ٢٠٢٦/١٠/١٧ و١٠/١٨ — المواصفة ١٠ §٢.٣ — وR4: «… يبدأ اولاً … وبمجرد فتح الموقع والدخول عليه …»
 * و«واظف الى فديو الموشن قرافيتي افضل واجمل واحدث موسيقا … واجعل علامة سديد في النهاية تكون كالجوهرة
 * المشعة باستمرار …» — و٢٠٢٦/١٠/٢٣: «أن يكون الصوت مفعّلًا تلقائيًا مع بداية الفيديو، وأن يكون الصوت
 * متصلًا مع الفيديو بشكلٍ منسّق وجميل احترافي»).
 *
 * ما يكسر الأمر لا يراه tsc ولا البناء:
 *   • الاسم أو السطر بغير نصّ المالك الحرفيّ («… رؤية تنفيذية **على** الأمن الصناعي …»)، أو
 *     مخبوزًا في صورة — والأمر «Render text as real HTML»؛
 *   • نصٌّ يبقى خافتًا بعد زوال الفيلم — واللوحة بلا نصّها، فيغيب الاسم كلّه — أو يخفت خارج
 *     قصّة الفيلم، أو خارج بوابة الحركة؛
 *   • لحظتا النصّ وقد تبدّل زمن الفيلم دونهما (`remotion/brand/film/timeline.ts`)؛
 *   • فيلمٌ بلا مسار صوتٍ في حاويته أو بمسارين (الموسيقى **داخل** الملفّ: مساران في ملفٍّ واحد لا
 *     يتزامنان بالقفز — قِيس على تسجيل المالك ٢٠٢٦/١٠/٢٣: انقطاعٌ كل 0.77 ث على iPhone)، أو بمدّةٍ غير
 *     24 ث + ثباتِ الذيل؛ أو ملفُّ موسيقى منفصلٌ ما زال يُشحن، أو `<audio>` في المصدر؛ أو يُركَّب لمن
 *     طلب السكون أو توفير البيانات، أو في HTML الخادم، أو قبل رسم الملصق؛
 *   • فيلمٌ يُعاد وحده: `loop`، أو تشغيلٌ بالعودة إلى الإطار أو بإغلاق اللوحة بعد نهايته؛
 *   • صوتٌ يُرفع كتمه دون سؤال تفضيل الزائر، أو بلا زرٍّ يكتمه (WCAG 1.4.2)، أو إسكاتٌ يوقف الفيلم
 *     بدل أن يكتمه، أو كتمٌ يُرفع عن فيلمٍ جارٍ قبل الإذن (Chromium يوقفه)، أو `autoPlay`/`muted`
 *     سمةً على `<video>` (البدء كلّه من `bindFilmSound`)؛
 *   • «جوهرةٌ» تتحرّك خارج بوابة الحركة أو فصلها، أو لا تقف بزرّ الإيقاف وخارج الإطار؛
 *   • وزنُ صورٍ يتجاوز سقف N3 (400 KB على `/`)، أو فيلمٌ يتضخّم بلا سقف؛
 *   • لوحةٌ تضيق عن العمود، أو صفٌّ في غير موضعه، أو لونٌ نهائي في CSS.
 *
 * وكل كاشفٍ يُجرَّب أولًا على انتهاكٍ مزروع (المادة ٣٠).
 *
 * **بنودٌ تقرأ بايتات الملفّات:** الفيلم (مساره الصوتي ومدّته) وقناع الرمز يُقرآن كما هما على القرص —
 * فيحمرّ بندهما حتى تصل ملفّات الفيلم بصوتها.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import postcss, { type AtRule, type ChildNode, type Node, type Rule } from "postcss";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { SadeedAudioBus } from "@/lib/sadeed/audio-bus";
import { sadeedState } from "@/lib/sadeed/sadeed-state";
import {
  BRAND_FILMS,
  FILM_TAIL,
  FILM_TEXT,
  GESTURE_GRACE_MS,
  HOME_BRAND,
  HomeBrandRow,
  MUSIC_KEY,
  SOUND_LABELS,
  filmActAt,
} from "@/components/home/HomeBrandRow";

const SRC = readFileSync("src/components/home/HomeBrandRow.tsx", "utf8");
const PAGE = readFileSync("src/routes/-blueprint-page.tsx", "utf8");
const CSS = readFileSync("src/styles/home/home-brand.css", "utf8");
const MOTION = readFileSync("src/styles/home/home-motion.css", "utf8");
const TIMELINE = readFileSync("remotion/brand/film/timeline.ts", "utf8");

const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const CODE = strip(SRC);

/** نصّ المالك الحرفيّ (٢٠٢٦/١٠/١٨: «Preserve the exact Arabic brand name سديد, English name SADEED, and the tagline»). */
const OWNER = {
  ar: "سديد",
  en: "SADEED",
  tagline: "مساعد ذكاء اصطناعي يعطي رؤية تنفيذية على الأمن الصناعي في جميع المناطق السعودية.",
} as const;

/** سقف صور الرئيسية (N3) — بايتات. */
const IMAGE_CEILING = 400 * 1024;
/**
 * سقوف الفيلم — بايتات. 26 ث بصوتها بدرجتين (حلقات الماء قبله 3 MB لكلٍّ)، والزائر يُنزّل ملفًّا واحدًا
 * بعد رسم الملصق؛ والجوال الصغرى وحدها (`pickFilm`) فسقفها أضيق. الموسيقى داخل هذه الملفّات فلا سقف
 * منفصل لها، والمجموع هو مجموع ملفّات الفيلم وحدها.
 */
const FILM_CEILING = { each: 4_500_000, phone: 2_000_000, total: 10_000_000 };
/** مدّة الحاوية (ث): الفيلم وثباتُ إطاره الأخير — تقرؤها الصفحة من `FILM_TEXT` و`FILM_TAIL`. */
const CONTAINER_SECONDS = 26;
const DURATION_TOLERANCE = 0.1;

const GATE = "prefers-reduced-motion: no-preference";
/** بوّابة الحركة الدائمة: مفتاح النظام والوضع الآمن معًا. */
const SWITCH = 'html:not([data-nx-motion="off"]):not(.safe-mode)';

/** أسماء زرّ الموسيقى بنصّ مواصفة المسار (R4). */
const SOUND = {
  ar: { play: "تشغيل الموسيقى", mute: "كتم الموسيقى", replay: "إعادة العرض مع الموسيقى" },
  en: { play: "Play music", mute: "Mute music", replay: "Replay with music" },
} as const;

/* ── أدوات ─────────────────────────────────────────────────────────────── */

const paths = (code: string, re: RegExp) => [...new Set([...code.matchAll(re)].map((m) => m[1]))];
const POSTERS = paths(CODE, /"(\/home\/brand\/[^"]+\.webp)"/g);
const FILMS = paths(CODE, /"(\/media\/brand\/[^"]+\.mp4)"/g);

function walkBytes(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    total += st.isDirectory() ? walkBytes(p) : st.size;
  }
  return total;
}

/** أنواع المسارات في MP4 من صناديق `hdlr` (النوع بعد الإصدار و`pre_defined`). */
function mp4Handlers(bytes: Buffer): string[] {
  const out: string[] = [];
  for (let i = bytes.indexOf("hdlr"); i !== -1; i = bytes.indexOf("hdlr", i + 4)) {
    if (i + 16 <= bytes.length) out.push(bytes.toString("latin1", i + 12, i + 16));
  }
  return out;
}

/** مدّة MP4 بالثواني من `mvhd` (الإصدار 0 أو 1) — `NaN` إن غاب. */
function mp4Seconds(bytes: Buffer): number {
  const at = bytes.indexOf("mvhd");
  if (at === -1) return Number.NaN;
  const v1 = bytes[at + 4] === 1;
  const scale = bytes.readUInt32BE(at + (v1 ? 24 : 16));
  const duration = v1 ? Number(bytes.readBigUInt64BE(at + 28)) : bytes.readUInt32BE(at + 20);
  return duration / scale;
}

/** عرض WebP وارتفاعه من ترويسته (VP8 / VP8L / VP8X). */
function webpSize(bytes: Buffer): { width: number; height: number } {
  const chunk = bytes.toString("latin1", 12, 16);
  if (chunk === "VP8X") {
    return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  }
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
  }
  return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
}
const webpWidth = (bytes: Buffer) => webpSize(bytes).width;

/** نسبة اللوحة كما رُسمت (2172×724) — والتقريب إلى بكسلٍ صحيح يحرّكها دون 0.02. */
const PLATE_RATIO = 2172 / 724;
const offRatio = (size: { width: number; height: number }) =>
  Math.abs(size.width / size.height - PLATE_RATIO) >= 0.02;

/**
 * معرّفات الترميز في حاوية Matroska/WebM (العنصر `0x86` بحجمٍ ببايتٍ واحد).
 * أيّ معرّفٍ يبدأ بـ`A_` مسارٌ سمعيّ — لا Opus وVorbis وحدهما.
 */
function matroskaCodecs(bytes: Buffer): string[] {
  const out: string[] = [];
  for (let i = 0; i + 2 < bytes.length; i++) {
    if (bytes[i] !== 0x86 || (bytes[i + 1] & 0x80) === 0) continue;
    const len = bytes[i + 1] & 0x7f;
    if (len < 3 || len > 32 || i + 2 + len > bytes.length) continue;
    const id = bytes.toString("latin1", i + 2, i + 2 + len);
    if (/^[AVS]_[A-Z0-9_/]+$/.test(id)) out.push(id);
  }
  return out;
}

/**
 * الفيلم بصوته في حاويته: MP4 بمسار فيديو واحد (H.264) ومسار صوتٍ واحد بالضبط (AAC)، وWebM بفيديو VP9
 * وصوتِ Opus واحد، ومدّةُ MP4 هي مدّة الحاوية (24 ث + ثباتُ الذيل). `null` غيابُ الملفّ.
 */
function filmTrackGaps(mp4: Buffer | null, webm: Buffer | null): string[] {
  const out: string[] = [];
  if (!mp4) out.push("mp4 غائب");
  else {
    const handlers = mp4Handlers(mp4);
    const video = handlers.filter((h) => h === "vide").length;
    const sound = handlers.filter((h) => h === "soun").length;
    if (!mp4.includes("ftyp")) out.push("mp4: ليس MP4");
    if (!mp4.includes("avc1") || video !== 1) out.push(`mp4: مسارات فيديو ${video}`);
    if (sound === 0) out.push("mp4: فيلم بلا مسار صوت");
    else if (sound > 1) out.push("mp4: مساران صوتيان");
    else if (!mp4.includes("mp4a")) out.push("mp4: الصوت ليس AAC");
    const seconds = mp4Seconds(mp4);
    if (!(Math.abs(seconds - CONTAINER_SECONDS) <= DURATION_TOLERANCE)) {
      out.push(`mp4: المدّة ${seconds} ≠ ${CONTAINER_SECONDS}`);
    }
  }
  if (!webm) out.push("webm غائب");
  else {
    const codecs = matroskaCodecs(webm);
    const sound = codecs.filter((c) => c.startsWith("A_"));
    if (codecs.filter((c) => c === "V_VP9").length !== 1) out.push(`webm: [${codecs.join("، ")}]`);
    if (sound.length === 0) out.push("webm: فيلم بلا مسار صوت");
    else if (sound.length > 1) out.push("webm: مساران صوتيان");
    else if (sound[0] !== "A_OPUS") out.push("webm: الصوت ليس Opus");
  }
  return out;
}

/** ملفّات الموسيقى المنفصلة القديمة التي ما زالت في مجلّد الفيلم — لا يبقى منها شيء. */
const strayScores = (names: string[]) => names.filter((n) => /^sadeed-film-score\./.test(n));

/** `<audio>` في مصدر المكوّن — الموسيقى لم تعد عنصرًا منفصلًا. */
const hasAudioElement = (code: string) => /<audio\b/.test(code);

/** ألوانٌ نهائية في CSS: سداسية أو rgb/hsl حرفية — ما عدا ألوان النظام. */
function literalColors(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkDecls((d) => {
    if (/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(d.value)) out.push(`${d.prop}: ${d.value}`);
  });
  return out;
}

function transforms(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkDecls("transform", (d) => {
    if (/\b(translate|scale)/.test(d.value)) out.push(d.value);
  });
  return out;
}

/** نصوص القواعد الحاوية — `@media …` من الأقرب. */
function atChain(node: ChildNode): string[] {
  const out: string[] = [];
  for (let p = node.parent as Node | undefined; p && p.type !== "root"; p = p.parent as Node) {
    if (p.type === "atrule") out.push(`@${(p as AtRule).name} ${(p as AtRule).params}`);
  }
  return out;
}

const flat = (s: string) => s.replace(/\s+/g, " ").trim();

/** متن دالّةٍ مسمّاة حتى قوسها الختامي في أوّل السطر — `""` إن غابت. */
function fnBody(src: string, name: string): string {
  const at = src.search(new RegExp(`\\bfunction ${name}\\b`));
  if (at === -1) return "";
  const end = src.indexOf("\n}\n", at);
  return src.slice(at, end === -1 ? undefined : end + 2);
}

/** سطر الفيلم: بعد السماح، وما لم يوقفه المستخدم، وحين يُرسم الملصق. */
const PLAY_LINE = "const play = allowed && !paused && posterReady;";

/** الفيلم لا يُرسم إلا بعد السماح وما لم يوقفه المستخدم وبعد الملصق — سطر الحراسة قبل `<video`. */
const gatedBeforeVideo = (code: string) => {
  const guard = code.indexOf("if (!play || failed || !src) return null;");
  const video = code.indexOf("<video");
  return guard > -1 && video > guard && code.includes(PLAY_LINE);
};

/** نصّ عنصر الفيلم من فتحه إلى إغلاقه. */
const filmAttrs = (code: string) => code.slice(code.indexOf("<video"), code.indexOf("</video>"));

/**
 * الملصق قبل الفيلم: الصورة مكتملةٌ عند التركيب أو بحدثيها، مربوطةً بمرجعها — ولا انتظار `load`
 * النافذة وخمولها (كان يؤخّر الفيلم ثوانيَ عن الدخول).
 */
function posterGateGaps(code: string): string[] {
  const out: string[] = [];
  const hook = fnBody(code, "usePosterReady");
  if (!hook.includes("if (img.complete)")) out.push("complete");
  if (!hook.includes('img.addEventListener("load", done')) out.push("load");
  if (!hook.includes('img.addEventListener("error", done')) out.push("error");
  if (!code.includes("ref={posterRef}")) out.push("مرجع الملصق");
  if (!code.includes("const posterReady = usePosterReady(posterRef);")) out.push("البوابة");
  if (/requestIdleCallback|window\.addEventListener\("load"/.test(code)) out.push("انتظار الخمول");
  return out;
}

/**
 * مرّةً لا حلقة: بلا `loop`، والنهاية تكتب الجوهرة، والعائد بعدها بلا تشغيلٍ تلقائيّ، والمراقب لا
 * يشغّل فيلمًا انتهى.
 */
function restartGaps(code: string): string[] {
  const out: string[] = [];
  const video = filmAttrs(code);
  if (/\bloop\b/.test(video)) out.push("loop");
  if (!/onEnded=\{[^}]*setEnded\(true\)/.test(video)) out.push("ended");
  // البدء كلّه من `bindFilmSound.begin` — والعائد بعد النهاية لا يبدأ وحده.
  if (!code.includes("if (!jewelRef.current) bound.begin();")) out.push("بدء بعد النهاية");
  if (!code.includes("const jewel = ended || failed;")) out.push("الجوهرة");
  const resume = code.indexOf("const resumed = video.play()");
  const watcher = code.lastIndexOf("new IntersectionObserver(", resume);
  const callback = resume === -1 || watcher === -1 ? "" : code.slice(watcher, resume);
  if (!callback.includes("if (jewelRef.current || video.ended) return;")) out.push("المراقب");
  return out;
}

/**
 * لا صوت بلا سؤال التفضيل: لا `<audio>` ولا `autoPlay` ولا `muted` سمةً على الفيلم، وكتمٌ واحد يُرفع
 * صراحةً (في `begin`، بعد سؤال `wanted()`) وغيره يمرّ بـ`audible()` — الذي يشترط التفضيل والإذن
 * (`unlocked`) وما يُسكت. ولا `pause()` لأجل الصوت: الإسكات كتمٌ.
 */
function soundStartGaps(code: string): string[] {
  const out: string[] = [];
  if (hasAudioElement(code)) out.push("<audio>");
  const video = filmAttrs(code);
  if (/\bautoPlay\b/.test(video)) out.push("autoPlay");
  if (/\bmuted\b/.test(video)) out.push("muted سمةً");
  const body = fnBody(code, "bindFilmSound");
  if (!body) return [...out, "bindFilmSound غائب"];
  if (/\.pause\(/.test(body)) out.push("pause لأجل الصوت");
  const unmutes = body.match(/\.muted = false/g) ?? [];
  if (unmutes.length !== 1) out.push(`رفع كتمٍ صريح × ${unmutes.length}`);
  const begin = body.slice(body.indexOf("const begin = () => {"), body.indexOf("const follow"));
  const asks = begin.indexOf("opts.wanted()");
  if (asks === -1 || asks > begin.indexOf(".muted = false")) out.push("سؤال التفضيل");
  if (!body.includes("const audible = () => unlocked && opts.wanted() &&")) out.push("شروط الصوت");
  if (!code.includes('localStorage.getItem(MUSIC_KEY) !== "off"')) out.push("قراءة التفضيل");
  return out;
}

/** زرّ الموسيقى: زرٌّ حقيقيّ بحاله المُعلنة واسمه ورموزه الثلاثة، وحلقة تركيز النظام. */
function soundButtonGaps(code: string): string[] {
  const at = code.indexOf('className="nx-brand-sound nx-focus-ring"');
  if (at === -1) return ["لا زرّ"];
  const button = code.slice(code.lastIndexOf("<button", at), code.indexOf("</button>", at));
  const out: string[] = [];
  for (const need of [
    'type="button"',
    "aria-pressed={jewel ? undefined : audible}",
    "aria-label={jewel ? labels.replay : labels.play}",
    "onClick={jewel ? replay : toggle}",
    "<Volume2",
    "<VolumeX",
    "<RotateCcw",
  ]) {
    if (!button.includes(need)) out.push(need);
  }
  return out;
}

/** تصريحات القاعدة الأولى التي يطابق محدِّدها `selector` حرفيًّا خارج أيّ `@media`. */
function baseDecls(css: string, selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(css).walkRules((rule) => {
    if (atChain(rule).length > 0 || !rule.selectors.some((s) => flat(s) === selector)) return;
    rule.walkDecls((d) => {
      out[d.prop] = d.value.trim();
    });
  });
  return out;
}

const px = (v: string | undefined) => (v && /^\d+(\.\d+)?px$/.test(v) ? parseFloat(v) : NaN);

/** هدف الزرّ ≥ 44px في البعدين. */
function soundTargetGaps(css: string): string[] {
  const d = baseDecls(css, ".nx-brand-sound");
  const out: string[] = [];
  if (!(px(d["inline-size"]) >= 44)) out.push("العرض");
  if (!(px(d["block-size"]) >= 44)) out.push("الارتفاع");
  return out;
}

/** خصائص يحرّكها مفتاحٌ حركيّ للجوهرة — المُركِّب وحده. */
const JEWEL_PROPS = new Set(["rotate", "translate", "scale", "opacity"]);
const JEWEL_SELECTOR = /\.nx-(brand-jewel|jewel-)/;

/**
 * الجوهرة: خفيّةٌ في أساسها، وتظهر في فصلها وحده خلف البوابة والمفتاح والوضع الآمن؛ وكل حركةٍ
 * لها في فصلها بعد `[data-run]`، والدائمة منها تقف بزرّ الإيقاف وخارج الإطار؛ وإطاراتها على المُركِّب؛
 * والألوان القسرية تُخفيها. فتحت تقليل الحركة لا جوهرة ولا حركة — اللوحة كما هي.
 */
function jewelGaps(css: string): string[] {
  const out: string[] = [];
  let hiddenBase = false;
  let forcedHidden = false;
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    const chain = atChain(rule);
    if (chain.some((a) => a.startsWith("@keyframes"))) return;
    if (!rule.selectors.some((s) => JEWEL_SELECTOR.test(s))) return;
    const gated = chain.some((a) => a.startsWith("@media") && a.includes(GATE));
    const forced = chain.some((a) => a.includes("forced-colors: active"));
    const selectors = rule.selectors.map((s) => flat(s));
    const infinite = rule.nodes.some(
      (n) =>
        n.type === "decl" &&
        n.prop === "animation-iteration-count" &&
        n.value.trim() === "infinite",
    );
    const within = (needs: string[]) =>
      gated && selectors.every((s) => s.startsWith(SWITCH) && needs.every((n) => s.includes(n)));
    rule.walkDecls((d) => {
      const value = d.value.trim();
      if ((d.prop === "animation" || d.prop === "animation-name") && !/^none\b/.test(value)) {
        const needs = ['[data-film-act="jewel"]', "[data-run]"];
        if (infinite) needs.push(":not([data-paused])", ":not([data-offscreen])");
        if (!within(needs)) out.push(`حركة: ${selectors.join(", ")}`);
      }
      if (d.prop !== "display") return;
      if (value.startsWith("none")) {
        if (chain.length === 0 && selectors.includes(".nx-brand-jewel")) hiddenBase = true;
        // يغلب قاعدة الظهور في فصلها (نوعيّتها أعلى) — فبلا `!important` تبقى الجوهرة.
        if (forced && selectors.includes(".nx-brand-jewel") && d.important) forcedHidden = true;
        return;
      }
      if (!within(['[data-film-act="jewel"]'])) out.push(`ظهور: ${selectors.join(", ")}`);
    });
  });
  root.walkAtRules("keyframes", (at) => {
    if (!at.params.startsWith("nxJewel")) return;
    at.walkDecls((d) => {
      if (!JEWEL_PROPS.has(d.prop)) out.push(`${at.params}: ${d.prop}`);
    });
  });
  if (!hiddenBase) out.push("الأساس ظاهر");
  if (!forcedHidden) out.push("الألوان القسرية");
  return out;
}

/** الاسم والسطر بنصّ المالك في المصدر، ومربوطان نصًّا في طبقة النصّ — لا صورةً ولا نصًّا ثانيًا. */
function copyGaps(code: string): string[] {
  const out: string[] = [];
  if (!code.includes(`title: { ar: "${OWNER.ar}", en: "${OWNER.en}" }`)) out.push("الاسم");
  if (!code.includes(`ar: "${OWNER.tagline}"`)) out.push("السطر");
  const at = code.indexOf('<div className="nx-brand-copy">');
  const copy = at === -1 ? "" : code.slice(at, code.indexOf("</div>", at));
  for (const bind of [
    "{plate.title.en}",
    "{plate.title.ar}",
    "{ar ? plate.tagline.ar : plate.tagline.en}",
  ]) {
    if (!copy.includes(bind)) out.push(bind);
  }
  return out;
}

/** زمن الفيلم كما كُتب في مصدره الواحد. */
function filmTimeline(src: string) {
  const num = (re: RegExp) => Number(re.exec(src)?.[1] ?? Number.NaN);
  return {
    seconds: num(/\bFILM_SECONDS = ([\d.]+)/),
    igniteEnd: num(/\bigniteEnd:\s*([\d.]+)/),
    forgeEnd: num(/\bforgeEnd:\s*([\d.]+)/),
    settleEnd: num(/\bsettleEnd:\s*([\d.]+)/),
    reveal: num(/\bTEXT_REVEAL = ([\d.]+)/),
  };
}

/**
 * لحظتا النصّ من زمن الفيلم: يخفت بعد الإطار 0 (الملصق بنصّه) وقبل نهاية الاشتعال، ويعود في
 * `TEXT_REVEAL` نفسه — وهو بين نهاية الصياغة ونهاية التثبيت — والمدّة مدّة الفيلم.
 */
function syncGaps(
  text: { hideAt: number; revealAt: number; seconds: number },
  timeline: string,
): string[] {
  const t = filmTimeline(timeline);
  const out: string[] = [];
  if (text.seconds !== t.seconds) out.push(`المدّة ${text.seconds} ≠ ${t.seconds}`);
  if (!(text.hideAt > 0 && text.hideAt < t.igniteEnd)) {
    out.push(`الخفوت ${text.hideAt} خارج (0، ${t.igniteEnd})`);
  }
  if (text.revealAt !== t.reveal) out.push(`العودة ${text.revealAt} ≠ ${t.reveal}`);
  if (!(text.revealAt > t.forgeEnd && text.revealAt < t.settleEnd)) {
    out.push(`العودة ${text.revealAt} خارج (${t.forgeEnd}، ${t.settleEnd})`);
  }
  return out;
}

/** قواعد فصل الفيلم كلّها داخل بوابة الحركة، ومحدِّدها يبدأ بالمفتاح والوضع الآمن. */
function ungatedActRules(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkRules((rule) => {
    if (!rule.selector.includes("data-film-act")) return;
    const gated = atChain(rule).some((a) => a.includes(GATE));
    const switched = rule.selectors.every((s) => s.trim().startsWith(SWITCH));
    if (!gated || !switched) out.push(flat(rule.selector));
  });
  return out;
}

/** ما يُخفي الاسم أو السطر — والمسموح فصل القصّة وحده، فاللوحة بلا نصّها. */
function copyHiders(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkDecls((d) => {
    const rule = d.parent;
    if (rule?.type !== "rule") return;
    const selector = (rule as Rule).selector;
    if (!/\.nx-brand-(copy|title|tagline)\b/.test(selector)) return;
    const value = d.value.trim();
    const hides =
      (d.prop === "opacity" && value === "0") ||
      (d.prop === "visibility" && value === "hidden") ||
      (d.prop === "display" && value === "none");
    if (hides) out.push(flat(selector));
  });
  return out;
}

/**
 * ما يضيّق اللوحة عن العمود (R3: «على امتداد الصفحة»): عرضٌ أو سقفٌ غير 100%، أو هامشٌ آليّ،
 * على حاوياتها — الصفّ والمسرح والإطار والفنّ.
 */
function narrowing(css: string): string[] {
  const out: string[] = [];
  const box = /^\.nx-(home-brand|brand-stage|brand|brand-art)(\[[^\]]+\])*(:[\w-]+(\([^)]*\))?)*$/;
  postcss.parse(css).walkDecls((d) => {
    const rule = d.parent;
    if (rule?.type !== "rule") return;
    const own = (rule as Rule).selectors.some((s) => box.test(flat(s).split(" ").pop() ?? ""));
    if (!own) return;
    if (/^(max-)?(inline-size|width)$/.test(d.prop) && d.value.trim() !== "100%") {
      out.push(`${d.prop}: ${d.value}`);
    }
    if (/^margin(-inline|-left|-right)?$/.test(d.prop) && /\bauto\b/.test(d.value)) {
      out.push(`${d.prop}: ${d.value}`);
    }
  });
  return out;
}

/** الشريط فوق اللوحة في الصفّ، والصفّ فوق المؤشرات في الصفحة. */
function orderGaps(row: string, page: string): string[] {
  const out: string[] = [];
  const ticker = row.indexOf("<HomeTicker");
  const plate = row.indexOf("<BrandPlate");
  if (ticker === -1 || plate === -1 || ticker > plate) out.push("الشريط بعد اللوحة");
  const code = strip(page);
  const brand = code.indexOf("<HomeBrandRow />");
  const kpi = code.indexOf("<HomeKpiRow />");
  if (brand === -1 || kpi === -1 || brand > kpi) out.push("الصفّ بعد المؤشرات");
  return out;
}

/** خصائص مفتاحٍ حركيّ باسمه. */
function keyframeProps(css: string, name: string): string[] {
  const props = new Set<string>();
  postcss.parse(css).walkAtRules("keyframes", (at) => {
    if (at.params !== name) return;
    at.walkDecls((d) => {
      props.add(d.prop);
    });
  });
  return [...props];
}

/* ── التجارب على المزروع (المادة ٣٠) ─────────────────────────────────── */

describe("الكواشف تحمرّ على انتهاكٍ مزروع", () => {
  it("فيلمٌ بلا مسار صوت، أو بمسارين، أو بمدّةٍ خاطئة، أو موسيقى منفصلة، أو `<audio>` — يُلتقط", () => {
    const hdlr = (type: string) =>
      Buffer.concat([Buffer.from("hdlr"), Buffer.alloc(8), Buffer.from(type)]);
    const mvhd = (seconds: number) => {
      const box = Buffer.alloc(24);
      box.write("mvhd", 0, "latin1");
      box.writeUInt32BE(1000, 16);
      box.writeUInt32BE(seconds * 1000, 20);
      return box;
    };
    const mp4 = (seconds: number, ...tracks: string[]) =>
      Buffer.concat([
        Buffer.from("....ftyp....avc1....mp4a"),
        mvhd(seconds),
        ...tracks.map((t) => hdlr(t)),
      ]);
    const element = (id: string) =>
      Buffer.concat([Buffer.from([0x86, 0x80 | id.length]), Buffer.from(id)]);
    const webm = Buffer.concat([element("V_VP9"), element("A_OPUS")]);
    expect(mp4Seconds(mp4(26, "vide", "soun"))).toBe(26);
    expect(filmTrackGaps(mp4(26, "vide", "soun"), webm)).toEqual([]);
    // الحاوية الصامتة القديمة (أو مسارٌ صامتٌ نُزع): يحمرّ.
    expect(filmTrackGaps(mp4(26, "vide"), webm)).toEqual(["mp4: فيلم بلا مسار صوت"]);
    expect(filmTrackGaps(mp4(26, "vide", "soun", "soun"), webm)).toEqual(["mp4: مساران صوتيان"]);
    expect(filmTrackGaps(mp4(24, "vide", "soun"), webm)).toEqual([
      `mp4: المدّة 24 ≠ ${CONTAINER_SECONDS}`,
    ]);
    expect(filmTrackGaps(mp4(26, "vide", "soun"), element("V_VP9"))).toEqual([
      "webm: فيلم بلا مسار صوت",
    ]);
    expect(
      filmTrackGaps(mp4(26, "vide", "soun"), Buffer.concat([webm, element("A_OPUS")])),
    ).toEqual(["webm: مساران صوتيان"]);
    expect(
      filmTrackGaps(
        mp4(26, "vide", "soun"),
        Buffer.concat([element("V_VP9"), element("A_VORBIS")]),
      ),
    ).toEqual(["webm: الصوت ليس Opus"]);
    expect(filmTrackGaps(null, null)).toEqual(["mp4 غائب", "webm غائب"]);
    // ملفّ الموسيقى المنفصل القديم لا يبقى في المجلّد، و`<audio>` لا يبقى في المصدر.
    expect(strayScores(["sadeed-film-804.mp4", "sadeed-film-score.m4a"])).toEqual([
      "sadeed-film-score.m4a",
    ]);
    expect(hasAudioElement(`${CODE}\n<audio preload="auto" />`)).toBe(true);
    expect(hasAudioElement(CODE)).toBe(false);
  });

  it("لونٌ نهائي و`transform` في CSS يُلتقطان", () => {
    expect(literalColors(`${CSS}\n.x { color: #fff; }`)).toEqual(["color: #fff"]);
    expect(literalColors(`${CSS}\n.x { background: rgba(0, 0, 0, 0.3); }`)).toHaveLength(1);
    expect(transforms(`${CSS}\n.x { transform: translate(0, 2px); }`)).toEqual([
      "translate(0, 2px)",
    ]);
  });

  it("سطرٌ بغير نصّ المالك («عن»)، واسمٌ مبدَّل، ونصٌّ غير مربوطٍ في طبقته — تُلتقط", () => {
    const an = CODE.replace("رؤية تنفيذية على الأمن", "رؤية تنفيذية عن الأمن");
    expect(an).not.toBe(CODE);
    expect(copyGaps(an)).toEqual(["السطر"]);
    const renamed = CODE.replace('en: "SADEED"', 'en: "Sadeed"');
    expect(renamed).not.toBe(CODE);
    expect(copyGaps(renamed)).toEqual(["الاسم"]);
    const baked = CODE.replace("{plate.title.en}", "");
    expect(baked).not.toBe(CODE);
    expect(copyGaps(baked)).toEqual(["{plate.title.en}"]);
  });

  it("زمنٌ تبدّل دون لحظتي النصّ، أو مدّةٌ غير مدّة الفيلم، أو خفوتٌ من الإطار 0 — تُلتقط", () => {
    const shorter = TIMELINE.replace(/FILM_SECONDS = \d+/, "FILM_SECONDS = 20");
    expect(shorter).not.toBe(TIMELINE);
    expect(syncGaps(FILM_TEXT, shorter)).toHaveLength(1);
    const ignite = TIMELINE.replace(/igniteEnd:\s*[\d.]+/, "igniteEnd: 0.1");
    expect(ignite).not.toBe(TIMELINE);
    expect(syncGaps(FILM_TEXT, ignite)).toHaveLength(1);
    const moved = TIMELINE.replace(/TEXT_REVEAL = [\d.]+/, "TEXT_REVEAL = 22.0");
    expect(moved).not.toBe(TIMELINE);
    expect(syncGaps(FILM_TEXT, moved)).toHaveLength(1);
    const forged = TIMELINE.replace(/forgeEnd:\s*[\d.]+/, "forgeEnd: 21.8");
    expect(forged).not.toBe(TIMELINE);
    expect(syncGaps(FILM_TEXT, forged)).toHaveLength(1);
    const settled = TIMELINE.replace(/settleEnd:\s*[\d.]+/, "settleEnd: 21.5");
    expect(settled).not.toBe(TIMELINE);
    expect(syncGaps(FILM_TEXT, settled)).toHaveLength(1);
    expect(syncGaps({ ...FILM_TEXT, hideAt: 0 }, TIMELINE)).toHaveLength(1);
  });

  it("فصلٌ خارج البوابة، ونصٌّ يخفت في غير القصّة، ولوحةٌ تضيق عن العمود — تُلتقط", () => {
    const loose = `${CSS}\n.nx-brand-art[data-film-act="story"] .nx-brand-copy { opacity: 0; }`;
    expect(ungatedActRules(loose)).toEqual(['.nx-brand-art[data-film-act="story"] .nx-brand-copy']);
    const reveal = `${CSS}\n@media (${GATE}) { ${SWITCH} .nx-brand-art[data-film-act="reveal"] .nx-brand-title { visibility: hidden; } }`;
    expect(ungatedActRules(reveal)).toEqual([]);
    expect(copyHiders(reveal)).toHaveLength(copyHiders(CSS).length + 1);
    const narrow = `${CSS}\n.nx-brand[data-kind="banner"] { max-inline-size: 800px; margin-inline: auto; }`;
    expect(narrowing(narrow)).toEqual(["max-inline-size: 800px", "margin-inline: auto"]);
  });

  it("فيلمٌ قبل حراسته أو يتجاهل الإيقاف أو يسبق الملصق، وصفٌّ في غير موضعه — تُلتقط", () => {
    const unguarded = CODE.replace("if (!play || failed || !src) return null;", "");
    expect(unguarded).not.toBe(CODE);
    expect(gatedBeforeVideo(unguarded)).toBe(false);
    const ignoresPause = CODE.replace(PLAY_LINE, "const play = allowed && posterReady;");
    expect(ignoresPause).not.toBe(CODE);
    expect(gatedBeforeVideo(ignoresPause)).toBe(false);
    // تركيبٌ قبل أن يُرسم الملصق — مع الترطيب.
    const eager = CODE.replace(PLAY_LINE, "const play = allowed && !paused;");
    expect(eager).not.toBe(CODE);
    expect(gatedBeforeVideo(eager)).toBe(false);
    const idle = CODE.replace(
      "if (img.complete) {",
      'window.addEventListener("load", go);\n    if (img.complete) {',
    );
    expect(idle).not.toBe(CODE);
    expect(posterGateGaps(idle)).toEqual(["انتظار الخمول"]);
    const noComplete = CODE.replace("if (img.complete) {", "if (false) {");
    expect(posterGateGaps(noComplete)).toEqual(["complete"]);
    const below = CODE.replace(/<HomeTicker [^>]*\/>/, "").replace(
      "<BrandPlate ar={ar} allowed={allowed} paused={paused} />",
      "<BrandPlate ar={ar} allowed={allowed} paused={paused} />\n<HomeTicker />",
    );
    expect(below).not.toBe(CODE);
    expect(orderGaps(below, PAGE)).toEqual(["الشريط بعد اللوحة"]);
    const swapped = PAGE.replace("<HomeBrandRow />", "").replace(
      "<HomeKpiRow />",
      "<HomeKpiRow />\n<HomeBrandRow />",
    );
    expect(swapped).not.toBe(PAGE);
    expect(orderGaps(CODE, swapped)).toEqual(["الصفّ بعد المؤشرات"]);
  });

  it("فيلمٌ يُعاد وحده — `loop`، أو تشغيلٌ تلقائيّ بعد النهاية، أو مراقبٌ يشغّل المنتهي — يُلتقط", () => {
    const looped = CODE.replace("        playsInline\n", "        playsInline\n        loop\n");
    expect(looped).not.toBe(CODE);
    expect(restartGaps(looped)).toEqual(["loop"]);
    const always = CODE.replace("if (!jewelRef.current) bound.begin();", "bound.begin();");
    expect(always).not.toBe(CODE);
    expect(restartGaps(always)).toEqual(["بدء بعد النهاية"]);
    const watcher = CODE.replace("if (jewelRef.current || video.ended) return;", "");
    expect(watcher).not.toBe(CODE);
    expect(restartGaps(watcher)).toEqual(["المراقب"]);
    const noEnd = CODE.replace("setEnded(true);", "");
    expect(restartGaps(noEnd)).toEqual(["ended"]);
  });

  it("كتمٌ يُرفع بلا سؤال التفضيل أو قبل الإذن، أو إسكاتٌ يوقف الفيلم، أو سمتا `autoPlay`/`muted` — يُلتقط", () => {
    expect(soundStartGaps(CODE)).toEqual([]);
    const unasked = CODE.replace(
      "if (!opts.wanted() || opts.offscreen() || filmAudioHeld()) {",
      "if (opts.offscreen() || filmAudioHeld()) {",
    );
    expect(unasked).not.toBe(CODE);
    expect(soundStartGaps(unasked)).toEqual(["سؤال التفضيل"]);
    // رفعٌ ثانٍ للكتم خارج `audible()` — يتجاوز التفضيل والإذن معًا.
    const second = CODE.replace(
      "    kick: () => {",
      "    kick: () => {\n      video.muted = false;",
    );
    expect(second).not.toBe(CODE);
    expect(soundStartGaps(second)).toEqual(["رفع كتمٍ صريح × 2"]);
    // يُرفع الكتم قبل الإذن (قاعدة Chromium): الشرط الأوّل في `audible()`.
    const early = CODE.replace("unlocked && opts.wanted() &&", "opts.wanted() &&");
    expect(early).not.toBe(CODE);
    expect(soundStartGaps(early)).toEqual(["شروط الصوت"]);
    const pausing = CODE.replace("video.muted = true;\n    },", "video.pause();\n    },");
    expect(pausing).not.toBe(CODE);
    expect(soundStartGaps(pausing)).toEqual(["pause لأجل الصوت"]);
    const auto = CODE.replace("        playsInline\n", "        playsInline\n        autoPlay\n");
    expect(auto).not.toBe(CODE);
    expect(soundStartGaps(auto)).toEqual(["autoPlay"]);
    const muted = CODE.replace("        playsInline\n", "        playsInline\n        muted\n");
    expect(muted).not.toBe(CODE);
    expect(soundStartGaps(muted)).toEqual(["muted سمةً"]);
    expect(soundStartGaps(`${CODE}\n<audio />`)).toEqual(["<audio>"]);
  });

  it("زرّ صوتٍ بلا حاله أو نوعه أو رموزه، وهدفٌ دون 44px — يُلتقط", () => {
    const stateless = CODE.replace("aria-pressed={jewel ? undefined : audible}", "");
    expect(soundButtonGaps(stateless)).toEqual(["aria-pressed={jewel ? undefined : audible}"]);
    const typeless = CODE.replace(
      'type="button"\n          className="nx-brand-sound',
      'className="nx-brand-sound',
    );
    expect(typeless).not.toBe(CODE);
    expect(soundButtonGaps(typeless)).toEqual(['type="button"']);
    expect(soundButtonGaps(CODE.replace("<RotateCcw", "<Repeat"))).toEqual(["<RotateCcw"]);
    expect(soundButtonGaps("")).toEqual(["لا زرّ"]);
    const small = CSS.replace(
      "inline-size: 44px;\n  block-size: 44px;",
      "inline-size: 32px;\n  block-size: 32px;",
    );
    expect(small).not.toBe(CSS);
    expect(soundTargetGaps(small)).toEqual(["العرض", "الارتفاع"]);
  });

  it("جوهرةٌ تتحرّك خارج البوابة أو لا تقف بالإيقاف، أو تظهر خارج فصلها، أو تحرّك التخطيط — تُلتقط", () => {
    const loose = `${CSS}\n.nx-jewel-glint { animation-name: nxJewelGlint; }`;
    expect(jewelGaps(loose)).toEqual(["حركة: .nx-jewel-glint"]);
    const unpaused = CSS.replace(":not([data-paused]):not([data-offscreen])", "");
    expect(unpaused).not.toBe(CSS);
    expect(jewelGaps(unpaused)).toHaveLength(1);
    const shown = `${CSS}\n.nx-brand-art[data-film-act="jewel"] .nx-brand-jewel { display: block; }`;
    expect(jewelGaps(shown)).toHaveLength(1);
    const always = CSS.replace("  block-size: 66.71%;\n  display: none;", "  block-size: 66.71%;");
    expect(always).not.toBe(CSS);
    expect(jewelGaps(always)).toEqual(["الأساس ظاهر"]);
    const layout = `${CSS}\n@keyframes nxJewelDrift { to { left: 10%; } }`;
    expect(jewelGaps(layout)).toEqual(["nxJewelDrift: left"]);
    const forced = CSS.replace("display: none !important;", "display: none;");
    expect(forced).not.toBe(CSS);
    expect(jewelGaps(forced)).toEqual(["الألوان القسرية"]);
  });

  it("قارئ عرض WebP يقرأ عرضًا حقيقيًّا، وصورةٌ مقصوصة الارتفاع تخرج عن 3:1", () => {
    const bytes = readFileSync(`public${POSTERS[0]}`);
    expect(webpWidth(bytes)).toBe(Number(/-(\d+)\.webp$/.exec(POSTERS[0])![1]));
    expect(offRatio(webpSize(bytes))).toBe(false);
    // قصٌّ يُبقي العرض ويُسقط ربع الارتفاع (VP8: الارتفاع في البايتين 28–29).
    const cropped = Buffer.from(bytes);
    cropped.writeUInt16LE(Math.round(webpSize(bytes).height * 0.75), 28);
    expect(offRatio(webpSize(cropped))).toBe(true);
  });

  it("أيّ مسارٍ سمعيّ في WebM يُلتقط — لا Opus وVorbis وحدهما", () => {
    const element = (id: string) =>
      Buffer.concat([Buffer.from([0x86, 0x80 | id.length]), Buffer.from(id)]);
    expect(matroskaCodecs(Buffer.concat([element("V_VP9"), element("A_AAC")]))).toEqual([
      "V_VP9",
      "A_AAC",
    ]);
    expect(matroskaCodecs(element("A_PCM/INT/LIT"))).toEqual(["A_PCM/INT/LIT"]);
  });

  it("سمة `poster` على الفيلم، ودخولٌ يصغّر البانر — يُلتقطان", () => {
    const withPoster = CODE.replace(
      'className="nx-brand-film"',
      'className="nx-brand-film"\n      poster={src}',
    );
    expect(withPoster).not.toBe(CODE);
    expect(filmAttrs(withPoster)).toContain("poster=");
    const scaled = `${MOTION}\n@keyframes nxHomeFade { from { scale: 0.985; } }`;
    expect(keyframeProps(scaled, "nxHomeFade")).toContain("scale");
  });
});

/* ── الصور: لوحة المالك بلا نصّها ─────────────────────────────────────── */

describe("الصور — لوحة المالك بلا نصّها، وتحت سقف N3", () => {
  it("أربع درجات من اللوحة الممسوحة، كلّها موجودة بعرضها المكتوب ونسبة 3:1", () => {
    expect(POSTERS).toHaveLength(4);
    for (const p of POSTERS) {
      expect(p, `${p}: ليست اللوحة الممسوحة`).toMatch(/\/sadeed-banner-clean-\d+\.webp$/);
      expect(existsSync(`public${p}`), `${p} غائب`).toBe(true);
      const bytes = readFileSync(`public${p}`);
      expect(bytes.toString("latin1", 8, 12)).toBe("WEBP");
      expect(webpWidth(bytes)).toBe(Number(/-(\d+)\.webp$/.exec(p)![1]));
      expect(offRatio(webpSize(bytes)), `${p}: خرج عن 3:1`).toBe(false);
    }
  });

  it("وزن صور الرئيسية كلّها ≤ 400 KB (N3)", () => {
    expect(walkBytes("public/home")).toBeLessThanOrEqual(IMAGE_CEILING);
  });

  it("اللوحة زخرفةٌ لقارئ الشاشة بأبعادها المرسومة، ولا لون سداسي في المكوّن", () => {
    // النصّ فوقها حقيقيّ، فبديلها فارغ — وإلا قُرئ الاسم مرّتين.
    expect(CODE).toMatch(/alt=""\s+decoding="async"\s+fetchPriority="high"/);
    // الصورة بأبعادها المرسومة (3:1) فلا قفزة تخطيط.
    expect(CODE).toContain("width={BRAND_RATIO.width}");
    expect(CODE).toContain("height={BRAND_RATIO.height}");
    expect(CODE).toMatch(/BRAND_RATIO = \{ width: 2172, height: 724 \}/);
    // لا لون سداسي في المكوّن (المادة ٣٣).
    expect(CODE.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });
});

/* ── النصّ: نصّ المالك الحرفيّ، حقيقيٌّ في الشجرة ─────────────────────── */

describe("الاسم والسطر — نصّ المالك الحرفيّ، نصًّا حقيقيًّا", () => {
  it("في المصدر بنصّه، ومربوطان في طبقة النصّ", () => {
    expect(copyGaps(CODE)).toEqual([]);
    expect(HOME_BRAND.banner.title).toEqual({ ar: OWNER.ar, en: OWNER.en });
    expect(HOME_BRAND.banner.tagline.ar).toBe(OWNER.tagline);
  });

  it("المصيَّر: الاسم بلسانيه والسطر بلغة الواجهة نصٌّ في الشجرة، والصورة بلا بديل", async () => {
    const view = render(createElement(I18nProvider, null, createElement(HomeBrandRow)));
    await act(async () => {});
    const copy = view.container.querySelector(".nx-brand-copy");
    expect(copy, "طبقة النصّ غائبة").not.toBeNull();
    expect(copy!.querySelector('.nx-brand-title [lang="en"]')?.textContent).toBe(OWNER.en);
    expect(copy!.querySelector('.nx-brand-title [lang="ar"]')?.textContent).toBe(OWNER.ar);
    const tagline = copy!.querySelector(".nx-brand-tagline");
    expect(tagline?.textContent).toBe(OWNER.tagline);
    expect(tagline?.getAttribute("lang")).toBe("ar");
    expect(tagline?.getAttribute("dir")).toBe("rtl");
    expect(view.container.querySelector("img.nx-brand-poster")?.getAttribute("alt")).toBe("");
    view.unmount();
  });
});

/* ── الفيلم: بصوته في حاويته، بسقف، وبلحظتي نصٍّ من زمنه ──────────────── */

describe("الفيلم — بمسار صوتٍ واحد مدمج في حاويته، بسقف وزن، ولحظتا النصّ من زمنه", () => {
  it("درجتان مذكورتان، لكلٍّ MP4 (H.264 + AAC) وWebM (VP9 + Opus) موجودان بمسار صوتٍ واحد ومدّة 26 ث", () => {
    expect(FILMS).toHaveLength(2);
    expect(FILMS).toEqual(BRAND_FILMS.map((f) => f.src));
    let total = 0;
    for (const f of FILMS) {
      const phone = f === BRAND_FILMS[0].src;
      const ceiling = phone ? FILM_CEILING.phone : FILM_CEILING.each;
      expect(existsSync(`public${f}`), `${f} غائب`).toBe(true);
      const bytes = readFileSync(`public${f}`);
      const webm = f.replace(/\.mp4$/, ".webm");
      expect(existsSync(`public${webm}`), `${webm} غائب`).toBe(true);
      const wb = readFileSync(`public${webm}`);
      // مسارا الفيديو والصوت في الحاوية نفسها: الصوت لا يتزامن بالقفز مع ملفٍّ آخر.
      expect(filmTrackGaps(bytes, wb), `${f}: مسارات الحاوية`).toEqual([]);
      expect(bytes.length, `${f}: فوق السقف`).toBeLessThanOrEqual(ceiling);
      expect(wb.length, `${webm}: فوق السقف`).toBeLessThanOrEqual(ceiling);
      total += bytes.length + wb.length;
    }
    expect(total).toBeLessThanOrEqual(FILM_CEILING.total);
  });

  it("لا ملفّ موسيقى منفصل يُشحن، ولا `<audio>` في المصدر", () => {
    expect(strayScores(readdirSync("public/media/brand"))).toEqual([]);
    expect(hasAudioElement(CODE)).toBe(false);
  });

  it("الفيلم مضمَّنٌ ويُعرض مرّةً، بمصدرين، بلا سمتَي `autoPlay`/`muted` وبلا أزرار ولا صورة داخل صورة", () => {
    const video = filmAttrs(CODE);
    // بلا `poster`: الصورة تحت الفيلم هي الملصق — والسمة جعلت الفيلم المركَّب بعد
    // الترطيب مرشّحَ LCP ونزّلت نسخة 1600 على الجوال (Lighthouse ٢٠٢٦/١٠/١٨).
    expect(video, "<video> بسمة poster").not.toContain("poster=");
    for (const attr of [
      "playsInline",
      "aria-hidden",
      "disablePictureInPicture",
      "onError=",
      "onEnded=",
      'type="video/mp4"',
      'type="video/webm"',
    ]) {
      expect(video, `<video> بلا ${attr}`).toContain(attr);
    }
    // البدء كلّه من `bindFilmSound.begin` بعد سؤال التفضيل: السمتان تفرضان بدءًا صامتًا أو بلا سؤال.
    expect(video, "<video> بسمة autoPlay").not.toMatch(/\bautoPlay\b/);
    expect(video, "<video> بسمة muted").not.toMatch(/\bmuted\b/);
    // مرّةً لا حلقة (R4): بلا `loop`، والنهاية «جوهرة» لا إعادة.
    expect(video, "<video> بحلقة").not.toMatch(/\bloop\b/);
    // MP4 أوّلًا: المتصفّح يأخذ أوّل مصدرٍ يقدر عليه.
    expect(video.indexOf('type="video/mp4"')).toBeLessThan(video.indexOf('type="video/webm"'));
    // وخطأ مصدرٍ واحد لا يُسقط الفيلم قبل تجربة الثاني (يصعد في شجرة React):
    // الفشل ما استهدف العنصر أو جاء بعد استنفاد المصادر.
    expect(video).toContain("video.networkState === video.NETWORK_NO_SOURCE");
    expect(video).toContain("e.target === video");
    expect(video).not.toContain("controls");
  });

  it("لحظتا النصّ من زمن الفيلم الواحد، والفصول بحدودها، والجوهرة من 24 ث والحاوية 24 + FILM_TAIL", () => {
    expect(syncGaps(FILM_TEXT, TIMELINE)).toEqual([]);
    expect(filmActAt(0)).toBe("hold");
    expect(filmActAt(FILM_TEXT.hideAt - 0.01)).toBe("hold");
    expect(filmActAt(FILM_TEXT.hideAt)).toBe("story");
    expect(filmActAt(FILM_TEXT.revealAt - 0.01)).toBe("story");
    expect(filmActAt(FILM_TEXT.revealAt)).toBe("reveal");
    // آخر إطارات الفيلم كشفٌ — ومن 24 ث جوهرة، والإطار الثابت (الذيل) تحتها لا تحت اللوحة بلا جوهرة.
    expect(filmActAt(FILM_TEXT.seconds - 1 / 30)).toBe("reveal");
    expect(filmActAt(FILM_TEXT.seconds)).toBe("jewel");
    expect(filmActAt(FILM_TEXT.seconds + FILM_TAIL)).toBe("jewel");
    expect(FILM_TAIL).toBe(2);
    expect(FILM_TEXT.seconds + FILM_TAIL).toBe(CONTAINER_SECONDS);
  });

  it("مرّةً لا حلقة: النهاية تكتب الجوهرة، ولا يُعاد الفيلم وحده", () => {
    expect(restartGaps(CODE)).toEqual([]);
  });
});

/* ── الصوت: مسار الفيلم نفسه، لا يُرفع كتمه بلا تفضيل، وزرٌّ يكتمه ─────── */

describe("الصوت — مسارٌ في الفيلم، وتفضيل الزائر قبل كل رفعٍ للكتم (WCAG 1.4.2)", () => {
  it("لا رفع كتمٍ بلا سؤال التفضيل ولا قبل الإذن، ولا `autoPlay`/`muted` سمةً، والمفتاح `nx-brand-music`", () => {
    expect(soundStartGaps(CODE)).toEqual([]);
    expect(MUSIC_KEY).toBe("nx-brand-music");
    // كل وصولٍ إلى التخزين في `try` (المحجوب لا يكسر شيئًا).
    expect((CODE.match(/\} catch \{/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it("زرّ الصوت: زرٌّ حقيقيّ بحاله ورموزه، بأسمائه في اللغتين، وهدفٌ ≥ 44px", () => {
    expect(soundButtonGaps(CODE)).toEqual([]);
    expect(SOUND_LABELS).toEqual(SOUND);
    expect(soundTargetGaps(CSS)).toEqual([]);
  });
});

/* ── البوابات: لمن لم يطلب السكون ولا توفير البيانات ───────────────── */

describe("البوابات — الفيلم اختيارٌ لا افتراض", () => {
  it("يُركَّب بعد أوّل رسمة فقط، وخلف أربع بوابات، ويقف خارج الإطار وتحت اللوحة", () => {
    expect(gatedBeforeVideo(CODE)).toBe(true);
    expect(CODE).toContain("useState(false)");
    expect(CODE).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(CODE).toContain("isSafeMode()");
    expect(CODE).toContain('getAttribute("data-nx-motion") !== "off"');
    expect(CODE).toContain("saveData !== true");
    expect(CODE).toContain("new IntersectionObserver(");
    expect(CODE).toContain("holdFilmUnderPanel(video)");
    // والمفتاح يُراقَب في أثناء الجلسة لا عند التركيب وحده.
    expect(CODE).toMatch(/attributeFilter: \["data-nx-motion", "class"\]/);
  });

  it("وللمستخدم إيقافٌ يُحفظ (WCAG 2.2.2) — والفيلم يظهر حين يُعرض إطاره", () => {
    // الزرّ نفسه في طرف الشريط، وعقده في home-ticker.contract.test.ts.
    expect(CODE).toContain('const PAUSE_KEY = "nx-brand-motion";');
    expect(CODE).toMatch(/localStorage\.getItem\(PAUSE_KEY\) === "paused"/);
    // لا يُعوَّل على شفافية ما قبل الإطار الأوّل في كل محرّك.
    expect(filmAttrs(CODE)).toContain("data-ready={ready || undefined}");
    expect(filmAttrs(CODE)).toMatch(/onPlaying=\{\(e\) => \{\s*setReady\(true\);/);
    expect(CSS).toMatch(/\.nx-brand-film:not\(\[data-ready\]\) \{\s*opacity: 0;/);
  });

  it("والفيلم يبدأ حين يُرسم الملصق («وبمجرد فتح الموقع») — لا قبله ولا بعد خمول الصفحة", () => {
    expect(posterGateGaps(CODE)).toEqual([]);
    expect(gatedBeforeVideo(CODE)).toBe(true);
  });

  it("البريق متغيّران يُمرَّران لا قيمةٌ نهائية (المادة ٣٣)", () => {
    const sets = [...CODE.matchAll(/style\.setProperty\("([^"]+)"/g)].map((m) => m[1]);
    expect(sets.length).toBeGreaterThan(0);
    for (const prop of sets) expect(prop.startsWith("--"), `setProperty(${prop})`).toBe(true);
  });
});

/* ── المصيَّر: الملصق ثم الفيلم، والنصّ يتبعه، ومرّةً ثم الجوهرة، والصوت ───── */

/**
 * وسائط مزيّفة على نموذج `HTMLMediaElement` نفسه: jsdom لا يشغّل شيئًا، فالحال في جدولٍ والأحداث بيد
 * الاختبار — **وتُركَّب قبل التركيب** لأن البدء (`begin`) يجري في تأثير التركيب لا بعده.
 * وفيها سياسة المتصفّح كما هي: التشغيل بصوتٍ يُرفض (`NotAllowedError`) ما لم يُؤذَن (`activated`)، ورفعُ
 * كتم فيلمٍ جارٍ بلا إذن **يوقفه** (قاعدة Chromium) — فيحمرّ الاختبار إن رُفع الكتم قبل الإذن.
 */
type MediaState = {
  paused: boolean;
  ended: boolean;
  time: number;
  ready: number;
  muted: boolean;
  /** حال الكتم عند كل استدعاء `play()`. */
  plays: boolean[];
  /** إيقافاتٌ فعلية (لا المتكرّرة على موقوف). */
  pauses: number;
  /** مرّات رفع الكتم. */
  unmutes: number;
};
const MEDIA = new WeakMap<HTMLMediaElement, MediaState>();
const mediaOf = (el: HTMLMediaElement): MediaState => {
  let m = MEDIA.get(el);
  if (!m) {
    m = {
      paused: true,
      ended: false,
      time: 0,
      ready: 0,
      muted: false,
      plays: [],
      pauses: 0,
      unmutes: 0,
    };
    MEDIA.set(el, m);
  }
  return m;
};
const policy = {
  autoplay: "allowed" as "allowed" | "blocked",
  /** هل لمس الزائر الصفحة؟ (التفعيل) — يفتح التشغيل بصوت. */
  activated: false,
  /** المتصفّح يمنع حتى التشغيل المكتوم (توفير الطاقة في iOS). */
  refuseMuted: false,
  /** عنصرٌ بـ`preload="none"`: إطاره بعد جلبٍ من الشبكة لا داخل `play`. */
  lazy: false,
  last: null as HTMLMediaElement | null,
};
const MEDIA_KEYS = [
  "paused",
  "ended",
  "readyState",
  "currentTime",
  "muted",
  "play",
  "pause",
] as const;
const savedMedia = new Map<string, PropertyDescriptor | undefined>();

function installMedia(): void {
  const proto = HTMLMediaElement.prototype;
  policy.autoplay = "allowed";
  policy.activated = false;
  policy.refuseMuted = false;
  policy.lazy = false;
  policy.last = null;
  for (const key of MEDIA_KEYS) savedMedia.set(key, Object.getOwnPropertyDescriptor(proto, key));
  const def = (key: (typeof MEDIA_KEYS)[number], desc: PropertyDescriptor) =>
    Object.defineProperty(proto, key, { configurable: true, ...desc });
  def("paused", {
    get(this: HTMLMediaElement) {
      return mediaOf(this).paused;
    },
  });
  def("ended", {
    get(this: HTMLMediaElement) {
      return mediaOf(this).ended;
    },
  });
  def("readyState", {
    get(this: HTMLMediaElement) {
      return mediaOf(this).ready;
    },
  });
  def("currentTime", {
    get(this: HTMLMediaElement) {
      return mediaOf(this).time;
    },
    set(this: HTMLMediaElement, v: number) {
      const m = mediaOf(this);
      m.time = v;
      m.ended = false;
    },
  });
  def("muted", {
    get(this: HTMLMediaElement) {
      return mediaOf(this).muted;
    },
    set(this: HTMLMediaElement, v: boolean) {
      const m = mediaOf(this);
      if (m.muted === v) return;
      m.muted = v;
      // قاعدة Chromium: رفعُ كتم فيلمٍ جارٍ بلا إذنٍ يوقفه.
      if (!v && !m.paused && policy.autoplay === "blocked" && !policy.activated) {
        m.paused = true;
        this.dispatchEvent(new Event("pause"));
      }
      if (!v) m.unmutes += 1;
      this.dispatchEvent(new Event("volumechange"));
    },
  });
  def("play", {
    writable: true,
    value: function (this: HTMLMediaElement) {
      const m = mediaOf(this);
      policy.last = this;
      m.plays.push(m.muted);
      const refused = m.muted
        ? policy.refuseMuted
        : policy.autoplay === "blocked" && !policy.activated;
      if (refused) return Promise.reject(new DOMException("blocked", "NotAllowedError"));
      m.paused = false;
      m.ended = false;
      this.dispatchEvent(new Event("play"));
      if (!policy.lazy) {
        m.ready = 4;
        this.dispatchEvent(new Event("playing"));
      }
      return Promise.resolve();
    },
  });
  def("pause", {
    writable: true,
    value: function (this: HTMLMediaElement) {
      const m = mediaOf(this);
      if (m.paused) return;
      m.pauses += 1;
      m.paused = true;
      this.dispatchEvent(new Event("pause"));
    },
  });
}

function uninstallMedia(): void {
  const proto = HTMLMediaElement.prototype;
  for (const key of MEDIA_KEYS) {
    const original = savedMedia.get(key);
    if (original) Object.defineProperty(proto, key, original);
    else delete (proto as unknown as Record<string, unknown>)[key];
  }
  savedMedia.clear();
}

/** يسجّل الوسائط المزيّفة لكل اختبارٍ في المجموعة الحاوية. */
function useMediaFakes(): void {
  beforeEach(installMedia);
  afterEach(uninstallMedia);
}

/** مراقب إطارٍ مزيّف — jsdom بلا `IntersectionObserver`، والاختبار يقرّر الظهور. */
class FakeObserver {
  static all: FakeObserver[] = [];
  constructor(readonly cb: IntersectionObserverCallback) {
    FakeObserver.all.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  static show(visible: boolean) {
    for (const o of FakeObserver.all) {
      o.cb(
        [{ isIntersecting: visible } as IntersectionObserverEntry],
        o as unknown as IntersectionObserver,
      );
    }
  }
}

const wait = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });

/**
 * يركّب الصفّ، ويرسم الملصق، فيبدأ الفيلم من تأثير التركيب (`begin`) — ثم يضع زمنه عند `at` ثانية.
 * `refuse`: المتصفّح يمنع التشغيل بصوتٍ؛ `refuseMuted`: ويمنع المكتوم أيضًا.
 */
async function mountFilm(at: number, opts: { refuse?: boolean; refuseMuted?: boolean } = {}) {
  policy.autoplay = opts.refuse ? "blocked" : "allowed";
  policy.refuseMuted = opts.refuseMuted ?? false;
  const view = render(createElement(I18nProvider, null, createElement(HomeBrandRow)));
  await act(async () => {});
  expect(view.container.querySelector("video"), "فيلمٌ قبل الملصق").toBeNull();
  const poster = view.container.querySelector<HTMLImageElement>("img.nx-brand-poster")!;
  await act(async () => {
    fireEvent.load(poster);
  });
  // ما بعد وعد التشغيل (إذنٌ أو رفضٌ ثم بدءٌ مكتوم).
  await act(async () => {});
  const video = opts.refuseMuted
    ? policy.last!
    : view.container.querySelector<HTMLVideoElement>("video.nx-brand-film");
  expect(video, "الفيلم لم يُركَّب بعد الملصق").not.toBeNull();
  expect(view.container.querySelector("audio"), "عنصر صوتٍ منفصل").toBeNull();
  const el = video as HTMLVideoElement;
  const m = mediaOf(el);
  const film = {
    state: m,
    get plays() {
      return m.plays;
    },
    get pauses() {
      return m.pauses;
    },
    clear() {
      m.plays = [];
      m.pauses = 0;
    },
  };
  const art = view.container.querySelector<HTMLElement>(".nx-brand-art")!;
  const seek = (seconds: number) => {
    m.time = seconds;
    fireEvent(el, new Event("timeupdate"));
  };
  seek(at);
  const end = async () => {
    m.time = FILM_TEXT.seconds + FILM_TAIL;
    m.paused = true;
    m.ended = true;
    await act(async () => {
      fireEvent(el, new Event("pause"));
      fireEvent(el, new Event("ended"));
    });
  };
  return { view, video: el, art, film, seek, end };
}

describe("المصيَّر — الملصق ثم الفيلم، والنصّ يتبعه ولا يبقى خافتًا بعده", () => {
  useMediaFakes();
  afterEach(() => {
    localStorage.removeItem("nx-brand-motion");
    localStorage.removeItem(MUSIC_KEY);
    delete document.documentElement.dataset.nxMotionPaused;
    vi.restoreAllMocks();
  });

  it("لا فيلم قبل الملصق، ويُركَّب حين تكتمل الصورة — أو كانت مكتملة عند التركيب", async () => {
    const { view } = await mountFilm(0);
    view.unmount();
    // الصورة المخزَّنة مكتملةٌ قبل الترطيب: لا حدث `load` بعده.
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    const cached = render(createElement(I18nProvider, null, createElement(HomeBrandRow)));
    await act(async () => {});
    expect(cached.container.querySelector("video.nx-brand-film")).not.toBeNull();
    cached.unmount();
  });

  it("الفصل من زمن الإطار المعروض (والجوهرة من 24 ث)، ويزول بزرّ الإيقاف فيعود النصّ", async () => {
    const { view, art, seek } = await mountFilm(10);
    expect(art.dataset.filmAct).toBe("story");
    seek(FILM_TEXT.revealAt + 0.5);
    expect(art.dataset.filmAct).toBe("reveal");
    seek(0);
    expect(art.dataset.filmAct).toBe("hold");
    // الإطار الثابت بعد 24 ث: الجوهرة ظاهرةٌ والفيلم لم ينتهِ بعد (الذيل يذوب تحتها).
    seek(FILM_TEXT.seconds);
    expect(art.dataset.filmAct).toBe("jewel");
    seek(10);
    expect(art.dataset.filmAct).toBe("story");
    fireEvent.click(view.getByRole("button", { name: "إيقاف الحركة" }));
    await act(async () => {});
    expect(view.container.querySelector("video")).toBeNull();
    expect(view.container.querySelector("audio")).toBeNull();
    expect(art.dataset.filmAct, "النصّ بقي خافتًا بعد الإيقاف").toBeUndefined();
    view.unmount();
  });

  it("وفيلمٌ يتعذّر في منتصف القصّة يزول إلى الجوهرة — والاسم ظاهرٌ فوق اللوحة الممسوحة", async () => {
    const { view, video, art } = await mountFilm(12);
    expect(art.dataset.filmAct).toBe("story");
    await act(async () => {
      fireEvent.error(video);
    });
    expect(view.container.querySelector("video")).toBeNull();
    // لا «قصّة» بعد زوال الفيلم: الجوهرة فصلٌ لا يُخفي النصّ (يُخفيه فصل القصّة وحده، أدناه).
    expect(art.dataset.filmAct, "النصّ بقي خافتًا بعد تعذّر الفيلم").toBe("jewel");
    view.unmount();
  });

  it("ومنعُ المتصفّح التشغيلَ حتى مكتومًا (توفير الطاقة) يُسقط الفيلم إلى الجوهرة — لا إطارًا متجمّدًا", async () => {
    const { view, art } = await mountFilm(2, { refuse: true, refuseMuted: true });
    expect(view.container.querySelector("video")).toBeNull();
    expect(art.dataset.filmAct).toBe("jewel");
    view.unmount();
  });
});

describe("المصيَّر — مرّةً ثم الجوهرة، ولا يُعاد وحده", () => {
  useMediaFakes();
  beforeEach(() => {
    FakeObserver.all = [];
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.removeItem("nx-brand-motion");
    localStorage.removeItem(MUSIC_KEY);
    delete document.documentElement.dataset.nxMotionPaused;
    document.documentElement.removeAttribute("data-sadeed-panel");
  });

  it("النهاية تكتب الجوهرة، ولا تشغيل بالعودة إلى الإطار ولا بإغلاق اللوحة ولا بعد الإيقاف", async () => {
    // جهاز لمس: الإيقاف تحت لوحة سَدِيد يجري فعلًا (`holdFilmUnderPanel`) — وتقليل الحركة غير مطلوب.
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query === "(pointer: coarse)",
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );
    const { view, art, film, end } = await mountFilm(20);
    // والإيقاف تحت اللوحة يعمل على الفيلم الجاري: يقف ويُستأنف — فالفحص بعده ليس على مسارٍ ميت.
    const root = document.documentElement;
    const started = film.plays.length;
    await act(async () => {
      root.setAttribute("data-sadeed-panel", "open");
    });
    expect(film.pauses, "اللوحة لم توقف الفيلم على اللمس").toBeGreaterThan(0);
    await act(async () => {
      root.removeAttribute("data-sadeed-panel");
    });
    expect(film.plays.length, "إغلاق اللوحة لم يستأنف الفيلم الجاري").toBeGreaterThan(started);
    await end();
    expect(art.dataset.filmAct).toBe("jewel");
    film.clear();
    // يخرج الصفّ من الإطار ويعود — والمنتهي لا يُشغَّل.
    await act(async () => {
      FakeObserver.show(false);
      FakeObserver.show(true);
    });
    expect(film.plays, "المراقب أعاد الفيلم").toEqual([]);
    // اللوحة تُفتح وتُغلق — والمنتهي موقوفٌ فلا يُستأنف.
    await act(async () => {
      root.setAttribute("data-sadeed-panel", "open");
    });
    await act(async () => {
      root.removeAttribute("data-sadeed-panel");
    });
    expect(film.plays, "إغلاق اللوحة أعاد الفيلم").toEqual([]);
    // «إيقاف الحركة» ثم استئنافها: الجوهرة باقية، والعائد بلا تشغيلٍ ولا تحميل.
    const proto = vi.spyOn(HTMLMediaElement.prototype, "play");
    const pause = view.getByRole("button", { name: "إيقاف الحركة" });
    fireEvent.click(pause);
    await act(async () => {});
    expect(view.container.querySelector("video")).toBeNull();
    expect(art.dataset.filmAct, "الجوهرة سقطت بالإيقاف").toBe("jewel");
    fireEvent.click(pause);
    await act(async () => {
      FakeObserver.show(true);
    });
    const back = view.container.querySelector<HTMLVideoElement>("video.nx-brand-film")!;
    expect(back, "الفيلم لم يعد بعد الاستئناف").not.toBeNull();
    expect(back.autoplay, "العائد بعد النهاية يبدأ وحده").toBe(false);
    expect(back.getAttribute("preload")).toBe("none");
    expect(proto, "العائد بعد النهاية شُغِّل").not.toHaveBeenCalled();
    expect(art.dataset.filmAct).toBe("jewel");
    view.unmount();
  });

  it("زرّ «إعادة العرض مع الموسيقى» بعد النهاية: من أوّله بصوته، ويُسقط الجوهرة", async () => {
    localStorage.setItem(MUSIC_KEY, "off");
    const { view, video, art, film, end } = await mountFilm(20);
    // الكتم المحفوظ يُسأل قبل كل رفع: بدأ مكتومًا بلا محاولة صوت.
    expect(film.plays, "محاولة صوت رغم الكتم المحفوظ").toEqual([true]);
    expect(video.muted).toBe(true);
    await end();
    const replay = view.getByRole("button", { name: SOUND.ar.replay });
    expect(replay.hasAttribute("aria-pressed"), "الإعادة ليست تبديلًا").toBe(false);
    await act(async () => {
      fireEvent.click(replay);
    });
    expect(film.plays, "الإعادة لم تشغّل الفيلم").toHaveLength(2);
    expect(film.state.time).toBe(0);
    expect(video.muted, "الإعادة بلا صوت").toBe(false);
    expect(localStorage.getItem(MUSIC_KEY), "«مع الموسيقى» لم يُحفظ").toBeNull();
    expect(art.dataset.filmAct).not.toBe("jewel");
    view.unmount();
  });

  it("والإعادة بعد إيقاف الحركة واستئنافها تُبقي التركيز على زرّها نفسه — قبل أوّل إطار وبعده (أمسكته المراجعة)", async () => {
    const { view, end } = await mountFilm(20);
    await end();
    const pause = view.getByRole("button", { name: "إيقاف الحركة" });
    fireEvent.click(pause);
    await act(async () => {});
    fireEvent.click(pause);
    await act(async () => {
      FakeObserver.show(true);
    });
    // العائد بعد النهاية عنصرٌ جديد بـ`preload="none"`: لا إطار حتى يُجلب.
    policy.lazy = true;
    const video = view.container.querySelector<HTMLVideoElement>("video.nx-brand-film")!;
    const film = mediaOf(video);
    const replay = view.getByRole("button", { name: SOUND.ar.replay });
    replay.focus();
    expect(document.activeElement).toBe(replay);
    await act(async () => {
      fireEvent.click(replay);
    });
    expect(film.plays, "الإعادة لم تشغّل الفيلم").toHaveLength(1);
    expect(replay.isConnected, "زرّ الإعادة زال بالنقر").toBe(true);
    expect(document.activeElement, "سقط التركيز بالإعادة").toBe(replay);
    film.ready = 4;
    await act(async () => {
      fireEvent(video, new Event("playing"));
    });
    expect(view.container.querySelector(".nx-brand-sound"), "زرٌّ آخر بعد أوّل إطار").toBe(replay);
    expect(document.activeElement, "سقط التركيز مع أوّل إطار").toBe(replay);
    expect(video.muted, "الإعادة بلا صوت").toBe(false);
    view.unmount();
  });
});

describe("المصيَّر — الصوت من الفيلم نفسه: بدءٌ بمحاولة صوت، وإسكاتٌ لا يوقف، وإذنٌ بنقرة", () => {
  useMediaFakes();
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem(MUSIC_KEY);
    localStorage.removeItem("locale");
    localStorage.removeItem("nx-brand-motion");
    delete document.documentElement.dataset.nxMotionPaused;
    document.documentElement.removeAttribute("data-sadeed-panel");
    sadeedState.set("idle");
    SadeedAudioBus.release("chat-tts");
    // يُمحى ما فرضه الاختبار على الوثيقة نفسها (يعود إلى المصدر في النموذج).
    delete (document as unknown as Record<string, unknown>).visibilityState;
  });

  it("يبدأ بمحاولة صوت: مرفوع الكتم من أوّل تشغيل، بلا `<audio>` ولا سمتَي autoplay/muted، والزرّ يعكس `muted`", async () => {
    const { view, video, film } = await mountFilm(3);
    expect(film.plays, "التشغيل الأوّل مكتوم").toEqual([false]);
    expect(video.muted).toBe(false);
    expect(film.state.paused).toBe(false);
    expect(view.container.querySelector("audio")).toBeNull();
    expect(video.hasAttribute("autoplay")).toBe(false);
    expect(video.hasAttribute("muted")).toBe(false);
    const button = view.getByRole("button", { name: SOUND.ar.play });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    // التلميح يطابق الاسم: «كتم» تلميحًا و«تشغيل» اسمًا كانا يتناقضان (أمسكته المراجعة).
    expect(button.getAttribute("title")).toBe(SOUND.ar.play);
    // الزرّ يتبع الفيلم نفسه لا حالًا موازية: كتمٌ من خارج الصفّ ينعكس عليه.
    await act(async () => {
      video.muted = true;
    });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    view.unmount();
  });

  it("الإسكات كتمٌ لا إيقاف: لوحة سَدِيد، ونطق سَدِيد، وإصغاؤه، وتبويبٌ مخفيّ — ويعود الصوت بزوال السبب", async () => {
    const { view, video, film } = await mountFilm(3);
    const root = document.documentElement;
    const muted = (why: string) => {
      expect(video.muted, `${why}: لم يُكتم`).toBe(true);
      expect(film.state.paused, `${why}: أُوقف الفيلم`).toBe(false);
    };
    const sound = (why: string) => {
      expect(video.muted, `${why}: لم يعد الصوت`).toBe(false);
      expect(film.state.paused, `${why}: أُوقف الفيلم`).toBe(false);
    };
    // لوحة سَدِيد تُفتح: يُكتم، وتُغلق: يعود الصوت.
    await act(async () => {
      root.setAttribute("data-sadeed-panel", "open");
    });
    muted("لوحة سَدِيد");
    await act(async () => {
      root.removeAttribute("data-sadeed-panel");
    });
    sound("إغلاق اللوحة");
    // سَدِيد ينطق (ناقل الصوت) أو يُصغي (حالة الحضور).
    SadeedAudioBus.unlock();
    await act(async () => {
      SadeedAudioBus.acquire("chat-tts", () => {});
    });
    muted("سَدِيد ينطق");
    await act(async () => {
      SadeedAudioBus.release("chat-tts");
    });
    sound("انتهى النطق");
    await act(async () => {
      sadeedState.set("listening");
    });
    muted("سَدِيد يُصغي");
    await act(async () => {
      sadeedState.set("idle");
    });
    sound("انتهى الإصغاء");
    // تبويبٌ مخفيّ.
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    muted("تبويبٌ مخفيّ");
    delete (document as unknown as Record<string, unknown>).visibilityState;
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    sound("عاد التبويب");
    // ولا إيقاف واحدًا لأجل الصوت في كل ما سبق.
    expect(film.pauses, "إيقافٌ لأجل الصوت").toBe(0);
    view.unmount();
  });

  it("«إيقاف الحركة» يكتم ويعود الصوت باستئنافها", async () => {
    const { view, video } = await mountFilm(3);
    expect(video.muted).toBe(false);
    await act(async () => {
      document.documentElement.dataset.nxMotionPaused = "1";
    });
    expect(video.muted).toBe(true);
    await act(async () => {
      delete document.documentElement.dataset.nxMotionPaused;
    });
    expect(video.muted).toBe(false);
    view.unmount();
  });

  describe("وخروج الصفّ من الإطار", () => {
    beforeEach(() => {
      FakeObserver.all = [];
      vi.stubGlobal("IntersectionObserver", FakeObserver);
    });
    afterEach(() => vi.unstubAllGlobals());

    it("يكتم الصوت، ويعود بعودته (والفيلم يقف ويُستأنف لفكّ الترميز لا للصوت)", async () => {
      const { view, video, film } = await mountFilm(3);
      expect(video.muted).toBe(false);
      await act(async () => {
        FakeObserver.show(false);
      });
      expect(video.muted).toBe(true);
      await act(async () => {
        FakeObserver.show(true);
      });
      expect(video.muted).toBe(false);
      expect(film.state.paused).toBe(false);
      view.unmount();
    });

    it("بدأ مكتومًا والصفّ خارج الإطار وقت النقرة: لا إعادة صامتة (الصوت لن يُسمع)", async () => {
      const { view, film } = await mountFilm(9, { refuse: true });
      await act(async () => {
        FakeObserver.show(false);
      });
      policy.activated = true;
      fireEvent.click(document.body);
      await wait(GESTURE_GRACE_MS + 30);
      expect(film.state.time, "أُعيد والصفّ خارج الإطار").toBe(9);
      view.unmount();
    });
  });

  it("كتم الزائر يُحفظ ويسكت الفيلم دون إيقافه، والتشغيل من النقرة يمحوه — والزرّ بلغة الواجهة", async () => {
    localStorage.setItem("locale", "en");
    const { view, video, film } = await mountFilm(2);
    const button = view.getByRole("button", { name: SOUND.en.play });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    await act(async () => {
      fireEvent.click(button);
    });
    expect(localStorage.getItem(MUSIC_KEY)).toBe("off");
    expect(video.muted).toBe(true);
    expect(film.state.paused).toBe(false);
    expect(film.pauses).toBe(0);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.getAttribute("title")).toBe(SOUND.en.play);
    await act(async () => {
      fireEvent.click(button);
    });
    expect(localStorage.getItem(MUSIC_KEY)).toBeNull();
    expect(video.muted).toBe(false);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    view.unmount();
  });

  it("التفضيل المحفوظ «مكتوم» يُسأل قبل رفع الكتم: يبدأ مكتومًا بلا محاولة صوت، ونقرةٌ في الصفحة لا ترفعه", async () => {
    localStorage.setItem(MUSIC_KEY, "off");
    const { view, video, film } = await mountFilm(2);
    expect(film.plays, "محاولة صوت رغم الكتم المحفوظ").toEqual([true]);
    expect(video.muted).toBe(true);
    policy.activated = true;
    fireEvent.click(document.body);
    await wait(GESTURE_GRACE_MS + 30);
    expect(video.muted, "نقرةٌ رفعت كتمًا اختاره الزائر").toBe(true);
    // وزرّه وحده يعيده.
    await act(async () => {
      fireEvent.click(view.getByRole("button", { name: SOUND.ar.play }));
    });
    expect(video.muted).toBe(false);
    expect(localStorage.getItem(MUSIC_KEY)).toBeNull();
    view.unmount();
  });

  it("رفض المتصفّح: يحاول بصوت ثم يبدأ مكتومًا من الإطار نفسه، ولا يفتح إلا نقرةٌ صالحة — لا التمرير ولا أزرار الصفّ", async () => {
    const { view, video, film } = await mountFilm(2, { refuse: true });
    expect(film.plays, "محاولة صوتٍ ثم بدءٌ مكتوم").toEqual([false, true]);
    expect(video.muted).toBe(true);
    expect(film.state.paused, "الفيلم لم يبدأ").toBe(false);
    const button = view.getByRole("button", { name: SOUND.ar.play });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    // التمرير ليس إذنًا.
    fireEvent.scroll(window);
    fireEvent.wheel(document.body);
    fireEvent.pointerDown(document.body, { pointerType: "touch" });
    // زرّ «إيقاف الحركة» يقرّر بنفسه — لا يفتح الصوت.
    fireEvent.pointerDown(view.getByRole("button", { name: "إيقاف الحركة" }), {
      pointerType: "mouse",
    });
    // ولا المفاتيح: Tab وسهمٌ تنقّلٌ لا قبولٌ بالصوت (أمسكته المراجعة).
    fireEvent.keyDown(document.body, { key: "Tab" });
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    await wait(GESTURE_GRACE_MS + 30);
    expect(video.muted, "ما ليس إذنًا فتح الصوت").toBe(true);
    // نقرةٌ في الصفحة: تفتح بعد مهلة اللمسة لا قبلها — والفيلم يمضي.
    policy.activated = true;
    fireEvent.click(document.body);
    expect(video.muted).toBe(true);
    await wait(GESTURE_GRACE_MS + 30);
    expect(video.muted).toBe(false);
    expect(film.pauses, "الفتح أوقف الفيلم").toBe(0);
    expect(film.plays, "الفتح أعاد تشغيل الفيلم").toEqual([false, true]);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    view.unmount();
  });

  it("بدأ مكتومًا بمنع المتصفّح: أوّل نقرةٍ صالحة تعيده من الثانية 0 بصوته (أمر المالك ٢٠٢٦/١٠/٢٤) — لا تمريرٌ ولا زرّ الصوت", async () => {
    const { view, video, film } = await mountFilm(9, { refuse: true });
    expect(video.muted).toBe(true);
    // ما ليس إذنًا لا يعيد ولا يفتح.
    fireEvent.scroll(window);
    fireEvent.keyDown(document.body, { key: "Tab" });
    await wait(GESTURE_GRACE_MS + 30);
    expect(film.state.time, "ما ليس نقرةً أعاد الفيلم").toBe(9);
    // نقرةٌ في الصفحة: بعد مهلة اللمسة يُعاد من أوّله ويُفتح الصوت، والفيلم لا يتوقف.
    policy.activated = true;
    fireEvent.click(document.body);
    expect(film.state.time, "أُعيد قبل استقرار اللمسة").toBe(9);
    await wait(GESTURE_GRACE_MS + 30);
    expect(film.state.time, "لم يُعد من أوّله").toBe(0);
    expect(video.muted).toBe(false);
    expect(film.pauses).toBe(0);
    // نقرةٌ ثانية لا تعيده ثانيةً.
    film.state.time = 4;
    fireEvent.click(document.body);
    await wait(GESTURE_GRACE_MS + 30);
    expect(film.state.time, "أُعيد مرّتين").toBe(4);
    view.unmount();
  });

  it("لا إعادة مع تفضيل «مكتوم» محفوظ: نقرةٌ لا تعيد ولا تفتح", async () => {
    localStorage.setItem(MUSIC_KEY, "off");
    const m = await mountFilm(9, { refuse: true });
    policy.activated = true;
    fireEvent.click(document.body);
    await wait(GESTURE_GRACE_MS + 30);
    expect(m.film.state.time, "أُعيد رغم تفضيل المكتوم").toBe(9);
    expect(m.video.muted).toBe(true);
    m.view.unmount();
  });

  it("لا إعادة لفيلمٍ بلغ الجوهرة: تُعاد بزرّها لا بنقرة الصفحة", async () => {
    const m = await mountFilm(FILM_TEXT.seconds + 0.5, { refuse: true });
    policy.activated = true;
    fireEvent.click(document.body);
    await wait(GESTURE_GRACE_MS + 30);
    expect(m.film.state.time, "أُعيدت الجوهرة بنقرة الصفحة").toBe(FILM_TEXT.seconds + 0.5);
    m.view.unmount();
  });

  it("زرّ الصوت قرارُ زائرٍ يريد الصوت فحسب: يفتحه دون إعادة", async () => {
    const m = await mountFilm(9, { refuse: true });
    policy.activated = true;
    await act(async () => {
      fireEvent.click(m.view.getByRole("button", { name: SOUND.ar.play }));
    });
    expect(m.video.muted).toBe(false);
    expect(m.film.state.time, "زرّ الصوت أعاد الفيلم").toBe(9);
    m.view.unmount();
  });

  it("نقرةٌ فتحت لوحة سَدِيد: لا إعادة صامتة", async () => {
    const m = await mountFilm(9, { refuse: true });
    policy.activated = true;
    fireEvent.click(document.body);
    document.documentElement.setAttribute("data-sadeed-panel", "open");
    await wait(GESTURE_GRACE_MS + 30);
    expect(m.film.state.time, "أُعيد والصوت محجوب بلوحة سَدِيد").toBe(9);
    m.view.unmount();
  });

  it("لا يُفكّ كتمٌ قبل الإذن ولو زال سبب الإسكات — وقاعدة المتصفّح المحاكاة حقيقية", async () => {
    const { view, video, film } = await mountFilm(2, { refuse: true });
    const root = document.documentElement;
    await act(async () => {
      root.setAttribute("data-sadeed-panel", "open");
    });
    await act(async () => {
      root.removeAttribute("data-sadeed-panel");
    });
    // لم يُؤذَن بعد: يبقى مكتومًا، والفيلم جارٍ (لا يوقفه المتصفّح).
    expect(video.muted, "رُفع الكتم قبل الإذن").toBe(true);
    expect(film.state.paused).toBe(false);
    expect(film.pauses).toBe(0);
    // الشاهد: لو رُفع الكتم بلا إذن لأوقف المتصفّح الفيلم — فالفحص أعلاه ليس على مسارٍ ميت.
    video.muted = false;
    expect(film.state.paused, "المتصفّح المحاكى لم يوقف الفيلم").toBe(true);
    view.unmount();
  });

  it("نقرةٌ أولى تفتح لوحة سَدِيد أو تنقل الصفحة لا تُسمِع دفقة (أمسكته المراجعة)", async () => {
    const { view, video, film } = await mountFilm(2, { refuse: true });
    // النقرة تفتح اللوحة: تمرّ المهلة واللوحة مفتوحة ⇒ يبقى مكتومًا.
    policy.activated = true;
    fireEvent.click(document.body);
    document.documentElement.setAttribute("data-sadeed-panel", "open");
    await wait(GESTURE_GRACE_MS + 30);
    expect(video.muted).toBe(true);
    expect(film.state.unmutes).toBe(0);
    // وأذنت النقرة للصفحة: تُغلق اللوحة فيعود الصوت دون نقرةٍ أخرى.
    await act(async () => {
      document.documentElement.removeAttribute("data-sadeed-panel");
    });
    expect(video.muted).toBe(false);
    expect(film.pauses).toBe(0);
    view.unmount();
  });

  it("نقرةٌ تنقل الصفحة (يُفكّ الصفّ في المهلة) لا ترفع الكتم بعد الفكّ", async () => {
    const { view, film } = await mountFilm(2, { refuse: true });
    policy.activated = true;
    fireEvent.click(document.body);
    view.unmount();
    await wait(GESTURE_GRACE_MS + 30);
    expect(film.state.unmutes, "رُفع الكتم بعد الفكّ").toBe(0);
  });

  it("لوحة سَدِيد مفتوحة عند التركيب: يبدأ مكتومًا بلا محاولة صوت، ولا يفتح بإغلاقها قبل الإذن", async () => {
    document.documentElement.setAttribute("data-sadeed-panel", "open");
    const { view, video, film } = await mountFilm(2);
    expect(film.plays).toEqual([true]);
    expect(video.muted).toBe(true);
    await act(async () => {
      document.documentElement.removeAttribute("data-sadeed-panel");
    });
    expect(video.muted, "رُفع الكتم قبل الإذن").toBe(true);
    policy.activated = true;
    fireEvent.click(document.body);
    await wait(GESTURE_GRACE_MS + 30);
    expect(video.muted).toBe(false);
    expect(film.pauses).toBe(0);
    view.unmount();
  });

  it("زرّ الصوت من داخل نقرة الزائر يفتح الصوت بعد رفض المتصفّح دون أن يتوقف الفيلم", async () => {
    const { view, video, film } = await mountFilm(2, { refuse: true });
    expect(video.muted).toBe(true);
    policy.activated = true;
    const button = view.getByRole("button", { name: SOUND.ar.play });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(video.muted).toBe(false);
    expect(film.pauses).toBe(0);
    expect(film.plays).toEqual([false, true]);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem(MUSIC_KEY)).toBeNull();
    view.unmount();
  });
});

/* ── الموضع والأنماط ─────────────────────────────────────────────────── */

describe("الموضع — الشريط فاللوحة فوق المؤشرات، بأنماط من طبقة الرموز", () => {
  it("الشريط فوق اللوحة، والصفّ فوق المؤشرات، من مصدرٍ واحد", () => {
    expect(orderGaps(CODE, PAGE)).toEqual([]);
    expect(strip(PAGE)).toContain('from "@/components/home/HomeBrandRow"');
    expect((strip(PAGE).match(/<HomeBrandRow \/>/g) ?? []).length).toBe(1);
  });

  it("CSS: لا لون نهائي ولا `transform`، نسبة اللوحة مكتوبة، واللوحة بعرض العمود", () => {
    expect(literalColors(CSS)).toEqual([]);
    expect(transforms(CSS)).toEqual([]);
    expect(CSS).toContain("aspect-ratio: 2172 / 724");
    expect(narrowing(CSS)).toEqual([]);
  });

  it("النصّ يخفت في القصّة وحدها، وخلف بوابة الحركة والمفتاح والوضع الآمن", () => {
    expect(ungatedActRules(CSS)).toEqual([]);
    expect(copyHiders(CSS)).toEqual([
      `${SWITCH} .nx-brand-art[data-film-act="story"] .nx-brand-copy`,
    ]);
  });

  it("الجوهرة: في فصلها وحده، وخلف البوابات، وتقف بالإيقاف وخارج الإطار — وتحت تقليل الحركة لا جوهرة", () => {
    expect(jewelGaps(CSS)).toEqual([]);
    // في الطبقة حركةٌ فعلًا — فلا يمرّ الفحص على مجموعةٍ فارغة.
    expect(CSS).toMatch(/@keyframes nxJewelSpin\b/);
    expect(CSS).toMatch(/@keyframes nxJewelRise\b/);
    expect(CSS).toMatch(/@keyframes nxJewelGlint\b/);
    // اللمعان من الأسفل إلى الأعلى مقصوصٌ على شكل الرمز، والقناع على القرص.
    expect(keyframeProps(CSS, "nxJewelRise")).toEqual(["translate"]);
    expect(CSS).toContain('mask: url("/home/brand/sadeed-emblem-mask.webp") 0 0 / 100% 100%;');
    expect(existsSync("public/home/brand/sadeed-emblem-mask.webp"), "قناع الرمز غائب").toBe(true);
  });

  it("بدائل `forced-colors`: حدٌّ وبلا بريقٍ ولا توهّجٍ ولا جوهرة، والاسم بحبر النظام", () => {
    const forced = CSS.slice(CSS.indexOf("@media (forced-colors: active)"));
    expect(forced).toContain("border-color: CanvasText");
    expect(forced).toMatch(/\.nx-brand-glare \{[^}]*display: none/);
    expect(forced).toMatch(/\.nx-brand-halo \{[^}]*display: none/);
    expect(forced).toMatch(/\.nx-brand-jewel \{[^}]*display: none !important/);
    expect(forced).toMatch(/\.nx-brand-title > span\[lang\] \{[^}]*color: CanvasText/);
  });

  it("الدخول في عقد الحركة: الشريط يرتفع والبانر يظهر بالشفافية وحدها (LCP)", () => {
    const code = MOTION.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).toMatch(/\.nx-ticker \{\s*animation: nxHomeRise/);
    expect(code).toMatch(/\.nx-brand\[data-kind="banner"\] \{\s*animation: nxHomeFade/);
    expect(keyframeProps(MOTION, "nxHomeFade")).toEqual(["opacity"]);
  });
});

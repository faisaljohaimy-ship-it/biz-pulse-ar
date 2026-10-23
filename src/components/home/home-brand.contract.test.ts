/**
 * عقد صفّ الهوية على الرئيسية: شريط «مزايا سَدِيد» ثم لوحة سَدِيد بعرض العمود، وفوقها فيلمها
 * السينمائي بموسيقاه، والاسم والسطر **نصًّا حقيقيًّا**، ثم «الجوهرة» (أوامر المالك ٢٠٢٦/١٠/١٧ و١٠/١٨
 * — المواصفة ١٠ §٢.٣ — وR4: «… يبدأ اولاً … وبمجرد فتح الموقع والدخول عليه …» و«واظف الى فديو الموشن
 * قرافيتي افضل واجمل واحدث موسيقا … واجعل علامة سديد في النهاية تكون كالجوهرة المشعة باستمرار …»).
 *
 * ما يكسر الأمر لا يراه tsc ولا البناء:
 *   • الاسم أو السطر بغير نصّ المالك الحرفيّ («… رؤية تنفيذية **على** الأمن الصناعي …»)، أو
 *     مخبوزًا في صورة — والأمر «Render text as real HTML»؛
 *   • نصٌّ يبقى خافتًا بعد زوال الفيلم — واللوحة بلا نصّها، فيغيب الاسم كلّه — أو يخفت خارج
 *     قصّة الفيلم، أو خارج بوابة الحركة؛
 *   • لحظتا النصّ وقد تبدّل زمن الفيلم دونهما (`remotion/brand/film/timeline.ts`)؛
 *   • فيلمٌ يحمل مسار صوت (Remotion يضيف مسارًا صامتًا افتراضًا) — صامتٌ في **حاويته** لا بسمة
 *     `muted` وحدها؛ أو يُركَّب لمن طلب السكون أو توفير البيانات، أو في HTML الخادم، أو قبل
 *     رسم الملصق؛
 *   • فيلمٌ يُعاد وحده: `loop`، أو تشغيلٌ بالعودة إلى الإطار أو بإغلاق اللوحة بعد نهايته؛
 *   • موسيقى تبدأ دون سؤال تفضيل الزائر، أو بلا زرٍّ يوقفها (WCAG 1.4.2)، أو ملفّها بمسار فيديو
 *     أو فوق سقفه؛
 *   • «جوهرةٌ» تتحرّك خارج بوابة الحركة أو فصلها، أو لا تقف بزرّ الإيقاف وخارج الإطار؛
 *   • وزنُ صورٍ يتجاوز سقف N3 (400 KB على `/`)، أو فيلمٌ يتضخّم بلا سقف؛
 *   • لوحةٌ تضيق عن العمود، أو صفٌّ في غير موضعه، أو لونٌ نهائي في CSS.
 *
 * وكل كاشفٍ يُجرَّب أولًا على انتهاكٍ مزروع (المادة ٣٠).
 *
 * **بنودٌ تنتظر ملفّات مساراتٍ أخرى:** ملفّا الموسيقى (`public/media/brand/sadeed-film-score.*`)
 * يحمرّ بندهما الحيّ حتى يصلا؛ والفيلم وقناع الرمز يُقرآن كما هما على القرص.
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
  BRAND_SCORE,
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
 * سقوف الفيلم — بايتات. 24 ث بدرجتين (حلقات الماء قبله 3 MB لكلٍّ)، والزائر يُنزّل ملفًّا واحدًا
 * بعد رسم الملصق؛ والجوال الصغرى وحدها (`pickFilm`) فسقفها أضيق.
 */
const FILM_CEILING = { each: 4_000_000, phone: 1_500_000, total: 8_000_000 };
/** سقف كل ملفٍّ من ملفّي الموسيقى (26 ث) — بايتات. */
const SCORE_CEILING = 600_000;

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

/** صناديق MP4 التي لا تُكتب إلا مع مسارٍ سمعيّ. */
const AUDIO_BOXES = ["mp4a", "esds", "soun", "smhd"];
const audioBoxes = (bytes: Buffer) => AUDIO_BOXES.filter((b) => bytes.includes(b));

/** أنواع المسارات في MP4 من صناديق `hdlr` (النوع بعد الإصدار و`pre_defined`). */
function mp4Handlers(bytes: Buffer): string[] {
  const out: string[] = [];
  for (let i = bytes.indexOf("hdlr"); i !== -1; i = bytes.indexOf("hdlr", i + 4)) {
    if (i + 16 <= bytes.length) out.push(bytes.toString("latin1", i + 12, i + 16));
  }
  return out;
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
 * ملفّا الموسيقى: AAC في MP4 بمسار صوتٍ وبلا مسار فيديو، وOpus وحده في WebM، وكلٌّ تحت سقفه.
 * `null` غيابُ الملفّ.
 */
function scoreGaps(m4a: Buffer | null, webm: Buffer | null): string[] {
  const out: string[] = [];
  if (!m4a) out.push("m4a غائب");
  else {
    const handlers = mp4Handlers(m4a);
    if (!m4a.includes("ftyp")) out.push("m4a: ليس MP4");
    if (!m4a.includes("mp4a")) out.push("m4a: بلا AAC");
    if (!handlers.includes("soun")) out.push("m4a: بلا مسار صوت");
    if (handlers.includes("vide")) out.push("m4a: مسار فيديو");
    if (m4a.length > SCORE_CEILING) out.push(`m4a: ${m4a.length} فوق السقف`);
  }
  if (!webm) out.push("webm غائب");
  else {
    const codecs = matroskaCodecs(webm);
    if (codecs.join() !== "A_OPUS") out.push(`webm: [${codecs.join("، ")}]`);
    if (webm.length > SCORE_CEILING) out.push(`webm: ${webm.length} فوق السقف`);
  }
  return out;
}

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
  if (!video.includes("onEnded={() => setEnded(true)}")) out.push("ended");
  if (!video.includes("autoPlay={!jewel}")) out.push("autoPlay بعد النهاية");
  if (!code.includes("const jewel = ended || failed;")) out.push("الجوهرة");
  const resume = code.indexOf("const resumed = video.play()");
  const watcher = code.lastIndexOf("new IntersectionObserver(", resume);
  const callback = resume === -1 || watcher === -1 ? "" : code.slice(watcher, resume);
  if (!callback.includes("if (jewelRef.current || video.ended) return;")) out.push("المراقب");
  return out;
}

/**
 * لا موسيقى بلا سؤال التفضيل: `<audio>` بلا `autoPlay`، وتشغيلٌ واحد في `start` أوّل سطرٍ فيها
 * سؤال التفضيل، والتفضيل من مفتاحه.
 */
function musicAutoplayGaps(code: string): string[] {
  const out: string[] = [];
  const at = code.indexOf("<audio");
  const audio = at === -1 ? "" : code.slice(at, code.indexOf("</audio>", at));
  if (!audio) out.push("لا موسيقى");
  if (/\bautoPlay\b/.test(audio)) out.push("autoPlay");
  if (!audio.includes("preload=")) out.push("preload");
  const plays = code.match(/\baudio\.play\(/g) ?? [];
  if (plays.length !== 1) out.push(`audio.play × ${plays.length}`);
  const start = code.indexOf("const start = () => {");
  const body = start === -1 ? "" : code.slice(start, code.indexOf("\n  };", start));
  if (!/^const start = \(\) => \{\s*if \(!opts\.wanted\(\)\) return;/.test(body)) {
    out.push("سؤال التفضيل");
  }
  if (!body.includes("audio.play(")) out.push("التشغيل خارج start");
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
  it("مسار صوتٍ مزروع في بايتات الفيلم يُلتقط", () => {
    const clean = Buffer.from("....ftypisom....moov....avc1....");
    expect(audioBoxes(clean)).toEqual([]);
    expect(audioBoxes(Buffer.concat([clean, Buffer.from("mp4a")]))).toEqual(["mp4a"]);
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
    const looped = CODE.replace("        muted\n", "        muted\n        loop\n");
    expect(looped).not.toBe(CODE);
    expect(restartGaps(looped)).toEqual(["loop"]);
    const always = CODE.replace("autoPlay={!jewel}", "autoPlay");
    expect(always).not.toBe(CODE);
    expect(restartGaps(always)).toEqual(["autoPlay بعد النهاية"]);
    const watcher = CODE.replace("if (jewelRef.current || video.ended) return;", "");
    expect(watcher).not.toBe(CODE);
    expect(restartGaps(watcher)).toEqual(["المراقب"]);
    const noEnd = CODE.replace("onEnded={() => setEnded(true)}", "");
    expect(restartGaps(noEnd)).toEqual(["ended"]);
  });

  it("موسيقى بلا سؤال التفضيل، أو `autoPlay` عليها، أو تشغيلٌ ثانٍ خارج `start` — يُلتقط", () => {
    const unasked = CODE.replace("if (!opts.wanted()) return;\n    resync();", "resync();");
    expect(unasked).not.toBe(CODE);
    expect(musicAutoplayGaps(unasked)).toEqual(["سؤال التفضيل"]);
    const auto = CODE.replace("<audio\n", "<audio\n        autoPlay\n");
    expect(auto).not.toBe(CODE);
    expect(musicAutoplayGaps(auto)).toEqual(["autoPlay"]);
    const second = CODE.replace("const replay = () => {", "const replay = () => {\n audio.play();");
    expect(second).not.toBe(CODE);
    expect(musicAutoplayGaps(second)).toEqual(["audio.play × 2"]);
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

  it("ملفّا موسيقى بمسار فيديو أو بغير Opus أو فوق السقف أو غائبين — يُلتقطان", () => {
    const hdlr = (type: string) =>
      Buffer.concat([Buffer.from("hdlr"), Buffer.alloc(8), Buffer.from(type)]);
    const m4a = Buffer.concat([Buffer.from("....ftypM4A "), hdlr("soun"), Buffer.from("mp4a")]);
    const element = (id: string) =>
      Buffer.concat([Buffer.from([0x86, 0x80 | id.length]), Buffer.from(id)]);
    const opus = element("A_OPUS");
    expect(mp4Handlers(m4a)).toEqual(["soun"]);
    expect(scoreGaps(m4a, opus)).toEqual([]);
    expect(scoreGaps(Buffer.concat([m4a, hdlr("vide")]), opus)).toEqual(["m4a: مسار فيديو"]);
    expect(scoreGaps(m4a, Buffer.concat([element("V_VP9"), opus]))).toEqual([
      "webm: [V_VP9، A_OPUS]",
    ]);
    expect(scoreGaps(m4a, element("A_VORBIS"))).toHaveLength(1);
    const heavy = Buffer.concat([m4a, Buffer.alloc(SCORE_CEILING)]);
    expect(scoreGaps(heavy, opus)).toEqual([`m4a: ${heavy.length} فوق السقف`]);
    expect(scoreGaps(null, null)).toEqual(["m4a غائب", "webm غائب"]);
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

/* ── الفيلم: صامتٌ في الحاوية، بسقف، وبلحظتي نصٍّ من زمنه ─────────────── */

describe("الفيلم — بلا مسار صوت، بسقف وزن، ولحظتا النصّ من زمنه", () => {
  it("درجتان مذكورتان، لكلٍّ MP4 (H.264) وWebM (VP9) موجودان، وبلا أيّ مسار صوت", () => {
    expect(FILMS).toHaveLength(2);
    expect(FILMS).toEqual(BRAND_FILMS.map((f) => f.src));
    let total = 0;
    for (const f of FILMS) {
      const phone = f === BRAND_FILMS[0].src;
      const ceiling = phone ? FILM_CEILING.phone : FILM_CEILING.each;
      expect(existsSync(`public${f}`), `${f} غائب`).toBe(true);
      const bytes = readFileSync(`public${f}`);
      expect(bytes.includes("ftyp"), `${f}: ليس MP4`).toBe(true);
      expect(bytes.includes("avc1"), `${f}: لا مسار فيديو`).toBe(true);
      expect(audioBoxes(bytes), `${f}: عاد مسار الصوت`).toEqual([]);
      expect(bytes.length, `${f}: فوق السقف`).toBeLessThanOrEqual(ceiling);
      total += bytes.length;

      // التوأم WebM: حاوية Matroska بمسار VP9 وبلا عنصر صوت (`A_` هو بادئة
      // معرّفات ترميزات الصوت في Matroska، و`V_VP9` معرّف الفيديو).
      const webm = f.replace(/\.mp4$/, ".webm");
      expect(existsSync(`public${webm}`), `${webm} غائب`).toBe(true);
      const wb = readFileSync(`public${webm}`);
      expect(matroskaCodecs(wb), `${webm}: مسارات الحاوية`).toEqual(["V_VP9"]);
      expect(wb.length, `${webm}: فوق السقف`).toBeLessThanOrEqual(ceiling);
      total += wb.length;
    }
    expect(total).toBeLessThanOrEqual(FILM_CEILING.total);
  });

  it("الفيلم صامتٌ ومضمَّنٌ ويبدأ تلقائيًّا ويُعرض مرّةً، بمصدرين، بلا أزرار ولا صورة داخل صورة", () => {
    const video = filmAttrs(CODE);
    // بلا `poster`: الصورة تحت الفيلم هي الملصق — والسمة جعلت الفيلم المركَّب بعد
    // الترطيب مرشّحَ LCP ونزّلت نسخة 1600 على الجوال (Lighthouse ٢٠٢٦/١٠/١٨).
    expect(video, "<video> بسمة poster").not.toContain("poster=");
    for (const attr of [
      "muted",
      "playsInline",
      "autoPlay",
      "aria-hidden",
      "disablePictureInPicture",
      "onError=",
      "onEnded=",
      'type="video/mp4"',
      'type="video/webm"',
    ]) {
      expect(video, `<video> بلا ${attr}`).toContain(attr);
    }
    // مرّةً لا حلقة (R4): بلا `loop`، والنهاية «جوهرة» لا إعادة.
    expect(video, "<video> بحلقة").not.toMatch(/\bloop\b/);
    // MP4 أوّلًا: المتصفّح يأخذ أوّل مصدرٍ يقدر عليه.
    expect(video.indexOf('type="video/mp4"')).toBeLessThan(video.indexOf('type="video/webm"'));
    // وخطأ مصدرٍ واحد لا يُسقط الفيلم قبل تجربة الثاني (يصعد في شجرة React):
    // الفشل ما استهدف العنصر أو جاء بعد استنفاد المصادر.
    expect(video).toContain("video.networkState === video.NETWORK_NO_SOURCE");
    expect(video).toContain("e.target === video");
    expect(video).not.toContain("controls");
    expect(CODE).not.toMatch(/muted\s*=\s*(false|\{false\})/);
  });

  it("لحظتا النصّ من زمن الفيلم الواحد، والفصول بحدودها، والجوهرة لا زمن لها", () => {
    expect(syncGaps(FILM_TEXT, TIMELINE)).toEqual([]);
    expect(filmActAt(0)).toBe("hold");
    expect(filmActAt(FILM_TEXT.hideAt - 0.01)).toBe("hold");
    expect(filmActAt(FILM_TEXT.hideAt)).toBe("story");
    expect(filmActAt(FILM_TEXT.revealAt - 0.01)).toBe("story");
    expect(filmActAt(FILM_TEXT.revealAt)).toBe("reveal");
    // آخر الإطارات كشفٌ — والجوهرة من حدث النهاية وحده، لا من عدّادٍ يسبقها أو يتأخّر عنها.
    expect(filmActAt(FILM_TEXT.seconds - 1 / 30)).toBe("reveal");
    expect(filmActAt(FILM_TEXT.seconds + 5)).toBe("reveal");
  });

  it("مرّةً لا حلقة: النهاية تكتب الجوهرة، ولا يُعاد الفيلم وحده", () => {
    expect(restartGaps(CODE)).toEqual([]);
  });
});

/* ── الموسيقى: ملفٌّ منفصل، لا تبدأ بلا تفضيل، وزرٌّ يوقفها ─────────────── */

describe("الموسيقى — ملفٌّ منفصل يتبع الفيلم، وتفضيل الزائر قبل كل تشغيل (WCAG 1.4.2)", () => {
  it("ملفّا الموسيقى: AAC بلا مسار فيديو وOpus وحده، كلٌّ ≤ 600 KB — **ينتظر مسار الموسيقى**", () => {
    expect(BRAND_SCORE.map((s) => s.type)).toEqual(["audio/mp4", "audio/webm"]);
    const [m4a, webm] = BRAND_SCORE.map((s) =>
      existsSync(`public${s.src}`) ? readFileSync(`public${s.src}`) : null,
    );
    expect(BRAND_SCORE[0].src).toMatch(/\.m4a$/);
    expect(BRAND_SCORE[1].src).toMatch(/\.webm$/);
    expect(scoreGaps(m4a, webm)).toEqual([]);
  });

  it("لا تشغيل بلا سؤال التفضيل، ولا `autoPlay` على الموسيقى، والمفتاح `nx-brand-music`", () => {
    expect(musicAutoplayGaps(CODE)).toEqual([]);
    expect(MUSIC_KEY).toBe("nx-brand-music");
    // كل وصولٍ إلى التخزين في `try` (المحجوب لا يكسر شيئًا).
    expect((CODE.match(/\} catch \{/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it("زرّ الموسيقى: زرٌّ حقيقيّ بحاله ورموزه، بأسمائه في اللغتين، وهدفٌ ≥ 44px", () => {
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
    expect(filmAttrs(CODE)).toContain("onPlaying={() => setReady(true)}");
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

/* ── المصيَّر: الملصق ثم الفيلم، والنصّ يتبعه، ومرّةً ثم الجوهرة، والموسيقى ───── */

/** وسائط مزيّفة: jsdom لا يشغّل شيئًا، فالحال على العنصر نفسه والأحداث بيد الاختبار. */
function fakeMedia(el: HTMLMediaElement, refuse?: string, lazy = false) {
  // `ready`: ‏`HAVE_NOTHING` (0) حتى أوّل إطار، ثم `HAVE_ENOUGH_DATA` (4) — كالمحرّك: `play` يسبق الإطار.
  // و`lazy`: عنصرٌ بـ`preload="none"` — إطاره بعد جلبٍ من الشبكة لا داخل `play`، فالاختبار يرسله.
  const state = { paused: true, ended: false, time: 0, ready: 0 };
  Object.defineProperty(el, "paused", { configurable: true, get: () => state.paused });
  Object.defineProperty(el, "ended", { configurable: true, get: () => state.ended });
  Object.defineProperty(el, "readyState", { configurable: true, get: () => state.ready });
  Object.defineProperty(el, "currentTime", {
    configurable: true,
    get: () => state.time,
    set: (v: number) => {
      state.time = v;
      state.ended = false;
    },
  });
  const play = vi.fn(() => {
    if (refuse) return Promise.reject(new DOMException("blocked", refuse));
    state.paused = false;
    state.ended = false;
    el.dispatchEvent(new Event("play"));
    if (lazy) return Promise.resolve();
    state.ready = 4;
    el.dispatchEvent(new Event("playing"));
    return Promise.resolve();
  });
  const pause = vi.fn(() => {
    if (state.paused) return;
    state.paused = true;
    el.dispatchEvent(new Event("pause"));
  });
  Object.defineProperty(el, "play", { configurable: true, value: play });
  Object.defineProperty(el, "pause", { configurable: true, value: pause });
  return { state, play, pause };
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

/** يركّب الصفّ، ويرسم الملصق، ويشغّل الفيلم عند `at` ثانية — والموسيقى بإذن `refuse`. */
async function mountFilm(at: number, opts: { refuse?: string } = {}) {
  const view = render(createElement(I18nProvider, null, createElement(HomeBrandRow)));
  await act(async () => {});
  expect(view.container.querySelector("video"), "فيلمٌ قبل الملصق").toBeNull();
  const poster = view.container.querySelector<HTMLImageElement>("img.nx-brand-poster")!;
  await act(async () => {
    fireEvent.load(poster);
  });
  const video = view.container.querySelector<HTMLVideoElement>("video.nx-brand-film");
  expect(video, "الفيلم لم يُركَّب بعد الملصق").not.toBeNull();
  const audio = view.container.querySelector<HTMLAudioElement>("audio")!;
  expect(audio, "الموسيقى لم تُركَّب مع الفيلم").not.toBeNull();
  const film = fakeMedia(video!);
  const score = fakeMedia(audio, opts.refuse);
  const art = view.container.querySelector<HTMLElement>(".nx-brand-art")!;
  const seek = (seconds: number) => {
    film.state.time = seconds;
    fireEvent(video!, new Event("timeupdate"));
  };
  film.state.time = at;
  film.state.paused = false;
  // `playing` يصل والإطار قائم — كالمحرّك.
  film.state.ready = 4;
  await act(async () => {
    fireEvent(video!, new Event("playing"));
  });
  const end = async () => {
    film.state.time = FILM_TEXT.seconds;
    film.state.paused = true;
    film.state.ended = true;
    await act(async () => {
      fireEvent(video!, new Event("pause"));
      fireEvent(video!, new Event("ended"));
    });
  };
  return { view, video: video!, audio, art, film, score, seek, end };
}

describe("المصيَّر — الملصق ثم الفيلم، والنصّ يتبعه ولا يبقى خافتًا بعده", () => {
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

  it("الفصل من زمن الإطار المعروض، ويزول بزرّ الإيقاف فيعود النصّ", async () => {
    const { view, art, seek } = await mountFilm(10);
    expect(art.dataset.filmAct).toBe("story");
    seek(FILM_TEXT.revealAt + 0.5);
    expect(art.dataset.filmAct).toBe("reveal");
    seek(0);
    expect(art.dataset.filmAct).toBe("hold");
    seek(10);
    expect(art.dataset.filmAct).toBe("story");
    fireEvent.click(view.getByRole("button", { name: "إيقاف الحركة" }));
    await act(async () => {});
    expect(view.container.querySelector("video")).toBeNull();
    expect(view.container.querySelector("audio"), "الموسيقى بقيت بعد الإيقاف").toBeNull();
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
});

describe("المصيَّر — مرّةً ثم الجوهرة، ولا يُعاد وحده", () => {
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
    await act(async () => {
      root.setAttribute("data-sadeed-panel", "open");
    });
    expect(film.pause, "اللوحة لم توقف الفيلم على اللمس").toHaveBeenCalled();
    await act(async () => {
      root.removeAttribute("data-sadeed-panel");
    });
    expect(film.play, "إغلاق اللوحة لم يستأنف الفيلم الجاري").toHaveBeenCalled();
    await end();
    expect(art.dataset.filmAct).toBe("jewel");
    film.play.mockClear();
    // يخرج الصفّ من الإطار ويعود — والمنتهي لا يُشغَّل.
    await act(async () => {
      FakeObserver.show(false);
      FakeObserver.show(true);
    });
    expect(film.play, "المراقب أعاد الفيلم").not.toHaveBeenCalled();
    // اللوحة تُفتح وتُغلق — والمنتهي موقوفٌ فلا يُستأنف.
    await act(async () => {
      root.setAttribute("data-sadeed-panel", "open");
    });
    await act(async () => {
      root.removeAttribute("data-sadeed-panel");
    });
    expect(film.play, "إغلاق اللوحة أعاد الفيلم").not.toHaveBeenCalled();
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

  it("زرّ «إعادة العرض مع الموسيقى» بعد النهاية: من أوّله بالموسيقى، ويُسقط الجوهرة", async () => {
    localStorage.setItem(MUSIC_KEY, "off");
    const { view, art, film, score, end } = await mountFilm(20);
    expect(score.play, "موسيقى رغم الكتم المحفوظ").not.toHaveBeenCalled();
    await end();
    const replay = view.getByRole("button", { name: SOUND.ar.replay });
    expect(replay.hasAttribute("aria-pressed"), "الإعادة ليست تبديلًا").toBe(false);
    await act(async () => {
      fireEvent.click(replay);
    });
    expect(film.play).toHaveBeenCalled();
    expect(film.state.time).toBe(0);
    expect(score.play, "الإعادة بلا موسيقى").toHaveBeenCalled();
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
    const video = view.container.querySelector<HTMLVideoElement>("video.nx-brand-film")!;
    const film = fakeMedia(video, undefined, true);
    const score = fakeMedia(view.container.querySelector<HTMLAudioElement>("audio")!);
    const replay = view.getByRole("button", { name: SOUND.ar.replay });
    replay.focus();
    expect(document.activeElement).toBe(replay);
    await act(async () => {
      fireEvent.click(replay);
    });
    expect(film.play, "الإعادة لم تشغّل الفيلم").toHaveBeenCalled();
    expect(replay.isConnected, "زرّ الإعادة زال بالنقر").toBe(true);
    expect(document.activeElement, "سقط التركيز بالإعادة").toBe(replay);
    expect(score.play, "موسيقى قبل أوّل إطار").not.toHaveBeenCalled();
    film.state.ready = 4;
    await act(async () => {
      fireEvent(video, new Event("playing"));
    });
    expect(view.container.querySelector(".nx-brand-sound"), "زرٌّ آخر بعد أوّل إطار").toBe(replay);
    expect(document.activeElement, "سقط التركيز مع أوّل إطار").toBe(replay);
    expect(score.play, "الإعادة بلا موسيقى").toHaveBeenCalled();
    view.unmount();
  });
});

describe("المصيَّر — الموسيقى تتبع الفيلم وتفضيل الزائر وأسباب السكوت", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem(MUSIC_KEY);
    localStorage.removeItem("locale");
    localStorage.removeItem("nx-brand-motion");
    delete document.documentElement.dataset.nxMotionPaused;
    document.documentElement.removeAttribute("data-sadeed-panel");
    sadeedState.set("idle");
    SadeedAudioBus.release("chat-tts");
  });

  it("تبدأ من زمن الإطار، وتعود إليه إن انحرفت، وتسكت باللوحة وبنطق سَدِيد ثم تعود", async () => {
    const { view, film, score, seek } = await mountFilm(3);
    expect(score.play).toHaveBeenCalledTimes(1);
    expect(score.state.time).toBe(3);
    const button = view.getByRole("button", { name: SOUND.ar.play });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    // التلميح يطابق الاسم: «كتم» تلميحًا و«تشغيل» اسمًا كانا يتناقضان (أمسكته المراجعة).
    expect(button.getAttribute("title")).toBe(SOUND.ar.play);
    // انحرافٌ فوق ربع ثانية يُعاد إلى زمن الإطار؛ ودونه يُترك.
    score.state.time = 3.1;
    seek(3.2);
    expect(score.state.time).toBe(3.1);
    seek(4);
    expect(score.state.time).toBe(4);
    // لوحة سَدِيد تُفتح: تسكت، وتُغلق: تعود من زمن الإطار.
    const root = document.documentElement;
    await act(async () => {
      root.setAttribute("data-sadeed-panel", "open");
    });
    expect(score.pause).toHaveBeenCalledTimes(1);
    film.state.time = 6;
    await act(async () => {
      root.removeAttribute("data-sadeed-panel");
    });
    expect(score.play).toHaveBeenCalledTimes(2);
    expect(score.state.time).toBe(6);
    // سَدِيد ينطق (ناقل الصوت) أو يُصغي (حالة الحضور): تسكت.
    SadeedAudioBus.unlock();
    await act(async () => {
      SadeedAudioBus.acquire("chat-tts", () => {});
    });
    expect(score.pause).toHaveBeenCalledTimes(2);
    await act(async () => {
      SadeedAudioBus.release("chat-tts");
    });
    expect(score.play).toHaveBeenCalledTimes(3);
    await act(async () => {
      sadeedState.set("listening");
    });
    expect(score.pause).toHaveBeenCalledTimes(3);
    await act(async () => {
      sadeedState.set("idle");
    });
    expect(score.play).toHaveBeenCalledTimes(4);
    // الفيلم يقف (خارج الإطار أو تحت اللوحة): تقف معه.
    film.state.paused = true;
    await act(async () => {
      fireEvent(view.container.querySelector("video")!, new Event("pause"));
    });
    expect(score.pause).toHaveBeenCalledTimes(4);
    view.unmount();
  });

  it("الكتم يُحفظ ويسكتها، والتشغيل من النقرة يمحوه — والزرّ بلغة الواجهة", async () => {
    localStorage.setItem("locale", "en");
    const { view, score } = await mountFilm(2);
    const button = view.getByRole("button", { name: SOUND.en.play });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    await act(async () => {
      fireEvent.click(button);
    });
    expect(localStorage.getItem(MUSIC_KEY)).toBe("off");
    expect(score.pause).toHaveBeenCalled();
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.getAttribute("title")).toBe(SOUND.en.play);
    await act(async () => {
      fireEvent.click(button);
    });
    expect(localStorage.getItem(MUSIC_KEY)).toBeNull();
    expect(score.play).toHaveBeenCalledTimes(2);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    view.unmount();
  });

  it("منعُ المتصفّح: محاولةٌ واحدة، ثم تنتظر أوّل نقرةٍ في الصفحة — لا التمرير ولا أزرار الصفّ", async () => {
    const { view, score, seek } = await mountFilm(2, { refuse: "NotAllowedError" });
    expect(score.play).toHaveBeenCalledTimes(1);
    await act(async () => {});
    // لا إعادة محاولةٍ مع كل إطار.
    seek(2.5);
    seek(3);
    expect(score.play).toHaveBeenCalledTimes(1);
    // التمرير ليس إذنًا.
    fireEvent.scroll(window);
    fireEvent.wheel(document.body);
    fireEvent.pointerDown(document.body, { pointerType: "touch" });
    expect(score.play).toHaveBeenCalledTimes(1);
    // زرّ «إيقاف الحركة» يقرّر بنفسه — لا يبدأ الموسيقى.
    fireEvent.pointerDown(view.getByRole("button", { name: "إيقاف الحركة" }), {
      pointerType: "mouse",
    });
    expect(score.play).toHaveBeenCalledTimes(1);
    // ولا المفاتيح: Tab وسهمٌ تنقّلٌ لا قبولٌ بالصوت (أمسكته المراجعة).
    fireEvent.keyDown(document.body, { key: "Tab" });
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(score.play).toHaveBeenCalledTimes(1);
    // نقرةٌ في الصفحة: تبدأ من زمن الإطار — بعد مهلة اللمسة لا قبلها.
    fireEvent.click(document.body);
    expect(score.play).toHaveBeenCalledTimes(1);
    await act(async () => {
      await new Promise((r) => setTimeout(r, GESTURE_GRACE_MS + 30));
    });
    expect(score.play).toHaveBeenCalledTimes(2);
    expect(score.state.time).toBe(3);
    view.unmount();
  });

  it("نقرةٌ أولى تفتح لوحة سَدِيد أو تنقل الصفحة لا تُسمِع دفقة (أمسكته المراجعة)", async () => {
    const { view, score } = await mountFilm(2, { refuse: "NotAllowedError" });
    await act(async () => {});
    expect(score.play).toHaveBeenCalledTimes(1);
    // النقرة تفتح اللوحة: تمرّ المهلة واللوحة مفتوحة ⇐ لا موسيقى.
    fireEvent.click(document.body);
    document.documentElement.setAttribute("data-sadeed-panel", "open");
    await act(async () => {
      await new Promise((r) => setTimeout(r, GESTURE_GRACE_MS + 30));
    });
    expect(score.play).toHaveBeenCalledTimes(1);
    document.documentElement.removeAttribute("data-sadeed-panel");
    // النقرة تنقل الصفحة: يُفكّ الصفّ في المهلة ⇐ لا موسيقى بعد الفكّ.
    fireEvent.click(document.body);
    view.unmount();
    await act(async () => {
      await new Promise((r) => setTimeout(r, GESTURE_GRACE_MS + 30));
    });
    expect(score.play).toHaveBeenCalledTimes(1);
  });

  it("كمون القفز المقيس يُضاف إلى الهدف التالي — فلا تدور الموسيقى في قفزاتٍ بلا نهاية (تسجيل المالك: انقطاعٌ كل 0.77 ث بطول 0.39 ث)", async () => {
    const now = vi.spyOn(performance, "now");
    now.mockReturnValue(1000);
    const { audio, score, seek } = await mountFilm(3);
    // أوّل قفزة بلا قياسٍ سابق: إلى زمن الإطار نفسه.
    expect(score.state.time).toBe(3);
    // اكتملت بعد 0.39 ث (كمون القفز في m4a على iOS) — والفيلم مضى 0.4 ث فصارت منحرفةً فوق ربع ثانية.
    now.mockReturnValue(1390);
    fireEvent(audio, new Event("seeked"));
    seek(3.4);
    // القفزة الثانية تهبط على الحاضر لا الماضي: زمن الإطار + الكمون المقيس.
    expect(score.state.time).toBeCloseTo(3.4 + 0.39, 5);
    // ومنحرفةً دون ربع ثانية بعد استقرارها: لا قفزة ثالثة.
    now.mockReturnValue(1790);
    fireEvent(audio, new Event("seeked"));
    seek(3.6);
    expect(score.state.time).toBeCloseTo(3.4 + 0.39, 5);
  });

  it("قفزةٌ جارية (`seeking`) لا تُقاس منحرفةً ولا تُعاد — الحلقة التي سمعها المالك", async () => {
    const { audio, score, seek } = await mountFilm(3);
    expect(score.state.time).toBe(3);
    Object.defineProperty(audio, "seeking", { configurable: true, get: () => true });
    seek(4);
    expect(score.state.time, "قفزةٌ فوق قفزة").toBe(3);
  });

  it("لا موسيقى قبل أوّل إطار، وإيقافها من خارج الصفّ قرارٌ لا يُنقض إلا بزرّها", async () => {
    const { view, film, score, seek } = await mountFilm(2);
    expect(score.play).toHaveBeenCalledTimes(1);
    const video = view.container.querySelector("video")!;
    // توقّفٌ لنقص البيانات: لا إطار قائم ⇐ تسكت حتى يعود.
    film.state.ready = 1;
    await act(async () => {
      fireEvent(video, new Event("waiting"));
    });
    expect(score.pause).toHaveBeenCalledTimes(1);
    seek(2.5);
    expect(score.play).toHaveBeenCalledTimes(1);
    film.state.ready = 4;
    await act(async () => {
      fireEvent(video, new Event("playing"));
    });
    expect(score.play).toHaveBeenCalledTimes(2);
    // مفاتيح الوسائط أو أداة النظام تُسكتها (إيقافٌ ليس منّا): لا تعود مع الإطار التالي.
    score.state.paused = true;
    await act(async () => {
      fireEvent(view.container.querySelector("audio")!, new Event("pause"));
    });
    seek(3);
    seek(3.5);
    expect(score.play).toHaveBeenCalledTimes(2);
    // ويعيدها زرّها وحده (من داخل نقرة الزائر).
    const button = view.getByRole("button", { name: SOUND.ar.play });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    await act(async () => {
      fireEvent.click(button);
    });
    expect(score.play).toHaveBeenCalledTimes(3);
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

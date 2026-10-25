/**
 * عقد «فيلم التوأم الرقمي» — صفحتا `/cinematic` و`/sec/twin` والمشغّل المضمَّن (أمر المالك
 * ٢٠٢٦/١٠/٢٣: «راجع المرفقات للتحسين» و«اظف فديو موشن جرافيتي مختص بالتوأم الرقمي»).
 *
 * ما يكسر الأمر ولا يراه tsc ولا البناء:
 *   • صورةٌ خارجية عند طرفٍ ثالث (`HERO_IMAGE`) أو أيّ رابط `http(s)://` في الصفحة — وفي الصورة
 *     القديمة واجهةٌ مخبوزة بأرقامٍ وأحداثٍ مختلَقة («٩٩٪ مستوى الالتزام» و«عاجل: بلاغ أمني …»)؛
 *   • `<iframe>` يضمّ /cinematic في /sec/twin (يحمل قشرة التطبيق مرّتين)؛
 *   • ألفاظ «البثّ المباشر» و«عاجل» و`LIVE` في الصفحتين أو المشغّل، أو رقمٌ في نصّهما — الفيلم
 *     **مُصيَّر مسبقًا** لا بثّ ولا بيانات تشغيلية (المادة ٢٧)؛
 *   • صفُّ روايةٍ لـ`/cinematic` يقول إن المشهد «يعمل داخل المتصفح لا ملف فيديو» — صار كاذبًا؛
 *   • عنوانٌ فوق الفيديو بتراكبٍ مطلق (يتداخل على الجوال) أو طبقاتٌ زخرفيةٌ أُسقطت تعود؛
 *   • مشغّلٌ يُعيد نفسه (`loop`) أو يبدأ بسمة `autoPlay` متجاوزًا البوابات، أو بلا `muted`/`playsInline`،
 *     أو يكتب سمة إيقاف الحركة التي كاتبها الوحيد صفّ الهوية، أو يكتب في التخزين المحلي (القراءة وحدها
 *     مأذونة: اختيار «إيقاف الحركة» المحفوظ يُحترم عند التحميل المباشر)؛
 *   • لونٌ نهائي في CSS، وزجاجٌ بالتمرير وحده، وحركةٌ خارج `prefers-reduced-motion: no-preference`،
 *     وهدفُ لمسٍ دون 44px، وإطارٌ بلا 16:9؛
 *   • أصولُ الفيلم: ناقصةٌ، أو بصوتٍ لا يطابق الراية، أو بغير مدّة 56 ث، أو فوق سقف الوزن، أو ملصقٌ بغير 1280×720.
 *
 * وكل كاشفٍ يُجرَّب أولًا على انتهاكٍ مزروع (المادة ٣٠). **وبنود الأصول تنتظر مسار التصيير**: لا
 * مجلّد `public/media/twin` ⇒ تتخطّى برسالةٍ صريحة؛ ووجوده بلا الأصول الخمسة ينهار.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import postcss, { type AtRule, type ChildNode, type Node } from "postcss";
import { describe, expect, it } from "vitest";
import { FILM_UPSCALE_LIMIT } from "@/components/home/HomeBrandRow";
import { ENTRIES_C } from "@/lib/sadeed/page-narrations.entries.c";
import { narrationFor } from "@/lib/sadeed/page-narrations";
import {
  MOTION_PREF_KEY,
  MOTION_PREF_PAUSED,
  SLOW_CONNECTIONS,
  TWIN_FILMS,
  TWIN_FILM_HAS_AUDIO,
  TWIN_FILM_POSTER,
  TWIN_FILM_SECONDS,
  TWIN_FILM_TEXT,
  TWIN_UPSCALE_LIMIT,
  VISIBLE_RATIO,
  controlFor,
  filmGate,
  offCause,
  pickTwinFilm,
  upgradeTwinFilm,
  webmOf,
  type FilmStatus,
  type GateSignals,
} from "@/components/twin/twin-film-model";

const read = (p: string) => readFileSync(p, "utf8");

const CINEMATIC = read("src/routes/cinematic.tsx");
const SEC_TWIN = read("src/routes/_authenticated/sec.twin.tsx");
const PLAYER = read("src/components/twin/TwinFilmPlayer.tsx");
const MODEL = read("src/components/twin/twin-film-model.ts");
const FILM_CSS = read("src/styles/twin-film.css");
const PAGE_CSS = read("src/styles/sadeed-cinematic.css");

/** يُسقط التعليقات (كتل JSX وكتل CSS/JS وسطور `//` غير الواقعة بعد `:`) — النصوص تبقى. */
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/* ── كاشفات المصدر ─────────────────────────────────────────────────────── */

/** كل رابطٍ مطلق: الصفحة لا تحمل رابطًا إلى طرفٍ ثالث ولا إلى نطاقٍ مكتوب. */
const externalUrls = (code: string) =>
  [...strip(code).matchAll(/https?:\/\/[^\s"'`)<>]+/g)].map((m) => m[0]);

/** صورة البطل الخارجية ومستضيفها. */
const heroImage = (code: string) => strip(code).match(/HERO_IMAGE|cloudfront/gi) ?? [];

/** إطارٌ يضمّ صفحةً أخرى. */
const iframes = (code: string) => strip(code).match(/<iframe\b/gi) ?? [];

/**
 * «البثّ المباشر» و«عاجل» و`LIVE` بحروفٍ كبيرة. **حالة الأحرف مقصودة:** `"live"` صغيرة قيمةٌ في
 * بيانات الصفحة (`dataSource === "live"` من PR #16) لا نصٌّ معروض، وتُنفى بـ«ليس بثًّا حيًّا» في
 * إفصاح المشغّل بلا لفظ «البثّ المباشر».
 */
const liveWords = (code: string, allow: readonly string[] = []) =>
  allow
    .reduce((acc, phrase) => acc.split(phrase).join(""), strip(code))
    .match(/البث المباشر|عاجل|\bLIVE\b/g) ?? [];

/**
 * الاستثناء الوحيد: توصية إجراءٍ **موجودة في /sec/twin قبل هذا العمل** داخل لوحة تفاصيل الموقع («فتح أمر
 * عمل **عاجل** لإعادة الموقع للحالة التشغيلية») — أولويةُ أمر عمل لا حدثٌ مختلَق ولا شارة بثّ، وليست من
 * قسم الفيلم. الاستثناء بالجملة كاملةً لا باللفظ: أيّ «عاجل» غيرها يُلتقط.
 */
const WORK_ORDER_ACTION = "فتح أمر عمل عاجل لإعادة الموقع للحالة التشغيلية";

/** أرقامٌ (لاتينية أو هندية) في نصٍّ مكتوب: JSX بين وسمين، أو سلاسل كائن `COPY`. */
function textDigits(code: string): string[] {
  const out: string[] = [];
  const body = strip(code);
  for (const m of body.matchAll(/>([^<>{}]+)</g)) {
    // نصّ JSX لا شيفرةٌ بين وسمٍ وعامِل مقارنة: لا فواصل شيفرة، وفيه حرفٌ. (`useState<T>(…)` و`a ? B2 : C2;`
    // تقع بين `>` و`<` أيضًا، ولا تُعدّ نصًّا معروضًا.)
    if (/[;=(){}]/.test(m[1]) || !/\p{L}/u.test(m[1])) continue;
    if (/[0-9٠-٩۰-۹]/.test(m[1])) out.push(m[1].trim());
  }
  const copy = body.indexOf("const COPY");
  if (copy !== -1) {
    const block = body.slice(copy, body.indexOf("} as const;", copy));
    for (const m of block.matchAll(/"([^"]*)"/g)) {
      if (/[0-9٠-٩۰-۹]/.test(m[1])) out.push(m[1]);
    }
  }
  return out;
}

/** مقطع قسم الفيلم في /sec/twin: من وسمه إلى إغلاقه. */
function filmSection(code: string): string {
  const at = code.indexOf('aria-label="تجربة سديد السينمائية"');
  if (at === -1) return "";
  return code.slice(code.lastIndexOf("<section", at), code.indexOf("</section>", at) + 10);
}

/** سمات `<video>` المشغّل بين الفتح والإغلاق. */
const videoTag = (code: string) => {
  const at = code.indexOf("<video");
  return at === -1 ? "" : code.slice(at, code.indexOf("</video>", at));
};

/** ما يكسر عقد الفيديو: إعادة تلقائية، أو تشغيلٌ بسمة، أو تحكّمٌ أصليّ، أو تركيبٌ بلا صمت/تضمين. */
function videoGaps(code: string): string[] {
  const out: string[] = [];
  const tag = strip(videoTag(code));
  if (!tag) return ["لا <video>"];
  if (/\bloop\b/.test(tag)) out.push("loop");
  if (/\bautoPlay\b/.test(tag)) out.push("autoPlay");
  if (/\bcontrols\b/.test(tag)) out.push("controls الأصلية");
  if (/\bposter=/.test(tag)) out.push("poster على الفيديو");
  for (const need of [
    "muted",
    "playsInline",
    "aria-hidden",
    "preload=",
    "disablePictureInPicture",
  ]) {
    if (!tag.includes(need)) out.push(`بلا ${need}`);
  }
  if (!tag.includes('type="video/mp4"') || !tag.includes('type="video/webm"')) out.push("مصدران");
  return out;
}

/** حراسة التركيب: بوّابةٌ ثم ظهورٌ ثم عنصر، والطبقة المشتركة للإيقاف تحت اللوحة. */
function gateGaps(code: string): string[] {
  const c = strip(code);
  const out: string[] = [];
  if (
    !c.includes(
      'const allowed = gate !== null && gate !== "off" && (gate === "open" || started || keepsPlaying);',
    )
  ) {
    out.push("سطر allowed");
  }
  // ما يُبقي فيلمًا عرض إطاره تحت الاتصال البطيء: `saver` وحدها — لا `reduced` (يُسقطه تقليل الحركة
  // المفعَّل في أثناء العرض) ولا `off`، ولا بدءٌ لم يُعرض إطاره.
  if (!c.includes('const keepsPlaying = gate === "saver" && played;')) out.push("سطر keepsPlaying");
  if (!/setPlayed\(true\)/.test(c) || !/setPlayed\(false\)/.test(c))
    out.push("played يُمنح ويُسحب");
  if (!c.includes("const mounted = allowed && (armed || started) && !failed && src !== null;")) {
    out.push("سطر mounted");
  }
  if (!c.includes("{mounted && src && (")) out.push("الفيديو خلف mounted");
  if (
    !/import \{[^}]*holdFilmUnderPanel[^}]*\} from "@\/components\/home\/HoloVideoEngine"/.test(c)
  ) {
    out.push("holdFilmUnderPanel من الطبقة المشتركة");
  }
  if (!c.includes("new IntersectionObserver(")) out.push("IntersectionObserver");
  if (!c.includes("finishedRef.current")) out.push("فيلمٌ انتهى لا يُعاد وحده");
  if (!c.includes("releaseVideo(video)")) out.push("تحرير المفكّك");
  return out;
}

/**
 * ما لا يملكه المشغّل: كتابة سمة الإيقاف المشتركة، والكتابة في التخزين (`setItem`/`removeItem`/`clear`
 * أو وصولٌ بالأقواس لا يُعرف قراءةً من كتابة)، والتخزين المؤقّت للجلسة، وصوت، ونطقٌ. **القراءة مأذونة**:
 * `localStorage.getItem` وحدها — اختيار «إيقاف الحركة» المحفوظ يُحترم عند التحميل المباشر (#14).
 */
const forbiddenPowers = (code: string) =>
  strip(code).match(
    /setAttribute\(\s*MOTION_PAUSED_ATTR|dataset\.nxMotionPaused|localStorage\.(?:setItem|removeItem|clear)\b|localStorage\s*(?:\[|=(?!=))|sessionStorage|speechSynthesis|<audio|new Audio\(/g,
  ) ?? [];

/* ── كاشفات CSS ────────────────────────────────────────────────────────── */

const flat = (s: string) => s.replace(/\s+/g, " ").trim();

/** ألوانٌ نهائية: سداسية أو rgb/hsl حرفية — لا ألوان النظام (`ButtonText` …) ولا `color-mix` على رموز. */
function literalColors(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkDecls((d) => {
    if (/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(d.value)) out.push(`${d.prop}: ${d.value}`);
  });
  return out;
}

function atChain(node: ChildNode): string[] {
  const out: string[] = [];
  for (let p = node.parent as Node | undefined; p && p.type !== "root"; p = p.parent as Node) {
    if (p.type === "atrule") out.push(`@${(p as AtRule).name} ${(p as AtRule).params}`);
  }
  return out;
}

/** `transition`/`animation` خارج بوّابة `prefers-reduced-motion: no-preference`. */
function ungatedMotion(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkDecls(/^(transition|animation)/, (d) => {
    const gated = atChain(d).some((a) => a.includes("prefers-reduced-motion: no-preference"));
    if (!gated) out.push(`${d.prop}: ${d.value}`);
  });
  return out;
}

/** الزجاج حالةٌ ساكنة: قاعدة `:hover` لا تكتب غير لون الحدّ. */
function hoverGlass(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkRules((rule) => {
    if (!rule.selector.includes(":hover")) return;
    rule.walkDecls((d) => {
      if (d.prop !== "border-color") out.push(`${rule.selector} { ${d.prop} }`);
    });
  });
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

function targetGaps(css: string): string[] {
  const d = baseDecls(css, ".twin-film-btn");
  const out: string[] = [];
  if (!(px(d["min-block-size"]) >= 44)) out.push("الارتفاع");
  if (!(px(d["min-inline-size"]) >= 44)) out.push("العرض");
  return out;
}

/** العنوان والشريط والمسرح لا يطفون فوق الفيديو: لا تموضع مطلق/ثابت ولا إزاحةٌ سالبة ولا `transform`. */
function overlayGaps(css: string): string[] {
  const out: string[] = [];
  const guarded = /^\.sd-cinema-(head|toolbar|stage|actions)$/;
  postcss.parse(css).walkRules((rule) => {
    if (!rule.selectors.some((s) => guarded.test(flat(s).replace(/^\.sd-cinema\s*>\s*/, ""))))
      return;
    rule.walkDecls((d) => {
      if (d.prop === "position" && /absolute|fixed/.test(d.value))
        out.push(`${rule.selector}: position`);
      if (d.prop === "transform" || d.prop === "translate") out.push(`${rule.selector}: ${d.prop}`);
      if (/^(margin|inset|top|bottom)/.test(d.prop) && /(^|\s)-\d/.test(d.value)) {
        out.push(`${rule.selector}: ${d.prop} سالب`);
      }
    });
  });
  return out;
}

/* ── كاشفات الأصول ─────────────────────────────────────────────────────── */

const AUDIO_BOXES = ["mp4a", "esds", "soun", "smhd"];
const audioBoxes = (bytes: Buffer) => AUDIO_BOXES.filter((b) => bytes.includes(b));

/** أنواع المسارات في MP4 من صناديق `hdlr`. */
function mp4Handlers(bytes: Buffer): string[] {
  const out: string[] = [];
  for (let i = bytes.indexOf("hdlr"); i !== -1; i = bytes.indexOf("hdlr", i + 4)) {
    if (i + 16 <= bytes.length) out.push(bytes.toString("latin1", i + 12, i + 16));
  }
  return out;
}

/** مدّة MP4 من صندوق `mvhd` (الإصدار 0 و1)؛ `null` إن غاب. */
function mp4Seconds(bytes: Buffer): number | null {
  const i = bytes.indexOf("mvhd");
  if (i === -1) return null;
  const v1 = bytes[i + 4] === 1;
  const timescale = bytes.readUInt32BE(i + (v1 ? 24 : 16));
  const duration = v1 ? Number(bytes.readBigUInt64BE(i + 28)) : bytes.readUInt32BE(i + 20);
  return timescale > 0 ? duration / timescale : null;
}

/** معرّفات الترميز في Matroska/WebM (العنصر `0x86`). أيّ معرّفٍ يبدأ بـ`A_` مسارٌ سمعيّ. */
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

/** مدّة WebM من عنصري `Duration` (0x4489) و`TimecodeScale` (0x2AD7B1) في رأس الملف؛ `null` إن غابت. */
function webmSeconds(bytes: Buffer): number | null {
  const head = bytes.subarray(0, Math.min(bytes.length, 4096));
  let scale = 1_000_000;
  const s = head.indexOf(Buffer.from([0x2a, 0xd7, 0xb1]));
  if (s !== -1) {
    const len = head[s + 3] & 0x0f;
    if (len >= 1 && len <= 8) {
      scale = 0;
      for (let k = 0; k < len; k++) scale = scale * 256 + head[s + 4 + k];
    }
  }
  const d = head.indexOf(Buffer.from([0x44, 0x89]));
  if (d === -1) return null;
  const size = head[d + 2];
  let units: number;
  if (size === 0x84) units = head.readFloatBE(d + 3);
  else if (size === 0x88) units = head.readDoubleBE(d + 3);
  else return null;
  return (units * scale) / 1e9;
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

/**
 * سقوف الوزن (بايت). **أرقامٌ مقترحة للمالك لا مقيسة**: 56 ث بصوتها بدرجتين على الجوال والمكتب، والمنشور
 * يُنزَّل ملفًّا واحدًا بعد أوّل ظهور. وسقف الوسائط الكلّي في الميزانية (`largestMedia`) 14 MiB أعلاها.
 */
const CEILING = { 1280: 9_000_000, 640: 4_000_000, poster: 250_000 } as const;

const ASSET_DIR = "public/media/twin";
const ASSETS = [
  `${ASSET_DIR}/sadeed-twin-1280.mp4`,
  `${ASSET_DIR}/sadeed-twin-1280.webm`,
  `${ASSET_DIR}/sadeed-twin-640.mp4`,
  `${ASSET_DIR}/sadeed-twin-640.webm`,
  `${ASSET_DIR}/sadeed-twin-poster.webp`,
] as const;

/**
 * فجوات ملفّات الفيديو: الصوت (يجب أن يطابق الراية `TWIN_FILM_HAS_AUDIO` بايتًا: راية «بصوت» على ملفٍّ
 * صامت تعرض زرًّا بلا صوت، وملفٌّ بصوتٍ تحت راية «بلا» يُسمَع دون أن يُتحكَّم به)، المدّة، الوزن.
 */
function filmGaps(
  name: string,
  mp4: Buffer,
  webm: Buffer,
  ceiling: number,
  hasAudio: boolean,
): string[] {
  const out: string[] = [];
  const handlers = mp4Handlers(mp4);
  const mp4Audio = audioBoxes(mp4).length > 0 || handlers.includes("soun");
  if (mp4Audio !== hasAudio) {
    out.push(
      `${name}.mp4: ${hasAudio ? "بلا مسار صوت والراية «بصوت»" : "فيه مسار صوت والراية «بلا»"}`,
    );
  }
  if (!mp4.includes("ftyp") || !mp4.includes("avc1")) out.push(`${name}.mp4: ليس H.264/MP4`);
  const mp4s = mp4Seconds(mp4);
  if (mp4s === null || Math.abs(mp4s - TWIN_FILM_SECONDS) > 0.5) {
    out.push(`${name}.mp4: المدّة ${mp4s} لا ${TWIN_FILM_SECONDS} ث`);
  }
  if (mp4.length > ceiling) out.push(`${name}.mp4: ${mp4.length} فوق السقف ${ceiling}`);
  const codecs = matroskaCodecs(webm);
  if (codecs.some((c) => c.startsWith("A_")) !== hasAudio) {
    out.push(`${name}.webm: الصوت لا يطابق الراية (${hasAudio}) [${codecs.join("،")}]`);
  }
  if (!codecs.includes("V_VP9")) out.push(`${name}.webm: ليس VP9 [${codecs.join("،")}]`);
  const ws = webmSeconds(webm);
  if (ws === null || Math.abs(ws - TWIN_FILM_SECONDS) > 0.5) {
    out.push(`${name}.webm: المدّة ${ws} لا ${TWIN_FILM_SECONDS} ث`);
  }
  if (webm.length > ceiling) out.push(`${name}.webm: ${webm.length} فوق السقف ${ceiling}`);
  return out;
}

/** مقارنة ثابت المدّة بثابت `remotion/twin/timeline.ts` نصًّا (الأداة خارج حزمة التطبيق فلا تُستورد). */
function secondsGap(timelineSrc: string, ours: number): string | null {
  const m = timelineSrc.match(
    /export const (?:TWIN_FILM_)?SECONDS\s*(?::\s*number\s*)?=\s*(\d+(?:\.\d+)?)/,
  );
  if (!m) return "SECONDS غير مُصدَّر في timeline.ts";
  return Number(m[1]) === ours ? null : `timeline.ts=${m[1]} والتطبيق=${ours}`;
}

/* ════════════════════════════════════════════════════════════════════════
   الكواشف تحمرّ على انتهاكٍ مزروع (المادة ٣٠)
   ════════════════════════════════════════════════════════════════════════ */

describe("الكواشف تحمرّ على انتهاكٍ مزروع", () => {
  it("رابط خارجي وصورة بطل وإطار iframe — تُلتقط، والتعليق لا يُحسب", () => {
    expect(
      externalUrls('const HERO = "https://d2ol7oe51mr4n9.cloudfront.net/x.png";'),
    ).toHaveLength(1);
    expect(externalUrls('<a href="http://example.com">x</a>')).toHaveLength(1);
    expect(externalUrls("// https://example.com في تعليق\nconst a = 1;")).toHaveLength(0);
    expect(heroImage("const HERO_IMAGE = 1;")).not.toHaveLength(0);
    expect(heroImage("a.cloudfront.net")).not.toHaveLength(0);
    expect(iframes("<iframe src='/cinematic' />")).toHaveLength(1);
    expect(iframes("{/* لا <iframe> هنا */}<div />")).toHaveLength(0);
  });

  it('«البثّ المباشر» و«عاجل» و LIVE تُلتقط، و«ليس بثًّا حيًّا» و`"live"` الصغيرة لا', () => {
    expect(liveWords("<span>البث المباشر</span>")).toHaveLength(1);
    expect(liveWords("<b>عاجل: بلاغ أمني</b>")).toHaveLength(1);
    expect(liveWords("<i /> LIVE")).toHaveLength(1);
    expect(liveWords("ليس بثًّا حيًّا")).toHaveLength(0);
    expect(liveWords('data.dataSource === "live"')).toHaveLength(0);
    expect(liveWords("{/* البث المباشر في تعليق */}")).toHaveLength(0);
    // الاستثناء بالجملة كاملةً: هي تمرّ، و«عاجل» غيرها لا.
    expect(liveWords(`"${WORK_ORDER_ACTION}"`, [WORK_ORDER_ACTION])).toHaveLength(0);
    expect(liveWords(`"${WORK_ORDER_ACTION}" <b>عاجل: بلاغ</b>`, [WORK_ORDER_ACTION])).toHaveLength(
      1,
    );
  });

  it("رقمٌ في نصٍّ معروض يُلتقط (كالأرقام المخبوزة في الصورة القديمة)", () => {
    expect(textDigits("<span>٩٩٪ مستوى الالتزام</span>")).toHaveLength(1);
    expect(textDigits("<p>٤٬٨٢٠ الموظفون</p>")).toHaveLength(1);
    expect(textDigits('const COPY = { ar: { a: "٣٢٠ المواقع" } } as const;')).toHaveLength(1);
    expect(textDigits('<Icon size={18} className="w-4" />')).toHaveLength(0);
  });

  it("فيديو بـloop أو autoPlay أو controls أو poster أو بلا muted/playsInline — يُلتقط", () => {
    const ok = `<video muted playsInline preload="auto" aria-hidden disablePictureInPicture><source type="video/mp4" /><source type="video/webm" /></video>`;
    expect(videoGaps(ok)).toEqual([]);
    expect(videoGaps(ok.replace("<video ", "<video loop "))).toContain("loop");
    expect(videoGaps(ok.replace("<video ", "<video autoPlay "))).toContain("autoPlay");
    expect(videoGaps(ok.replace("<video ", "<video controls "))).toContain("controls الأصلية");
    expect(videoGaps(ok.replace("<video ", '<video poster="/x.webp" '))).toContain(
      "poster على الفيديو",
    );
    expect(videoGaps(ok.replace("muted ", ""))).toContain("بلا muted");
    expect(videoGaps(ok.replace("playsInline ", ""))).toContain("بلا playsInline");
    expect(videoGaps(ok.replace('<source type="video/webm" />', ""))).toContain("مصدران");
  });

  it("فيلمٌ بلا بوّابة أو بلا الطبقة المشتركة أو بلا تحرير — يُلتقط", () => {
    expect(gateGaps(PLAYER)).toEqual([]);
    expect(gateGaps(PLAYER.replace('gate !== "off" && ', ""))).toContain("سطر allowed");
    // مزروع: يبقى الفيلم تحت `reduced` أيضًا، أو لا يُسحب حقّ البقاء عند الفكّ.
    expect(gateGaps(PLAYER.replace('gate === "saver" && played', "played"))).toContain(
      "سطر keepsPlaying",
    );
    expect(gateGaps(PLAYER.replace("setPlayed(false)", ""))).toContain("played يُمنح ويُسحب");
    expect(gateGaps(PLAYER.replace("(armed || started) && ", ""))).toContain("سطر mounted");
    expect(gateGaps(PLAYER.replace("{mounted && src && (", "{src && ("))).toContain(
      "الفيديو خلف mounted",
    );
    expect(gateGaps(PLAYER.replace(/holdFilmUnderPanel,?/g, ""))).toContain(
      "holdFilmUnderPanel من الطبقة المشتركة",
    );
    expect(gateGaps(PLAYER.replace(/releaseVideo\(video\)/g, "void 0"))).toContain("تحرير المفكّك");
  });

  it("كتابة سمة الإيقاف المشتركة أو الكتابة في التخزين أو الصوت — تُلتقط", () => {
    expect(forbiddenPowers(PLAYER)).toEqual([]);
    expect(forbiddenPowers("root.setAttribute(MOTION_PAUSED_ATTR, '1')")).toHaveLength(1);
    expect(forbiddenPowers("localStorage.setItem('a','b')")).toHaveLength(1);
    expect(forbiddenPowers("localStorage.removeItem('a')")).toHaveLength(1);
    expect(forbiddenPowers("localStorage.clear()")).toHaveLength(1);
    expect(forbiddenPowers("localStorage['a'] = 'b'")).toHaveLength(1);
    expect(forbiddenPowers("sessionStorage.getItem('a')")).toHaveLength(1);
    // القراءة وحدها مأذونة (#14).
    expect(forbiddenPowers("localStorage.getItem('nx-brand-motion') === 'paused'")).toEqual([]);
    expect(forbiddenPowers("window.speechSynthesis.speak(u)")).toHaveLength(1);
    expect(forbiddenPowers("<audio />")).toHaveLength(1);
  });

  it("لونٌ نهائي وزجاجٌ بالتمرير وحركةٌ بلا بوّابة وهدفٌ دون 44px وتراكبٌ مطلق — تُلتقط", () => {
    expect(literalColors(".a { color: #fff; background: rgba(0 0 0 / 0.5); }")).toHaveLength(2);
    expect(literalColors(".a { color: var(--ink); border-color: ButtonText; }")).toEqual([]);
    expect(hoverGlass(".a:hover { background: var(--x); }")).toHaveLength(1);
    expect(hoverGlass(".a:hover { border-color: var(--x); }")).toEqual([]);
    expect(ungatedMotion(".a { transition: opacity 1s; }")).toHaveLength(1);
    expect(
      ungatedMotion(
        "@media (prefers-reduced-motion: no-preference) { .a { transition: opacity 1s; } }",
      ),
    ).toEqual([]);
    expect(targetGaps(".twin-film-btn { min-block-size: 36px; min-inline-size: 36px; }")).toEqual([
      "الارتفاع",
      "العرض",
    ]);
    expect(overlayGaps(".sd-cinema-head { position: absolute; top: 5%; }")).toContain(
      ".sd-cinema-head: position",
    );
    expect(overlayGaps(".sd-cinema-head { margin-block-start: -40px; }")).toHaveLength(1);
    expect(overlayGaps(".sd-cinema > .sd-cinema-stage { transform: scale(1.1); }")).toHaveLength(1);
  });

  it("أصولٌ بصوتٍ أو بمدّةٍ خاطئة أو بملصقٍ بغير 1280×720 — تُلتقط", () => {
    // MP4 مزروع: صندوق mvhd بإصدار 0، timescale=1000، duration=29000 ⇒ 29 ث؛ وصندوق `soun` للصوت.
    const mvhd = Buffer.alloc(32);
    mvhd.write("mvhd", 0, "latin1");
    mvhd.writeUInt32BE(1000, 16);
    mvhd.writeUInt32BE(29_000, 20);
    expect(mp4Seconds(mvhd)).toBe(29);
    const v1 = Buffer.alloc(40);
    v1.write("mvhd", 0, "latin1");
    v1[4] = 1;
    v1.writeUInt32BE(600, 24);
    v1.writeBigUInt64BE(BigInt(18_000), 28);
    expect(mp4Seconds(v1)).toBe(30);
    expect(audioBoxes(Buffer.from("....mp4a...."))).toEqual(["mp4a"]);
    expect(mp4Handlers(Buffer.from("xxxxhdlr\0\0\0\0\0\0\0\0soun"))).toEqual(["soun"]);
    // WebM مزروع: TimecodeScale=1_000_000 (0x0F4240) وDuration=30000.0 (float32).
    const webm = Buffer.alloc(64);
    let o = 0;
    for (const b of [0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40, 0x44, 0x89, 0x84]) webm[o++] = b;
    webm.writeFloatBE(30_000, o);
    expect(webmSeconds(webm)).toBeCloseTo(30, 3);
    expect(webmSeconds(Buffer.alloc(64))).toBeNull();
    expect(matroskaCodecs(Buffer.from([0x86, 0x86, ...Buffer.from("A_OPUS")]))).toEqual(["A_OPUS"]);
    // الفجوات المجمَّعة.
    const gaps = filmGaps("x", Buffer.from("ftypavc1 mp4a"), Buffer.alloc(8), 10, false);
    expect(gaps.join("\n")).toMatch(/فيه مسار صوت/);
    // والعكس: راية «بصوت» على ملفٍّ صامت تُلتقط، وملفٌّ بصوتٍ تحت راية «بصوت» يمرّ من هذا البند.
    const silent = filmGaps("x", Buffer.from("ftypavc1"), Buffer.alloc(8), 10, true).join("\n");
    expect(silent).toMatch(/بلا مسار صوت/);
    expect(
      filmGaps("x", Buffer.from("ftypavc1 mp4a"), Buffer.alloc(8), 10, true).join("\n"),
    ).not.toMatch(/مسار صوت/);
    expect(gaps.join("\n")).toMatch(/المدّة/);
    expect(gaps.join("\n")).toMatch(/فوق السقف/);
    // ملصق WebP مزروع بأبعاد VP8X: 640×360.
    const wp = Buffer.alloc(32);
    wp.write("RIFF", 0, "latin1");
    wp.write("WEBP", 8, "latin1");
    wp.write("VP8X", 12, "latin1");
    wp.writeUIntLE(639, 24, 3);
    wp.writeUIntLE(359, 27, 3);
    expect(webpSize(wp)).toEqual({ width: 640, height: 360 });
  });

  it("ثابت المدّة يخالف timeline.ts ⇒ يُلتقط", () => {
    expect(secondsGap("export const TWIN_FILM_SECONDS = 30;", 30)).toBeNull();
    expect(secondsGap("export const TWIN_FILM_SECONDS: number = 30;", 30)).toBeNull();
    expect(secondsGap("export const TWIN_FILM_SECONDS = 24;", 30)).toMatch(/24/);
    expect(secondsGap("export const OTHER = 30;", 30)).toMatch(/غير مُصدَّر/);
  });
});

/* ════════════════════════════════════════════════════════════════════════
   الصفحتان — بلا صورةٍ خارجية ولا iframe ولا بثٍّ ولا رقمٍ مختلَق
   ════════════════════════════════════════════════════════════════════════ */

describe("/cinematic — بلا صورة خارجية ولا طبقاتٍ زخرفية ولا نصٍّ فوق الفيديو", () => {
  it("لا رابط خارجي ولا HERO_IMAGE ولا iframe ولا ألفاظ بثّ ولا رقمٌ في النصّ", () => {
    expect(externalUrls(CINEMATIC), "رابطٌ خارجي في الصفحة").toEqual([]);
    expect(heroImage(CINEMATIC), "صورة البطل الخارجية").toEqual([]);
    expect(iframes(CINEMATIC)).toEqual([]);
    expect(liveWords(CINEMATIC)).toEqual([]);
    expect(textDigits(CINEMATIC), "رقمٌ في نصّ الصفحة").toEqual([]);
  });

  it("المسرح هو المشغّل المضمَّن، والعنوان نصٌّ حقيقيّ قبله في الشجرة", () => {
    const code = strip(CINEMATIC);
    expect(code).toContain("<TwinFilmPlayer");
    expect(code).not.toMatch(/<img\b/);
    expect(code.indexOf("<h1>")).toBeGreaterThan(-1);
    expect(code.indexOf("<h1>")).toBeLessThan(code.indexOf("<TwinFilmPlayer"));
    // والشريط: العودة وزرّ المرآة وملء الشاشة — ملء الشاشة بعد التحقّق من دعمه.
    expect(code).toContain('to="/"');
    expect(code).toContain("player.current?.toggle()");
    expect(code).toContain("fullscreen.supported &&");
  });

  it("CSS: لا طبقة زخرفية قديمة، ولا حركة، ولا لون نهائي، ولا تراكب مطلق للعنوان والشريط", () => {
    const css = strip(PAGE_CSS);
    for (const gone of [
      "particles",
      "scan",
      "orbit",
      "grid",
      "vignette",
      "picture",
      "headline",
      "bottom",
      "live",
      "disclosure",
    ]) {
      expect(css, `طبقة .sd-cinema-${gone} عادت`).not.toMatch(
        new RegExp(`\\.sd-cinema-${gone}\\b`),
      );
    }
    expect(css).not.toMatch(/@keyframes|animation\s*:/);
    expect(literalColors(PAGE_CSS)).toEqual([]);
    expect(overlayGaps(PAGE_CSS)).toEqual([]);
    expect(externalUrls(PAGE_CSS)).toEqual([]);
    expect(css).not.toMatch(/url\(/);
  });

  it("المسرح لا يتجاوز الشاشة ارتفاعًا ولا يضيق عن 20rem، والجوال أيقونات بهدف 44px", () => {
    expect(strip(PAGE_CSS)).toMatch(
      /\.sd-cinema > \.sd-cinema-stage\s*\{[^}]*max-inline-size:\s*min\(1150px,\s*max\(20rem,\s*calc\(\(100svh - 18rem\) \* 16 \/ 9\)\)\)/,
    );
    expect(strip(PAGE_CSS)).toMatch(/@media \(max-width: 599px\)[\s\S]*inline-size:\s*44px/);
  });
});

/**
 * حشوة أسفل /cinematic تُخلي زرّ سَدِيد العائم (#16): الإفصاح الصادق آخر ما في الصفحة، ولا تمرير بعده،
 * فإن لم تحجز الحشوةُ مساحةَ الزرّ غطّى آخرَ سطورِه. المطلوب: ثالث قيم `padding` (أسفل) = طولٌ ≥ حاجة
 * الزرّ + `env(safe-area-inset-bottom)` (قصّة iPhone). والحاجة تُشتقّ من مصدر الزرّ لا من رقمٍ مكتوب.
 */
function launcherClearanceGaps(css: string, needPx: number): string[] {
  const out: string[] = [];
  const padding = baseDecls(css, ".sd-cinema").padding;
  if (!padding) return ["لا padding على .sd-cinema"];
  const bottom =
    flat(padding)
      .replace(/\s*\+\s*/g, " + ")
      .match(/^(?:\S+\s+){2}(.+)$/)?.[1] ?? "";
  if (!bottom.includes("env(safe-area-inset-bottom)")) out.push("بلا env(safe-area-inset-bottom)");
  const length = /calc\(\s*([\d.]+)(px|rem)\s*\+/.exec(bottom) ?? /^([\d.]+)(px|rem)$/.exec(bottom);
  const px = length ? parseFloat(length[1]) * (length[2] === "rem" ? 16 : 1) : NaN;
  if (!(px >= needPx))
    out.push(`الحشوة ${Number.isNaN(px) ? "غير مقروءة" : px + "px"} < ${needPx}px`);
  return out;
}

/** حاجة الزرّ العائم بالبكسل من مصدره: `bottom` بقيمة calc(R rem + env) + `h-N` (N×4px). */
function launcherFootprintPx(src: string): number | null {
  const bottom = /fixed bottom-\[calc\(([\d.]+)rem\+env\(safe-area-inset-bottom\)\)\]/.exec(src);
  const height = /\bh-(\d+)\b/.exec(src.slice(bottom?.index ?? 0, (bottom?.index ?? 0) + 160));
  return bottom && height ? parseFloat(bottom[1]) * 16 + parseInt(height[1], 10) * 4 : null;
}

describe("/cinematic — حشوة الأسفل تُخلي زرّ سَدِيد العائم فلا يغطّي الإفصاح (#16)", () => {
  const LAUNCHER = read("src/components/sadeed-core/SadeedCopilot.tsx");
  const need = launcherFootprintPx(LAUNCHER);

  it("حاجة الزرّ تُقرأ من مصدره (وإن انتقل الزرّ يحمرّ هذا ليُراجَع الإخلاء)", () => {
    expect(need, "تغيّر شكل تموضع الزرّ العائم في SadeedCopilot — راجِع حشوة /cinematic").toBe(80);
  });

  it("الحشوة السفلى ≥ الحاجة + مساحة الأمان، والقديمة 48px تُلتقط", () => {
    expect(launcherClearanceGaps(PAGE_CSS, need ?? 80)).toEqual([]);
    expect(launcherClearanceGaps(".sd-cinema { padding: 16px 16px 48px; }", 80)).toEqual([
      "بلا env(safe-area-inset-bottom)",
      "الحشوة 48px < 80px",
    ]);
    expect(
      launcherClearanceGaps(
        ".sd-cinema { padding: 16px 16px calc(2rem + env(safe-area-inset-bottom)); }",
        80,
      ),
    ).toEqual(["الحشوة 32px < 80px"]);
    expect(launcherClearanceGaps(".sd-cinema { padding: 16px 16px 96px; }", 80)).toEqual([
      "بلا env(safe-area-inset-bottom)",
    ]);
  });
});

describe("/sec/twin — مشغّلٌ مضمَّن لا iframe، والنصوص الكاذبة حُذفت، والصندوقان المحدَّدان محذوفان", () => {
  it("لا iframe ولا رابط خارجي ولا ألفاظ بثّ ولا رقمٌ في نصّ قسم الفيلم", () => {
    expect(iframes(SEC_TWIN)).toEqual([]);
    expect(externalUrls(SEC_TWIN)).toEqual([]);
    expect(liveWords(SEC_TWIN, [WORK_ORDER_ACTION])).toEqual([]);
    expect(SEC_TWIN, "الاستثناء بلا موضع — يُحذف من القائمة").toContain(WORK_ORDER_ACTION);
    expect(textDigits(filmSection(SEC_TWIN)), "رقمٌ في نصّ قسم الفيلم").toEqual([]);
  });

  it("قسم الفيلم: المشغّل المضمَّن ورابط /cinematic، بلا زرّ فتحٍ ولا شرائح الإعلان القديمة", () => {
    const section = filmSection(SEC_TWIN);
    expect(section, "قسم الفيلم غائب").not.toBe("");
    expect(section).toContain("<TwinFilmPlayer");
    expect(section).toContain('to="/cinematic"');
    // الرابط يسمّي ما يفعله (#18): ينتقل إلى صفحة التجربة، فلا يُسمّى «ملء الشاشة» وليس في هذه الصفحة
    // أيّ شاشة كاملة (ملء الشاشة الحقيقي زرّ /cinematic وحده).
    expect(section).toMatch(/<Link to="\/cinematic"[^>]*>\s*فتح التجربة السينمائية\s*<\/Link>/);
    expect(strip(section), "رابط يسمّي التنقّل شاشةً كاملة").not.toMatch(/ملء الشاشة|Full screen/);
    expect(section).not.toMatch(/cinemaOpen|setCinemaOpen|aria-expanded/);
    // الجمل القديمة التي صارت كاذبةً أو مكرَّرة: «تفاعلي» و«شبكات الطاقة» و«ليس بثًا مباشرًا» و«البث الحقيقي».
    expect(strip(section)).not.toMatch(
      /تفاعلي|شبكات الطاقة|بثًا مباشرًا|البث الحقيقي|ثانية عند توفر الاتصال/,
    );
  });

  it("أمر المالك ٢٠٢٦/١٠/٢٣: صندوقا الشارة وتحديث البيانات والمشهد المرسوم محذوفان، وتبقى بطاقة العطل ووسم المحاكاة", () => {
    // الصندوقان بنصّ أمر المالك: «احذف البوكسين او العنصرين المحددين… قسم التوأم الرقمي».
    for (const gone of [
      "<RegionTwinScene",
      'aria-live="polite"',
      "تحديث البيانات",
      "تحديث تلقائي كل 60 ثانية عند توفر الاتصال",
      "بيانات أصول مرتبطة بالنظام",
      "جاري الاتصال بمصدر البيانات",
      "تعذر تحديث بيانات التوأم الرقمي",
      "isFetching",
      "sceneAssets",
    ]) {
      expect(SEC_TWIN, `عاد ما حذفه المالك: ${gone}`).not.toContain(gone);
    }
    // ما بقي: بطاقة العطل وإعادة المحاولة (عدم عرض أرقامٍ غير موثوقة)، ووسم المحاكاة سطرًا واحدًا
    // (المادة ٢٧: لا أرقام تُقرأ حيّةً وهي عرضٌ توضيحي).
    for (const keep of [
      "تعذر الحصول على شجرة الأصول. لن تُعرض أرقام غير موثوقة على أنها بيانات حية.",
      "إعادة المحاولة",
      "const { data, isLoading, isError, refetch } = useQuery({",
      "isError && !data ?",
      'data.dataSource !== "live"',
      "بيانات عرض توضيحية — ليست تشغيلية",
    ]) {
      expect(SEC_TWIN, `ضاع ما يجب أن يبقى: ${keep}`).toContain(keep);
    }
  });
});

/** ما صار كاذبًا بالفيلم، وما ينقص الصدق: يُرجَع نصًّا لكل فجوة. */
function narrationLies(ar: string, en: string): string[] {
  const out: string[] = [];
  if (/داخل المتصفح|لا ملف فيديو|تفاعلي|مشهد يعمل/.test(ar))
    out.push("ar: وصفٌ لمشهدٍ داخل المتصفح");
  if (/in-browser|interactive|not a video file/i.test(en)) out.push("en: وصفٌ لمشهدٍ داخل المتصفح");
  if (!/فيلم/.test(ar) || !/مُصيَّر مسبقًا/.test(ar))
    out.push("ar: لا يقول فيلمًا مُصيَّرًا مسبقًا");
  if (!/لا بثًّا حيًّا ولا بيانات تشغيلية/.test(ar))
    out.push("ar: بلا نفي البثّ والبيانات التشغيلية");
  if (!/pre-rendered/.test(en)) out.push("en: not pre-rendered");
  if (!/not a live feed and not operational data/.test(en))
    out.push("en: no live/operational disclaimer");
  if (liveWords(ar).length > 0) out.push("ar: لفظ بثٍّ مباشر");
  return out;
}

describe("الرواية — صفّ /cinematic صادق بالفيلم", () => {
  const row = ENTRIES_C.find(([k]) => k === "/cinematic")?.[1];

  it("الصفّ موجود، ويقول فيلمًا مُصيَّرًا مسبقًا لا بثًّا ولا بياناتٍ تشغيلية، وبلا ما صار كاذبًا", () => {
    expect(row, "صفّ /cinematic غاب").toBeDefined();
    const entry = narrationFor("/cinematic")!;
    expect(narrationLies(entry.ar, entry.en)).toEqual([]);
  });

  it("والكاشف يحمرّ على الصفّ القديم المزروع بلسانيه", () => {
    const oldAr =
      "أنت الآن في التجربة السينمائية. تشمل مشهد موشن جرافيك تفاعلي للتوأم الرقمي. القيمة: مشهدٌ يعمل داخل المتصفح لا ملف فيديو ولا بثًّا حيًّا، وأرقامه توضيحية لا بيانات تشغيلية.";
    const oldEn =
      "You are in the Cinematic Experience. Value: an in-browser scene, not a video file or a live feed, and its figures are illustrative, not operational data.";
    const lies = narrationLies(oldAr, oldEn);
    expect(lies.join("\n")).toMatch(/وصفٌ لمشهدٍ داخل المتصفح/);
    expect(lies.join("\n")).toMatch(/لا يقول فيلمًا مُصيَّرًا مسبقًا/);
    expect(lies.join("\n")).toMatch(/in-browser|not pre-rendered/);
  });
});

/* ════════════════════════════════════════════════════════════════════════
   المشغّل — مصدره وCSS ونموذجه
   ════════════════════════════════════════════════════════════════════════ */

describe("المشغّل — مصدرٌ بلا إعادةٍ ذاتية ولا قوى فوق صلاحيته", () => {
  it("الفيديو صامتٌ مضمَّنٌ بلا loop ولا autoPlay ولا controls، بمصدرين", () => {
    expect(videoGaps(PLAYER)).toEqual([]);
  });

  it("البوّابة ثم الظهور ثم العنصر، والإيقاف تحت اللوحة من الطبقة المشتركة، والتحرير عند الفكّ", () => {
    expect(gateGaps(PLAYER)).toEqual([]);
  });

  it("لا يكتب سمة الإيقاف المشتركة ولا يكتب في التخزين (يقرأ اختيار الإيقاف فقط) ولا يحمل صوتًا", () => {
    expect(forbiddenPowers(PLAYER)).toEqual([]);
  });

  it("لا ألفاظ بثّ في المشغّل ونموذجه، ولا رابط خارجي، وإفصاحه صادق بلسانيه", () => {
    expect(liveWords(PLAYER)).toEqual([]);
    expect(liveWords(MODEL)).toEqual([]);
    expect(externalUrls(PLAYER)).toEqual([]);
    expect(externalUrls(MODEL)).toEqual([]);
    for (const lang of ["ar", "en"] as const) {
      const t = TWIN_FILM_TEXT[lang];
      expect(`${t.disclosure} ${t.description}`).toContain(String(TWIN_FILM_SECONDS));
    }
    expect(TWIN_FILM_TEXT.ar.disclosure).toMatch(/مُصيَّر مسبقًا/);
    expect(TWIN_FILM_TEXT.ar.disclosure).toMatch(/ليس بثًّا حيًّا ولا بيانات تشغيلية/);
    expect(TWIN_FILM_TEXT.en.disclosure).toMatch(/pre-rendered/);
    expect(TWIN_FILM_TEXT.en.disclosure).toMatch(/not a live feed and not operational data/);
  });

  it("الأفعال الخمسة بلسانيها، والتلميحات الأربعة، وكلّها بلا فراغ", () => {
    for (const lang of ["ar", "en"] as const) {
      const t = TWIN_FILM_TEXT[lang];
      expect(Object.keys(t.actions).sort()).toEqual(["pause", "play", "replay", "resume", "retry"]);
      expect(Object.keys(t.hints).sort()).toEqual([
        "failed",
        "off",
        "offPaused",
        "reduced",
        "saver",
      ]);
      for (const v of [...Object.values(t.actions), ...Object.values(t.hints)]) {
        expect(v.trim().length).toBeGreaterThan(3);
      }
    }
  });
});

describe("CSS المشغّل — رموزٌ لا ألوان، زجاجٌ ساكن، حركةٌ بوّابة، أهدافٌ ≥ 44px، إطارٌ 16:9", () => {
  it("لا لون نهائي، ولا `url()` خارجية", () => {
    expect(literalColors(FILM_CSS)).toEqual([]);
    expect(externalUrls(FILM_CSS)).toEqual([]);
    expect(strip(FILM_CSS)).not.toMatch(/url\(/);
  });

  it("الزجاج في القاعدة: الحشوة والبريق والحافّة بلا `:hover`، والتمرير يغيّر الحدّ وحده", () => {
    const d = baseDecls(FILM_CSS, ".twin-film-btn");
    expect(d.background).toMatch(/var\(--glass-sheen\)/);
    expect(d.background).toMatch(/var\(--glass-fill\)/);
    expect(d.border).toMatch(/var\(--glass-edge\)/);
    expect(d["box-shadow"]).toMatch(/var\(--glass-rim\)/);
    expect(hoverGlass(FILM_CSS)).toEqual([]);
    // ومحصورٌ بأجهزة التمرير فلا يلتصق على اللمس.
    expect(strip(FILM_CSS)).toMatch(/@media \(hover: hover\)[\s\S]*:hover/);
  });

  it("كل حركةٍ داخل prefers-reduced-motion: no-preference", () => {
    expect(ungatedMotion(FILM_CSS)).toEqual([]);
    expect(strip(FILM_CSS)).toMatch(/prefers-reduced-motion: no-preference/);
  });

  it("هدف الزرّ ≥ 44px في البعدين، والإطار 16:9 ثابتٌ بأبعاد الملصق على الوسم", () => {
    expect(targetGaps(FILM_CSS)).toEqual([]);
    expect(baseDecls(FILM_CSS, ".twin-film-frame")["aspect-ratio"]).toBe("16 / 9");
    expect(TWIN_FILM_POSTER.width / TWIN_FILM_POSTER.height).toBeCloseTo(16 / 9, 3);
    expect(PLAYER).toContain("width={TWIN_FILM_POSTER.width}");
    expect(PLAYER).toContain("height={TWIN_FILM_POSTER.height}");
  });

  it("بدائل forced-colors وreduced-transparency، وملء الشاشة بنسبة 16:9", () => {
    const css = strip(FILM_CSS);
    expect(css).toMatch(/@media \(forced-colors: active\)[\s\S]*ButtonText/);
    expect(css).toMatch(/@media \(prefers-reduced-transparency: reduce\)/);
    expect(css).toMatch(/\.twin-film:fullscreen[\s\S]*\* 16 \/ 9/);
  });

  it("الفيديو شفّافٌ حتى `data-ready` — لا يُعوَّل على شفافية ما قبل الإطار الأوّل", () => {
    expect(baseDecls(FILM_CSS, ".twin-film-video").opacity).toBe("0");
    expect(baseDecls(FILM_CSS, ".twin-film-video[data-ready]").opacity).toBe("1");
    expect(PLAYER).toContain("data-ready={ready || undefined}");
  });
});

/* ════════════════════════════════════════════════════════════════════════
   النموذج الخالص
   ════════════════════════════════════════════════════════════════════════ */

const SIGNALS: GateSignals = {
  reducedMotion: false,
  saveData: false,
  motionOff: false,
  motionPaused: false,
  safeMode: false,
};

describe("البوابة — الأولويّة للنظام ثم الجهاز ثم الشبكة", () => {
  it("بلا مانع ⇒ open", () => {
    expect(filmGate(SIGNALS)).toBe("open");
    expect(filmGate({ ...SIGNALS, effectiveType: "4g" })).toBe("open");
  });

  it("تقليل الحركة ⇒ reduced", () => {
    expect(filmGate({ ...SIGNALS, reducedMotion: true })).toBe("reduced");
  });

  it("توفير البيانات أو اتصالٌ بطيء ⇒ saver", () => {
    expect(filmGate({ ...SIGNALS, saveData: true })).toBe("saver");
    for (const slow of SLOW_CONNECTIONS) {
      expect(filmGate({ ...SIGNALS, effectiveType: slow }), slow).toBe("saver");
    }
    expect(SLOW_CONNECTIONS).toEqual(["slow-2g", "2g", "3g"]);
  });

  it("مفتاح النظام وزرّ الإيقاف والوضع الآمن ⇒ off ويعلون على كل ما سواها", () => {
    expect(filmGate({ ...SIGNALS, motionOff: true })).toBe("off");
    expect(filmGate({ ...SIGNALS, motionPaused: true })).toBe("off");
    expect(filmGate({ ...SIGNALS, safeMode: true })).toBe("off");
    expect(filmGate({ ...SIGNALS, motionPaused: true, reducedMotion: true, saveData: true })).toBe(
      "off",
    );
    expect(filmGate({ ...SIGNALS, reducedMotion: true, saveData: true })).toBe("reduced");
  });
});

describe("سبب الإيقاف — التلميح بالسبب لا بالبوابة المطويّة (#13/#17)", () => {
  it("زرّ الإيقاف وحده ⇒ pause-button؛ والوضع الآمن أو مفتاح النظام (ومعهما الزرّ) ⇒ system", () => {
    expect(offCause({ ...SIGNALS, motionPaused: true })).toBe("pause-button");
    expect(offCause({ ...SIGNALS, safeMode: true })).toBe("system");
    expect(offCause({ ...SIGNALS, motionOff: true })).toBe("system");
    expect(offCause({ ...SIGNALS, motionPaused: true, safeMode: true })).toBe("system");
    expect(offCause({ ...SIGNALS, motionPaused: true, motionOff: true })).toBe("system");
    expect(offCause(SIGNALS)).toBe("system");
  });

  it("الإحالة إلى الرئيسية في نصّ التفضيل القديم وحده، والمحايد بلا إحالة بلسانيه", () => {
    expect(TWIN_FILM_TEXT.ar.hints.offPaused).toMatch(/افتح الصفحة الرئيسية مرّةً/);
    expect(TWIN_FILM_TEXT.en.hints.offPaused).toMatch(/Open the home page once/);
    for (const lang of ["ar", "en"] as const) {
      expect(TWIN_FILM_TEXT[lang].hints.off, `${lang}: المحايد يحيل`).not.toMatch(
        /الصفحة الرئيسية|home page|إيقاف الحركة|Pause motion/i,
      );
    }
  });
});

describe("إيقاف الحركة المحفوظ — يطابق ما يكتبه زرّ الرئيسية (#14)", () => {
  const ROW = read("src/components/home/HomeBrandRow.tsx");
  const PLATE = read("src/components/brand/SadeedPlateLockup.tsx");
  const constOf = (src: string, name: string) =>
    new RegExp(`const ${name} = "([^"]+)"`).exec(src)?.[1] ?? null;

  it("المفتاح هو مفتاح الرئيسية ومفتاح اللوحة نفسه، والقيمة «paused» كما يكتبها الزرّ", () => {
    expect(MOTION_PREF_KEY).toBe(constOf(ROW, "PAUSE_KEY"));
    expect(MOTION_PREF_KEY).toBe(constOf(PLATE, "SAVED_PAUSE_KEY"));
    expect(ROW).toContain(`localStorage.setItem(PAUSE_KEY, "${MOTION_PREF_PAUSED}")`);
    // والمشغّل يقرؤه ولا يكتبه: القراءة بالثابتين لا بنصٍّ مكرَّر.
    expect(strip(PLAYER)).toMatch(
      /localStorage\.getItem\(MOTION_PREF_KEY\) === MOTION_PREF_PAUSED/,
    );
  });
});

describe("الدرجة بالحاجة المقيسة", () => {
  it("الجوال يأخذ 640 والمكتب 1280، والتكبير لا يتجاوز الحدّ", () => {
    expect(pickTwinFilm(358, 3).width).toBe(640); // 358×2 = 716 ≤ 640×1.15
    expect(pickTwinFilm(390, 1).width).toBe(640);
    expect(pickTwinFilm(640, 1).width).toBe(640);
    expect(pickTwinFilm(735, 1).width).toBe(640); // 640×1.15 = 736
    expect(pickTwinFilm(737, 1).width).toBe(1280);
    expect(pickTwinFilm(900, 1).width).toBe(1280);
    expect(pickTwinFilm(1150, 2).width).toBe(1280);
    expect(pickTwinFilm(0, 0).width).toBe(640);
  });

  it("الترقية فقط: إطارٌ يكبر يرفع الدرجة، وإطارٌ يصغر لا يخفّضها (#15)", () => {
    const small = TWIN_FILMS[0].src;
    const big = TWIN_FILMS[1].src;
    expect(upgradeTwinFilm(null, 358, 2)).toBe(small);
    expect(upgradeTwinFilm(small, 358, 2)).toBe(small);
    expect(upgradeTwinFilm(small, 1200, 1)).toBe(big);
    expect(upgradeTwinFilm(small, 844, 2)).toBe(big);
    expect(upgradeTwinFilm(big, 300, 1), "تخفيضٌ بعد ترقية").toBe(big);
    expect(upgradeTwinFilm(big, 1200, 1)).toBe(big);
    // مصدرٌ لا يُعرف (قيمة قديمة) ⇒ يُختار من جديد بالحاجة.
    expect(upgradeTwinFilm("/x.mp4", 358, 2)).toBe(small);
  });

  it("مصدر الدرجة MP4 وتوأمه WebM بالمسار نفسه، ومساراتها في عقد الأصول", () => {
    expect(TWIN_FILMS.map((f) => f.src)).toEqual([
      "/media/twin/sadeed-twin-640.mp4",
      "/media/twin/sadeed-twin-1280.mp4",
    ]);
    expect(webmOf("/media/twin/sadeed-twin-640.mp4")).toBe("/media/twin/sadeed-twin-640.webm");
    expect(TWIN_FILM_POSTER.src).toBe("/media/twin/sadeed-twin-poster.webp");
  });

  it("حدّ التكبير هو حدّ الرئيسية نفسه، ونسبة الظهور مكتوبة", () => {
    expect(TWIN_UPSCALE_LIMIT).toBe(FILM_UPSCALE_LIMIT);
    expect(VISIBLE_RATIO).toBeGreaterThan(0);
    expect(VISIBLE_RATIO).toBeLessThan(1);
  });
});

describe("الزرّ الواحد — فعلٌ لكل حال، وسببٌ للتعليق", () => {
  const STATUSES: FilmStatus[] = ["idle", "playing", "paused", "ended", "failed"];

  it("الحال ⇒ الفعل بالاسم العربي والإنجليزي", () => {
    const want = {
      idle: ["play", "تشغيل الفيلم", "Play film"],
      playing: ["pause", "إيقاف الفيلم مؤقتًا", "Pause film"],
      paused: ["resume", "متابعة الفيلم", "Resume film"],
      ended: ["replay", "إعادة عرض الفيلم", "Replay film"],
      failed: ["retry", "إعادة محاولة تحميل الفيلم", "Retry loading the film"],
    } as const;
    for (const s of STATUSES) {
      const ar = controlFor(s, "open", "ar");
      const en = controlFor(s, "open", "en");
      expect([ar.action, ar.label, en.label]).toEqual(want[s]);
      expect(ar.disabled).toBe(false);
    }
  });

  it("المُعلَّق في off وحده، وسببه في التلميح — وreduced/saver يشرحان غياب البدء التلقائي", () => {
    for (const s of STATUSES) {
      expect(controlFor(s, "off", "ar").disabled).toBe(true);
      // بلا سبب معلوم: التلميح المحايد (لا يَعِد بزرّ قد لا يزيل السبب).
      expect(controlFor(s, "off", "ar").hint).toBe(TWIN_FILM_TEXT.ar.hints.off);
      expect(controlFor(s, "off", "ar", "system").hint).toBe(TWIN_FILM_TEXT.ar.hints.off);
      expect(controlFor(s, "off", "en", "pause-button").hint).toBe(
        TWIN_FILM_TEXT.en.hints.offPaused,
      );
    }
    expect(controlFor("idle", "reduced", "ar").hint).toBe(TWIN_FILM_TEXT.ar.hints.reduced);
    expect(controlFor("idle", "saver", "en").hint).toBe(TWIN_FILM_TEXT.en.hints.saver);
    expect(controlFor("idle", "open", "ar").hint).toBeNull();
    expect(controlFor("idle", null, "ar").hint).toBeNull();
    expect(controlFor("failed", "open", "ar").hint).toBe(TWIN_FILM_TEXT.ar.hints.failed);
    // بدأ الفيلم بنقرة الزائر تحت تقليل الحركة ⇒ لا تلميح بعد البدء.
    expect(controlFor("playing", "reduced", "ar").hint).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════════════
   الأصول — تنتظر مسار التصيير (W5-A)
   ════════════════════════════════════════════════════════════════════════ */

describe("ثابت المدّة — يطابق timeline.ts في أداة التصيير", () => {
  it("TWIN_FILM_SECONDS في التطبيق = SECONDS في remotion/twin2/timeline.ts (الفيلم المنشور)", (ctx) => {
    if (!existsSync("remotion/twin2/timeline.ts")) {
      ctx.skip("remotion/twin2/timeline.ts غير موجود — المقارنة تنتظره");
    }
    expect(secondsGap(read("remotion/twin2/timeline.ts"), TWIN_FILM_SECONDS)).toBeNull();
  });
});

describe("أصول الفيلم — الخمسة، صوتها يطابق الراية، 56 ث، تحت السقف", () => {
  const folder = existsSync(ASSET_DIR);

  it("ينهار فقط إن وُجد المجلّد بلا الأصول الخمسة", () => {
    if (!folder) return; // الغياب الكامل معلَن في البند التالي لا هنا
    const missing = ASSETS.filter((p) => !existsSync(p));
    expect(missing, "public/media/twin موجود بلا هذه الأصول").toEqual([]);
  });

  it("الأصول الخمسة: MP4/H.264 وWebM/VP9 بصوتٍ يطابق الراية وبمدّة 56 ث وتحت السقف، وملصق 1280×720", (ctx) => {
    if (!folder) {
      ctx.skip("public/media/twin غير موجود بعد (مسار W5-A لم يسلّم) — فحص الأصول معلَّق بها");
    }
    if (ASSETS.some((p) => !existsSync(p))) return; // ينهار في البند السابق بتسميتها
    const gaps = [
      ...filmGaps(
        "sadeed-twin-1280",
        readFileSync(ASSETS[0]),
        readFileSync(ASSETS[1]),
        CEILING[1280],
        TWIN_FILM_HAS_AUDIO,
      ),
      ...filmGaps(
        "sadeed-twin-640",
        readFileSync(ASSETS[2]),
        readFileSync(ASSETS[3]),
        CEILING[640],
        TWIN_FILM_HAS_AUDIO,
      ),
    ];
    const poster = readFileSync(ASSETS[4]);
    const size = webpSize(poster);
    if (size.width !== TWIN_FILM_POSTER.width || size.height !== TWIN_FILM_POSTER.height) {
      gaps.push(
        `الملصق ${size.width}×${size.height} لا ${TWIN_FILM_POSTER.width}×${TWIN_FILM_POSTER.height}`,
      );
    }
    if (poster.length > CEILING.poster)
      gaps.push(`الملصق ${poster.length} فوق السقف ${CEILING.poster}`);
    expect(gaps).toEqual([]);
    // ودرجة 640 أخفّ من 1280 — وإلا فلا معنى لاختيارها على الجوال.
    expect(statSync(ASSETS[2]).size).toBeLessThan(statSync(ASSETS[0]).size);
  });
});

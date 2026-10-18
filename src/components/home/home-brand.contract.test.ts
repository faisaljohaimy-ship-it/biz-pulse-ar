/**
 * عقد صفّ الهوية على الرئيسية: شريط «مزايا سَدِيد» ثم لوحة سَدِيد بعرض العمود، وفوقها فيلمها
 * السينمائي والاسم والسطر **نصًّا حقيقيًّا** (أوامر المالك ٢٠٢٦/١٠/١٧ و١٠/١٨ — المواصفة ١٠ §٢.٣).
 *
 * ما يكسر الأمر لا يراه tsc ولا البناء:
 *   • الاسم أو السطر بغير نصّ المالك الحرفيّ («… رؤية تنفيذية **على** الأمن الصناعي …»)، أو
 *     مخبوزًا في صورة — والأمر «Render text as real HTML»؛
 *   • نصٌّ يبقى خافتًا بعد زوال الفيلم — واللوحة بلا نصّها، فيغيب الاسم كلّه — أو يخفت خارج
 *     قصّة الفيلم، أو خارج بوابة الحركة؛
 *   • لحظتا النصّ وقد تبدّلت مشاهد الفيلم دونهما (`remotion/brand/SadeedFilm.tsx`)؛
 *   • فيلمٌ يحمل مسار صوت (Remotion يضيف مسارًا صامتًا افتراضًا) — صامتٌ في **حاويته** لا بسمة
 *     `muted` وحدها؛ أو يُركَّب لمن طلب السكون أو توفير البيانات، أو في HTML الخادم، أو قبل
 *     استقرار الصفحة؛
 *   • وزنُ صورٍ يتجاوز سقف N3 (400 KB على `/`)، أو فيلمٌ يتضخّم بلا سقف؛
 *   • لوحةٌ تضيق عن العمود، أو صفٌّ في غير موضعه، أو لونٌ نهائي في CSS.
 *
 * وكل كاشفٍ يُجرَّب أولًا على انتهاكٍ مزروع (المادة ٣٠).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import postcss, { type AtRule, type ChildNode, type Node, type Rule } from "postcss";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import {
  BRAND_FILMS,
  FILM_TEXT,
  HOME_BRAND,
  HomeBrandRow,
  filmActAt,
} from "@/components/home/HomeBrandRow";

const SRC = readFileSync("src/components/home/HomeBrandRow.tsx", "utf8");
const PAGE = readFileSync("src/routes/-blueprint-page.tsx", "utf8");
const CSS = readFileSync("src/styles/home/home-brand.css", "utf8");
const MOTION = readFileSync("src/styles/home/home-motion.css", "utf8");
const FILM = readFileSync("remotion/brand/SadeedFilm.tsx", "utf8");

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
 * بعد استقرار الصفحة؛ والجوال الصغرى وحدها (`pickFilm`) فسقفها أضيق.
 */
const FILM_CEILING = { each: 4_000_000, phone: 1_500_000, total: 8_000_000 };

const GATE = "prefers-reduced-motion: no-preference";
/** بوّابة الحركة الدائمة: مفتاح النظام والوضع الآمن معًا. */
const SWITCH = 'html:not([data-nx-motion="off"]):not(.safe-mode)';

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

/** الفيلم لا يُرسم إلا بعد السماح وما لم يوقفه المستخدم — سطر الحراسة قبل `<video`. */
const gatedBeforeVideo = (code: string) => {
  const guard = code.indexOf("if (!play || failed || !src) return null;");
  const video = code.indexOf("<video");
  return (
    guard > -1 && video > guard && code.includes("const play = allowed && !paused && settled;")
  );
};

/** نصّ عنصر الفيلم من فتحه إلى إغلاقه. */
const filmAttrs = (code: string) => code.slice(code.indexOf("<video"), code.indexOf("</video>"));

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

/** حدود المشاهد كما كُتبت في مصدر الفيلم. */
function filmActs(film: string) {
  const num = (re: RegExp) => Number(re.exec(film)?.[1] ?? Number.NaN);
  return {
    holdEnd: num(/\bholdEnd:\s*([\d.]+)/),
    s4End: num(/\bs4End:\s*([\d.]+)/),
    s5End: num(/\bs5End:\s*([\d.]+)/),
    seconds: num(/\bFILM_SECONDS = ([\d.]+)/),
  };
}

/**
 * لحظتا النصّ داخل مشاهدهما: يخفت قبيل خفوت اللوحة (حتى نصف ثانية قبله، فيسبقه انتقاله)،
 * ويعود بين بدء هبوط الرمز وسكون الختام — والمدّة مدّة الفيلم.
 */
function syncGaps(
  text: { hideAt: number; revealAt: number; seconds: number },
  film: string,
): string[] {
  const act = filmActs(film);
  const out: string[] = [];
  if (text.seconds !== act.seconds) out.push(`المدّة ${text.seconds} ≠ ${act.seconds}`);
  if (!(text.hideAt <= act.holdEnd && text.hideAt >= act.holdEnd - 0.5)) {
    out.push(`الخفوت ${text.hideAt} خارج [${act.holdEnd - 0.5}، ${act.holdEnd}]`);
  }
  if (!(text.revealAt > act.s4End && text.revealAt < act.s5End)) {
    out.push(`العودة ${text.revealAt} خارج (${act.s4End}، ${act.s5End})`);
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

  it("مشاهدٌ تبدّلت دون لحظتي النصّ، أو مدّةٌ غير مدّة الفيلم — تُلتقط", () => {
    const later = FILM.replace(/holdEnd:\s*[\d.]+/, "holdEnd: 9.0");
    expect(later).not.toBe(FILM);
    expect(syncGaps(FILM_TEXT, later)).toHaveLength(1);
    const landed = FILM.replace(/s4End:\s*[\d.]+/, "s4End: 21.5");
    expect(landed).not.toBe(FILM);
    expect(syncGaps(FILM_TEXT, landed)).toHaveLength(1);
    const shorter = FILM.replace(/FILM_SECONDS = \d+/, "FILM_SECONDS = 20");
    expect(shorter).not.toBe(FILM);
    expect(syncGaps(FILM_TEXT, shorter)).toHaveLength(1);
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

  it("فيلمٌ قبل حراسته أو يتجاهل الإيقاف، وصفٌّ في غير موضعه — يُلتقطان", () => {
    const unguarded = CODE.replace("if (!play || failed || !src) return null;", "");
    expect(unguarded).not.toBe(CODE);
    expect(gatedBeforeVideo(unguarded)).toBe(false);
    const ignoresPause = CODE.replace(
      "const play = allowed && !paused && settled;",
      "const play = allowed && settled;",
    );
    expect(ignoresPause).not.toBe(CODE);
    expect(gatedBeforeVideo(ignoresPause)).toBe(false);
    const below = CODE.replace(/<HomeTicker [^>]*\/>/, "").replace(
      "<BrandPlate ar={ar} play={play} />",
      "<BrandPlate ar={ar} play={play} />\n<HomeTicker />",
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

/* ── الفيلم: صامتٌ في الحاوية، بسقف، وبلحظتي نصٍّ من مشاهده ─────────────── */

describe("الفيلم — بلا مسار صوت، بسقف وزن، ولحظتا النصّ من مشاهده", () => {
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

  it("الفيلم صامتٌ ومضمَّنٌ ويعيد ويبدأ تلقائيًّا، بمصدرين، بلا أزرار ولا صورة داخل صورة", () => {
    const video = filmAttrs(CODE);
    // بلا `poster`: الصورة تحت الفيلم هي الملصق — والسمة جعلت الفيلم المركَّب بعد
    // الترطيب مرشّحَ LCP ونزّلت نسخة 1600 على الجوال (Lighthouse ٢٠٢٦/١٠/١٨).
    expect(video, "<video> بسمة poster").not.toContain("poster=");
    for (const attr of [
      "muted",
      "playsInline",
      "loop",
      "autoPlay",
      "aria-hidden",
      "disablePictureInPicture",
      "onError=",
      'type="video/mp4"',
      'type="video/webm"',
    ]) {
      expect(video, `<video> بلا ${attr}`).toContain(attr);
    }
    // MP4 أوّلًا: المتصفّح يأخذ أوّل مصدرٍ يقدر عليه.
    expect(video.indexOf('type="video/mp4"')).toBeLessThan(video.indexOf('type="video/webm"'));
    // وخطأ مصدرٍ واحد لا يُسقط الفيلم قبل تجربة الثاني (يصعد في شجرة React):
    // الفشل ما استهدف العنصر أو جاء بعد استنفاد المصادر.
    expect(video).toContain("video.networkState === video.NETWORK_NO_SOURCE");
    expect(video).toContain("e.target === video");
    expect(video).not.toContain("controls");
    expect(CODE).not.toMatch(/muted\s*=\s*(false|\{false\})/);
  });

  it("لحظتا النصّ من جدول مشاهد الفيلم، والفصول بحدودها، والوصلة بلا خفوت", () => {
    expect(syncGaps(FILM_TEXT, FILM)).toEqual([]);
    expect(filmActAt(0)).toBe("hold");
    expect(filmActAt(FILM_TEXT.hideAt - 0.01)).toBe("hold");
    expect(filmActAt(FILM_TEXT.hideAt)).toBe("story");
    expect(filmActAt(FILM_TEXT.revealAt - 0.01)).toBe("story");
    expect(filmActAt(FILM_TEXT.revealAt)).toBe("reveal");
    // آخر إطارٍ قبل الوصلة كشفٌ وأوّل إطارٍ بعدها سكون — والنصّ ظاهرٌ في الاثنين (لا يُخفيه
    // إلا فصل القصّة، أدناه)، فلا يومض عند كل دورة.
    expect(filmActAt(FILM_TEXT.seconds - 1 / 30)).toBe("reveal");
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
    expect((CODE.match(/\} catch \{/g) ?? []).length).toBeGreaterThanOrEqual(2);
    // لا يُعوَّل على شفافية ما قبل الإطار الأوّل في كل محرّك.
    expect(filmAttrs(CODE)).toContain("data-ready={ready || undefined}");
    expect(filmAttrs(CODE)).toContain("onPlaying={() => setReady(true)}");
    expect(CSS).toMatch(/\.nx-brand-film:not\(\[data-ready\]\) \{\s*opacity: 0;/);
  });

  it("والفيلم ينتظر استقرار الصفحة — لا ينافس الصورة الكبرى (LCP)", () => {
    expect(CODE).toContain("const play = allowed && !paused && settled;");
    expect(CODE).toMatch(/document\.readyState === "complete"/);
    expect(CODE).toMatch(/addEventListener\("load", go, \{ once: true \}\)/);
    expect(CODE).toContain("requestIdleCallback");
    // ويحمرّ على المزروع: تركيبٌ مع الترطيب.
    const eager = CODE.replace(
      "const play = allowed && !paused && settled;",
      "const play = allowed && !paused;",
    );
    expect(eager).not.toBe(CODE);
    expect(gatedBeforeVideo(eager)).toBe(false);
  });

  it("البريق متغيّران يُمرَّران لا قيمةٌ نهائية (المادة ٣٣)", () => {
    const sets = [...CODE.matchAll(/style\.setProperty\("([^"]+)"/g)].map((m) => m[1]);
    expect(sets.length).toBeGreaterThan(0);
    for (const prop of sets) expect(prop.startsWith("--"), `setProperty(${prop})`).toBe(true);
  });
});

/* ── النصّ يتبع الفيلم ولا يبقى خافتًا بعده ─────────────────────────────── */

describe("النصّ يتبع الفيلم ولا يبقى خافتًا بعده (المصيَّر)", () => {
  afterEach(() => {
    localStorage.removeItem("nx-brand-motion");
    delete document.documentElement.dataset.nxMotionPaused;
  });

  /** يركّب الصفّ حتى يُركَّب الفيلم ويُعرض إطاره عند `at` ثانية. */
  async function mountFilm(at: number) {
    const view = render(createElement(I18nProvider, null, createElement(HomeBrandRow)));
    // الاستقرار: `load` وقع في jsdom، وبديل الخمول فيه مؤقّتٌ بـ300ms.
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 400)));
    const video = view.container.querySelector<HTMLVideoElement>("video.nx-brand-film");
    expect(video, "الفيلم لم يُركَّب").not.toBeNull();
    const art = view.container.querySelector<HTMLElement>(".nx-brand-art")!;
    const seek = (seconds: number) => {
      Object.defineProperty(video!, "currentTime", { configurable: true, value: seconds });
      fireEvent(video!, new Event("timeupdate"));
    };
    Object.defineProperty(video!, "currentTime", { configurable: true, value: at });
    await act(async () => {
      fireEvent(video!, new Event("playing"));
    });
    return { view, video: video!, art, seek };
  }

  it("الفصل من زمن الإطار المعروض، ويزول بزرّ الإيقاف فيعود النصّ", async () => {
    const { view, art, seek } = await mountFilm(10);
    expect(art.dataset.filmAct).toBe("story");
    seek(FILM_TEXT.revealAt + 0.5);
    expect(art.dataset.filmAct).toBe("reveal");
    seek(1);
    expect(art.dataset.filmAct).toBe("hold");
    seek(10);
    expect(art.dataset.filmAct).toBe("story");
    fireEvent.click(view.getByRole("button", { name: "إيقاف الحركة" }));
    await act(async () => {});
    expect(view.container.querySelector("video")).toBeNull();
    expect(art.dataset.filmAct, "النصّ بقي خافتًا بعد الإيقاف").toBeUndefined();
    view.unmount();
  });

  it("وفيلمٌ يتعذّر في منتصف القصّة يزول ومعه فصله — لا يغيب الاسم مع اللوحة الممسوحة", async () => {
    const { view, video, art } = await mountFilm(12);
    expect(art.dataset.filmAct).toBe("story");
    await act(async () => {
      fireEvent.error(video);
    });
    expect(view.container.querySelector("video")).toBeNull();
    expect(art.dataset.filmAct, "النصّ بقي خافتًا بعد تعذّر الفيلم").toBeUndefined();
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

  it("بدائل `forced-colors`: حدٌّ وبلا بريقٍ ولا توهّج، والاسم بحبر النظام", () => {
    const forced = CSS.slice(CSS.indexOf("@media (forced-colors: active)"));
    expect(forced).toContain("border-color: CanvasText");
    expect(forced).toMatch(/\.nx-brand-glare \{[^}]*display: none/);
    expect(forced).toMatch(/\.nx-brand-halo \{[^}]*display: none/);
    expect(forced).toMatch(/\.nx-brand-title > span\[lang\] \{[^}]*color: CanvasText/);
  });

  it("الدخول في عقد الحركة: الشريط يرتفع والبانر يظهر بالشفافية وحدها (LCP)", () => {
    const code = MOTION.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).toMatch(/\.nx-ticker \{\s*animation: nxHomeRise/);
    expect(code).toMatch(/\.nx-brand\[data-kind="banner"\] \{\s*animation: nxHomeFade/);
    expect(keyframeProps(MOTION, "nxHomeFade")).toEqual(["opacity"]);
  });
});

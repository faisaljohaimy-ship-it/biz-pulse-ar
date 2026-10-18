/**
 * عقد صفّ الهوية على الرئيسية (أمر المالك ٢٠٢٦/١٠/١٧ — المواصفة ١٠ §٢.٣).
 *
 * ما يكسر الأمر لا يراه tsc ولا البناء:
 *   • صورةٌ تُستبدل أو تُقصّ أو تُكتب عليها — والأمر «كما هي»؛
 *   • فيلمٌ يحمل مسار صوت (Remotion يضيف مسارًا صامتًا افتراضًا) — والفيلم
 *     يجب أن يكون صامتًا في **حاويته** لا بسمة `muted` وحدها؛
 *   • فيلمٌ يُركَّب لمن طلب السكون أو توفير البيانات، أو يُركَّب في HTML الخادم؛
 *   • وزنُ صورٍ يتجاوز سقف N3 (400 KB على `/`)، أو حلقةٌ تتضخّم بلا سقف؛
 *   • الصفّ في غير موضعه (تحت الترويسة وفوق المؤشرات)، أو لونٌ نهائي في CSS.
 *
 * وكل كاشفٍ يُجرَّب أولًا على انتهاكٍ مزروع (المادة ٣٠).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const SRC = readFileSync("src/components/home/HomeBrandRow.tsx", "utf8");
const PAGE = readFileSync("src/routes/-blueprint-page.tsx", "utf8");
const CSS = readFileSync("src/styles/home/home-brand.css", "utf8");
const MOTION = readFileSync("src/styles/home/home-motion.css", "utf8");

const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const CODE = strip(SRC);

/** سقف صور الرئيسية (N3) وسقوف الحلقات — بايتات. */
const IMAGE_CEILING = 400 * 1024;
const LOOP_CEILING = { each: 3_000_000, total: 12_000_000 };

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

/** نسبة اللوحتين كما رُسمتا (2172×724) — والتقريب إلى بكسلٍ صحيح يحرّكها دون 0.02. */
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

/** الفيلم لا يُرسم إلا بعد السماح وما لم يوقفه المستخدم — سطر الحراسة قبل `<video`. */
const gatedBeforeVideo = (code: string) => {
  const guard = code.indexOf("if (!play || failed || !src) return null;");
  const video = code.indexOf("<video");
  return (
    guard > -1 && video > guard && code.includes("const play = allowed && !paused && settled;")
  );
};

/** اسم رابط الشعار صريحٌ ويحوي نصّ اللوحة (‏`<figure>` داخل الرابط يقطع أخذه من البديل). */
const namedMarkLink = (code: string) =>
  /<Link\s+to="\/"\s+className="nx-brand-link"\s+aria-label=\{ar \? `\$\{HOME_BRAND\.mark\.ar\} — الرئيسية` : `\$\{HOME_BRAND\.mark\.en\} — Home`\}/.test(
    code,
  );

/** زرّ إيقاف الحلقتين: زرٌّ حقيقي بحالةٍ مُعلنة، لا يظهر حيث لا حركة. */
const pauseControl = (code: string) => {
  const at = code.indexOf('className="nx-brand-toggle');
  if (at === -1) return false;
  const button = code.slice(code.lastIndexOf("<button", at), code.indexOf("</button>", at));
  return (
    button.includes('type="button"') &&
    button.includes("aria-pressed={paused}") &&
    button.includes("aria-label={pauseLabel}") &&
    button.includes("onClick={() => setPaused(!paused)}") &&
    /\{allowed && \(\s*<button/.test(code)
  );
};

/** نصّ عنصر الفيلم من فتحه إلى إغلاقه. */
const filmAttrs = (code: string) => code.slice(code.indexOf("<video"), code.indexOf("</video>"));

const rowOrder = (page: string) => {
  const code = strip(page);
  const header = code.indexOf("<SystemHeader");
  const brand = code.indexOf("<HomeBrandRow />");
  const kpi = code.indexOf("<HomeKpiRow />");
  return header > -1 && brand > header && kpi > brand;
};

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

  it("رابط شعارٍ بلا اسم، وزرّ إيقافٍ بلا حالة أو ظاهرٌ بلا حركة — يُلتقطان", () => {
    const unnamed = CODE.replace(
      /\s+aria-label=\{ar \? `\$\{HOME_BRAND\.mark\.ar\}[^}]*\}[^}]*\}/,
      "",
    );
    expect(unnamed).not.toBe(CODE);
    expect(namedMarkLink(unnamed)).toBe(false);
    const stateless = CODE.replace("aria-pressed={paused}", "");
    expect(stateless).not.toBe(CODE);
    expect(pauseControl(stateless)).toBe(false);
    const always = CODE.replace("{allowed && (", "{(");
    expect(always).not.toBe(CODE);
    expect(pauseControl(always)).toBe(false);
    const ignoresPause = CODE.replace(
      "const play = allowed && !paused && settled;",
      "const play = allowed && settled;",
    );
    expect(ignoresPause).not.toBe(CODE);
    expect(gatedBeforeVideo(ignoresPause)).toBe(false);
  });

  it("فيلمٌ قبل حراسته، وصفٌّ في غير موضعه — يُلتقطان", () => {
    const unguarded = CODE.replace("if (!play || failed || !src) return null;", "");
    expect(unguarded).not.toBe(CODE);
    expect(gatedBeforeVideo(unguarded)).toBe(false);
    const swapped = PAGE.replace("<HomeBrandRow />", "").replace(
      "<HomeKpiRow />",
      "<HomeKpiRow />\n<HomeBrandRow />",
    );
    expect(swapped).not.toBe(PAGE);
    expect(rowOrder(swapped)).toBe(false);
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

  it("سمة `poster` على الفيلم تُلتقط", () => {
    const withPoster = CODE.replace(
      'className="nx-brand-film"',
      'className="nx-brand-film"\n      poster={src}',
    );
    expect(withPoster).not.toBe(CODE);
    expect(filmAttrs(withPoster)).toContain("poster=");
  });
});

/* ── الصور: ملفّا المالك كما هما ─────────────────────────────────────── */

describe("الصور — كما هي، وتحت سقف N3", () => {
  it("ستّ درجات مذكورة، وكلّها موجودة بعرضها المكتوب ونسبة 3:1", () => {
    expect(POSTERS).toHaveLength(6);
    for (const p of POSTERS) {
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

  it("النصّ البديل نصّ اللوحة نفسه، ولا نصّ أو رقم يُضاف فوقها", () => {
    expect(CODE).toContain("منظومة القرار والإنجاز الذكي");
    expect(CODE).toContain("رؤية تنفيذية على الأمن الصناعي");
    expect(CODE).toMatch(/alt=\{ar \? plate\.ar : plate\.en\}/);
    // الصورة بأبعادها المرسومة (3:1) فلا قفزة تخطيط.
    expect(CODE).toContain("width={BRAND_RATIO.width}");
    expect(CODE).toContain("height={BRAND_RATIO.height}");
    expect(CODE).toMatch(/BRAND_RATIO = \{ width: 2172, height: 724 \}/);
    // لا لون سداسي في المكوّن (المادة ٣٣).
    expect(CODE.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });
});

/* ── الحلقات: صامتة في الحاوية، بسقف ────────────────────────────────── */

describe("حلقات الماء — بلا مسار صوت وبسقف وزن", () => {
  it("ثلاث حلقات مذكورة، لكلٍّ MP4 (H.264) وWebM (VP9) موجودان، وبلا أيّ مسار صوت", () => {
    expect(FILMS).toHaveLength(3);
    let total = 0;
    for (const f of FILMS) {
      expect(existsSync(`public${f}`), `${f} غائب`).toBe(true);
      const bytes = readFileSync(`public${f}`);
      expect(bytes.includes("ftyp"), `${f}: ليس MP4`).toBe(true);
      expect(bytes.includes("avc1"), `${f}: لا مسار فيديو`).toBe(true);
      expect(audioBoxes(bytes), `${f}: عاد مسار الصوت`).toEqual([]);
      expect(bytes.length, `${f}: فوق السقف`).toBeLessThanOrEqual(LOOP_CEILING.each);
      total += bytes.length;

      // التوأم WebM: حاوية Matroska بمسار VP9 وبلا عنصر صوت (`A_` هو بادئة
      // معرّفات ترميزات الصوت في Matroska، و`V_VP9` معرّف الفيديو).
      const webm = f.replace(/\.mp4$/, ".webm");
      expect(existsSync(`public${webm}`), `${webm} غائب`).toBe(true);
      const wb = readFileSync(`public${webm}`);
      expect(matroskaCodecs(wb), `${webm}: مسارات الحاوية`).toEqual(["V_VP9"]);
      expect(wb.length, `${webm}: فوق السقف`).toBeLessThanOrEqual(LOOP_CEILING.each);
      total += wb.length;
    }
    expect(total).toBeLessThanOrEqual(LOOP_CEILING.total);
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

  it("وللمستخدم إيقافٌ ظاهر يُحفظ (WCAG 2.2.2) — والفيلم يظهر حين يُعرض إطاره", () => {
    // حلقتان بلا نهاية فوق نصّ، و`data-nx-motion` بلا كاتبٍ في الواجهة اليوم.
    expect(pauseControl(CODE)).toBe(true);
    expect(CODE).toContain('const PAUSE_KEY = "nx-brand-motion";');
    expect(CODE).toMatch(/localStorage\.getItem\(PAUSE_KEY\) === "paused"/);
    expect((CODE.match(/\} catch \{/g) ?? []).length).toBeGreaterThanOrEqual(2);
    const toggle = CSS.slice(CSS.indexOf(".nx-brand-toggle {"));
    const rule = toggle.slice(0, toggle.indexOf("}"));
    expect(rule).toContain("min-inline-size: 44px");
    expect(rule).toContain("min-block-size: 44px");
    // لا يُعوَّل على شفافية ما قبل الإطار الأوّل في كل محرّك.
    expect(filmAttrs(CODE)).toContain("data-ready={ready || undefined}");
    expect(filmAttrs(CODE)).toContain("onPlaying={() => setReady(true)}");
    expect(CSS).toMatch(/\.nx-brand-film:not\(\[data-ready\]\) \{\s*opacity: 0;/);
  });

  it("والحلقتان تنتظران استقرار الصفحة — لا تنافسان الصورة الكبرى (LCP)", () => {
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

  it("ورابط الشعار باسمٍ صريح يحوي نصّ اللوحة (WCAG 2.4.4 · 2.5.3 · 4.1.2)", () => {
    expect(namedMarkLink(CODE)).toBe(true);
  });

  it("البريق متغيّران يُمرَّران لا قيمةٌ نهائية (المادة ٣٣)", () => {
    const sets = [...CODE.matchAll(/style\.setProperty\("([^"]+)"/g)].map((m) => m[1]);
    expect(sets.length).toBeGreaterThan(0);
    for (const prop of sets) expect(prop.startsWith("--"), `setProperty(${prop})`).toBe(true);
  });
});

/* ── الموضع والأنماط ─────────────────────────────────────────────────── */

describe("الموضع — تحت الترويسة وفوق المؤشرات، بأنماط من طبقة الرموز", () => {
  it("الصفّ بين الترويسة والمؤشرات، من مصدرٍ واحد", () => {
    expect(rowOrder(PAGE)).toBe(true);
    expect(strip(PAGE)).toContain('from "@/components/home/HomeBrandRow"');
    expect((strip(PAGE).match(/<HomeBrandRow \/>/g) ?? []).length).toBe(1);
  });

  it("CSS: لا لون نهائي، لا `transform`، نسبة اللوحة مكتوبة، والشعار في الزاوية اليمنى عريضًا", () => {
    expect(literalColors(CSS)).toEqual([]);
    expect(transforms(CSS)).toEqual([]);
    expect(CSS).toContain("aspect-ratio: 2172 / 724");
    const wide = CSS.slice(CSS.indexOf("@media (min-width: 900px)"));
    expect(wide).toContain("inset-inline-end: 0");
    expect(wide).toMatch(/\.nx-brand\[data-kind="banner"\] \{[^}]*margin-inline: auto/);
  });

  it("بدائل: `forced-colors` بحدٍّ وبلا بريق، وحلقة تركيز على رابط الشعار", () => {
    const forced = CSS.slice(CSS.indexOf("@media (forced-colors: active)"));
    expect(forced).toContain("border-color: CanvasText");
    expect(forced).toMatch(/\.nx-brand-glare \{[^}]*display: none/);
    expect(CSS).toMatch(
      /\.nx-brand-link:focus-visible \{[^}]*outline: 2px solid var\(--tone-cyan\)/,
    );
  });

  it("الدخول في عقد الحركة: البانر يستقرّ والشعار يرتفع", () => {
    const code = MOTION.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).toMatch(/\.nx-brand\[data-kind="banner"\] \{\s*animation: nxHomeSettle/);
    expect(code).toMatch(/\.nx-brand-link \{\s*animation: nxHomeRise/);
  });
});

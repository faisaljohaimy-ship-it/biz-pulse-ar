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

/** عرض WebP من ترويسته (VP8 / VP8L / VP8X). */
function webpWidth(bytes: Buffer): number {
  const chunk = bytes.toString("latin1", 12, 16);
  if (chunk === "VP8X") return 1 + bytes.readUIntLE(24, 3);
  if (chunk === "VP8L") return 1 + (bytes.readUInt32LE(21) & 0x3fff);
  return bytes.readUInt16LE(26) & 0x3fff;
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

/** الفيلم لا يُرسم إلا بعد السماح — سطر الحراسة قبل `<video`. */
const gatedBeforeVideo = (code: string) => {
  const guard = code.indexOf("if (!allowed || failed || !src) return null;");
  const video = code.indexOf("<video");
  return guard > -1 && video > guard;
};

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

  it("فيلمٌ قبل حراسته، وصفٌّ في غير موضعه — يُلتقطان", () => {
    const unguarded = CODE.replace("if (!allowed || failed || !src) return null;", "");
    expect(unguarded).not.toBe(CODE);
    expect(gatedBeforeVideo(unguarded)).toBe(false);
    const swapped = PAGE.replace("<HomeBrandRow />", "").replace(
      "<HomeKpiRow />",
      "<HomeKpiRow />\n<HomeBrandRow />",
    );
    expect(swapped).not.toBe(PAGE);
    expect(rowOrder(swapped)).toBe(false);
  });

  it("قارئ عرض WebP يقرأ عرضًا حقيقيًّا", () => {
    const bytes = readFileSync(`public${POSTERS[0]}`);
    expect(webpWidth(bytes)).toBe(Number(/-(\d+)\.webp$/.exec(POSTERS[0])![1]));
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
      expect(wb.includes("V_VP9"), `${webm}: لا مسار VP9`).toBe(true);
      expect(wb.includes("A_OPUS") || wb.includes("A_VORBIS"), `${webm}: فيه مسار صوت`).toBe(false);
      expect(wb.length, `${webm}: فوق السقف`).toBeLessThanOrEqual(LOOP_CEILING.each);
      total += wb.length;
    }
    expect(total).toBeLessThanOrEqual(LOOP_CEILING.total);
  });

  it("الفيلم صامتٌ ومضمَّنٌ ويعيد ويبدأ تلقائيًّا، بمصدرين، بلا أزرار ولا صورة داخل صورة", () => {
    const video = CODE.slice(CODE.indexOf("<video"), CODE.indexOf("</video>"));
    for (const attr of [
      "muted",
      "playsInline",
      "loop",
      "autoPlay",
      "poster={poster}",
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

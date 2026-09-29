/**
 * أرضيةُ التباين فوق فيلم الخلفية — **بمحرّكٍ حقيقيّ على الناتج المبنيّ.**
 *
 * ## لماذا لا يكفي اختبار الوحدة
 *
 * كان حارسُ العقد يقرأ رموز الحبر من `src/styles.css` نصًّا، فقرأ
 * `.light { --ink-3: #3f3f46 }` وحسب عليه ٤٫٩٠:١ — **وتلك تصريحاتٌ ميتة**:
 * تغلبها كتلةٌ لاحقة `:root, .light, .dark` بالنوعية نفسها، فالنافذ فعلًا
 * `#4b5563` والتباين الحقيقيّ ٣٫٥٤:١. وصرّحت البوابة بالرقم الكاذب ونُشر.
 *
 * والتعاقب لا يُحسب نصًّا: نوعيةٌ ثم ترتيبٌ ثم طبقاتٌ ثم `var()` تكراريًّا.
 * فيُسأل عنه مَن يحسبه — المتصفّح نفسه عبر `getComputedStyle` — ولا
 * يحتاج ذلك مفكّكَ ترميز فيديو (وقد قُبل خطأً أنه يحتاجه ثلاث جولات).
 *
 * ## ما يُقاس
 *
 * لكل وضعٍ، على أسوأ إطارين مرصودين في الملفّ (أسود ٠ وأبيض ٢٥٥):
 *   • رموز الحبر التي تكتبها صفحة الواجهة — تُشتقّ منها لا تُكتب هنا.
 *   • حبرُ ترويسة الصفحتين الدائمتي الدكنة بقيمهما المثبَّتة.
 *   • **قناة السلامة**: نصّ رقاقة «خطر/تحذير/سليم» (يلزمه ٤٫٥) وأيقونتها
 *     (يلزمها ٣٫٠، WCAG 2.2 §1.4.11) فوق خلفية النغمة فوق الفيلم.
 *
 * ## والمقارنة من جهةٍ واحدة
 *
 * كلُّ قيمةٍ لها **أرضية**: عتبةُ AA إن كانت تجتازها، أو **القيمةُ التي
 * أقرّها المالك بتاريخها** إن قَبِل ما دونها بعد عرض الأرقام عليه. ويسقط
 * الفحص إن **هبطت** قيمةٌ عن أرضيتها — لا إن تحسّنت: حارسُ وصولٍ يحمرّ
 * حين تتحسّن القراءة خرج عن غرضه.
 *
 * ## حدودٌ معلَنة
 *
 * • **النموذج يحسب الفيلم والغطاء وحدهما.** طبقات الشفق والشبكة والأفق
 *   والتعتيم والنسيج فوقهما لا تدخل الحساب — فالأرقام تقريبٌ لتلك الطبقات
 *   لا قياسٌ لها. والتعتيم شفّافٌ في الوسط حيث يقع المتن، فأثره هناك صفر.
 * • **المتصفّح:** يُطلق Chromium الذي يطلبه `@playwright/test` المثبَّت.
 *   فإن لم يكن نازلًا في البيئة مرِّر مساره: `CHROMIUM_PATH=… npm run check:contrast`.
 *   وفي CI يُنزَّل بـ`npx playwright install --with-deps chromium`.
 * • **CI:** الخطوة لا تجري ما دام `npm ci` يسقط بتضارب القفل
 *   (`@lovable.dev/vite-tanstack-config` ‏2.13.1 في القفل مقابل 2.23.1).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const OUT = [
  join(ROOT, "dist", "client", "assets"),
  join(ROOT, ".output", "public", "assets"),
].find(existsSync);
if (!OUT) {
  console.error("فحص التباين يحتاج بناءً مكتملًا (dist/client أو .output/public).");
  process.exit(1);
}
const CSS_FILE = readdirSync(OUT).find((f) => /^styles-.*\.css$/.test(f));
if (!CSS_FILE) {
  console.error(`لا ملفّ أنماط مبنيّ في ${OUT}`);
  process.exit(1);
}

/** أسوأ إطارين مرصودين في `public/sadeed-home-bg.mp4` (signalstats، ٤٦٥ إطارًا). */
const FRAMES = [0, 255];
const TOL = 0.05;

/**
 * **قرارات المالك بأرقامها** — ما قَبِله دون AA بعد عرضه عليه.
 *
 * كلُّ قيدٍ هنا قيمةٌ مقيسة لا عتبة: هي ما كان على الشاشة يوم القرار.
 * والأرضية تُشتقّ منها (القيمة − التسامح)، فالتدهور بعدها يُسقط الفحص.
 */
const DECIDED = {
  "2026-09-29": {
    why: "المالك: الفاتح ٨٠٪ (٠٩/٢٨) والداكن ٨٠٪ «عاريةً بلا رفع الغطاء» (٠٩/٢٩)، وقناة السلامة «اتركها كما هي وسجّل القرار» (٠٩/٢٩).",
    values: {
      "light --ink-3": 3.54,
      "light danger chip": 2.4,
      "light warning chip": 2.28,
      "light success chip": 2.32,
      "light danger icon": 2.72,
      "light warning icon": 2.31,
      "light success icon": 2.42,
      "dark --ink": 3.23,
      "dark --ink-2": 2.35,
      "dark --ink-3": 1.93,
      "dark bare header": 2.49,
      "dark danger chip": 2.12,
      "dark warning chip": 2.26,
      "dark success chip": 2.22,
      "dark danger icon": 1.32,
      "dark warning icon": 2.01,
      "dark success icon": 1.8,
    },
  },
};
const decidedFloor = Object.fromEntries(
  Object.entries(DECIDED).flatMap(([date, d]) =>
    Object.entries(d.values).map(([k, v]) => [k, { value: v, date }]),
  ),
);

// ── ما يُشتقّ من المصدر ────────────────────────────────────────────────
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const HOME = "src/routes/-blueprint-page.tsx";
const BARE = ["src/routes/-nx-agents-page.tsx", "src/routes/-rag-search-page.tsx"];

const inks = [
  ...new Set([...read(HOME).matchAll(/var\((--ink[\w-]*)\)/g)].map((m) => m[1])),
].sort();

/** أصنافُ النغمة من `STAT_TONES` نفسها — لا تُكتب هنا فتفترق عنها. */
const shell = read("src/components/sec/sec-shell.tsx");
const TONES = ["danger", "warning", "success"].map((key) => {
  const block = shell.slice(
    shell.indexOf(`  ${key}: {`),
    shell.indexOf("},", shell.indexOf(`  ${key}: {`)),
  );
  const field = (f) => block.match(new RegExp(`${f}:\\s*"([^"]+)"`))?.[1];
  const [card, iconCls, badgeCls] = [field("card"), field("iconCls"), field("badgeCls")];
  if (!card || !iconCls || !badgeCls)
    throw new Error(`تعذّر اشتقاق أصناف النغمة «${key}» من sec-shell`);
  return { key, card, iconCls, badgeCls };
});

/** قيمُ الصفحتين المثبَّتة في كائن الأسلوب نفسه الذي يفرض السطح. */
const bare = BARE.map((p) => {
  const src = read(p);
  const at = src.indexOf('"--surface"');
  const style = src.slice(src.lastIndexOf("{", at), src.indexOf("}", at) + 1);
  const pick = (n, re) => style.match(new RegExp(`"${n}"[^:]*:\\s*"(${re})"`))?.[1];
  const header = src.slice(src.indexOf("<header"), src.indexOf("</header>"));
  const alphas = [...header.matchAll(/(<[^<>]*text-nx-pearl\/(\d+)[^<>]*>)/g)]
    .filter((m) => !m[1].includes("aria-hidden"))
    .map((m) => Number(m[2]) / 100);
  return {
    page: p,
    surface: pick("--surface", "#[0-9a-fA-F]{6}"),
    film: pick("--hv-film-opacity", "[\\d.]+"),
    scrim: pick("--hv-scrim-mix", "\\d+%"),
    alpha: Math.min(...alphas),
  };
});

// ── المحرّك ─────────────────────────────────────────────────────────────
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage();

async function resolve(mode, extraRoot = "") {
  const cards = TONES.map(
    (t) =>
      `<div id="card-${t.key}" class="${t.card}"><svg id="icon-${t.key}" class="${t.iconCls}"></svg><span id="chip-${t.key}" class="nx-dash-chip border ${t.badgeCls}">x</span></div>`,
  ).join("");
  const inkSpans = inks
    .map((n, i) => `<span id="ink-${i}" style="color:var(${n})">x</span>`)
    .join("");
  await page.setContent(
    `<!doctype html><html class="${mode}"><body><div id="root" class="nx-bp-surface" style="${extraRoot}"><div class="nx-hv"><video class="nx-hv-film"></video><span class="nx-hv-scrim"></span></div>${inkSpans}<span id="pearl" class="text-nx-pearl">x</span>${cards}</div></body></html>`,
  );
  await page.addStyleTag({ path: join(OUT, CSS_FILE) });
  return page.evaluate(
    ({ inkCount, tones }) => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 1;
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      // `getImageData` يُعيد RGBA **غير مضروب** بالشفافية — فلا قسمة عليها.
      const col = (c) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.fillStyle = c;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3] / 255];
      };
      const cs = (id) => getComputedStyle(document.getElementById(id));
      const root = cs("root");
      const film = getComputedStyle(document.querySelector(".nx-hv-film"));
      const o = {
        surface: col(root.getPropertyValue("--surface").trim()),
        film: parseFloat(film.opacity),
        filmPosition: film.position,
        filmFit: film.objectFit,
        scrim: parseFloat(root.getPropertyValue("--hv-scrim-mix")) / 100,
        pearl: col(cs("pearl").color),
        inks: Array.from({ length: inkCount }, (_, i) => col(cs(`ink-${i}`).color)),
        tones: {},
      };
      for (const k of tones)
        o.tones[k] = {
          card: col(cs(`card-${k}`).backgroundColor),
          chipBg: col(cs(`chip-${k}`).backgroundColor),
          chip: col(cs(`chip-${k}`).color),
          icon: col(cs(`icon-${k}`).color),
        };
      return o;
    },
    { inkCount: inks.length, tones: TONES.map((t) => t.key) },
  );
}

const over = (top, bottom) => [0, 1, 2].map((i) => top[3] * top[i] + (1 - top[3]) * bottom[i]);
const lum = (c) => {
  const l = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** الخلفية تحت النصّ: إطارٌ فوق السطح بوضوح الفيلم، ثم الغطاء فوقه. */
const backdrop = (r, y) =>
  over([...r.surface.slice(0, 3), r.scrim], over([y, y, y, r.film], r.surface.slice(0, 3)));
const worst = (fn) => Math.min(...FRAMES.map(fn));

const measured = [];
const push = (key, value, need) => measured.push({ key, value, need });
const failures = [];

for (const mode of ["light", "dark"]) {
  const r = await resolve(mode);
  // الفيلم نفسه طبقةٌ فعلًا في الناتج — وإلّا فالأرقام كلُّها عن قاعدةٍ ميتة.
  if (r.filmPosition !== "absolute" || r.filmFit !== "cover" || !(r.film > 0)) {
    failures.push(
      `${mode}: قاعدة الفيلم لا تصل المحرّك (position=${r.filmPosition}, object-fit=${r.filmFit}, opacity=${r.film})`,
    );
    continue;
  }
  inks.forEach((n, i) =>
    push(
      `${mode} ${n}`,
      worst((y) => {
        const b = backdrop(r, y);
        return ratio(over(r.inks[i], b), b);
      }),
      4.5,
    ),
  );
  for (const t of TONES) {
    const tc = r.tones[t.key];
    push(
      `${mode} ${t.key} chip`,
      worst((y) => {
        const b = over(tc.chipBg, over(tc.card, backdrop(r, y)));
        return ratio(over(tc.chip, b), b);
      }),
      4.5,
    );
    push(
      `${mode} ${t.key} icon`,
      worst((y) => {
        const b = over(tc.card, backdrop(r, y));
        return ratio(over(tc.icon, b), b);
      }),
      3.0,
    );
  }
}

// الصفحتان الدائمتا الدكنة — بقيمهما المثبَّتة، ويُفترض تطابقهما.
const pins = new Set(bare.map((b) => `${b.surface}|${b.film}|${b.scrim}|${b.alpha}`));
if (pins.size !== 1)
  failures.push(`الصفحتان الداكنتان تُثبّتان قيمًا مختلفة: ${[...pins].join(" ≠ ")}`);
{
  const b = bare[0];
  const r = await resolve(
    "dark",
    `--surface:${b.surface};--hv-film-opacity:${b.film};--hv-scrim-mix:${b.scrim}`,
  );
  const pearl = [...r.pearl.slice(0, 3), b.alpha];
  push(
    "dark bare header",
    worst((y) => {
      const bg = backdrop(r, y);
      return ratio(over(pearl, bg), bg);
    }),
    4.5,
  );
}
await browser.close();

// ── الحكم: من جهةٍ واحدة ────────────────────────────────────────────────
console.log(`سَدِيد | أرضية التباين فوق فيلم الخلفية — ${CSS_FILE}`);
for (const m of measured) {
  const d = decidedFloor[m.key];
  const floor = m.value >= m.need ? m.need : d ? d.value - TOL : m.need;
  const ok = m.value >= floor;
  const tag = m.value >= m.need ? "AA" : d ? `مُقَرّ ${d.date}` : "غير مُقَرّ";
  console.log(
    `${ok ? "✓" : "✗"} ${m.key.padEnd(22)} ${m.value.toFixed(2)}  (أرضية ${floor.toFixed(2)} · ${tag})`,
  );
  if (!ok) failures.push(`${m.key}: ${m.value.toFixed(2)} دون أرضيته ${floor.toFixed(2)} (${tag})`);
}
// قيدٌ مُقَرّ لا يُقاس بعد اليوم دَينٌ بائت: إمّا زال موضعه أو تغيّر اسمه.
// (ويُسكَت حين سقط وضعٌ كاملًا — فالعلّة حينها قاعدةُ الفيلم لا القيد.)
const skipped = new Set(failures.filter((f) => /قاعدة الفيلم/.test(f)).map((f) => f.split(":")[0]));
for (const k of Object.keys(decidedFloor))
  if (!skipped.has(k.split(" ")[0]) && !measured.some((m) => m.key === k))
    failures.push(`قرارٌ مُسجَّل لا يُقاس: «${k}» — احذفه أو صحّح اسمه`);

if (failures.length) {
  console.error("\n✗ أرضية التباين:");
  for (const f of failures) console.error("  - " + f);
  console.error("هبوطٌ دون ما أُقِرّ يُعاد إلى المالك بأرقامه، لا يُخفَّض القيد ليمرّ.");
  process.exit(1);
}
console.log("✓ كلُّ قيمةٍ عند أرضيتها أو فوقها.");

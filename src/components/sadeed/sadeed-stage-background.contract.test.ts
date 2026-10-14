/**
 * خلفية بطاقة سَدِيد — حارس «الصورة لا تُقرأ قياسًا» (المادة ٢٧).
 *
 * البطاقة تفرش صورةً فوتوغرافية على كامل سطحها بأمر المالك ٢٠٢٦/٠٨/١١.
 * والصورة المختارة تحمل **داخلها** لوحةَ مؤشّرات مرسومة: «١٢٨ مواقع» و«٣٤٢
 * دوريات» و«١٬٢٤٨ موظفون» و«٩٤٫٢٪ مؤشر الأداء». قِيست مقروءةً تمامًا على
 * ‏390px‏ و‏1280px‏ قبل المعالجة.
 *
 * وهذا **نفس نوع الفبركة** التي تحرسها `measured-counters.contract.test.ts`،
 * لا نوعٌ أخفّ: رقمٌ يبدو قياسًا ولم يقع قياسه، على الصفحة الأولى، تحت اسم
 * المنتج مباشرة. الفارق الوحيد أنه مرسومٌ في بكسل لا مكتوبٌ في JSX — فلا
 * `tsc` يراه ولا `eslint` ولا أيّ اختبار يقرأ نصًّا.
 *
 * ── لماذا يحرس هذا الملف الاقترانَ لا الوجود ──
 * الحارس الذي يقول «الضبابة موجودة» يموت يوم تتبدّل الصورة إلى واحدة بلا
 * أرقام، فيصير عبئًا يُحذف. والحارس هنا يقول شيئًا أبقى: **ما دامت البطاقة
 * تفرش صورةً، فمعها ما ينزع مقروئية ما فيها.** فإن رُفعت الصورة سقط الشرط
 * من نفسه، وإن بقيت بقي معها علاجه.
 *
 * ولا يُفحص هنا «هل الأرقام مقروءة؟» — ذلك يحتاج متصفّحًا وبصرًا. يُفحص
 * الشرطان اللذان يجعلانها غير مقروءة، وهما نصّان يمكن لأي تعديل لاحق أن
 * يمحوهما بصمت.
 *
 * ── والضبابة تنجو من أنماط الاستقرار (P0 ٢٠٢٦/١٠/١٤) ──
 * كتلة اللمس في آخر `styles.css` والوضع الآمن في أوّله يُسقطان المرشّحات
 * بـ`!important`، والضبابة أداة Tailwind بلا `!important` — فأيّ إسقاطٍ يبلغ
 * الصورة يمحوها ويُعيد الأرقام مقروءة. والوضع الآمن صار بلوغه ممكنًا بعد
 * الترطيب، فيُحسب هنا التتالي نفسه في السياقات الأربعة (سطح المكتب، اللمس،
 * الوضع الآمن، والوضع الآمن على اللمس): الفائز بين إعلانات `filter`
 * المهمّة التي تطابق الصورة إمّا لا أحد (فتبقى ضبابة المكوّن) وإمّا ضبابةٌ
 * لا تقلّ عن المقيس.
 */
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import postcss, { type AtRule, type Container } from "postcss";

const COMPONENT_PATH = "src/components/sadeed/SadeedStagePresence.tsx";
const STYLES_PATH = "src/styles.css";

const read = (p: string) => readFileSync(p, "utf8");
/** التعليقات تُنزع: الحارس يقرأ ما يُنفَّذ، لا ما يُشرح عنه. */
const stripJs = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ");
const stripCss = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ");

const COMPONENT = stripJs(read(COMPONENT_PATH));

/** هل ما زالت البطاقة تفرش صورةً على كامل سطحها؟ هذا شرط كل ما بعده. */
const hasFullBleedImage =
  /CARD_BG_SRC/.test(COMPONENT) && /absolute inset-0[^"]*object-cover/.test(COMPONENT);

describe("خلفية بطاقة سَدِيد لا تُقرأ قياسًا", () => {
  it("الصورة المفروشة مصحوبةٌ بضبابة تمحو حروفها الصغيرة", () => {
    if (!hasFullBleedImage) {
      // رُفعت الصورة — سقط الشرط. لا فشل ولا ادّعاء نجاح.
      expect(COMPONENT).not.toMatch(/CARD_BG_SRC/);
      return;
    }

    const imgTag = COMPONENT.match(/<img[\s\S]*?CARD_BG_SRC[\s\S]*?\/>/)?.[0] ?? "";
    expect(imgTag, "لم يُعثر على وسم الصورة — تغيّر شكله فبطل الحارس").not.toBe("");

    const blur = imgTag.match(/blur-\[(\d+(?:\.\d+)?)px\]/);
    expect(
      blur,
      "سقطت الضبابة عن خلفية البطاقة — عادت أرقام الصورة المرسومة مقروءةً " +
        "على الصفحة الأولى (١٢٨ · ٣٤٢ · ١٬٢٤٨ · ٩٤٫٢٪) وهي أرقامٌ لا يقيسها شيء",
    ).not.toBeNull();

    // ‏5px‏ هي المقيسة كافيةً على أصغر حرف في الصورة. وما دونها لم يُقَس،
    // فلا يُفترض أنه يكفي.
    expect(Number(blur![1]), "الضبابة أرقّ من المقيس كافيًا").toBeGreaterThanOrEqual(4);

    // الضبابة تُفرغ حواف الصورة شفافيةً؛ بلا تكبير تظهر إطارًا باهتًا.
    expect(imgTag, "ضبابة بلا تكبير — تنكشف حافّة شفّافة حول البطاقة").toMatch(/scale-1[01]\d/);
  });

  it("والحاجب لا يهبط تحت أرضية التباين المحسوبة", () => {
    if (!hasFullBleedImage) return;

    const css = stripCss(read(STYLES_PATH));
    const at = css.indexOf(".sd-stage-scrim");
    expect(at, "اختفى الحاجب `.sd-stage-scrim` وبقيت الصورة تحته").toBeGreaterThan(-1);

    const block = css.slice(at, css.indexOf("}", at));

    // **الأرضية تُقرأ من التدرّج الخطّي وحده.** الطبقة الشعاعية معه في نفس
    // الخاصية، وكلتاهما فوق الصورة — فهي تزيد العتمة ولا تنقصها أبدًا، ومنها
    // `transparent` عند طرفها. فإدخال شفافيّاتها في الحساب يقيس الطبقة
    // الخطأ: أرقّ نقطة فيها ليست أرقّ نقطة في الحاجب. (سقط الحارس على هذا
    // أول تشغيل: قرأ ‏0.5‏ الشعاعية أرضيةً وهي إضافةٌ لا نقص.)
    const linear = block.match(/linear-gradient\(([\s\S]*?)\)\s*(?:,|;|$)/)?.[1] ?? "";
    expect(linear, "لم يُعثر على التدرّج الخطّي — تغيّر شكل الحاجب فبطل الحارس").not.toBe("");

    const alphas = [
      ...linear.matchAll(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/g),
    ].map((m) => Number(m[1]));

    expect(alphas.length, "لم تُقرأ أي شفافية من التدرّج الخطّي").toBeGreaterThanOrEqual(4);

    // الحساب: أسطع بكسل ممكن أبيض؛ تحت ‏α‏ من ‏rgb(3,12,20)‏ تكون إضاءته
    // الناتجة ‏((1-α)·255)‏ تقريبًا. عند ‏α = 0.8‏ ⇐ ‏≈53‏ ⇐ تباين `--ink`
    // ‏≈10.8:1‏. وعند ‏α = 0.7‏ يهبط إلى ‏≈6.4:1‏ — ما زال فوق ‏4.5‏ للنصّ
    // الكبير لكنه يقارب حدّ `--ink-2` الرفيع. فالأرضية ‏0.8‏ لا ‏0.7‏.
    const floor = Math.min(...alphas);
    expect(
      floor,
      `أرقّ نقطة في الحاجب ${floor} — دون الأرضية المحسوبة 0.8، فتباين النصّ ` +
        "فوق أسطع بكسل ممكن لم يعد مضمونًا حسابيًّا",
    ).toBeGreaterThanOrEqual(0.8);
  });

  it("والبطاقة تحمل أرضيتها الداكنة معها في الوضعين", () => {
    // الصورة كحليّة داكنة، و`--ink` في الوضع الفاتح أسود. بلا تثبيتٍ للرموز
    // على البطاقة يصير النصّ أسودَ على كحليّ: غيابٌ لا بهتان.
    const css = stripCss(read(STYLES_PATH));
    const at = css.indexOf(".sd-stage-card {");
    expect(
      at,
      "سقط تثبيت رموز البطاقة — يعود النصّ أسودَ على كحليّ في الوضع الفاتح",
    ).toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("}", at));
    for (const token of ["--ink", "--chip", "--hairline"]) {
      expect(block, `الرمز ${token} غير مثبَّت على البطاقة`).toContain(`${token}:`);
    }

    // العناوين: قاعدة `h1..h6` غير المُطبَّقة في هذا الملف تعلو أدوات
    // Tailwind مهما كانت النوعية، فتمحو `--ink` عن العنوان وحده. قِيس
    // `rgb(17,24,39)` على بطاقةٍ رمزها `#e9f6ff`.
    expect(css, "سقط علاج العناوين — يعود عنوان البطاقة داكنًا على الصورة الداكنة").toMatch(
      /\.sd-stage-card\s*:is\(\s*h1[\s\S]{0,60}?\)\s*\{\s*color:\s*var\(--ink\)/,
    );
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   الضبابة تنجو من اللمس والوضع الآمن — التتالي محسوبًا
   ═══════════════════════════════════════════════════════════════════════ */

const COARSE_QUERY = "(pointer: coarse)";
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

function isCoarseMedia(node: Container | undefined): boolean {
  return (
    node?.type === "atrule" &&
    (node as AtRule).name === "media" &&
    norm((node as AtRule).params) === COARSE_QUERY
  );
}

type Specificity = [number, number, number];
const cmpSpec = (x: Specificity, y: Specificity) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];

/** نهاية معرِّفٍ (صنف، معرِّف، نوع، اسم صنفٍ زائف) — مع المهرَّب كأصناف Tailwind. */
function identEnd(sel: string, i: number): number {
  while (i < sel.length) {
    if (sel[i] === "\\") i += 2;
    else if (/[\w-]/.test(sel[i])) i += 1;
    else break;
  }
  return i;
}

/** يقسم قائمة محدِّداتٍ على الفواصل خارج الأقواس. */
function splitTopLevel(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i += 1) {
    if (list[i] === "(") depth += 1;
    else if (list[i] === ")") depth -= 1;
    else if (list[i] === "," && depth === 0) {
      out.push(list.slice(start, i));
      start = i + 1;
    }
  }
  out.push(list.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}

/**
 * نوعية المحدِّد (المستوى ٤) بقدر ما يحتاجه هذا الملف: المعرِّف (a)، والصنف
 * والسمة والصنف الزائف (b)، والنوع والعنصر الزائف (c)؛ و`:not()`/`:is()`/
 * `:has()` تأخذ أعلى حجّتها، و`:where()` صفر — فـ`:not(#nx-coarse)` يزن (1,0,0).
 */
function specificity(sel: string): Specificity {
  const s: Specificity = [0, 0, 0];
  let i = 0;
  while (i < sel.length) {
    const ch = sel[i];
    if (ch === "#") {
      s[0] += 1;
      i = identEnd(sel, i + 1);
    } else if (ch === ".") {
      s[1] += 1;
      i = identEnd(sel, i + 1);
    } else if (ch === "[") {
      s[1] += 1;
      i = sel.indexOf("]", i) + 1;
    } else if (ch === ":" && sel[i + 1] === ":") {
      s[2] += 1;
      i = identEnd(sel, i + 2);
    } else if (ch === ":") {
      const end = identEnd(sel, i + 1);
      const name = sel.slice(i + 1, end).toLowerCase();
      if (sel[end] === "(") {
        let depth = 0;
        let close = end;
        for (; close < sel.length; close += 1) {
          if (sel[close] === "(") depth += 1;
          else if (sel[close] === ")" && --depth === 0) break;
        }
        if (["not", "is", "has", "matches"].includes(name)) {
          const best = splitTopLevel(sel.slice(end + 1, close))
            .map(specificity)
            .sort(cmpSpec)
            .at(-1) ?? [0, 0, 0];
          s[0] += best[0];
          s[1] += best[1];
          s[2] += best[2];
        } else if (name !== "where") {
          s[1] += 1;
        }
        i = close + 1;
      } else {
        if (["before", "after", "first-line", "first-letter"].includes(name)) s[2] += 1;
        else s[1] += 1;
        i = end;
      }
    } else if (/[a-zA-Z]/.test(ch)) {
      s[2] += 1;
      i = identEnd(sel, i);
    } else {
      i += 1; // `*` والمسافات والروابط لا وزن لها
    }
  }
  return s;
}

type StyleContext = { coarse: boolean; safe: boolean };

/**
 * قيمة `filter` الفائزة بين الإعلانات المهمّة التي تطابق صورة البطاقة في
 * السياق، أو `null` إن لم يطابقها إسقاطٌ مهمّ (فتبقى ضبابة المكوّن، وهي أداة
 * Tailwind بلا `!important`). الصورة عنصرٌ حقيقيّ في jsdom والمطابقة بـ`matches`؛
 * والتتالي: النوعية ثم الترتيب. الطبقات لا تُحسب — والفحص التالي يُثبت أن لا
 * إعلان `filter` مهمًّا داخل طبقةٍ أو استعلامٍ آخر.
 */
function stageImageFilter(css: string, ctx: StyleContext): string | null {
  const root = document.documentElement;
  root.classList.toggle("safe-mode", ctx.safe);
  document.body.innerHTML = `<section class="sd-stage-card"><img alt="" /></section>`;
  const img = document.body.querySelector("img") as HTMLImageElement;
  let winner: { spec: Specificity; value: string } | null = null;
  postcss.parse(css).walkRules((rule) => {
    const parent = rule.parent as Container | undefined;
    if (!(parent?.type === "root" || (ctx.coarse && isCoarseMedia(parent)))) return;
    let value: string | null = null;
    rule.walkDecls("filter", (decl) => {
      if (decl.important) value = norm(decl.value);
    });
    if (value === null) return;
    for (const sel of rule.selectors) {
      if (sel.includes("::")) continue; // عنصرٌ زائف ليس الصورة
      if (!img.matches(sel)) continue;
      const spec = specificity(sel);
      // `>=`: عند تساوي النوعية يفوز اللاحق في المصدر.
      if (!winner || cmpSpec(spec, winner.spec) >= 0) winner = { spec, value };
    }
  });
  return (winner as { value: string } | null)?.value ?? null;
}

/** هل تبقى الضبابة (≥ ‏4px‏ كالمقيس أعلاه) في السياق؟ */
function blurSurvives(css: string, ctx: StyleContext): boolean {
  const value = stageImageFilter(css, ctx);
  if (value === null) return true;
  const px = value.match(/^blur\((\d+(?:\.\d+)?)px\)$/);
  return px !== null && Number(px[1]) >= 4;
}

const CONTEXTS: Array<[string, StyleContext]> = [
  ["سطح المكتب", { coarse: false, safe: false }],
  ["اللمس", { coarse: true, safe: false }],
  ["الوضع الآمن", { coarse: false, safe: true }],
  ["الوضع الآمن على اللمس", { coarse: true, safe: true }],
];

/**
 * الانتهاك المزروع: الوضع الآمن كما شُحن في b996d1e، وكتلة لمسٍ بوزن المعرِّف
 * بلا استثناء البطاقة — كلاهما يُسقط الضبابة.
 */
const PLANTED_STRIPS_BLUR = `
html.safe-mode *,
html.safe-mode *::before,
html.safe-mode *::after {
  filter: none !important;
}
@media (pointer: coarse) {
  body *:not(#nx-coarse) {
    filter: none !important;
  }
}
`;

describe("والضبابة تنجو من اللمس والوضع الآمن", () => {
  afterEach(() => {
    document.documentElement.classList.remove("safe-mode");
    document.body.innerHTML = "";
  });

  it("النوعية تُحسب كما يحسبها المتصفّح على محدِّدات الملف", () => {
    expect(specificity("html.safe-mode *")).toEqual([0, 1, 1]);
    expect(specificity("html.safe-mode .sd-stage-card > img")).toEqual([0, 2, 2]);
    expect(specificity("body *:not(#nx-coarse):not(.sd-stage-card > img)")).toEqual([1, 1, 2]);
    expect(specificity(".blur-\\[5px\\]")).toEqual([0, 1, 0]);
  });

  it("كل إعلان `filter` مهمّ في الجذر أو في كتلة اللمس — النموذج يرى التتالي كلّه", () => {
    const outside: string[] = [];
    postcss.parse(read(STYLES_PATH)).walkDecls("filter", (decl) => {
      if (!decl.important) return;
      const parent = decl.parent?.parent as Container | undefined;
      if (parent?.type === "root" || isCoarseMedia(parent)) return;
      outside.push(
        `${(decl.parent as { selector?: string }).selector ?? "?"} @ ${decl.source?.start?.line}`,
      );
    });
    expect(outside, "إعلانٌ مهمّ خارج ما يحسبه النموذج — وسّع النموذج قبل الوثوق به").toEqual([]);
  });

  it.each(CONTEXTS)(
    "الكاشف يحمرّ على إسقاطٍ مزروع بلا استثناء البطاقة: %s (المادة ٣٠)",
    (_name, ctx) => {
      // سطح المكتب لا يمسّه المزروع، وما سواه يُسقط الضبابة.
      expect(blurSurvives(PLANTED_STRIPS_BLUR, ctx)).toBe(!ctx.coarse && !ctx.safe);
    },
  );

  it.each(CONTEXTS)("styles.css: الضبابة باقية — %s", (_name, ctx) => {
    if (!hasFullBleedImage) return;
    expect(
      blurSurvives(read(STYLES_PATH), ctx),
      "سقطت ضبابة خلفية البطاقة في هذا السياق — عادت الأرقام المرسومة مقروءة",
    ).toBe(true);
  });
});

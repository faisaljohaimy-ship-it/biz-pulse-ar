/**
 * عقد لوحة الرئيسية (أمر المالك ٢٠٢٦/٠٩/٢٩ — «تفعيل جميع الأيقونات»).
 *
 * أعطالٌ لا يراها tsc ولا البناء: رابطٌ إلى مسارٍ محجوب أو «قريباً» (المسار
 * نصّ)، ورقمٌ غائب يُعرض صفرًا (`?? 0`)، وخطُّ اتجاهٍ لسلسلةٍ لم تُقَس،
 * و**لوحةٌ تعذّر تحميلها تقول «لا بلاغات» بصيغة الحقيقة** — قاسه حارس
 * الجودة بإسقاط الخادم، والمؤشر فوقها يقول عن العدد نفسه «لم يُقَس».
 *
 * وكل فحصٍ دالّةٌ تُجرَّب أولًا على انتهاكٍ مزروع (المادة ٣٠): فحصٌ لم
 * يُرَ يحمرّ لا يُثبت شيئًا حين يخضرّ.
 */
import { existsSync, readFileSync } from "node:fs";
import postcss, { type AtRule } from "postcss";
import { describe, expect, it } from "vitest";
import { isRouteHidden } from "@/lib/nav/hidden-routes";

const SRC = readFileSync("src/components/home/HomeDashboard.tsx", "utf8");
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const CODE = strip(SRC);
const TREE = readFileSync("src/routeTree.gen.ts", "utf8");
const CSS = readFileSync("src/styles.css", "utf8");
const PAGE = readFileSync("src/routes/-blueprint-page.tsx", "utf8");

/* ── الفحوص نفسها — دوالّ تُعيد المخالفات، فتُجرَّب على المزروع ─────── */

/** كل وجهة مكتوبة: `to="/x"` في JSX و`to: "/x"` في سجل المؤشرات. */
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

const zeroForAbsence = (code: string) =>
  code.match(/(counts|data|oms|risk|sec)\??\.[\w?.]+\s*\?\?\s*0\b/g) ?? [];
const fakeSeries = (code: string) => code.match(/sparkline|delta|trend/gi) ?? [];
const pictures = (code: string) => code.match(/<img\b|<video\b/g) ?? [];
const hexColours = (code: string) => code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
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
const finalInline = (code: string) =>
  (code.match(/style=\{\{[^}]*\}\}/g) ?? []).filter((s) => !/--[a-z-]+/.test(s));

/**
 * لوحةٌ تقرأ الفراغ قبل الخطأ: فرعٌ يُعرض فيه `<Empty` دون أن يسبقه فحص
 * `isError` في المكوّن نفسه. والتفرّع المعتمد مكوّنٌ واحد (`PanelBody`)
 * يرتّب الثلاث: خطأ ← تحميل ← فراغ.
 */
function emptyBeforeError(code: string): string[] {
  const bad: string[] = [];
  // الشكل القديم حرفيًّا: `q.isPending ? <Loading/> : cond ? <Empty>` بلا خطأ.
  for (const m of code.matchAll(/\{(\w+)\.isPending \? \(\s*<Loading[^]*?<Empty>/g)) bad.push(m[1]);
  const body = code.slice(code.indexOf("function PanelBody"));
  // الفروع نفسها لا ذكرُ الحقول: `isPending` يسبق `isError` في نوع المعامل.
  const e = body.indexOf("if (q.isError)");
  const l = body.indexOf("if (q.isPending)");
  const f = body.indexOf("if (isEmpty)");
  if (!(e > -1 && e < l && l < f)) bad.push("PanelBody");
  return bad;
}

/* ── المزروع أولًا (المادة ٣٠) ─────────────────────────────────────────── */

describe("كل فحصٍ يحمرّ على انتهاكه المزروع", () => {
  it("الوجهة الميتة: غير موجودة · محجوبة · «قريباً»", () => {
    expect(deadDestinations('<Link to="/people" /> { to: "/mission-control" } to="/team"')).toEqual(
      ["/people", "/mission-control", "/team"],
    );
  });
  it("الصفر بدل الغياب", () => {
    expect(zeroForAbsence("value: counts?.incidents_open ?? 0")).toHaveLength(1);
  });
  it("السلسلة المختلقة والصورة واللون النهائي والأسلوب النهائي", () => {
    expect(fakeSeries("<Sparkline /> delta")).toHaveLength(2);
    expect(pictures('<img src="a" /> <video />')).toHaveLength(2);
    expect(hexColours('className="text-[#22d3ee]"')).toHaveLength(1);
    expect(finalInline('style={{ color: "red" }}')).toHaveLength(1);
    expect(finalInline('style={{ ["--x" as string]: "red" }}')).toHaveLength(0);
  });
  it("اللوحة التي تقرأ الفراغ قبل الخطأ", () => {
    const old = `{sec.isPending ? (\n <Loading ar={ar} />\n ) : rows.length === 0 ? (\n <Empty>x</Empty>`;
    const good = "function PanelBody(){ if (q.isError) if (q.isPending) if (isEmpty) }";
    const swapped = "function PanelBody(){ if (q.isPending) if (q.isError) if (isEmpty) }";
    expect(emptyBeforeError(old + good)).toEqual(["sec"]);
    expect(emptyBeforeError(swapped)).toEqual(["PanelBody"]);
  });
});

/* ── ثم المصدر الحقيقي ─────────────────────────────────────────────────── */

describe("كل أيقونة ومؤشر ولوحة يفتح شاشةً حيّة", () => {
  it("تسع وجهات مختلفة على الأقل — كلها حيّة", () => {
    // سبعة مؤشرات بسبع وجهات، ولوحتا الأنظمة والامتثال تضيفان اثنتين؛
    // لوحات البلاغات والدوريات والكاميرات تشارك مؤشراتها وجهاتها.
    expect(destinations(CODE).length).toBeGreaterThanOrEqual(9);
    expect(deadDestinations(CODE)).toEqual([]);
  });
});

describe("الحالات الثلاث — المادة ١٤", () => {
  it("الخطأ قبل التحميل قبل الفراغ، ومعه إعادة المحاولة", () => {
    expect(emptyBeforeError(CODE)).toEqual([]);
    expect(CODE).toContain("q.refetch()");
    expect(CODE).toContain("أعد المحاولة");
    // كل لوحة بيانات تمرّ بالتفرّع الواحد: أربعٌ بقوائمها + الامتثال.
    expect(CODE.match(/<PanelBody\b/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });

  it("المؤشر يفصل التحميل والخطأ عن «لم يُقَس»", () => {
    expect(CODE).toMatch(/type ReadStatus = "loading" \| "error" \| "ready"/);
    expect(CODE).toContain("تعذّر التحميل");
    // كل مؤشر يحمل حال قراءته — لا مؤشر يُقرأ «لم يُقَس» وهو ينتظر.
    const registry = CODE.slice(
      CODE.indexOf("const kpis: Kpi[]"),
      CODE.indexOf("];", CODE.indexOf("const kpis: Kpi[]")),
    );
    expect(registry.match(/\bid: "/g)?.length).toBe(7);
    expect(registry.match(/status: statusOf\(/g)?.length).toBe(7);
  });
});

describe("الصدق العددي — المادة ٢٧", () => {
  it("لا صفر بدل الغياب، ولا سلسلة مختلقة، ولا صورة كاميرا", () => {
    expect(zeroForAbsence(CODE)).toEqual([]);
    expect(fakeSeries(CODE)).toEqual([]);
    expect(pictures(CODE)).toEqual([]);
    expect(CODE).toContain("لا بثّ مرتبط");
  });

  it("الامتثال: الصفر قياسٌ لا غياب، ولا شريط بلا قياس", () => {
    expect(CODE).not.toMatch(/compliance_pct\s*>\s*0/);
    expect(CODE).toMatch(/compliance_pct !== null/);
    expect(CODE).toMatch(/\{pct !== null && \(/);
  });

  it("المصدر المكتوب يطابق ما يُعدّ", () => {
    // `assets_offline` يعدّ `offline || degraded` (sec.functions.ts).
    expect(CODE).toContain("أصول حالتها غير متصلة أو متدهورة");
    expect(CODE).toContain("حرّاس المواقع");
    expect(CODE).not.toContain("على رأس العمل");
  });

  it("عنوان فئات البلاغات لا يحمل عددًا قبل وصول القراءة", () => {
    // عند السقوط كان يُقرأ «آخر ٠ بلاغًا» — صفرٌ هو غياب.
    const at = CODE.indexOf('id="nx-home-categories"');
    const block = CODE.slice(at, at + 600);
    expect(block).toMatch(/statusOf\(sec\) === "ready"/);
  });

  it("«الجاهزية التنفيذية» لا تعود — حذف المالك صندوقها ٢٠٢٦/٠٨/٢٠", () => {
    expect(CODE).not.toContain("executive_readiness");
    expect(CODE).not.toContain("الجاهزية التنفيذية");
  });
});

describe("طبقة الرموز — المواد ٣٣ و٣٤ وWCAG §1.4.11", () => {
  it("لا لون سداسي ولا أسلوب مضمّن بقيمة نهائية", () => {
    expect(hexColours(CODE)).toEqual([]);
    expect(finalInline(CODE)).toEqual([]);
  });

  it("حلقة التركيز بقاعدةٍ تغلب القاعدة العامة — لا بأدوات ميتة", () => {
    // أدوات `focus-visible:outline-*` تخسر أمام `:where(…):focus-visible`
    // غير المطبَّقة في طبقة، فوجودها هنا إيهامٌ بحلقةٍ لا تُرسم.
    expect(CODE).not.toMatch(/focus-visible:outline/);
    const at = CSS.indexOf(".nx-home-kpi:focus-visible,");
    expect(at, "لا قاعدة تركيز للوحة").toBeGreaterThan(-1);
    const rule = CSS.slice(at, CSS.indexOf("}", at));
    expect(rule).toContain(".nx-home-more:focus-visible");
    expect(rule).toContain(".nx-home-retry:focus-visible");
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
    // أمر المالك ٢٠٢٦/٠٩/٢٩: «اجعل إحداثيات الموقع رسمة خريطة شبه الجزيرة».
    expect(CODE).toContain("<ArabianPeninsulaMap");
    expect(CODE).not.toContain("<RegionPulseMap");
    expect(CODE).toContain("REGIONS.map");
    expect(CODE).not.toMatch(/"(الوسطى|الغربية|الشرقية|الجنوبية)"/);
  });
});

describe("الرئيسية تركّب اللوحة وتُفصح بصدق", () => {
  it("المؤشرات تحت العنوان واللوحات بعد الصدر الثلاثي", () => {
    const kpi = PAGE.indexOf("<HomeKpiRow />");
    const triad = PAGE.indexOf('className="nx-home-triad');
    const ops = PAGE.indexOf("<HomeOperations />");
    const risk = PAGE.indexOf('id="nx-risk-heading"');
    expect(kpi).toBeGreaterThan(-1);
    expect(kpi).toBeLessThan(triad);
    expect(ops).toBeGreaterThan(triad);
    expect(ops).toBeLessThan(risk);
  });

  it("سطر الإفصاح يذكر المحاكاة ولا يدّعي الحياة وحدها (المادة ٦)", () => {
    const code = strip(PAGE);
    expect(code).toContain("وإلا فمن محاكاةٍ مرجعية مدمجة");
    expect(code, "عاد السطر يدّعي أن كل رقم حيّ").not.toContain("الأرقام من مصدر النظام الحيّ. ");
  });
});

/* ── نصّ الحلقة يُرى مضروبًا في نسبة رسمها إلى viewBox ───────────────── */

/** الحجم المرئي لنصّ SVG: الحجم المصرَّح × (عرض الرسم ÷ عرض viewBox). */
function donutTextPx(code: string, css: string, cls: string): number {
  const svg = /<svg viewBox="0 0 (\d+) \d+" className="size-(\d+)[^"]*"/.exec(code);
  const decl = new RegExp(`\\.${cls}\\s*\\{[^}]*?font-size:\\s*([\\d.]+)px`).exec(css);
  if (!svg || !decl) return NaN;
  return Number(decl[1]) * ((Number(svg[2]) * 4) / Number(svg[1]));
}

describe("نصوص الحلقة فوق أرضية 12px مرئيًّا (ui-audit)", () => {
  it("الفحص يحمرّ على المزروع: 12px داخل viewBox 120 مرسوم 112px", () => {
    const seeded = `<svg viewBox="0 0 120 120" className="size-28 shrink-0"`;
    expect(donutTextPx(seeded, ".x { font-size: 12px; }", "x")).toBeCloseTo(11.2, 5);
  });

  it("الوسم والقيمة يُريان ≥12px", () => {
    for (const cls of ["nx-home-donut-caption", "nx-home-donut-value"]) {
      const px = donutTextPx(CODE, CSS, cls);
      expect(px, cls).toBeGreaterThanOrEqual(12);
    }
  });
});

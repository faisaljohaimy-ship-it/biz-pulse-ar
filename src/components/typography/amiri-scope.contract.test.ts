/**
 * عقد نطاق الخط التحريري — النطاق (أ) المعتمد من المالك.
 *
 * القاعدة: الخط النسخي للعناوين والأغلفة والتقارير والاقتباسات فقط، والجسم
 * والأرقام والجداول سانس. والاستهلاك حصرًا عبر الفئة المتولدة `font-amiri`
 * من الرمز `--font-amiri` في طبقة الرموز — **لا اسم خط يُكتب في أي مكوّن**.
 *
 * كل بند هنا يحرس خرقًا لا يلتقطه tsc ولا eslint:
 * اسم خط منثور في مكوّن يفكّ الرمز عن مصدره؛ وزن مُصطنع (الوجهان المودَعان
 * 400/700 فقط) يتوحّل بصمت؛ أداة `leading-*` ضيّقة تغلب الصنف المرافق
 * (طبقة الأدوات بعد طبقة المكوّنات) فتعيد قصّ الصاعد/النازل الذي وُجد
 * الصنف لمنعه؛ وسطحٌ معتمد يفقد فئته في أول تعديل جمالي لاحق.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

const BLUEPRINT = read("src/routes/-blueprint-page.tsx");
const REPORT = read("src/components/reports/viewer/ReportViewer.tsx");
const STAGE = read("src/components/sadeed/SadeedStagePresence.tsx");
const PLAYER = read("src/components/demo/ExecutivePresentationPlayer.tsx");

const SURFACES = {
  "-blueprint-page.tsx": BLUEPRINT,
  "ReportViewer.tsx": REPORT,
  "SadeedStagePresence.tsx": STAGE,
  "ExecutivePresentationPlayer.tsx": PLAYER,
} as const;

/**
 * كل سلسلة أصناف تحمل الفئة — سلسلةً سلسلة لا كتلة `cn(...)` كاملة: فرعا
 * الشرط الثلاثي (عربي نسخي / إنجليزي سانس) يتجاوران في نداء واحد، وفحص
 * الكتلة كاملةً يحاسب فرعًا على أدوات جاره.
 */
const amiriClassStrings = (src: string): string[] =>
  [...src.matchAll(/"([^"\n]*\bfont-amiri\b[^"\n]*)"/g)].map((m) => m[1]);

describe("نطاق الخط التحريري — الرمز هو المصدر الوحيد", () => {
  it("صفر ورود لاسم الخط في أي tsx بالمشروع كلّه", () => {
    // الفئة `font-amiri` بحروف صغيرة هي الاستهلاك المشروع؛ الممنوع هو اسم
    // الخط نفسه «Amiri» (بالحرف الكبير) في سلسلة `font-family` أو غيرها —
    // كتابته تفكّ المكوّن عن الرمز فيسقط من أي تبديل لاحق لسلسلة السقوط.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = path.join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith(".tsx") && /Amiri/.test(read(p))) offenders.push(p);
      }
    };
    walk("src");
    expect(offenders, "اسم الخط مكتوب خارج طبقة الرموز").toEqual([]);
  });

  it("الأسطح المعتمدة الأربعة تحمل الفئة", () => {
    // ① الرئيسية: الاسم العربي في العنوان البطل وحده.
    expect(BLUEPRINT).toMatch(
      /className="nx-bp-title font-amiri[^"]*">\s*\{PRODUCT_BRAND\.ar\.name\}/,
    );
    // ② عارض التقارير: عنوان المستند وترويسات الأقسام.
    expect(REPORT).toContain('<span className="font-amiri">{doc.titleAr}</span>');
    expect(REPORT).toContain('<span className="font-amiri">{section.titleAr}</span>');
    // ③ بطاقة الحضور: اسم الشخصية.
    expect(STAGE).toContain('<span className="font-amiri">{SADEED_DISPLAY_NAME_AR}</span>');
    // ④ مشغّل العرض: عنوان الشريحة العربي وحده — الإنجليزي على أدواته.
    expect(PLAYER).toContain('<span className="font-amiri">{scene.title_ar}</span>');
    expect(PLAYER).not.toMatch(/font-amiri[^"]*"[^"]*\{scene\.title_en\}/);
  });

  it("الفئة على span داخلي لا على عنصر عنوان — الدرس المقيس", () => {
    // قِيس بالمتصفح لا افتُرض: قاعدة `:where(h1..h6) { line-height: 1.3 }`
    // خارج الطبقات تغلب الصنف المرافق للفئة وأدوات `leading-*` معًا على
    // عنصر العنوان نفسه (غير المُطبَّق يسبق المُطبَّق مهما كانت النوعية)،
    // و1.3 دون صندوق حبر الخط ‎1.76em‎ فيُقصّ الصاعد/النازل. على span داخلي
    // يقيس الصنف المرافق 1.8 ويرفع صندوق سطر العنوان معه — قِيس 1.8 فعلًا.
    for (const [name, src] of Object.entries(SURFACES)) {
      expect(src, `${name}: الفئة على عنصر عنوان مباشرة — سطره مثبَّت 1.3`).not.toMatch(
        /<h[1-6][^>]*font-amiri/,
      );
    }
  });

  it("اللاتيني والأرقام والجسم خارج النطاق — سانس تبقى سانس", () => {
    // الامتداد الإنجليزي في العنوان البطل على خطّه اللاتيني (قرار النطاق أ).
    expect(BLUEPRINT).toMatch(/className="nx-bp-title tracking-\[0\.06em\]"/);
    // ترويسات الأقسام وسطر التعريف في الرئيسية مستبعَدان عمدًا: قاعدتاهما
    // خارج الطبقات (14px/800 و15px/600) تغلبان أدوات Tailwind، والنسخي
    // بحجم مثبَّت صغير «خطّان متنازعان» لا تناغم.
    expect(BLUEPRINT).not.toMatch(/nx-bp-h2[^"]*font-amiri|font-amiri[^"]*nx-bp-h2/);
    expect(BLUEPRINT).not.toMatch(/nx-bp-lede[^"]*font-amiri|font-amiri[^"]*nx-bp-lede/);
    // رقم القسم وامتدادا `rv-en` خارج span الفئة فيبقيان على سانس المستند
    // (الأرقام خارج النطاق التحريري بقرار النطاق أ).
    expect(REPORT).toContain('className="rv-section-index"');
    expect(REPORT).not.toMatch(/rv-en[^"]*font-amiri|font-amiri[^"]*rv-en/);
    expect(REPORT).not.toMatch(/rv-section-index[^"]*font-amiri|font-amiri[^"]*rv-section-index/);
  });

  it("لا وزن مُصطنع ولا سطر ضيّق على حامل الفئة", () => {
    // الوجهان المودَعان 400/700 فقط: أي `font-black/extrabold/semibold` مع
    // الفئة يُثخَّن اصطناعيًّا. وأدوات السطر الضيّقة تغلب الصنف المرافق
    // (1.8) لأنها في طبقة أعلى — فتعيد القصّ الذي وُجد الصنف لمنعه.
    for (const [name, src] of Object.entries(SURFACES)) {
      const carriers = amiriClassStrings(src);
      expect(carriers.length, `${name}: لا حامل للفئة — تغيّر شكله فبطل الحارس`).toBeGreaterThan(0);
      for (const cls of carriers) {
        expect(cls, `${name}: وزن غير مودَع على حامل الفئة`).not.toMatch(
          /font-(black|extrabold|semibold|medium|light|thin)/,
        );
        expect(cls, `${name}: أداة سطر ضيّقة تقصّ الصاعد/النازل`).not.toMatch(
          /leading-(none|tight|snug)/,
        );
      }
    }
  });
});

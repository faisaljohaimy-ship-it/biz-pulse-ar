/**
 * عقد عارض التقرير المفصَّل.
 *
 * الطلب الحرفيّ للمالك: تقرير «مفصَّل مدعَّم بالصور والجداول ويحتوي تشارت
 * وقراف، **وجميعها تفتح تلقائيًّا بمجرّد النظر للتقرير**».
 *
 * «تفتح تلقائيًّا» نيّة حتى تُقاس. هذا الملف يحوّلها إلى عقد: لا `<details>`
 * ولا `aria-expanded="false"` ولا `hidden` ولا `data-state="closed"` ولا
 * `loading="lazy"` — ولا حالة React في العارض أصلًا، فما لا يملك حالة لا
 * يستطيع أن يطوي شيئًا. ويُحسب عدد الجداول والرسوم والصور من **النموذج
 * نفسه** لا من رقم مكتوب، فأي كتلة تسقط بصمت تُسقط الاختبار.
 *
 * كل تأكيد هنا أُسقط بكسرٍ مصطنع في المصدر قبل اعتماده — التأكيد الذي
 * يمرّ في الحالتين لا يحرس شيئًا.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";

import { ReportViewer } from "./ReportViewer";
import { formatReportNumber } from "./report-charts";
import { REPORT_TONES } from "./report-tones";
import type { ReportBlock, ReportDocument } from "./report-document.types";

// ---------------------------------------------------------------- المصادر

const VIEWER_DIR = path.resolve(process.cwd(), "src/components/reports/viewer");
const CSS_PATH = path.resolve(process.cwd(), "src/styles/report-viewer.css");

const SOURCE_FILES = [
  "ReportViewer.tsx",
  "report-blocks.tsx",
  "report-charts.tsx",
  "report-tones.tsx",
] as const;

const SOURCES = Object.fromEntries(
  SOURCE_FILES.map((file) => [file, readFileSync(path.join(VIEWER_DIR, file), "utf8")]),
) as Record<(typeof SOURCE_FILES)[number], string>;

/**
 * الفحص يجري على **الكود** لا على التعليقات: هذا الملف نفسه وملفات
 * العارض تشرح المحظور بذكر اسمه (`useState`، `<details>`، `fill="white"`)،
 * فلو فُحص النصّ الخام لسقط الاختبار على شرحه لا على مخالفة.
 */
function stripJsComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

const ALL_SOURCE = SOURCE_FILES.map((file) => stripJsComments(SOURCES[file])).join("\n");

const CSS = readFileSync(CSS_PATH, "utf8");

/** كتلة الطباعة معلَّمة بعلامتين صريحتين — أقلّ هشاشةً من عدّ الأقواس. */
const PRINT_START = "@@PRINT-START@@";
const PRINT_END = "@@PRINT-END@@";
const PRINT_CSS = CSS.slice(CSS.indexOf(PRINT_START), CSS.indexOf(PRINT_END));
const SCREEN_CSS = CSS.slice(0, CSS.indexOf(PRINT_START)) + CSS.slice(CSS.indexOf(PRINT_END));

/** يُجرَّد التعليق قبل فحص الألوان — التعليقات العربية تحوي أرقامًا ورموزًا. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

// --------------------------------------------------------------- النموذج

const DOC: ReportDocument = {
  titleAr: "التقرير التنفيذي المفصَّل للأمن الصناعي",
  titleEn: "Detailed Industrial Security Executive Report",
  periodAr: "الربع الثالث ١٤٤٧هـ",
  periodEn: "Q3 1447 AH",
  regionId: "eastern",
  isSimulation: true,
  sections: [
    {
      titleAr: "الملخّص التنفيذي",
      titleEn: "Executive Summary",
      blocks: [
        {
          kind: "prose",
          titleAr: "خلاصة الفترة",
          titleEn: "Period Summary",
          paragraphsAr: [
            "انخفضت البلاغات الحرجة مع ارتفاع تغطية تصاريح العمل في المنطقة الشرقية.",
            "استقرّ زمن الاستجابة دون العتبة المعتمدة طوال الفترة.",
          ],
          paragraphsEn: ["Critical incidents fell while permit coverage rose."],
        },
        {
          kind: "kpi-grid",
          titleAr: "مؤشّرات الأداء",
          titleEn: "Key Performance Indicators",
          items: [
            { labelAr: "بلاغات حرجة", labelEn: "Critical incidents", value: 3, tone: "danger" },
            { labelAr: "مخالفات مفتوحة", labelEn: "Open findings", value: 17, tone: "warning" },
            { labelAr: "تصاريح مغلقة", labelEn: "Closed permits", value: 412, tone: "success" },
            {
              labelAr: "زمن الاستجابة",
              labelEn: "Response time",
              value: 6.4,
              unitAr: "دقيقة",
              tone: "info",
              deltaAr: "−١٢٪ عن الربع السابق",
            },
          ],
        },
        {
          kind: "callout",
          tone: "danger",
          titleAr: "بند يستوجب قرارًا",
          titleEn: "Decision Required",
          bodyAr: "موقعان لم يُغلق فيهما إجراء تصحيحي خلال المهلة النظامية.",
          bodyEn: "Two sites missed the statutory corrective-action window.",
        },
        {
          kind: "callout",
          tone: "warning",
          titleAr: "تنبيه متابعة",
          titleEn: "Follow-up Notice",
          bodyAr: "ثلاثة تصاريح عمل قاربت انتهاء صلاحيتها.",
        },
      ],
    },
    {
      titleAr: "التحليل بالأرقام",
      titleEn: "Quantitative Analysis",
      blocks: [
        {
          kind: "chart",
          chart: "bar",
          titleAr: "البلاغات حسب الشهر",
          titleEn: "Incidents by Month",
          unitAr: "بلاغ",
          points: [
            { labelAr: "رجب", labelEn: "Rajab", value: 24 },
            { labelAr: "شعبان", labelEn: "Shaban", value: 18 },
            { labelAr: "رمضان", labelEn: "Ramadan", value: 31 },
          ],
        },
        {
          kind: "chart",
          chart: "line",
          titleAr: "زمن الاستجابة",
          titleEn: "Response Time",
          unitAr: "دقيقة",
          points: [
            { labelAr: "رجب", labelEn: "Rajab", value: 8.2 },
            { labelAr: "شعبان", labelEn: "Shaban", value: 7.1 },
            { labelAr: "رمضان", labelEn: "Ramadan", value: 6.4 },
          ],
        },
        {
          kind: "chart",
          chart: "donut",
          titleAr: "توزيع المخالفات",
          titleEn: "Findings Distribution",
          points: [
            { labelAr: "سلامة", labelEn: "Safety", value: 40 },
            { labelAr: "أمن", labelEn: "Security", value: 35 },
            { labelAr: "بيئة", labelEn: "Environment", value: 25 },
          ],
        },
        {
          kind: "table",
          captionAr: "المواقع الأعلى مخاطرةً",
          captionEn: "Highest-risk sites",
          columns: [
            { key: "site", labelAr: "الموقع", labelEn: "Site" },
            { key: "open", labelAr: "مفتوح", labelEn: "Open", align: "center" },
            { key: "closed", labelAr: "مغلق", labelEn: "Closed", align: "center" },
          ],
          rows: [
            { site: "مجمّع الجبيل", open: 7, closed: 91 },
            { site: "ميناء رأس تنورة", open: 5, closed: 78 },
            { site: "محطة الخفجي", open: 5, closed: 64 },
          ],
          footnoteAr: "المصدر: محاكاة مرجعية موسومة.",
        },
      ],
    },
    {
      titleAr: "الشواهد الميدانية",
      titleEn: "Field Evidence",
      blocks: [
        {
          kind: "figure",
          src: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
          altAr: "لقطة من غرفة العمليات أثناء تمرين الإخلاء",
          captionAr: "غرفة العمليات أثناء تمرين الإخلاء",
          captionEn: "Operations room during the evacuation drill",
          creditAr: "محاكاة مرجعية",
        },
        {
          kind: "prose",
          paragraphsAr: ["أُجري التمرين على ثلاث مراحل دون إصابات."],
        },
      ],
    },
  ],
};

const BLOCKS: ReportBlock[] = DOC.sections.flatMap((section) => section.blocks);
const countOf = (kind: ReportBlock["kind"]) => BLOCKS.filter((b) => b.kind === kind).length;

function renderDoc(doc: ReportDocument = DOC) {
  return render(<ReportViewer doc={doc} />).container;
}

// ============================================================================
// ① كل شيء مفتوح عند أوّل رسم — العقد الأصلي
// ============================================================================

describe("«جميعها تفتح تلقائيًّا بمجرّد النظر للتقرير»", () => {
  it("لا عنصر طيّ واحد في الشجرة: لا <details> ولا <summary>", () => {
    const container = renderDoc();
    expect(container.querySelectorAll("details")).toHaveLength(0);
    expect(container.querySelectorAll("summary")).toHaveLength(0);
  });

  // تُكتب `aria` صغيرةً عمدًا: حارس الهوية يمنع `ARIA` كبيرةً مستقلّة لأنها
  // اسم المساعد المتقاعد، والعُرف في هذا الريبو `aria-*` صغيرة.
  it("لا شيء مطويّ عبر سمات aria: لا aria-expanded إطلاقًا، ولا «مغلق» بحال", () => {
    const container = renderDoc();
    expect(container.querySelectorAll('[aria-expanded="false"]')).toHaveLength(0);
    // أشدّ من ذلك: لا وجود للسمة أصلًا — ما لا يُطوى لا يحتاج إعلان حالة.
    expect(container.querySelectorAll("[aria-expanded]")).toHaveLength(0);
    expect(container.querySelectorAll('[data-state="closed"]')).toHaveLength(0);
  });

  it("لا عنصر يحمل السمة hidden", () => {
    const container = renderDoc();
    expect(container.querySelectorAll("[hidden]")).toHaveLength(0);
  });

  it("كل كتلة في النموذج لها عنصر مقابل في أوّل رسم — العدّ من النموذج لا من رقم مكتوب", () => {
    const container = renderDoc();
    expect(container.querySelectorAll('[data-block="table"]')).toHaveLength(countOf("table"));
    expect(container.querySelectorAll('[data-block="chart"]')).toHaveLength(countOf("chart"));
    expect(container.querySelectorAll('[data-block="figure"]')).toHaveLength(countOf("figure"));
    expect(container.querySelectorAll('[data-block="kpi-grid"]')).toHaveLength(countOf("kpi-grid"));
    expect(container.querySelectorAll('[data-block="callout"]')).toHaveLength(countOf("callout"));
    expect(container.querySelectorAll('[data-block="prose"]')).toHaveLength(countOf("prose"));
    expect(container.querySelectorAll(".rv-block")).toHaveLength(BLOCKS.length);
  });

  it("كل رسم مرسوم فعلًا: SVG بـviewBox، وكل نقطة قيمتها ظاهرة نصًّا", () => {
    const container = renderDoc();
    const charts = Array.from(container.querySelectorAll<SVGSVGElement>("svg.rv-chart-svg"));
    expect(charts).toHaveLength(countOf("chart"));

    for (const svg of charts) {
      expect(svg.getAttribute("viewBox")).toBeTruthy();
      expect(svg.querySelectorAll("rect, circle, polyline, path, text").length).toBeGreaterThan(0);
    }

    // لا «اضغط لعرض البيانات»: كل قيمة مقروءة نصًّا في المفتاح الظاهر.
    const text = container.textContent ?? "";
    for (const block of BLOCKS) {
      if (block.kind !== "chart") continue;
      for (const point of block.points) {
        expect(text).toContain(point.labelAr);
        expect(text).toContain(formatReportNumber(point.value));
      }
    }
  });

  it("كل صفوف الجداول مرسومة كاملةً — لا «عرض المزيد»", () => {
    const container = renderDoc();
    const tables = Array.from(container.querySelectorAll("table"));
    const tableBlocks = BLOCKS.filter((b) => b.kind === "table");
    tables.forEach((table, i) => {
      const block = tableBlocks[i];
      if (block.kind !== "table") return;
      expect(table.querySelectorAll("tbody tr")).toHaveLength(block.rows.length);
    });
  });

  it("الصور تُحمَّل فورًا لا كسولًا — lazy تعني صورة غائبة حتى يمرّ البصر، وورقةً بمربّع فارغ", () => {
    const container = renderDoc();
    const images = Array.from(container.querySelectorAll("img"));
    expect(images).toHaveLength(countOf("figure"));
    for (const img of images) {
      expect(img.getAttribute("loading")).toBe("eager");
      expect(img.getAttribute("loading")).not.toBe("lazy");
    }
  });

  it("لا حالة ولا تفاعل في مصدر العارض — ما لا يملك حالة لا يستطيع أن يطوي شيئًا", () => {
    expect(ALL_SOURCE).not.toMatch(/\buseState\b/);
    expect(ALL_SOURCE).not.toMatch(/\buseReducer\b/);
    expect(ALL_SOURCE).not.toMatch(/\buseEffect\b/);
    expect(ALL_SOURCE).not.toMatch(/\bonClick\b/);
    expect(ALL_SOURCE).not.toMatch(/<details\b/);
    expect(ALL_SOURCE).not.toMatch(/\bAccordion\b/);
    expect(ALL_SOURCE).not.toMatch(/\bCollapsible\b/);
    expect(ALL_SOURCE).not.toMatch(/\bTabsContent\b/);
    // مكتبات الرسم التي تقيس الحاوية ترسم فارغًا في أوّل إطار وفي الطباعة.
    expect(ALL_SOURCE).not.toMatch(/ResponsiveContainer|from "recharts"/);
  });

  it("لا قاعدة في الأنماط تُخفي كتلة محتوى", () => {
    const screen = stripComments(SCREEN_CSS);
    // `.rv-print-header/footer` وحدهما مخفيّان على الشاشة، ونصّهما مكرَّر
    // من ترويسة المستند وتذييله (aria-hidden) — لا محتوى يضيع بإخفائهما.
    const hidingRules = screen
      .split("}")
      .filter((rule) => /display:\s*none/.test(rule))
      .map((rule) => rule.split("{")[0].trim());
    for (const selector of hidingRules) {
      expect(selector).toMatch(/rv-print-(header|footer)/);
    }
  });
});

// ============================================================================
// ② الطباعة — A4، كسر صفحات، ترويسة وتذييل مكرّران
// ============================================================================

describe("تخطيط الطباعة", () => {
  it("مقاس الصفحة A4", () => {
    expect(PRINT_CSS).toMatch(/@page\s*\{[^}]*size:\s*A4/);
  });

  it("كسر صفحة بين الأقسام، والأول بلا كسر قبله", () => {
    expect(PRINT_CSS).toMatch(/\.rv-section\s*\{[^}]*break-before:\s*page/);
    expect(PRINT_CSS).toMatch(/\.rv-section:first-child\s*\{[^}]*break-before:\s*auto/);
  });

  it("البطاقات لا تُشطر بين ورقتين (break-inside: avoid)", () => {
    expect(stripComments(SCREEN_CSS)).toMatch(/\.rv-block\s*\{[^}]*break-inside:\s*avoid/);
    expect(PRINT_CSS).toMatch(/break-inside:\s*avoid/);
    // ترويسة الجدول تتكرّر مع كل صفحة يمتدّ إليها الجدول.
    expect(PRINT_CSS).toMatch(/\.rv-table thead\s*\{[^}]*display:\s*table-header-group/);
  });

  it("ترويسة وتذييل مكرّران على كل صفحة مطبوعة", () => {
    const container = renderDoc();
    const header = container.querySelector(".rv-print-header");
    const footer = container.querySelector(".rv-print-footer");
    expect(header?.textContent).toContain(DOC.titleAr);
    expect(footer?.textContent).toContain(DOC.periodAr);
    // التكرار على كل صفحة = `position: fixed` داخل كتلة الطباعة.
    expect(PRINT_CSS).toMatch(/\.rv-print-header,\s*\.rv-print-footer\s*\{[^}]*position:\s*fixed/);
    expect(PRINT_CSS).toMatch(/\.rv-print-header,\s*\.rv-print-footer\s*\{[^}]*display:\s*block/);
  });

  it("الخلفيات الحاملة للمعنى تُطلب صراحةً من الطابعة", () => {
    expect(PRINT_CSS).toMatch(/print-color-adjust:\s*exact/);
  });
});

// ============================================================================
// ③ الورق فاتح دائمًا، والشاشة بوضعين من طبقة الرموز
// ============================================================================

describe("الوضعان والورق", () => {
  it("الطباعة تفرض ورقًا أبيض وحبرًا داكنًا مهما كان وضع الشاشة", () => {
    const doc = PRINT_CSS.match(/\.rv-doc\s*\{([\s\S]*?)\}/);
    expect(doc, "كتلة .rv-doc غائبة عن أنماط الطباعة").toBeTruthy();
    const body = doc![1];
    expect(body).toMatch(/--rv-surface:\s*#ffffff/i);
    expect(body).toMatch(/--rv-ink:\s*#(0|1|2|3)[0-9a-f]{5}/i); // حبر داكن، لا فاتح
    expect(body).toMatch(/background:\s*#ffffff/i);
  });

  it("لا لون مكتوب يدويًّا خارج كتلة الطباعة — كل لون من طبقة الرموز", () => {
    const screen = stripComments(SCREEN_CSS);
    expect(screen).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // ولا `rgb()/rgba()` بأرقام حرفية — المسموح `rgba(var(--…), …)` وحده.
    expect(screen).not.toMatch(/rgba?\(\s*\d/);
  });

  it("لا صنف ثيم مكتوب في الترميز (المادة ٣٢ §١)", () => {
    expect(ALL_SOURCE).not.toMatch(/className=["'`][^"'`]*\b(dark|light)\b/);
  });

  it("رموز العارض مشتقّة من طبقة الرموز العامة فتتبع الوضعين معًا", () => {
    const rootBlock = stripComments(SCREEN_CSS).match(/\.rv-doc\s*\{([\s\S]*?)\}/);
    expect(rootBlock).toBeTruthy();
    const body = rootBlock![1];
    expect(body).toMatch(/--rv-ink:\s*var\(--ink\)/);
    expect(body).toMatch(/--rv-surface:\s*var\(--surface\)/);
    expect(body).toMatch(/--rv-hairline:\s*var\(--hairline\)/);
  });

  // العنوان لا يقتبس النمط المحظور حرفيًّا: حارس الوضعين
  // (`src/lib/theme/theme-contract.test.ts`) يفحص الكود بعد نزع التعليقات
  // وحدها، فنصّ العنوان يُقرأ خرقًا لا وصفًا للخرق.
  it("لا تعبئة بيضاء صريحة في أي SVG — currentColor حصرًا (المادة ٣٣ §٢)", () => {
    expect(ALL_SOURCE).not.toMatch(/fill=["']white["']/);
    expect(ALL_SOURCE).not.toMatch(/fill=["']#[0-9a-fA-F]{3,8}["']/);
    expect(SOURCES["report-tones.tsx"]).toMatch(/fill="currentColor"/);
  });
});

// ============================================================================
// ④ شارة المحاكاة
// ============================================================================

describe("شارة المحاكاة", () => {
  it("ظاهرة على التقرير كلّه ما دام isSimulation", () => {
    const container = renderDoc();
    const badge = container.querySelector(".rv-sim-badge");
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain("بيانات مرجعية");
    expect(badge?.textContent, "الشارة لم تعد تقول إن البيانات ليست حيّة").toContain("ليست حيّة");
    expect(badge?.textContent).toContain("is_simulation = true");
    expect(container.querySelector(".rv-doc")?.getAttribute("data-simulation")).toBe("true");
  });

  it("لا تُخفى في الطباعة — إخفاؤها يُخرج ورقةً تبدو تقريرًا عن عميل حقيقي", () => {
    expect(PRINT_CSS).toMatch(/\.rv-sim-badge\s*\{[^}]*display:\s*(flex|block|inline-flex)/);
    expect(PRINT_CSS).not.toMatch(/\.rv-sim-badge\s*\{[^}]*display:\s*none/);
    const container = renderDoc();
    expect(container.querySelector(".rv-foot-sim")).toBeTruthy();
  });

  it("تختفي حين لا يكون التقرير محاكاة", () => {
    const container = renderDoc({ ...DOC, isSimulation: false });
    expect(container.querySelector(".rv-sim-badge")).toBeNull();
    expect(container.querySelector(".rv-doc")?.getAttribute("data-simulation")).toBe("false");
  });
});

// ============================================================================
// ⑤ RTL وثنائية اللغة
// ============================================================================

describe("RTL وثنائية اللغة", () => {
  it("المستند عربي واتجاهه RTL", () => {
    const container = renderDoc();
    const root = container.querySelector(".rv-doc");
    expect(root?.getAttribute("dir")).toBe("rtl");
    expect(root?.getAttribute("lang")).toBe("ar");
  });

  it('كل نصّ إنجليزي موسوم lang="en" dir="ltr" — لا إنجليزية عائمة داخل RTL', () => {
    const container = renderDoc();
    const englishNodes = Array.from(container.querySelectorAll(".rv-en"));
    expect(englishNodes.length).toBeGreaterThan(0);
    for (const node of englishNodes) {
      expect(node.getAttribute("lang")).toBe("en");
      expect(node.getAttribute("dir")).toBe("ltr");
    }
  });

  it("العنوان والفترة والمنطقة والأقسام كلها بوجهيها العربي والإنجليزي", () => {
    const text = renderDoc().textContent ?? "";
    expect(text).toContain(DOC.titleAr);
    expect(text).toContain(DOC.titleEn);
    expect(text).toContain(DOC.periodAr);
    expect(text).toContain(DOC.periodEn);
    for (const section of DOC.sections) {
      expect(text).toContain(section.titleAr);
      expect(text).toContain(section.titleEn);
    }
  });

  it("المنطقة تُقرأ من regions.ts لا من نصّ مكتوب", () => {
    expect(SOURCES["ReportViewer.tsx"]).toMatch(/from "@\/lib\/regions"/);
    const text = renderDoc().textContent ?? "";
    expect(text).toContain("المنطقة الشرقية");
    expect(renderDoc().querySelector(".rv-doc")?.getAttribute("data-region")).toBe("eastern");
  });
});

// ============================================================================
// ⑥ إمكانية الوصول
// ============================================================================

describe("إمكانية الوصول", () => {
  it("عنوان رئيسي واحد، وتسلسل h1→h2→h3 بلا قفز", () => {
    const container = renderDoc();
    const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    const levels = headings.map((h) => Number(h.tagName[1]));

    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    expect(levels).toContain(2);
    expect(levels).toContain(3);

    let previous = levels[0];
    for (const [i, level] of levels.entries()) {
      expect(
        level - previous,
        `قفزة في تسلسل العناوين عند «${headings[i].textContent?.slice(0, 40)}»`,
      ).toBeLessThanOrEqual(1);
      previous = level;
    }
  });

  it("كل جدول له <caption>", () => {
    const container = renderDoc();
    const tables = Array.from(container.querySelectorAll("table"));
    expect(tables.length).toBe(countOf("table"));
    for (const table of tables) {
      const caption = table.querySelector("caption");
      expect(caption, "جدول بلا <caption>").toBeTruthy();
      expect(caption?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  it("كل <th> يحمل scope، وكل صفّ يبدأ بترويسة صفّ", () => {
    const container = renderDoc();
    const headers = Array.from(container.querySelectorAll("th"));
    expect(headers.length).toBeGreaterThan(0);
    for (const th of headers) {
      expect(["col", "row"]).toContain(th.getAttribute("scope"));
    }
    for (const row of Array.from(container.querySelectorAll("tbody tr"))) {
      expect(row.querySelector('th[scope="row"]'), "صفّ بلا ترويسة صفّ").toBeTruthy();
    }
  });

  it("كل صورة لها بديل نصّي، وكل رسم له وصف نصّي كامل", () => {
    const container = renderDoc();
    for (const img of Array.from(container.querySelectorAll("img"))) {
      expect(img.getAttribute("alt")?.trim().length ?? 0).toBeGreaterThan(0);
    }
    for (const svg of Array.from(container.querySelectorAll("svg.rv-chart-svg"))) {
      expect(svg.getAttribute("role")).toBe("img");
      expect(svg.getAttribute("aria-label")?.length ?? 0).toBeGreaterThan(10);
    }
    // ورموز الزينة محجوبة عن القارئ الصوتي.
    for (const glyph of Array.from(container.querySelectorAll("svg.rv-tone-glyph"))) {
      expect(glyph.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("لا مخالفات axe على التقرير كاملًا", async () => {
    const container = renderDoc();
    expect(await axe(container)).toHaveNoViolations();
  }, 20000);
});

// ============================================================================
// ⑦ النغمات — الشكل والكلمة قبل اللون
// ============================================================================

describe("«خطر» و«تحذير» لا يُوحَّدان", () => {
  it("شكلان مختلفان وكلمتان مختلفتان — واللون حامل ثالث لا وحيد", () => {
    expect(REPORT_TONES.danger.shape).not.toBe(REPORT_TONES.warning.shape);
    expect(REPORT_TONES.danger.wordAr).toBe("خطر");
    expect(REPORT_TONES.warning.wordAr).toBe("تحذير");
    expect(REPORT_TONES.danger.toneVar).not.toBe(REPORT_TONES.warning.toneVar);
    // عرف لوحات السلامة: مثمّن = خطر · مثلث = تحذير · دائرة = سليم.
    expect(REPORT_TONES.danger.shape).toBe("octagon");
    expect(REPORT_TONES.warning.shape).toBe("triangle");
    expect(REPORT_TONES.success.shape).toBe("circle");
  });

  it("انزع اللون كلّه من المرسوم: يبقى الفرق قائمًا", () => {
    const container = renderDoc();
    const callouts = Array.from(container.querySelectorAll<HTMLElement>('[data-block="callout"]'));
    const danger = callouts.find((c) => c.dataset.tone === "danger");
    const warning = callouts.find((c) => c.dataset.tone === "warning");
    expect(danger).toBeTruthy();
    expect(warning).toBeTruthy();

    // الشكل: عدد رؤوس المضلّع مختلف — لا يعتمد على لون ولا على CSS.
    const dangerShape = danger!.querySelector("polygon")?.getAttribute("points");
    const warningShape = warning!.querySelector("polygon")?.getAttribute("points");
    expect(dangerShape).toBeTruthy();
    expect(warningShape).toBeTruthy();
    expect(dangerShape).not.toBe(warningShape);

    // الكلمة: تُقرأ بلا لون.
    expect(danger!.querySelector(".rv-tone-word")?.textContent).toBe("خطر");
    expect(warning!.querySelector(".rv-tone-word")?.textContent).toBe("تحذير");
  });

  it("النغمات تصل CSS عبر data-tone لا عبر لون مكتوب في الترميز", () => {
    const screen = stripComments(SCREEN_CSS);
    expect(screen).toMatch(/\[data-tone="danger"\]\s*\{[^}]*--rv-tone:\s*var\(--rv-tone-danger\)/);
    expect(screen).toMatch(
      /\[data-tone="warning"\]\s*\{[^}]*--rv-tone:\s*var\(--rv-tone-warning\)/,
    );
  });
});

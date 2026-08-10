/**
 * عقد طقم رسوم التقارير.
 *
 * أربعة مطالب يحرسها هذا الملف، وكلها من النوع الذي **لا يكسر شيئًا حين
 * يسقط**: يمرّ tsc ويمرّ eslint وتمرّ كل الاختبارات الأخرى، ولا يُرى العطل
 * إلا في تقرير مطبوع بيد مسؤول أو على قارئ شاشة.
 *
 * ① `null` لا يُرسم (المادة ٢٧) — عمود بطول صفر أو نقطة على أرضية المحور
 *   تقول «قِيس فكان صفرًا»، وهو خبرٌ لم يقع.
 * ② لا لون خام (المادتان ٣٢–٣٤) — `fill="white"` يختفي على ورق أبيض وفي
 *   الوضع الفاتح، وأي hex مكتوب يُجمّد الرسم على وضع واحد.
 * ③ البديل النصّي موجود **وخارج** `role="img"` — الجدول داخل عنصر بهذا
 *   الدور محجوبٌ بالكامل عن قارئ الشاشة، فيصير بديلًا لا يبلغ أحدًا.
 * ④ «خطر» و«تحذير» يفترقان بلا لون (WCAG 2.2 §1.4.1).
 *
 * ## المادة ٣٠ — الآلة تُختبر قبل أن يُوثق بقراءتها
 *
 * كل كاشف في هذا الملف (مُجرِّد التعليقات · كاشف اللون الخام · عدّاد
 * الأشكال) له اختبارٌ يُثبت أنه **يشتعل على كسرٍ مصطنع**. كاشفٌ لا يشتعل
 * أبدًا يمرّ دائمًا ولا يثبت شيئًا — وهو أسوأ من غياب الاختبار لأنه يشتري
 * طمأنينة كاذبة.
 */
import { readFileSync, readdirSync } from "node:fs";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import React from "react";

import { ReportLineChart } from "./ReportLineChart";
import { ReportBarChart, ReportStackedBarChart } from "./ReportBarChart";
import { ReportAreaChart } from "./ReportAreaChart";
import { ReportDonutChart } from "./ReportDonutChart";
import { ReportGaugeChart } from "./ReportGaugeChart";
import {
  NOT_MEASURED,
  TONE_CLASS,
  TONE_SHAPE,
  TONE_WORD,
  tonePolygonPoints,
  type ReportCategory,
  type ReportSeries,
  type ReportTone,
} from "./chart-tokens";

afterEach(cleanup);

const DIR = "src/components/reports/charts";
const CSS_PATH = "src/styles/report-charts.css";
const CSS = readFileSync(CSS_PATH, "utf8");
const SOURCES = readdirSync(DIR)
  .filter((f) => /\.tsx?$/.test(f) && !f.includes(".test."))
  .map((f) => [`${DIR}/${f}`, readFileSync(`${DIR}/${f}`, "utf8")] as const);

const W = 420;

/* ═════════════════════════════ أدوات الفحص ═════════════════════════════ */

/**
 * تجريد التعليقات. لازمٌ لا تجميل: هذا الملفّ يمنع كتابة `#fff` في الكود،
 * والكود نفسه **يشرح** في تعليقاته لماذا مُنع `stroke="#fff"` الافتراضي في
 * recharts. بلا التجريد يشتعل الكاشف على الشرح فيُجبر الشرح على الاختفاء —
 * فيضيع السبب الذي كُتب الحارس لأجله.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** لون خام: hex أو rgb/rgba أو hsl/hsla أو اسم لون في موضع قيمة. */
const RAW_COLOR =
  /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(|(?:fill|stroke|color|background|stopColor|background-color|border-color)\s*[:=]\s*["']?\s*(?:white|black|red|green|blue|yellow|orange|amber|gray|grey|silver|purple|pink)\b/;

function rawColorHits(text: string): string[] {
  const re = new RegExp(RAW_COLOR.source, "g");
  return text.match(re) ?? [];
}

/* ═════════════════════════════ عيّنات البيانات ═════════════════════════ */

const SERIES: ReportSeries[] = [{ key: "v", label: "البلاغات" }];

/** الوسط `null` عمدًا — هو محلّ الاختبار كلّه. */
const GAPPED: ReportCategory[] = [
  { label: "الأحد", values: { v: 12 } },
  { label: "الاثنين", values: { v: null } },
  { label: "الثلاثاء", values: { v: 30 } },
];

const FULL: ReportCategory[] = [
  { label: "الأحد", values: { v: 12 } },
  { label: "الاثنين", values: { v: 21 } },
  { label: "الثلاثاء", values: { v: 30 } },
];

const ALL_NULL: ReportCategory[] = GAPPED.map((d) => ({ ...d, values: { v: null } }));

const el = React.createElement;

/* ═══════════════════ ① المادة ٢٧ — ما لم يُقَس لا يُرسم ═══════════════ */

describe("المادة ٢٧ — `null` لا تُرسم عمودًا ولا نقطة ولا قوسًا", () => {
  it("العمود الغائب لا مستطيل له — والكامل له ثلاثة (الكاشف يعدّ فعلًا)", () => {
    const gap = render(
      el(ReportBarChart, {
        title: "بلاغات",
        data: GAPPED,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
    ).container;
    expect(gap.querySelectorAll(".recharts-rectangle")).toHaveLength(2);

    cleanup();

    // بلا هذا الشقّ يمرّ الاختبار على مكوّن لا يرسم شيئًا أصلًا.
    const full = render(
      el(ReportBarChart, {
        title: "بلاغات",
        data: FULL,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
    ).container;
    expect(full.querySelectorAll(".recharts-rectangle")).toHaveLength(3);
  });

  it("المكدّس كذلك — الغياب لا يُطوى قطعةً بارتفاع صفر", () => {
    const { container } = render(
      el(ReportStackedBarChart, {
        title: "بلاغات",
        data: GAPPED,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
    );
    expect(container.querySelectorAll(".recharts-rectangle")).toHaveLength(2);
  });

  it("الخطّ ينقطع عند الغياب ولا يقفز فوقه", () => {
    const gap = render(
      el(ReportLineChart, {
        title: "بلاغات",
        data: GAPPED,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
    ).container;
    expect(gap.querySelectorAll(".rpt-dot")).toHaveLength(2);

    // مسار مقطوع = أمرا `M` اثنان. الوصل فوق الفجوة يعطي أمرًا واحدًا،
    // وهو أخطر من الصفر لأنه لا يترك أثرًا يُشكّ فيه.
    const gappedD = gap.querySelector(".recharts-line-curve")?.getAttribute("d") ?? "";
    expect(gappedD.match(/M/g) ?? []).toHaveLength(2);

    cleanup();

    const full = render(
      el(ReportLineChart, {
        title: "بلاغات",
        data: FULL,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
    ).container;
    expect(full.querySelectorAll(".rpt-dot")).toHaveLength(3);
    const fullD = full.querySelector(".recharts-line-curve")?.getAttribute("d") ?? "";
    expect(fullD.match(/M/g) ?? []).toHaveLength(1);
  });

  it("المساحي ينقطع عند الغياب ولا يهبط به إلى أرضية المحور", () => {
    // **لا يُقاس المساحي بالنقاط.** قيس: `<Area>` في recharts لا يُصيّر
    // النقطة المخصّصة إطلاقًا — لا مع البيانات الكاملة ولا الناقصة (٠ و٠).
    // فتأكيدٌ على `.rpt-dot` هنا يفحص ما لا تفعله المكتبة أصلًا، و«إصلاحه»
    // بتوقّع صفر كان يجعله أخضر يحرس العدم.
    //
    // والمساحي يحفظ المادة ٢٧ بالآلية التي يملكها فعلًا: `connectNulls={false}`
    // يقطع المسار، فالغياب فجوةٌ لا هبوطٌ إلى الصفر — وهبوطُه إلى الأرضية
    // أخطر من غيابه لأنه يُقرأ «لا حوادث» بدل «لم يُقَس».
    const gap = render(
      el(ReportAreaChart, {
        title: "حجم",
        data: GAPPED,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
    ).container;
    const gappedD = gap.querySelector(".recharts-area-area")?.getAttribute("d") ?? "";
    expect(gappedD, "لم يُقرأ مسار المساحي — تغيّر الصنف فبطل الفحص").not.toBe("");
    expect(gappedD.match(/M/g) ?? []).toHaveLength(2);

    cleanup();

    const full = render(
      el(ReportAreaChart, {
        title: "حجم",
        data: FULL,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
    ).container;
    const fullD = full.querySelector(".recharts-area-area")?.getAttribute("d") ?? "";
    expect(fullD.match(/M/g) ?? []).toHaveLength(1);
  });

  it("الحلقي لا يعطي الشريحة الغائبة زاوية، ولا يحسبها في المقام", () => {
    const { container, getByText } = render(
      el(ReportDonutChart, {
        title: "توزيع",
        width: W,
        staticRender: true,
        slices: [
          { label: "تشغيلي", value: 30 },
          { label: "أمني", value: null },
          { label: "صيانة", value: 70 },
        ],
      }),
    );
    expect(container.querySelectorAll(".recharts-sector")).toHaveLength(2);

    // المقام مجموع المقيس وحده (100)، فنسبة 30 هي 30.0٪ لا أقلّ.
    const table = container.querySelector(".rpt-sr table")!;
    expect(table.textContent).toContain("30.0٪");
    expect(getByText(NOT_MEASURED, { selector: ".rpt-legend-unmeasured" })).toBeTruthy();
  });

  it("المقياس بلا قياس: وجه الجهاز يبقى، وقوس القيمة لا يُرسم ولا حالة تُخمَّن", () => {
    const none = render(
      el(ReportGaugeChart, {
        title: "الجاهزية",
        value: null,
        thresholds: { warning: 60, danger: 80 },
      }),
    ).container;
    expect(none.querySelectorAll(".rpt-gauge-value")).toHaveLength(0);
    expect(none.querySelectorAll(".rpt-gauge-track")).toHaveLength(1);
    // لا حكم بلا قياس — لا شارة «سليم» ولا «خطر».
    expect(none.querySelectorAll(".rpt-badge")).toHaveLength(0);
    expect(none.textContent).toContain(NOT_MEASURED);

    cleanup();

    const some = render(
      el(ReportGaugeChart, {
        title: "الجاهزية",
        value: 42,
        thresholds: { warning: 60, danger: 80 },
      }),
    ).container;
    expect(some.querySelectorAll(".rpt-gauge-value")).toHaveLength(1);
    expect(some.querySelectorAll(".rpt-badge")).toHaveLength(1);
  });

  it("لا قياس واحد في البيانات ⇐ لا رسم إطلاقًا، بل «لم يُقَس»", () => {
    const { container } = render(
      el(ReportBarChart, {
        title: "بلاغات",
        data: ALL_NULL,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
    );
    expect(container.querySelector(".rpt-empty")?.textContent).toBe(NOT_MEASURED);
    expect(container.querySelector(".recharts-surface")).toBeNull();
  });

  it("الصفر قياسٌ ويُرسم — الغياب وحده هو الذي لا يُرسم", () => {
    // الخلط بين الاثنين هو العطل الذي وُجدت المادة ٢٧ لأجله.
    const { container } = render(
      el(ReportBarChart, {
        title: "بلاغات",
        width: W,
        staticRender: true,
        series: SERIES,
        data: [
          { label: "الأحد", values: { v: 0 } },
          { label: "الاثنين", values: { v: null } },
        ],
      }),
    );
    expect(container.querySelector(".rpt-empty")).toBeNull();
    const table = container.querySelector(".rpt-sr table")!;
    expect(table.textContent).toContain("0");
    expect(table.textContent).toContain(NOT_MEASURED);
  });

  it("الحاشية تُسمّي ما غاب — الرسم لا يُكمل، والنصّ يقول إنه ناقص", () => {
    const { container } = render(
      el(ReportLineChart, {
        title: "بلاغات",
        data: GAPPED,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
    );
    const note = container.querySelector(".rpt-note")?.textContent ?? "";
    expect(note).toContain(NOT_MEASURED);
    expect(note).toContain("الاثنين");
    expect(note).not.toContain("الأحد");
  });
});

/* ═══════════════════ ② لا لون خام — لا في الترميز ولا في المصدر ══════ */

describe("المادتان ٣٢–٣٤ — اللون من طبقة الرموز وحدها", () => {
  function renderAll() {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const out: string[] = [];
    for (const node of [
      el(ReportLineChart, {
        title: "خطّي",
        data: GAPPED,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
      el(ReportBarChart, {
        title: "أعمدة",
        data: GAPPED,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
      el(ReportStackedBarChart, {
        title: "مكدّس",
        data: GAPPED,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
      el(ReportAreaChart, {
        title: "مساحي",
        data: GAPPED,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
      el(ReportDonutChart, {
        title: "حلقي",
        width: W,
        staticRender: true,
        slices: [
          { label: "أ", value: 3, tone: "danger" as ReportTone },
          { label: "ب", value: 7 },
        ],
      }),
      el(ReportGaugeChart, { title: "مقياس", value: 88, thresholds: { warning: 60, danger: 80 } }),
    ]) {
      out.push(render(node).container.innerHTML);
      cleanup();
    }
    host.remove();
    return out.join("\n");
  }

  it('لا `fill="white"` ولا أي لون خام في الترميز المُخرَج', () => {
    const html = renderAll();
    expect(html).not.toMatch(/fill="white"/i);
    expect(html).not.toMatch(/stroke="white"/i);
    // `stroke="#fff"` هو ما يكتبه recharts افتراضيًّا على قطاعات الفطيرة.
    expect(rawColorHits(html)).toEqual([]);
  });

  it("الكاشف يشتعل على كسرٍ مصطنع — وإلّا كان مرورًا بلا معنى (المادة ٣٠)", () => {
    expect(rawColorHits('<rect fill="white" />')).not.toEqual([]);
    expect(rawColorHits('<path stroke="#fff" />')).not.toEqual([]);
    expect(rawColorHits('<i style="color: rgb(1,2,3)" />')).not.toEqual([]);
    expect(rawColorHits('<g class="rpt-series-1" fill="currentColor" />')).toEqual([]);
  });

  it("لا لون خام مكتوبًا في أي مصدر من الطقم", () => {
    for (const [file, src] of SOURCES) {
      expect(rawColorHits(stripComments(src)), `${file} يكتب لونًا خامًّا`).toEqual([]);
    }
  });

  it("ورقة الأنماط كذلك — وكل رمز تقرأه من القائمة المعتمدة", () => {
    const body = stripComments(CSS);
    expect(rawColorHits(body)).toEqual([]);

    const vars = new Set(body.match(/var\(\s*(--[a-z0-9-]+)/g)?.map((m) => m.split("(")[1].trim()));
    const allowed = /^--(rpt-|nx-|ink|surface|hairline|chip|tone-|glass-)/;
    for (const v of vars) {
      expect(allowed.test(v), `الرمز ${v} خارج طبقة الرموز المعتمدة`).toBe(true);
    }
  });

  it("مُجرِّد التعليقات يجرّد فعلًا — لا يمرّ اللون الخام مختبئًا في شرح", () => {
    expect(stripComments('/* stroke="#fff" */ const a = 1;')).not.toContain("#fff");
    expect(stripComments('// fill="white"\nconst b = 2;')).not.toContain("white");
    // ولا يبتلع الكود: لو ابتلعه لصار الفحص كلّه على نصٍّ فارغ.
    expect(stripComments("/* شرح */ const a = 1;")).toContain("const a = 1;");
    expect(rawColorHits(stripComments('const c = { fill: "#abcdef" };'))).not.toEqual([]);
  });

  it("كل ما يُرسم يقرأ `currentColor` — واللون يأتي من صنف السلسلة", () => {
    const { container } = render(
      el(ReportBarChart, {
        title: "أعمدة",
        data: FULL,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
    );
    const rect = container.querySelector(".recharts-rectangle")!;
    expect(rect.getAttribute("fill")).toBe("currentColor");
    expect(container.querySelector('[class*="rpt-series-"]')).not.toBeNull();
  });
});

/* ═══════════════════ ③ البديل النصّي ══════════════════════════════════ */

describe("الرسم وحده لا يكفي — بديل نصّي يبلغ قارئ الشاشة", () => {
  it('لكل رسم `role="img"` ووصف عربي غير فارغ', () => {
    for (const node of [
      el(ReportLineChart, {
        title: "خطّي",
        data: GAPPED,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
      el(ReportBarChart, {
        title: "أعمدة",
        data: GAPPED,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
      el(ReportAreaChart, {
        title: "مساحي",
        data: GAPPED,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
      el(ReportDonutChart, {
        title: "حلقي",
        width: W,
        staticRender: true,
        slices: [{ label: "أ", value: 3 }],
      }),
      el(ReportGaugeChart, { title: "مقياس", value: 40 }),
    ]) {
      const { container } = render(node);
      const img = container.querySelector('[role="img"]')!;
      expect(img).not.toBeNull();
      const label = img.getAttribute("aria-label") ?? "";
      expect(label.length).toBeGreaterThan(10);
      expect(label, `الوصف ليس عربيًّا: ${label}`).toMatch(/[؀-ۿ]/);
      cleanup();
    }
  });

  it("جدولٌ مخفيّ بصريًّا يحمل كل قيمة، والغياب مكتوب فيه «لم يُقَس»", () => {
    const { container } = render(
      el(ReportBarChart, {
        title: "بلاغات",
        data: GAPPED,
        series: SERIES,
        width: W,
        staticRender: true,
        unit: "بلاغ",
      }),
    );
    const wrap = container.querySelector(".sr-only.rpt-sr")!;
    expect(wrap).not.toBeNull();
    const table = wrap.querySelector("table")!;
    expect(table).not.toBeNull();
    expect(table.querySelectorAll("tbody tr")).toHaveLength(GAPPED.length);
    expect(table.querySelectorAll('th[scope="row"]')).toHaveLength(GAPPED.length);
    expect(table.textContent).toContain("12");
    expect(table.textContent).toContain("30");
    expect(table.textContent).toContain(NOT_MEASURED);
  });

  it('الجدول **خارج** `role="img"` — وهذا هو البند الحامل', () => {
    // ما داخل عنصر `role="img"` محجوب بالكامل عن شجرة الوصول. جدولٌ يُكتب
    // داخله بديلٌ لا يبلغ أحدًا، والاختبار يمرّ لو اكتفى بوجوده في المستند.
    const { container } = render(
      el(ReportBarChart, {
        title: "بلاغات",
        data: GAPPED,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
    );
    const img = container.querySelector('[role="img"]')!;
    expect(img.querySelector("table")).toBeNull();
    expect(img.querySelector(".rpt-sr")).toBeNull();
    expect(container.querySelector(".rpt-sr table")).not.toBeNull();
    // والوسيلة كذلك نصٌّ يُقرأ لا رسمٌ محجوب.
    expect(img.querySelector(".rpt-legend")).toBeNull();
    expect(container.querySelector(".rpt-legend")).not.toBeNull();
  });
});

/* ═══════════════════ ④ خطر وتحذير — الشكل قبل اللون ═════════════════ */

describe("WCAG 2.2 §1.4.1 — «خطر» و«تحذير» لا يفترقان باللون وحده", () => {
  it("عرف لوحات السلامة: مثمّن خطر · مثلث تحذير · دائرة سليم", () => {
    expect(TONE_SHAPE.danger).toBe("octagon");
    expect(TONE_SHAPE.warning).toBe("triangle");
    expect(TONE_SHAPE.success).toBe("circle");
  });

  it("الأشكال أعداد أضلاعها مختلفة فعلًا لا أسماء متشابهة", () => {
    const count = (tone: ReportTone) => {
      const pts = tonePolygonPoints(TONE_SHAPE[tone], 8, 8, 7);
      return pts === null ? 0 : pts.trim().split(/\s+/).length;
    };
    expect(count("danger")).toBe(8);
    expect(count("warning")).toBe(3);
    expect(count("success")).toBe(0); // دائرة — `<circle>` لا مضلّع
    expect(new Set([count("danger"), count("warning"), count("success")]).size).toBe(3);
  });

  it("الكلمة حاملٌ ثانٍ، والصنف ثالث — وكلها مختلفة", () => {
    expect(TONE_WORD.danger).toBe("خطر");
    expect(TONE_WORD.warning).toBe("تحذير");
    expect(TONE_WORD.success).toBe("سليم");
    expect(new Set(Object.values(TONE_WORD)).size).toBe(Object.keys(TONE_WORD).length);
    expect(new Set(Object.values(TONE_CLASS)).size).toBe(Object.keys(TONE_CLASS).length);
  });

  it("الشكل يصل إلى الترميز فعلًا: مقياس «خطر» فيه مثمّن، و«تحذير» مثلث", () => {
    const danger = render(
      el(ReportGaugeChart, { title: "مؤشر", value: 95, thresholds: { warning: 60, danger: 80 } }),
    ).container;
    const dangerPts = danger.querySelector(".rpt-badge polygon")?.getAttribute("points") ?? "";
    expect(dangerPts.trim().split(/\s+/)).toHaveLength(8);
    expect(danger.textContent).toContain("خطر");

    cleanup();

    const warn = render(
      el(ReportGaugeChart, { title: "مؤشر", value: 70, thresholds: { warning: 60, danger: 80 } }),
    ).container;
    const warnPts = warn.querySelector(".rpt-badge polygon")?.getAttribute("points") ?? "";
    expect(warnPts.trim().split(/\s+/)).toHaveLength(3);
    expect(warn.textContent).toContain("تحذير");
  });

  it("أسقِط اللون كلّه فيبقى الفرق قائمًا — وهذا هو البند الحامل", () => {
    const strip = (html: string) =>
      html
        .replace(/class="[^"]*"/g, "")
        .replace(/\s(?:fill|stroke|color)="[^"]*"/g, "")
        .replace(/style="[^"]*"/g, "");

    const d = strip(
      render(el(ReportGaugeChart, { title: "م", value: 95, thresholds: { danger: 80 } })).container
        .innerHTML,
    );
    cleanup();
    const w = strip(
      render(
        el(ReportGaugeChart, { title: "م", value: 70, thresholds: { warning: 60, danger: 80 } }),
      ).container.innerHTML,
    );

    expect(d).not.toBe(w);
    expect(d).toContain("خطر");
    expect(w).toContain("تحذير");
    // والمضلّعان مختلفان في عدد نقاطهما بعد نزع كل لون.
    expect(d).toMatch(/points="(?:[-\d.]+,[-\d.]+ ){7}[-\d.]+,[-\d.]+"/);
    expect(w).toMatch(/points="(?:[-\d.]+,[-\d.]+ ){2}[-\d.]+,[-\d.]+"/);
  });

  it("مُجرِّد اللون يجرّد فعلًا (المادة ٣٠)", () => {
    const strip = (html: string) =>
      html.replace(/class="[^"]*"/g, "").replace(/\s(?:fill|stroke|color)="[^"]*"/g, "");
    expect(strip('<p class="rpt-tone-danger" fill="currentColor">خطر</p>')).toBe("<p >خطر</p>");
  });
});

/* ═══════════════════ ⑤ الالتقاط والطباعة ═════════════════════════════ */

describe("جاهزية الالتقاط — `staticRender` يوقف كل حركة", () => {
  it("يضع `.rpt-static` على الجذر ويحذف التلميح أصلًا", () => {
    const { container } = render(
      el(ReportLineChart, {
        title: "خطّي",
        data: FULL,
        series: SERIES,
        width: W,
        staticRender: true,
      }),
    );
    expect(container.querySelector("figure")?.classList.contains("rpt-static")).toBe(true);
    expect(container.querySelector(".recharts-tooltip-wrapper")).toBeNull();
  });

  it("وبدونه يُركَّب التلميح — وإلّا كان الفحص أعلاه يقيس العدم", () => {
    const { container } = render(
      el(ReportLineChart, { title: "خطّي", data: FULL, series: SERIES, width: W }),
    );
    expect(container.querySelector("figure")?.classList.contains("rpt-static")).toBe(false);
    expect(container.querySelector(".recharts-tooltip-wrapper")).not.toBeNull();
  });

  it("كل مكوّن يقبل `staticRender` ويمرّرها إلى حركة recharts", () => {
    for (const [file, src] of SOURCES) {
      if (!/^src.*Report[A-Z]/.test(file)) continue;
      expect(src, `${file} لا يقبل staticRender`).toContain("staticRender");
    }
    const animated = SOURCES.filter(([, s]) => s.includes("isAnimationActive"));
    expect(animated.length).toBeGreaterThan(0);
    for (const [file, src] of animated) {
      // الشرط أن تكون الحركة **موقوفةً عند الالتقاط**، لا أن تُكتب بصيغة
      // بعينها. و`isAnimationActive={false}` تفي به **أشدّ**: موقوفةٌ دائمًا
      // لا عند الالتقاط وحده (هكذا مؤشّر التلميح في `cartesian.tsx`).
      // اشتراط الصيغة الأولى حصرًا كان يُسقِط الأشدّ لصالح الأضعف.
      const stoppable =
        /isAnimationActive=\{!staticRender\}/.test(src) || /isAnimationActive=\{false\}/.test(src);
      expect(stoppable, `${file} يفعّل حركة لا يوقفها الالتقاط`).toBe(true);
    }
  });

  it("ورقة الأنماط تُلغي الحركة في الالتقاط وفي الطباعة وفي تقليل الحركة", () => {
    expect(CSS).toContain(".rpt-chart.rpt-static");
    expect(CSS).toContain("@media print");
    expect(CSS).toContain("prefers-reduced-motion");
    expect(CSS.match(/animation:\s*none\s*!important/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
});

/* ═══════════════════ ⑥ RTL والخطوط والأرقام ══════════════════════════ */

describe("عربيّ أولًا — المحور يبدأ يمينًا والأرقام تُصفّ", () => {
  it('الجذر `dir="rtl"`', () => {
    const { container } = render(
      el(ReportBarChart, { title: "بلاغات", data: FULL, series: SERIES, width: W }),
    );
    expect(container.querySelector("figure")?.getAttribute("dir")).toBe("rtl");
  });

  it("الفئة الأولى تُرسم يمين الأخيرة فعلًا — لا `direction` وحدها", () => {
    // `direction: rtl` تقلب النصّ لا الرسم. الفحص على الإحداثي المرسوم.
    const { container } = render(
      el(ReportBarChart, { title: "بلاغات", data: FULL, series: SERIES, width: W }),
    );
    const xOf = (label: string) => {
      const text = [...container.querySelectorAll(".recharts-xAxis text")].find(
        (t) => t.textContent === label,
      );
      const tr = text?.parentElement?.getAttribute("transform") ?? "";
      return Number(/translate\(([-\d.]+)/.exec(tr)?.[1] ?? NaN);
    };
    const first = xOf(FULL[0].label);
    const last = xOf(FULL[FULL.length - 1].label);
    expect(Number.isFinite(first) && Number.isFinite(last)).toBe(true);
    expect(first).toBeGreaterThan(last);
  });

  it("خطوط المنتج وأرقام مصفوفة في ورقة الأنماط", () => {
    expect(CSS).toContain("IBM Plex Sans Arabic");
    expect(CSS).toContain("Tajawal");
    expect(CSS).toContain("Cairo");
    expect(CSS).toContain("font-variant-numeric: tabular-nums");
  });

  it("الأرقام لاتينية فلا يتكسّر صفّها — لا أرقام هندية في الجدول", () => {
    const { container } = render(
      el(ReportBarChart, { title: "بلاغات", data: FULL, series: SERIES, width: W }),
    );
    const table = container.querySelector(".rpt-sr table")!.textContent ?? "";
    expect(table).toMatch(/12/);
    expect(table, "أرقام هندية تكسر tabular-nums").not.toMatch(/[٠-٩]/);
  });

  it("بلا `width` يُلفّ الرسم في حاوية متمدّدة — والالتقاط يمرّر عرضًا", () => {
    const { container } = render(
      el(ReportBarChart, { title: "بلاغات", data: FULL, series: SERIES }),
    );
    expect(container.querySelector(".recharts-responsive-container")).not.toBeNull();
  });
});

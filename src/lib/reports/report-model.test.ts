/**
 * حارس عقد نموذج التقرير الغنيّ.
 *
 * الاختبارات الحاملة للوزن هنا ثلاثة، والباقي حولها:
 *  ① `null` يُقرأ «لم يُقَس» — و**الصفر المقيس يبقى صفرًا**. الثاني هو الذي
 *    يسقط حين يتسلّل `?? 0` إلى مسار العرض، والأول وحده يمرّ على تنفيذٍ
 *    يستبدل كل رقم بنصّ ثابت.
 *  ② تمرير `0` في فرع الغياب **يفشل التحقّق** — لا يعتمد على انتباه كاتب.
 *  ③ `isSimulation` غائبًا يُسقط الوثيقة — لا افتراضي يحوّل النسيان إلى
 *    ادّعاء بأن الأرقام حيّة.
 */
import { describe, expect, it } from "vitest";
import {
  ABSENT_DATE_AR,
  CHART_TYPES,
  LocalizedTextSchema,
  MeasureSchema,
  REPORT_TONES,
  REPORT_TONE_META,
  ReportBlockSchema,
  ReportDocumentSchema,
  SIMULATION_NOTICE,
  UNMEASURED_AR,
  UNMEASURED_EN,
  cellText,
  collectBlocks,
  disclosureLine,
  flattenBlocks,
  formatDate,
  formatMeasure,
  fromNullable,
  isMeasured,
  kpiCells,
  measured,
  measurementCoverage,
  parseReportDocument,
  regionLabel,
  sumMeasures,
  tableHeaders,
  tableMatrix,
  tableRows,
  tableWidths,
  unmeasured,
  type ReportDocumentInput,
  type ReportKpiGridBlock,
  type ReportTableBlock,
} from "./report-model";

const AR_EN = (ar: string, en: string) => ({ ar, en });

/** وثيقة صالحة صغيرة — كل اختبارٍ يشوّه نسخةً منها. */
function baseDocument(): ReportDocumentInput {
  return {
    id: "rep-exec-2026-08",
    title: AR_EN("التقرير التنفيذي للأمن الصناعي", "Industrial Security Executive Report"),
    subtitle: AR_EN("نافذة ٣٠ يومًا", "30-day window"),
    period: {
      fromIso: "2026-07-10T00:00:00.000Z",
      toIso: "2026-08-09T00:00:00.000Z",
      label: AR_EN("١٠ يوليو — ٩ أغسطس ٢٠٢٦", "10 Jul — 9 Aug 2026"),
      granularity: "month",
    },
    region: "western",
    isSimulation: true,
    generatedAtIso: "2026-08-09T06:00:00.000Z",
    scope: "executive_summary",
    sections: [
      {
        id: "sec-overview",
        title: AR_EN("النظرة التنفيذية", "Executive Overview"),
        blocks: [
          {
            kind: "prose",
            id: "p-1",
            paragraphs: [
              AR_EN(
                "انخفض زمن الاستجابة مع ثبات حجم البلاغات.",
                "Response time fell at flat volume.",
              ),
            ],
          },
          {
            kind: "kpi-grid",
            id: "kpi-1",
            columns: 3,
            items: [
              {
                id: "k-open",
                label: AR_EN("بلاغات مفتوحة", "Open incidents"),
                measure: measured(0),
                tone: "success",
              },
              {
                id: "k-mttr",
                label: AR_EN("متوسط زمن الإصلاح", "MTTR"),
                measure: unmeasured(
                  AR_EN("لا بلاغ مغلق في النافذة", "No closed incident in window"),
                ),
                unit: AR_EN("دقيقة", "min"),
              },
            ],
          },
        ],
      },
      {
        id: "sec-detail",
        title: AR_EN("التفصيل", "Detail"),
        blocks: [
          {
            kind: "table",
            id: "tbl-inc",
            title: AR_EN("البلاغات", "Incidents"),
            columns: [
              { id: "ref", header: AR_EN("المرجع", "Ref"), type: "text", widthWeight: 1 },
              {
                id: "resp",
                header: AR_EN("الاستجابة", "Response"),
                type: "measure",
                unit: AR_EN("دقيقة", "min"),
                widthWeight: 1,
              },
              { id: "at", header: AR_EN("وقت البلاغ", "Reported"), type: "date", widthWeight: 2 },
              { id: "st", header: AR_EN("الحالة", "Status"), type: "status", widthWeight: 1 },
            ],
            rows: [
              {
                id: "r1",
                cells: [
                  { type: "text", value: AR_EN("بلاغ-١٠١", "INC-101") },
                  { type: "measure", measure: measured(12) },
                  { type: "date", iso: "2026-08-01T09:30:00.000Z" },
                  { type: "status", tone: "danger", label: AR_EN("مفتوح", "Open") },
                ],
              },
              {
                id: "r2",
                cells: [
                  { type: "text", value: AR_EN("بلاغ-١٠٢", "INC-102") },
                  { type: "measure", measure: unmeasured() },
                  { type: "date", iso: null },
                  { type: "status", tone: "warning", label: AR_EN("قيد المراجعة", "Under review") },
                ],
              },
            ],
          },
          {
            kind: "chart",
            id: "ch-trend",
            chartType: "line",
            title: AR_EN("الاتجاه الزمني", "Trend"),
            categories: [AR_EN("الأحد", "Sun"), AR_EN("الاثنين", "Mon"), AR_EN("الثلاثاء", "Tue")],
            series: [
              {
                id: "s-inc",
                label: AR_EN("البلاغات", "Incidents"),
                points: [measured(4), measured(0), unmeasured()],
                accent: "cyan",
              },
            ],
            axisX: { title: AR_EN("اليوم", "Day") },
            axisY: { title: AR_EN("العدد", "Count"), min: 0 },
          },
          {
            kind: "figure",
            id: "fig-map",
            caption: AR_EN("مخطّط المواقع", "Site diagram"),
            alt: AR_EN("مخطّط يوضّح المواقع الأربعة", "Diagram of the four sites"),
            source: {
              type: "vector",
              viewBox: "0 0 24 24",
              paths: [{ d: "M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z", stroke: "currentColor" }],
            },
          },
          {
            kind: "callout",
            id: "cal-1",
            tone: "warning",
            title: AR_EN("تنبيه", "Notice"),
            body: AR_EN("ثلاثة تصاريح تنتهي غدًا.", "Three permits expire tomorrow."),
          },
        ],
      },
    ],
  };
}

/* ───────────────────── ① المادة ٢٧ — الصفر ليس غيابًا ────────────────── */

describe("المادة ٢٧ — الصدق العددي", () => {
  it("الغياب يُقرأ «لم يُقَس» بالعربية و«Not measured» بالإنجليزية", () => {
    const m = MeasureSchema.parse(unmeasured());
    expect(m.value).toBeNull();
    expect(formatMeasure(m, "ar")).toBe(UNMEASURED_AR);
    expect(formatMeasure(m, "ar")).toBe("لم يُقَس");
    expect(formatMeasure(m, "en")).toBe(UNMEASURED_EN);
  });

  it("الوحدة لا تُلحق بالغياب — «لم يُقَس دقيقة» جملة كاذبة", () => {
    const out = formatMeasure(unmeasured(), "ar", { unit: AR_EN("دقيقة", "min"), percent: true });
    expect(out).toBe(UNMEASURED_AR);
    expect(out).not.toContain("%");
    expect(out).not.toContain("دقيقة");
  });

  it("صفرٌ مقيس يبقى صفرًا ولا ينقلب «لم يُقَس»", () => {
    // هذا هو الاختبار الذي يسقط على تنفيذٍ يعامل `!value` معاملة الغياب.
    const zero = measured(0);
    expect(formatMeasure(zero, "ar")).toBe("0");
    expect(formatMeasure(zero, "en")).toBe("0");
    expect(formatMeasure(zero, "ar")).not.toBe(UNMEASURED_AR);
    expect(isMeasured(zero)).toBe(true);
  });

  it("تمرير صفرٍ في فرع الغياب يفشل التحقّق — لا يعتمد على انتباه الكاتب", () => {
    const forged = { state: "unmeasured", value: 0 };
    expect(MeasureSchema.safeParse(forged).success).toBe(false);
  });

  it("نصّ الغياب مقفل — لا «—» ولا «٠» ولا «غير متوفر» بديلًا عنه", () => {
    for (const forgedLabel of ["—", "٠", "0", "غير متوفر", ""]) {
      const res = MeasureSchema.safeParse({
        state: "unmeasured",
        value: null,
        unmeasuredLabelAr: forgedLabel,
      });
      expect(res.success).toBe(false);
    }
  });

  it("النصّ يُسافر داخل البيانات فلا يحتاج المولّد ثابتًا خارجيًّا", () => {
    const m = MeasureSchema.parse({ state: "unmeasured" });
    expect(m).toMatchObject({ unmeasuredLabelAr: UNMEASURED_AR, unmeasuredLabelEn: UNMEASURED_EN });
  });

  it("fromNullable جسرٌ أمين: 0 قياس، وnull/undefined/NaN غياب", () => {
    expect(fromNullable(0)).toEqual({ state: "measured", value: 0 });
    expect(fromNullable(87)).toEqual({ state: "measured", value: 87 });
    expect(fromNullable(null).state).toBe("unmeasured");
    expect(fromNullable(undefined).state).toBe("unmeasured");
    expect(fromNullable(Number.NaN).state).toBe("unmeasured");
    expect(fromNullable(Number.POSITIVE_INFINITY).state).toBe("unmeasured");
  });

  it("مجموع الغيابات غيابٌ لا صفر؛ ومجموع أصفارٍ مقيسة صفرٌ مقيس", () => {
    expect(sumMeasures([unmeasured(), unmeasured()]).state).toBe("unmeasured");
    expect(sumMeasures([measured(0), measured(0)])).toEqual({ state: "measured", value: 0 });
    expect(sumMeasures([measured(3), unmeasured(), measured(4)])).toEqual({
      state: "measured",
      value: 7,
    });
    expect(sumMeasures([]).state).toBe("unmeasured");
  });

  it("التاريخ الغائب «—» لا «1970-01-01» — الصفر الزمني كالصفر العددي", () => {
    expect(formatDate(null, "ar")).toBe(ABSENT_DATE_AR);
    expect(formatDate(null, "ar")).not.toContain("1970");
    expect(formatDate("2026-08-01T09:30:00.000Z", "ar")).toBe("2026-08-01 09:30");
  });

  it("المنازل العشرية والنسبة تُطبَّق على المقيس وحده", () => {
    expect(formatMeasure(measured(87.456), "ar", { digits: 1 })).toBe("87.5");
    expect(formatMeasure(measured(87), "en", { percent: true })).toBe("87%");
    expect(formatMeasure(measured(12), "ar", { unit: AR_EN("دقيقة", "min") })).toBe("12 دقيقة");
  });
});

/* ─────────────────── ② المحاكاة إلزامية لا اختيارية ──────────────────── */

describe("وسم المحاكاة إلزامي", () => {
  it("وثيقة بلا isSimulation لا تُبنى", () => {
    const doc = baseDocument() as Record<string, unknown>;
    delete doc.isSimulation;
    const res = ReportDocumentSchema.safeParse(doc);
    expect(res.success).toBe(false);
    expect(JSON.stringify(res.error?.issues)).toContain("isSimulation");
  });

  it("لا قيمة افتراضية تُملأ صامتة — false يُكتب صراحةً ويبقى false", () => {
    const live = parseReportDocument({ ...baseDocument(), isSimulation: false });
    expect(live.isSimulation).toBe(false);
    expect(disclosureLine(live, "ar")).not.toContain("is_simulation = true");
  });

  it("سطر الإفصاح يعلن المحاكاة بنصّ الذيل نفسه المستعمل في التقارير", () => {
    const doc = parseReportDocument(baseDocument());
    expect(doc.isSimulation).toBe(true);
    expect(disclosureLine(doc, "ar")).toContain(SIMULATION_NOTICE.ar);
    expect(disclosureLine(doc, "ar")).toContain("is_simulation = true");
    expect(disclosureLine(doc, "en")).toContain("is_simulation = true");
    expect(disclosureLine(doc, "ar")).toContain("سرّي");
  });
});

/* ────────────────────── ③ ثنائية اللغة على كل نصّ ────────────────────── */

describe("ثنائية اللغة إلزامية", () => {
  it("النصّ بلا إنجليزية أو بلا عربية مرفوض، والفراغ ليس نصًّا", () => {
    expect(LocalizedTextSchema.safeParse({ ar: "عنوان" }).success).toBe(false);
    expect(LocalizedTextSchema.safeParse({ en: "Title" }).success).toBe(false);
    expect(LocalizedTextSchema.safeParse({ ar: "عنوان", en: "   " }).success).toBe(false);
    expect(LocalizedTextSchema.safeParse({ ar: "", en: "Title" }).success).toBe(false);
    expect(LocalizedTextSchema.safeParse({ ar: "عنوان", en: "Title" }).success).toBe(true);
  });

  it("عنوان الوثيقة بلا إنجليزية يُسقط الوثيقة كلها", () => {
    const doc = baseDocument();
    (doc as { title: unknown }).title = { ar: "تقرير" };
    expect(ReportDocumentSchema.safeParse(doc).success).toBe(false);
  });
});

/* ───────────────────────────── النغمات ───────────────────────────────── */

describe("النغمة ليست لونًا وحده", () => {
  it("خطر وتحذير يختلفان في الكلمة وفي الشكل لا في اللون فقط", () => {
    expect(REPORT_TONE_META.danger.label.ar).toBe("خطر");
    expect(REPORT_TONE_META.warning.label.ar).toBe("تحذير");
    expect(REPORT_TONE_META.danger.label.ar).not.toBe(REPORT_TONE_META.warning.label.ar);
    expect(REPORT_TONE_META.danger.label.en).not.toBe(REPORT_TONE_META.warning.label.en);
    // الأشكال بعرف لوحات السلامة: مثمّن = خطر · مثلث = تحذير · دائرة = سليم.
    expect(REPORT_TONE_META.danger.shape).toBe("octagon");
    expect(REPORT_TONE_META.warning.shape).toBe("triangle");
    expect(REPORT_TONE_META.success.shape).toBe("circle");
  });

  it("كل نغمة تحمل كلمة وشكلًا — لا نغمة صامتة", () => {
    for (const tone of REPORT_TONES) {
      expect(REPORT_TONE_META[tone].label.ar.length).toBeGreaterThan(0);
      expect(REPORT_TONE_META[tone].label.en.length).toBeGreaterThan(0);
      expect(REPORT_TONE_META[tone].shape).toBeTruthy();
    }
    const shapes = REPORT_TONES.map((tone) => REPORT_TONE_META[tone].shape);
    expect(new Set(shapes).size).toBe(REPORT_TONES.length);
  });

  it("خلية الحالة تُلزم بنصّ إلى جانب النغمة", () => {
    const block = {
      kind: "table",
      id: "t",
      title: AR_EN("جدول", "Table"),
      columns: [{ id: "st", header: AR_EN("الحالة", "Status"), type: "status" }],
      rows: [{ id: "r", cells: [{ type: "status", tone: "danger" }] }],
    };
    expect(ReportBlockSchema.safeParse(block).success).toBe(false);
  });
});

/* ───────────────────────────── الجداول ───────────────────────────────── */

describe("عقد الجدول", () => {
  const tableOf = (doc = parseReportDocument(baseDocument())) =>
    collectBlocks(doc, "table")[0].block as ReportTableBlock;

  it("نوع الخلية يجب أن يطابق نوع عمودها", () => {
    const doc = baseDocument();
    const table = doc.sections[1].blocks[0] as { rows: Array<{ cells: unknown[] }> };
    table.rows[0].cells[1] = { type: "text", value: AR_EN("سريع", "Fast") };
    const res = ReportDocumentSchema.safeParse(doc);
    expect(res.success).toBe(false);
    expect(JSON.stringify(res.error?.issues)).toContain("measure");
  });

  it("عدد الخلايا يجب أن يطابق عدد الأعمدة", () => {
    const doc = baseDocument();
    const table = doc.sections[1].blocks[0] as { rows: Array<{ cells: unknown[] }> };
    table.rows[0].cells.pop();
    expect(ReportDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("معرّفات الأعمدة لا تتكرّر", () => {
    const doc = baseDocument();
    const table = doc.sections[1].blocks[0] as { columns: Array<{ id: string }> };
    table.columns[1].id = table.columns[0].id;
    expect(ReportDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("الترويسة تحمل الوحدة، والخلية لا تكرّرها", () => {
    const table = tableOf();
    expect(tableHeaders(table, "ar")).toEqual([
      "المرجع",
      "الاستجابة (دقيقة)",
      "وقت البلاغ",
      "الحالة",
    ]);
    expect(tableHeaders(table, "en")[1]).toBe("Response (min)");
    expect(cellText(table.rows[0].cells[1], table.columns[1], "ar")).toBe("12");
  });

  it("صفوف نصّية جاهزة للرسم والتصدير، والغياب فيها «لم يُقَس» لا صفر", () => {
    const table = tableOf();
    const rows = tableRows(table, "ar");
    expect(rows[0]).toEqual(["بلاغ-١٠١", "12", "2026-08-01 09:30", "مفتوح"]);
    expect(rows[1]).toEqual(["بلاغ-١٠٢", UNMEASURED_AR, "—", "قيد المراجعة"]);
    expect(rows[1]).not.toContain("0");
  });

  it("tableWidths يعطي معامل العرض النسبي كما يبتلعه مولّد PDF", () => {
    expect(tableWidths(tableOf())).toEqual([1, 1, 2, 1]);
  });

  it("tableMatrix يبدأ بالترويسة ويلحق الإجماليات إن وُجدت", () => {
    const matrix = tableMatrix(tableOf(), "en");
    expect(matrix).toHaveLength(3);
    expect(matrix[0][0]).toBe("Ref");
  });

  it("الجدول الفارغ يحمل نصّ فراغ ثنائي اللغة افتراضًا", () => {
    const table = tableOf();
    expect(table.emptyText.ar.length).toBeGreaterThan(0);
    expect(table.emptyText.en.length).toBeGreaterThan(0);
  });

  it("المفتاح الغريب مرفوض — الحقل المكتوب خطأً لا يُبتلع صامتًا", () => {
    const doc = baseDocument();
    (doc.sections[1].blocks[0] as Record<string, unknown>).titel = AR_EN("خطأ", "Typo");
    expect(ReportDocumentSchema.safeParse(doc).success).toBe(false);
  });
});

/* ─────────────────────────── الرسوم البيانية ─────────────────────────── */

describe("عقد الرسوم البيانية", () => {
  const chartBase = {
    kind: "chart" as const,
    id: "c1",
    title: AR_EN("رسم", "Chart"),
    categories: [AR_EN("أ", "A"), AR_EN("ب", "B")],
    series: [{ id: "s1", label: AR_EN("سلسلة", "Series"), points: [measured(1), measured(2)] }],
  };

  it("الأنواع الستة معتمدة", () => {
    expect([...CHART_TYPES]).toEqual(["line", "bar", "area", "donut", "gauge", "stacked-bar"]);
  });

  it("نقاط السلسلة تُحاذي الفئات نقطةً بفئة", () => {
    const bad = {
      ...chartBase,
      chartType: "bar",
      series: [{ ...chartBase.series[0], points: [measured(1)] }],
    };
    expect(ReportBlockSchema.safeParse(bad).success).toBe(false);
    expect(ReportBlockSchema.safeParse({ ...chartBase, chartType: "bar" }).success).toBe(true);
  });

  it("الرسم الفئوي بلا فئات مرفوض", () => {
    const bad = {
      ...chartBase,
      chartType: "line",
      categories: [],
      series: [{ ...chartBase.series[0], points: [] }],
    };
    expect(ReportBlockSchema.safeParse(bad).success).toBe(false);
  });

  it("معرّفات السلاسل لا تتكرّر", () => {
    const bad = {
      ...chartBase,
      chartType: "line",
      series: [chartBase.series[0], { ...chartBase.series[0] }],
    };
    expect(ReportBlockSchema.safeParse(bad).success).toBe(false);
  });

  it("الأعمدة المكدّسة تتطلّب سلسلتين فأكثر", () => {
    expect(ReportBlockSchema.safeParse({ ...chartBase, chartType: "stacked-bar" }).success).toBe(
      false,
    );
    const ok = {
      ...chartBase,
      chartType: "stacked-bar",
      series: [chartBase.series[0], { ...chartBase.series[0], id: "s2" }],
    };
    expect(ReportBlockSchema.safeParse(ok).success).toBe(true);
  });

  it("الحلقة سلسلة واحدة وشرائحها غير سالبة", () => {
    const twoSeries = {
      ...chartBase,
      chartType: "donut",
      series: [chartBase.series[0], { ...chartBase.series[0], id: "s2" }],
    };
    expect(ReportBlockSchema.safeParse(twoSeries).success).toBe(false);
    const negative = {
      ...chartBase,
      chartType: "donut",
      series: [{ ...chartBase.series[0], points: [measured(-1), measured(2)] }],
    };
    expect(ReportBlockSchema.safeParse(negative).success).toBe(false);
  });

  it("الحلقة تحتمل شريحة غير مقيسة — ولا تُستبدل بصفر يرسم قطاعًا وهميًّا", () => {
    const donut = {
      ...chartBase,
      chartType: "donut",
      series: [{ ...chartBase.series[0], points: [measured(3), unmeasured()] }],
    };
    const parsed = ReportBlockSchema.parse(donut);
    expect(parsed.kind).toBe("chart");
    if (parsed.kind === "chart") {
      expect(parsed.series[0].points[1].value).toBeNull();
    }
  });

  it("المقياس سلسلة واحدة بنقطة واحدة وحدّين صاعدين", () => {
    const gauge = {
      kind: "chart",
      id: "g",
      chartType: "gauge",
      title: AR_EN("الجاهزية", "Readiness"),
      categories: [],
      series: [{ id: "g1", label: AR_EN("الجاهزية", "Readiness"), points: [measured(82)] }],
      gauge: { min: 0, max: 100, bands: [] },
    };
    expect(ReportBlockSchema.safeParse(gauge).success).toBe(true);
    expect(ReportBlockSchema.safeParse({ ...gauge, gauge: undefined }).success).toBe(false);
    expect(
      ReportBlockSchema.safeParse({ ...gauge, gauge: { min: 100, max: 0, bands: [] } }).success,
    ).toBe(false);
    expect(
      ReportBlockSchema.safeParse({
        ...gauge,
        series: [{ ...gauge.series[0], points: [measured(1), measured(2)] }],
      }).success,
    ).toBe(false);
  });

  it("هدف المقياس قد يكون غير مقيس ولا يُستبدل بصفر", () => {
    const gauge = ReportBlockSchema.parse({
      kind: "chart",
      id: "g",
      chartType: "gauge",
      title: AR_EN("الجاهزية", "Readiness"),
      series: [{ id: "g1", label: AR_EN("الجاهزية", "Readiness"), points: [measured(82)] }],
      gauge: { min: 0, max: 100, target: unmeasured() },
    });
    if (gauge.kind === "chart") expect(gauge.gauge?.target?.value).toBeNull();
  });

  it("المحاور تحمل عناوين ثنائية ووحدات، وحدّاها اختياريان لا null", () => {
    const doc = parseReportDocument(baseDocument());
    const chart = collectBlocks(doc, "chart")[0].block;
    expect(chart.axisX?.title.ar).toBe("اليوم");
    expect(chart.axisX?.title.en).toBe("Day");
    expect(chart.axisY?.min).toBe(0);
    expect(chart.axisX?.min).toBeUndefined();
  });

  it("المحور بعنوان أحادي اللغة مرفوض", () => {
    const bad = { ...chartBase, chartType: "line", axisY: { title: { ar: "العدد" } } };
    expect(ReportBlockSchema.safeParse(bad).success).toBe(false);
  });
});

/* ──────────────────────── الصور والأشكال ─────────────────────────────── */

describe("عقد الصور والأشكال", () => {
  const figure = {
    kind: "figure" as const,
    id: "f",
    caption: AR_EN("شكل", "Figure"),
    alt: AR_EN("وصف الشكل", "Figure description"),
    source: { type: "vector" as const, viewBox: "0 0 24 24", paths: [{ d: "M0 0 L1 1" }] },
  };

  it("البديل النصّي إلزامي — الشكل بلا وصف معدوم لقارئ الشاشة", () => {
    const bad = { ...figure, alt: undefined };
    expect(ReportBlockSchema.safeParse(bad).success).toBe(false);
  });

  it('fill="white" ممنوع — يُكتب currentColor أو رمز لوني', () => {
    const white = {
      ...figure,
      source: { ...figure.source, paths: [{ d: "M0 0 L1 1", fill: "white" }] },
    };
    expect(ReportBlockSchema.safeParse(white).success).toBe(false);
    const hex = {
      ...figure,
      source: { ...figure.source, paths: [{ d: "M0 0 L1 1", fill: "#ffffff" }] },
    };
    expect(ReportBlockSchema.safeParse(hex).success).toBe(false);
    const ok = {
      ...figure,
      source: { ...figure.source, paths: [{ d: "M0 0 L1 1", fill: "currentColor" }] },
    };
    expect(ReportBlockSchema.safeParse(ok).success).toBe(true);
  });

  it("المضيف الخارجي ممنوع في مصدر الصورة", () => {
    const remote = {
      ...figure,
      source: { type: "image", src: "https://cdn.example.com/x.png" },
    };
    expect(ReportBlockSchema.safeParse(remote).success).toBe(false);
    const embedded = {
      ...figure,
      source: { type: "image", src: "data:image/png;base64,iVBORw0KGgo=" },
    };
    expect(ReportBlockSchema.safeParse(embedded).success).toBe(true);
    const local = { ...figure, source: { type: "image", src: "/assets/site-map.png" } };
    expect(ReportBlockSchema.safeParse(local).success).toBe(true);
  });

  it("viewBox بصيغة صحيحة فقط", () => {
    const bad = { ...figure, source: { ...figure.source, viewBox: "big" } };
    expect(ReportBlockSchema.safeParse(bad).success).toBe(false);
  });
});

/* ─────────────────────────── شبكة المؤشرات ───────────────────────────── */

describe("عقد شبكة المؤشرات", () => {
  const kpiBlock = (doc = parseReportDocument(baseDocument())) =>
    collectBlocks(doc, "kpi-grid")[0].block as ReportKpiGridBlock;

  it("المؤشر غير المقيس لا يُلوَّن — «ما لم يُقَس لا يُرسم ولا يُلوَّن»", () => {
    const doc = baseDocument();
    const grid = doc.sections[0].blocks[1] as { items: Array<Record<string, unknown>> };
    grid.items[1].tone = "danger";
    const res = ReportDocumentSchema.safeParse(doc);
    expect(res.success).toBe(false);
    expect(JSON.stringify(res.error?.issues)).toContain("المادة ٢٧");
  });

  it("لا فارق (delta) لمؤشر لم يُقَس", () => {
    const doc = baseDocument();
    const grid = doc.sections[0].blocks[1] as { items: Array<Record<string, unknown>> };
    grid.items[1].delta = { measure: measured(3), direction: "up", betterWhen: "down" };
    expect(ReportDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("المؤشر المقيس بصفر يجوز تلوينه — الصفر قياس", () => {
    const doc = parseReportDocument(baseDocument());
    const first = kpiBlock(doc).items[0];
    expect(first.measure).toEqual({ state: "measured", value: 0 });
    expect(first.tone).toBe("success");
  });

  it("kpiCells تعطي الشكل الذي يبتلعه kpiGrid في builder.server.ts", () => {
    const cells = kpiCells(kpiBlock(), "ar");
    expect(cells[0]).toEqual({ label: "بلاغات مفتوحة", value: "0", tone: "success" });
    expect(cells[1]).toEqual({ label: "متوسط زمن الإصلاح", value: UNMEASURED_AR, tone: "default" });
    expect(kpiCells(kpiBlock(), "en")[1].value).toBe(UNMEASURED_EN);
  });

  it("معرّفات المؤشرات لا تتكرّر", () => {
    const doc = baseDocument();
    const grid = doc.sections[0].blocks[1] as { items: Array<Record<string, unknown>> };
    grid.items[1].id = grid.items[0].id;
    expect(ReportDocumentSchema.safeParse(doc).success).toBe(false);
  });
});

/* ──────────────────────────── الوثيقة كلّها ──────────────────────────── */

describe("عقد الوثيقة", () => {
  it("الوثيقة المرجعية تجتاز التحقّق وتحمل ستّة أنواع كتل", () => {
    const doc = parseReportDocument(baseDocument());
    const kinds = new Set(flattenBlocks(doc).map((e) => e.block.kind));
    expect(kinds).toEqual(new Set(["prose", "kpi-grid", "table", "chart", "figure", "callout"]));
  });

  it("تقرير بلا أقسام أو قسم بلا كتل مرفوض", () => {
    expect(ReportDocumentSchema.safeParse({ ...baseDocument(), sections: [] }).success).toBe(false);
    const doc = baseDocument();
    doc.sections[0].blocks = [];
    expect(ReportDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("معرّفات الأقسام لا تتكرّر", () => {
    const doc = baseDocument();
    doc.sections[1].id = doc.sections[0].id;
    expect(ReportDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("بداية الفترة بعد نهايتها مرفوضة", () => {
    const doc = baseDocument();
    doc.period = { ...doc.period, fromIso: "2026-09-01T00:00:00.000Z" };
    expect(ReportDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("المنطقة من regions.ts وحدها، و«all» تعني الأربع مجتمعة", () => {
    const doc = parseReportDocument(baseDocument());
    expect(regionLabel(doc.region, "ar")).toBe("الأمن الصناعي — المنطقة الغربية");
    expect(regionLabel(doc.region, "en")).toBe("Industrial Security — Western Region");
    expect(regionLabel("all", "ar")).toBe("كل المناطق");
    expect(ReportDocumentSchema.safeParse({ ...baseDocument(), region: "northern" }).success).toBe(
      false,
    );
    expect(ReportDocumentSchema.safeParse({ ...baseDocument(), region: "all" }).success).toBe(true);
  });

  it("النطاق مربوط بـreport-scope.ts القائم لا بقائمة ثانية", () => {
    expect(parseReportDocument(baseDocument()).scope).toBe("executive_summary");
    expect(ReportDocumentSchema.safeParse({ ...baseDocument(), scope: "invented" }).success).toBe(
      false,
    );
  });

  it("measurementCoverage تحصي ما لم يُقَس بلا خلطه بالصفر", () => {
    const cov = measurementCoverage(parseReportDocument(baseDocument()));
    // ٢ مؤشر + ٣ نقاط رسم + ٢ خلية قياس = ٧ قياسات، منها ٣ غير مقيسة.
    expect(cov.total).toBe(7);
    expect(cov.unmeasured).toBe(3);
    expect(cov.measured).toBe(4);
    expect(cov.measured + cov.unmeasured).toBe(cov.total);
  });
});

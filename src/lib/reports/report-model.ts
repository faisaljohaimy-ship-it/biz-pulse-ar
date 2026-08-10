/**
 * نموذج التقرير الغنيّ — العقد الوحيد لما يحمله تقرير سَدِيد المفصَّل.
 *
 * الملف **معزول عن أي مولّد**: لا pdf-lib ولا xlsx ولا React. يصف *ماذا*
 * يقول التقرير، ويترك *كيف يُرسم* لـ`daily-ops-pdf.ts` و`bi-pdf.ts`
 * و`builder.server.ts`. هذا الفصل هو ما يجعل التقرير الواحد يخرج PDF
 * وExcel وHTML من مصدر واحد بلا ازدواج أرقام.
 *
 * أربعة ثوابت مبنيّة في الأنواع نفسها، لا في تعليقٍ يُنسى:
 *
 * ① **المادة ٢٧ — الصدق العددي.** القيمة العددية ليست `number | null`
 *    سائبة، بل اتّحاد مميَّز على `state`. فرع الغياب يعلن `value: z.null()`
 *    نصًّا، فتمرير `0` مكان الغياب **يفشل وقت التشغيل ووقت الترجمة معًا** —
 *    لا يعتمد على انتباه الكاتب. ونصّ «لم يُقَس» مثبَّت `z.literal` فلا
 *    يُستبدل بـ«—» ولا بـ«٠» ولا بـ«غير متوفر»، ويُسافر **داخل البيانات**
 *    حتى لا يحتاج المولّد إلى استيراد ثابت (وهذا ما كرّر النصّ اليوم:
 *    `bi-pdf.ts` يكتب «لم يُقَس» و`builder.server.ts` يكتب
 *    «Not measured»، كلٌّ بنسخته).
 *
 * ② **المحاكاة لا تُنسى.** `isSimulation` حقل **إلزامي بلا قيمة افتراضية**:
 *    وثيقة بلا إفصاح لا تُبنى أصلًا. لو كان `.default(false)` لصار النسيان
 *    يُنتج تقريرًا يدّعي أنه حيّ.
 *
 * ③ **ثنائية اللغة إلزامية.** كل نصّ ظاهر `{ ar, en }` وكلاهما غير فارغ.
 *
 * ④ **اللون ليس حاملًا وحيدًا للمعنى** (WCAG 2.2 §1.4.1، ومادة النغمات):
 *    كل نغمة تحمل كلمة وشكلًا في `REPORT_TONE_META`، وخلية الحالة تُلزم
 *    بنصٍّ إلى جانب النغمة. وما لم يُقَس لا يُلوَّن: مؤشّر غير مقيس مع
 *    نغمة غير محايدة يُرفض.
 *
 * الأرقام تبقى **لاتينية** في نصوص العرض عمدًا — مسار الرسم في PDF يمرّر
 * أرقام ASCII عبر Helvetica ولا يسلّمها لخوارزمية bidi في fontkit (انظر
 * صدر `arabic-text.ts`). تعريب الأرقام مسؤولية سطح HTML وحده إن أراد.
 */

import { z } from "zod";
import { REGIONS, getRegion, type RegionId } from "@/lib/regions";
import { DAILY_REPORT_SCOPES } from "@/lib/reports/report-scope";
import { sumMeasured } from "@/lib/exec/measured-sum";

/* ────────────────────────────── نصّ ثنائي اللغة ───────────────────────── */

/** نصّ ظاهر للمستخدم. العربية أولًا، والإنجليزية إلزامية معها لا بديلًا. */
export const LocalizedTextSchema = z
  .object({
    ar: z.string().trim().min(1, "النصّ العربي إلزامي"),
    en: z.string().trim().min(1, "English text is required"),
  })
  .strict();

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export type ReportLang = "ar" | "en";

/** يقرأ الوجه المطلوب من نصٍّ ثنائي. */
export function t(text: LocalizedText, lang: ReportLang): string {
  return lang === "ar" ? text.ar : text.en;
}

/* ───────────────────────── المادة ٢٧ — القيمة المقيسة ─────────────────── */

/**
 * نصّ الغياب الموحَّد. مثبَّت هنا ومُقفَل بـ`z.literal` في المخطط، فلا يتسرّب
 * إلى التقارير مرادفٌ يوحي بقياسٍ لم يقع.
 */
export const UNMEASURED_AR = "لم يُقَس";
export const UNMEASURED_EN = "Not measured";

/** غياب **زمنيّ** لا عدديّ (تاريخ لم يُسجَّل). ليس قياسًا، فلا يُقرأ «لم يُقَس». */
export const ABSENT_DATE_AR = "—";
export const ABSENT_DATE_EN = "—";

const MeasuredSchema = z
  .object({
    state: z.literal("measured"),
    /** صفرٌ هنا **قياسٌ صحيح** ويبقى صفرًا — الغياب له فرعه الخاص. */
    value: z.number().finite(),
  })
  .strict();

const UnmeasuredSchema = z
  .object({
    state: z.literal("unmeasured"),
    /**
     * `z.null()` نصًّا لا `z.number().nullable()`: تمرير `0` هنا خطأ تحقّق،
     * وهذا هو المقصود بـ«يستحيل تمرير صفرٍ مكان غياب».
     */
    value: z.null().default(null),
    unmeasuredLabelAr: z.literal(UNMEASURED_AR).default(UNMEASURED_AR),
    unmeasuredLabelEn: z.literal(UNMEASURED_EN).default(UNMEASURED_EN),
    /** سبب الغياب إن عُرف («لا عيّنة في النافذة»)، لا يُغني عن الوسم. */
    reason: LocalizedTextSchema.optional(),
  })
  .strict();

export const MeasureSchema = z.discriminatedUnion("state", [MeasuredSchema, UnmeasuredSchema]);

export type Measure = z.infer<typeof MeasureSchema>;
export type MeasureInput = z.input<typeof MeasureSchema>;
export type MeasuredValue = z.infer<typeof MeasuredSchema>;

/** بانٍ للقيمة المقيسة. `measured(0)` صفرٌ حقيقي ولا يُقرأ غيابًا. */
export function measured(value: number): Measure {
  return { state: "measured", value };
}

/** بانٍ للغياب — يحمل نصّه معه فلا يحتاج المستهلك إلى ثابتٍ خارجي. */
export function unmeasured(reason?: LocalizedText): Measure {
  return {
    state: "unmeasured",
    value: null,
    unmeasuredLabelAr: UNMEASURED_AR,
    unmeasuredLabelEn: UNMEASURED_EN,
    ...(reason ? { reason } : {}),
  };
}

export function isMeasured(m: Measure): m is MeasuredValue {
  return m.state === "measured";
}

/**
 * جسر إلى ما هو قائم: `ExecKpis` و`BiPdfInput.sla.pct` وكل حقول
 * `number | null` في `snapshot.server.ts` تعبر من هنا إلى النموذج بلا
 * فقدان معنى. `0` يبقى قياسًا، و`null`/`undefined`/`NaN` غياب.
 */
export function fromNullable(v: number | null | undefined, reason?: LocalizedText): Measure {
  return typeof v === "number" && Number.isFinite(v) ? measured(v) : unmeasured(reason);
}

/**
 * جمعٌ يحفظ الفرق بين الصفر والغياب — يستعمل `sumMeasured` القائم بدل أن
 * يعيد قاعدته. مجموعُ غياباتٍ كلّها غياب، لا صفر.
 */
export function sumMeasures(measures: ReadonlyArray<Measure>, reason?: LocalizedText): Measure {
  return fromNullable(
    sumMeasured(measures.map((m) => (m.state === "measured" ? m.value : null))),
    reason,
  );
}

export type FormatMeasureOptions = {
  /** وحدة تُلحق بالقيمة المقيسة فقط — الغياب لا يأخذ وحدة. */
  unit?: LocalizedText;
  /** عدد المنازل العشرية. غير محدَّد = كما هي. */
  digits?: number;
  /** يُلحق `%` (لاتينية عمدًا: ترسمها Helvetica في مسار PDF). */
  percent?: boolean;
};

/**
 * نقطة الاختناق الوحيدة لعرض قيمة. وجودها يجعل قاعدة المادة ٢٧ ميكانيكية:
 * لا موضع نداءٍ يستطيع طباعة `?? 0` لأن فرع الغياب هنا لا هناك.
 */
export function formatMeasure(
  m: Measure,
  lang: ReportLang,
  opts: FormatMeasureOptions = {},
): string {
  if (m.state === "unmeasured") {
    return lang === "ar" ? m.unmeasuredLabelAr : m.unmeasuredLabelEn;
  }
  const n = opts.digits === undefined ? m.value : Number(m.value.toFixed(opts.digits));
  const base = opts.percent ? `${n}%` : String(n);
  return opts.unit ? `${base} ${t(opts.unit, lang)}` : base;
}

/** تاريخ للعرض. الغياب «—» لا «1970-01-01» — الصفر الزمني ككل صفرٍ مُختلَق. */
export function formatDate(iso: string | null, lang: ReportLang): string {
  if (!iso) return lang === "ar" ? ABSENT_DATE_AR : ABSENT_DATE_EN;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return lang === "ar" ? ABSENT_DATE_AR : ABSENT_DATE_EN;
  return d.toISOString().slice(0, 16).replace("T", " ");
}

/* ─────────────────────────────── النغمات ─────────────────────────────── */

/**
 * مفردات النغمة — مطابقة عمدًا لـ`StatTone` في `sec-shell.tsx` حتى لا
 * تنشأ لغة ثانية للألوان. لا يُستورد المكوّن هنا: النموذج يجب أن يظلّ
 * خاليًا من React ليعمل على الخادم وفي مولّد PDF.
 */
export const REPORT_TONES = ["default", "success", "warning", "danger"] as const;
export type ReportTone = (typeof REPORT_TONES)[number];
export const ReportToneSchema = z.enum(REPORT_TONES);

/**
 * كلمة وشكل لكل نغمة. اللون وحده لا يكفي (WCAG 2.2 §1.4.1): الزوج
 * أحمر/كهرماني هو ما يطمسه عمى الألوان الأحمر-الأخضر على لوحة وظيفتها
 * الإنذار، فالأشكال تتبع عرف لوحات السلامة.
 */
export const REPORT_TONE_META: Record<
  ReportTone,
  { label: LocalizedText; shape: "square" | "circle" | "triangle" | "octagon" }
> = {
  default: { label: { ar: "محايد", en: "Neutral" }, shape: "square" },
  success: { label: { ar: "سليم", en: "Healthy" }, shape: "circle" },
  warning: { label: { ar: "تحذير", en: "Warning" }, shape: "triangle" },
  danger: { label: { ar: "خطر", en: "Danger" }, shape: "octagon" },
};

/** رمز لوني مجرّد — لا سداسي خام في البيانات؛ المولّد يترجمه إلى لوحته. */
export const ACCENT_TOKENS = ["emerald", "cyan", "amber", "red", "slate", "violet"] as const;
export type AccentToken = (typeof ACCENT_TOKENS)[number];

/* ─────────────────────────────── الجداول ─────────────────────────────── */

export const TABLE_CELL_TYPES = ["text", "measure", "date", "status"] as const;
export type TableCellType = (typeof TABLE_CELL_TYPES)[number];

export const ReportTableColumnSchema = z
  .object({
    id: z.string().min(1),
    header: LocalizedTextSchema,
    type: z.enum(TABLE_CELL_TYPES),
    align: z.enum(["start", "center", "end"]).default("start"),
    /** وحدة العمود — تُعرض في الترويسة لا في كل خلية. */
    unit: LocalizedTextSchema.optional(),
    /** وزن العرض النسبي؛ يغذّي معامل `widths` في `builder.server.ts`. */
    widthWeight: z.number().positive().finite().default(1),
  })
  .strict();

export type ReportTableColumn = z.infer<typeof ReportTableColumnSchema>;

const TextCellSchema = z.object({ type: z.literal("text"), value: LocalizedTextSchema }).strict();
const MeasureCellSchema = z.object({ type: z.literal("measure"), measure: MeasureSchema }).strict();
const DateCellSchema = z
  .object({
    type: z.literal("date"),
    /** `null` = لا تاريخ. غيابٌ زمنيّ لا قياس — يُعرض «—». */
    iso: z.string().datetime().nullable(),
  })
  .strict();
const StatusCellSchema = z
  .object({
    type: z.literal("status"),
    tone: ReportToneSchema,
    /** إلزامي: النغمة لونٌ، والكلمة هي ما يقرأه من لا يميّز اللون. */
    label: LocalizedTextSchema,
  })
  .strict();

export const ReportTableCellSchema = z.discriminatedUnion("type", [
  TextCellSchema,
  MeasureCellSchema,
  DateCellSchema,
  StatusCellSchema,
]);

export type ReportTableCell = z.infer<typeof ReportTableCellSchema>;

export const ReportTableRowSchema = z
  .object({
    id: z.string().min(1),
    cells: z.array(ReportTableCellSchema).min(1),
    tone: ReportToneSchema.optional(),
  })
  .strict();

export type ReportTableRow = z.infer<typeof ReportTableRowSchema>;

const TableBlockSchema = z
  .object({
    kind: z.literal("table"),
    id: z.string().min(1),
    title: LocalizedTextSchema,
    caption: LocalizedTextSchema.optional(),
    columns: z.array(ReportTableColumnSchema).min(1),
    rows: z.array(ReportTableRowSchema),
    /** صفّ إجماليات اختياري — يخضع لنفس فحص المطابقة. */
    totals: ReportTableRowSchema.optional(),
    /** «بيانات لا تفرغ»: الجدول الفارغ يقول شيئًا، ولا يُترك هيكلًا صامتًا. */
    emptyText: LocalizedTextSchema.default({
      ar: "لا توجد صفوف في النافذة",
      en: "No rows in window",
    }),
  })
  .strict();

/* ──────────────────────────── الرسوم البيانية ────────────────────────── */

export const CHART_TYPES = ["line", "bar", "area", "donut", "gauge", "stacked-bar"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export const ChartAxisSchema = z
  .object({
    title: LocalizedTextSchema,
    unit: LocalizedTextSchema.optional(),
    /**
     * حدّا المحور اختياريان: غيابهما = مقياس تلقائي، وليس «لم يُقَس».
     * لذلك `optional` لا `nullable` — كي لا يزاحم `null` معناه الدستوري.
     */
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  })
  .strict();

export type ChartAxis = z.infer<typeof ChartAxisSchema>;

export const ChartSeriesSchema = z
  .object({
    id: z.string().min(1),
    label: LocalizedTextSchema,
    /** نقاط بمحاذاة `categories` نقطةً بنقطة. الغياب نقطة غير مقيسة لا صفر. */
    points: z.array(MeasureSchema).min(1),
    unit: LocalizedTextSchema.optional(),
    accent: z.enum(ACCENT_TOKENS).optional(),
    tone: ReportToneSchema.optional(),
  })
  .strict();

export type ChartSeries = z.infer<typeof ChartSeriesSchema>;

export const GaugeBandSchema = z
  .object({
    from: z.number().finite(),
    to: z.number().finite(),
    tone: ReportToneSchema,
    label: LocalizedTextSchema,
  })
  .strict()
  .refine((b) => b.from < b.to, { message: "نطاق المقياس يجب أن يكون تصاعديًّا" });

export const GaugeSpecSchema = z
  .object({
    min: z.number().finite(),
    max: z.number().finite(),
    /** الهدف قد يكون غير مقيس — ولا يُستبدل بصفر. */
    target: MeasureSchema.optional(),
    bands: z.array(GaugeBandSchema).default([]),
  })
  .strict()
  .refine((g) => g.min < g.max, { message: "min يجب أن يكون أصغر من max" });

const ChartBlockSchema = z
  .object({
    kind: z.literal("chart"),
    id: z.string().min(1),
    chartType: z.enum(CHART_TYPES),
    title: LocalizedTextSchema,
    caption: LocalizedTextSchema.optional(),
    /** تسميات المحور الفئوي (أو شرائح الحلقة). المقياس لا يحتاجها. */
    categories: z.array(LocalizedTextSchema).default([]),
    series: z.array(ChartSeriesSchema).min(1),
    axisX: ChartAxisSchema.optional(),
    axisY: ChartAxisSchema.optional(),
    /** وحدة القيم إن لم تُحدَّد على السلسلة. */
    valueUnit: LocalizedTextSchema.optional(),
    gauge: GaugeSpecSchema.optional(),
    showLegend: z.boolean().default(true),
  })
  .strict();

/* ────────────────────────── الصور والأشكال ───────────────────────────── */

const ImageSourceSchema = z
  .object({
    type: z.literal("image"),
    /**
     * `data:` مضمَّنة أو مسار محليّ فقط. المضيف الخارجي ممنوع: التقرير
     * يُولَّد في العامل ويُرسل بريدًا ويُؤرشف — والصورة البعيدة تصير 404
     * أو تسريب إحالة.
     */
    src: z
      .string()
      .min(1)
      .refine((s) => /^data:image\/(png|jpeg|svg\+xml);base64,/.test(s) || s.startsWith("/"), {
        message: "المصدر يجب أن يكون data: مضمَّنة أو مسارًا محليًّا يبدأ بـ/",
      }),
    width: z.number().positive().finite().optional(),
    height: z.number().positive().finite().optional(),
  })
  .strict();

const VectorPathSchema = z
  .object({
    /** مسار SVG — يُرسم بـ`drawSvgPath` كما في `daily-ops-pdf.ts`. */
    d: z.string().min(1),
    /** `currentColor` أو رمز لوني. الأبيض الصريح ممنوع (قاعدة الوضعين ٢). */
    stroke: z.union([z.literal("currentColor"), z.enum(ACCENT_TOKENS)]).optional(),
    fill: z.union([z.literal("none"), z.literal("currentColor"), z.enum(ACCENT_TOKENS)]).optional(),
    strokeWidth: z.number().positive().finite().optional(),
  })
  .strict();

const VectorSourceSchema = z
  .object({
    type: z.literal("vector"),
    viewBox: z.string().regex(/^-?\d+(\.\d+)? -?\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?$/, {
      message: "viewBox بصيغة «minX minY width height»",
    }),
    paths: z.array(VectorPathSchema).min(1),
  })
  .strict();

export const FigureSourceSchema = z.discriminatedUnion("type", [
  ImageSourceSchema,
  VectorSourceSchema,
]);

const FigureBlockSchema = z
  .object({
    kind: z.literal("figure"),
    id: z.string().min(1),
    title: LocalizedTextSchema.optional(),
    caption: LocalizedTextSchema,
    /** بديل نصّي إلزامي — الشكل بلا وصف معدوم لقارئ الشاشة. */
    alt: LocalizedTextSchema,
    source: FigureSourceSchema,
  })
  .strict();

/* ─────────────────────────── شبكة المؤشرات ───────────────────────────── */

export const KpiItemSchema = z
  .object({
    id: z.string().min(1),
    label: LocalizedTextSchema,
    measure: MeasureSchema,
    unit: LocalizedTextSchema.optional(),
    percent: z.boolean().default(false),
    tone: ReportToneSchema.default("default"),
    delta: z
      .object({
        measure: MeasureSchema,
        direction: z.enum(["up", "down", "flat"]),
        /** أيّ اتجاه هو التحسّن — بدونه السهم بلا معنى. */
        betterWhen: z.enum(["up", "down"]),
      })
      .strict()
      .optional(),
    note: LocalizedTextSchema.optional(),
  })
  .strict();

export type KpiItem = z.infer<typeof KpiItemSchema>;

const KpiGridBlockSchema = z
  .object({
    kind: z.literal("kpi-grid"),
    id: z.string().min(1),
    title: LocalizedTextSchema.optional(),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
    items: z.array(KpiItemSchema).min(1).max(24),
  })
  .strict();

/* ──────────────────────────── نصّ وتنبيه ─────────────────────────────── */

const ProseBlockSchema = z
  .object({
    kind: z.literal("prose"),
    id: z.string().min(1),
    title: LocalizedTextSchema.optional(),
    paragraphs: z.array(LocalizedTextSchema).min(1),
    emphasis: z.boolean().default(false),
  })
  .strict();

const CalloutBlockSchema = z
  .object({
    kind: z.literal("callout"),
    id: z.string().min(1),
    tone: ReportToneSchema,
    title: LocalizedTextSchema,
    body: LocalizedTextSchema,
  })
  .strict();

/* ──────────────────────────── اتّحاد الكتل ───────────────────────────── */

const ReportBlockUnion = z.discriminatedUnion("kind", [
  ProseBlockSchema,
  TableBlockSchema,
  ChartBlockSchema,
  FigureBlockSchema,
  KpiGridBlockSchema,
  CalloutBlockSchema,
]);

export type ReportBlock = z.infer<typeof ReportBlockUnion>;
export type ReportBlockInput = z.input<typeof ReportBlockUnion>;
export type ReportBlockKind = ReportBlock["kind"];

export type ReportTableBlock = Extract<ReportBlock, { kind: "table" }>;
export type ReportChartBlock = Extract<ReportBlock, { kind: "chart" }>;
export type ReportFigureBlock = Extract<ReportBlock, { kind: "figure" }>;
export type ReportKpiGridBlock = Extract<ReportBlock, { kind: "kpi-grid" }>;
export type ReportProseBlock = Extract<ReportBlock, { kind: "prose" }>;
export type ReportCalloutBlock = Extract<ReportBlock, { kind: "callout" }>;

function checkTableBlock(block: ReportTableBlock, ctx: z.RefinementCtx): void {
  const ids = new Set<string>();
  block.columns.forEach((c, i) => {
    if (ids.has(c.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["columns", i, "id"],
        message: `معرّف عمود مكرّر: ${c.id}`,
      });
    }
    ids.add(c.id);
  });

  const checkRow = (row: ReportTableRow, path: (string | number)[]) => {
    if (row.cells.length !== block.columns.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, "cells"],
        message: `عدد الخلايا ${row.cells.length} لا يطابق عدد الأعمدة ${block.columns.length}`,
      });
      return;
    }
    row.cells.forEach((cell, i) => {
      if (cell.type !== block.columns[i].type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [...path, "cells", i, "type"],
          message: `نوع الخلية «${cell.type}» لا يطابق نوع العمود «${block.columns[i].type}»`,
        });
      }
    });
  };

  block.rows.forEach((row, i) => checkRow(row, ["rows", i]));
  if (block.totals) checkRow(block.totals, ["totals"]);
}

function checkChartBlock(block: ReportChartBlock, ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  block.series.forEach((s, i) => {
    if (seen.has(s.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["series", i, "id"],
        message: `معرّف سلسلة مكرّر: ${s.id}`,
      });
    }
    seen.add(s.id);
  });

  if (block.chartType === "gauge") {
    if (!block.gauge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gauge"],
        message: "المقياس يتطلّب حدّي min/max",
      });
    }
    if (block.series.length !== 1 || block.series[0].points.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["series"],
        message: "المقياس سلسلة واحدة بنقطة واحدة",
      });
    }
    return;
  }

  // كل ما عدا المقياس فئويّ: بلا فئات لا رسم، والمحاذاة نقطةً بفئة.
  if (block.categories.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["categories"],
      message: "الرسم الفئوي يتطلّب فئة واحدة على الأقل",
    });
  }
  block.series.forEach((s, i) => {
    if (s.points.length !== block.categories.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["series", i, "points"],
        message: `عدد النقاط ${s.points.length} لا يطابق عدد الفئات ${block.categories.length}`,
      });
    }
  });

  if (block.chartType === "stacked-bar" && block.series.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["series"],
      message: "الأعمدة المكدّسة تتطلّب سلسلتين فأكثر؛ وإلا فهي أعمدة عادية",
    });
  }

  if (block.chartType === "donut") {
    if (block.series.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["series"],
        message: "الحلقة سلسلة واحدة",
      });
    }
    block.series.forEach((s, si) =>
      s.points.forEach((p, pi) => {
        if (p.state === "measured" && p.value < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["series", si, "points", pi],
            message: "شريحة الحلقة لا تكون سالبة",
          });
        }
      }),
    );
  }
}

function checkKpiGridBlock(block: ReportKpiGridBlock, ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  block.items.forEach((item, i) => {
    if (seen.has(item.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items", i, "id"],
        message: `معرّف مؤشر مكرّر: ${item.id}`,
      });
    }
    seen.add(item.id);

    // «ما لم يُقَس لا يُرسم ولا يُلوَّن» — نغمة على مؤشر غير مقيس تدّعي حكمًا
    // لا سند له، وفارقٌ لا أصل له أشدّ.
    if (item.measure.state === "unmeasured") {
      if (item.tone !== "default") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", i, "tone"],
          message: "المؤشر غير المقيس لا يُلوَّن — النغمة تبقى محايدة (المادة ٢٧)",
        });
      }
      if (item.delta) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", i, "delta"],
          message: "لا فارق لمؤشر لم يُقَس",
        });
      }
    }
  });
}

export const ReportBlockSchema = ReportBlockUnion.superRefine((block, ctx) => {
  switch (block.kind) {
    case "table":
      checkTableBlock(block, ctx);
      break;
    case "chart":
      checkChartBlock(block, ctx);
      break;
    case "kpi-grid":
      checkKpiGridBlock(block, ctx);
      break;
    default:
      break;
  }
});

/* ────────────────────────────── الأقسام ──────────────────────────────── */

export const ReportSectionSchema = z
  .object({
    id: z.string().min(1),
    title: LocalizedTextSchema,
    summary: LocalizedTextSchema.optional(),
    blocks: z.array(ReportBlockSchema).min(1, "القسم بلا كتل قسمٌ فارغ"),
  })
  .strict();

export type ReportSection = z.infer<typeof ReportSectionSchema>;
export type ReportSectionInput = z.input<typeof ReportSectionSchema>;

/* ────────────────────────────── الوثيقة ──────────────────────────────── */

const REGION_IDS = REGIONS.map((r) => r.id) as [RegionId, ...RegionId[]];

/** نطاق التقرير الجغرافي: منطقة بعينها أو الأربع مجتمعة. */
export const ReportRegionScopeSchema = z.union([z.literal("all"), z.enum(REGION_IDS)]);
export type ReportRegionScope = z.infer<typeof ReportRegionScopeSchema>;

export const ReportPeriodSchema = z
  .object({
    fromIso: z.string().datetime(),
    toIso: z.string().datetime(),
    label: LocalizedTextSchema,
    granularity: z.enum(["day", "week", "month", "quarter", "year", "custom"]).default("custom"),
  })
  .strict()
  .refine((p) => Date.parse(p.fromIso) <= Date.parse(p.toIso), {
    message: "بداية الفترة بعد نهايتها",
    path: ["fromIso"],
  });

export type ReportPeriod = z.infer<typeof ReportPeriodSchema>;

export const REPORT_CLASSIFICATIONS = ["internal", "confidential", "restricted"] as const;
export type ReportClassification = (typeof REPORT_CLASSIFICATIONS)[number];

export const REPORT_CLASSIFICATION_META: Record<ReportClassification, LocalizedText> = {
  internal: { ar: "داخلي", en: "Internal" },
  confidential: { ar: "سرّي", en: "Confidential" },
  restricted: { ar: "مقيّد التداول", en: "Restricted" },
};

/** إفصاح المحاكاة — النصّ نفسه الذي يذيّل `bi-pdf.ts` اليوم. */
export const SIMULATION_NOTICE: LocalizedText = {
  ar: "بيانات محاكاة مرجعية — is_simulation = true",
  en: "Reference simulation data — is_simulation = true",
};

export const LIVE_NOTICE: LocalizedText = {
  ar: "بيانات حيّة من قاعدة التشغيل",
  en: "Live data from the operations database",
};

export const ReportDocumentSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    id: z.string().min(1),
    title: LocalizedTextSchema,
    subtitle: LocalizedTextSchema.optional(),
    period: ReportPeriodSchema,
    region: ReportRegionScopeSchema,
    /**
     * **إلزامي بلا افتراضي.** وثيقة بلا إفصاح لا تُبنى. أي `.default(false)`
     * هنا يحوّل النسيان إلى ادّعاء بأن الأرقام حيّة.
     */
    isSimulation: z.boolean(),
    generatedAtIso: z.string().datetime(),
    generatedBy: LocalizedTextSchema.optional(),
    classification: z.enum(REPORT_CLASSIFICATIONS).default("confidential"),
    /** ربط بمكتبة النطاقات القائمة في `report-scope.ts`. */
    scope: z.enum(DAILY_REPORT_SCOPES).optional(),
    sections: z.array(ReportSectionSchema).min(1, "تقرير بلا أقسام ليس تقريرًا"),
    footnotes: z.array(LocalizedTextSchema).default([]),
  })
  .strict()
  .superRefine((doc, ctx) => {
    const seen = new Set<string>();
    doc.sections.forEach((s, i) => {
      if (seen.has(s.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sections", i, "id"],
          message: `معرّف قسم مكرّر: ${s.id}`,
        });
      }
      seen.add(s.id);
    });
  });

export type ReportDocument = z.infer<typeof ReportDocumentSchema>;
export type ReportDocumentInput = z.input<typeof ReportDocumentSchema>;

export function parseReportDocument(input: unknown): ReportDocument {
  return ReportDocumentSchema.parse(input);
}

export function safeParseReportDocument(input: unknown) {
  return ReportDocumentSchema.safeParse(input);
}

/* ───────────────────────── قراءات مشتقّة للمولّدات ───────────────────── */

/** تسمية النطاق الجغرافي — من `regions.ts` وحده، لا نسخة ثانية للأسماء. */
export function regionLabel(scope: ReportRegionScope, lang: ReportLang): string {
  if (scope === "all") return lang === "ar" ? "كل المناطق" : "All regions";
  const region = getRegion(scope);
  return lang === "ar" ? region.labelAr : region.labelEn;
}

/** سطر الإفصاح الذي يذيّل كل صفحة/ورقة. */
export function disclosureLine(doc: ReportDocument, lang: ReportLang): string {
  const notice = doc.isSimulation ? SIMULATION_NOTICE : LIVE_NOTICE;
  return `${t(notice, lang)} · ${t(REPORT_CLASSIFICATION_META[doc.classification], lang)}`;
}

/** كل الكتل بترتيب ظهورها، مقرونة بقسمها. */
export function flattenBlocks(
  doc: ReportDocument,
): Array<{ section: ReportSection; block: ReportBlock }> {
  return doc.sections.flatMap((section) => section.blocks.map((block) => ({ section, block })));
}

export function collectBlocks<K extends ReportBlockKind>(
  doc: ReportDocument,
  kind: K,
): Array<{ section: ReportSection; block: Extract<ReportBlock, { kind: K }> }> {
  return flattenBlocks(doc).filter(
    (entry): entry is { section: ReportSection; block: Extract<ReportBlock, { kind: K }> } =>
      entry.block.kind === kind,
  );
}

/** ترويسات جدول جاهزة لـ`table()` في `builder.server.ts` ولـ`aoa_to_sheet`. */
export function tableHeaders(block: ReportTableBlock, lang: ReportLang): string[] {
  return block.columns.map((c) =>
    c.unit ? `${t(c.header, lang)} (${t(c.unit, lang)})` : t(c.header, lang),
  );
}

/**
 * نصّ خلية واحدة — نقطة الاختناق نفسها التي تحرس المادة ٢٧.
 * الوحدة تُعرض في ترويسة العمود لا في كل خلية، فلا تُمرَّر هنا.
 */
export function cellText(
  cell: ReportTableCell,
  _column: ReportTableColumn,
  lang: ReportLang,
): string {
  switch (cell.type) {
    case "text":
      return t(cell.value, lang);
    case "measure":
      return formatMeasure(cell.measure, lang);
    case "date":
      return formatDate(cell.iso, lang);
    case "status":
      return t(cell.label, lang);
  }
}

/** صفوف نصّية جاهزة للرسم أو للتصدير. */
export function tableRows(block: ReportTableBlock, lang: ReportLang): string[][] {
  return block.rows.map((row) =>
    row.cells.map((cell, i) => cellText(cell, block.columns[i], lang)),
  );
}

/** أوزان الأعمدة — تُمرَّر كما هي إلى معامل `widths`. */
export function tableWidths(block: ReportTableBlock): number[] {
  return block.columns.map((c) => c.widthWeight);
}

/** مصفوفة كاملة (ترويسة + صفوف + إجماليات) لـ`XLSX.utils.aoa_to_sheet`. */
export function tableMatrix(block: ReportTableBlock, lang: ReportLang): string[][] {
  const matrix = [tableHeaders(block, lang), ...tableRows(block, lang)];
  if (block.totals) {
    matrix.push(block.totals.cells.map((cell, i) => cellText(cell, block.columns[i], lang)));
  }
  return matrix;
}

/** خلايا شبكة المؤشرات بالشكل الذي يبتلعه `kpiGrid()` في `builder.server.ts`. */
export function kpiCells(
  block: ReportKpiGridBlock,
  lang: ReportLang,
): Array<{ label: string; value: string; tone: ReportTone }> {
  return block.items.map((item) => ({
    label: t(item.label, lang),
    value: formatMeasure(item.measure, lang, {
      unit: item.unit,
      percent: item.percent,
    }),
    tone: item.tone,
  }));
}

/**
 * حصر ما لم يُقَس في الوثيقة كلّها. يخدم غرضين: سطر «مؤشرات لم تُقَس: ن»
 * في ذيل التقرير، وحارسٌ في الاختبارات يمنع تسلّل صفرٍ مكان غياب.
 */
export function measurementCoverage(doc: ReportDocument): {
  total: number;
  measured: number;
  unmeasured: number;
} {
  let total = 0;
  let measuredCount = 0;
  const count = (m: Measure) => {
    total += 1;
    if (m.state === "measured") measuredCount += 1;
  };
  for (const { block } of flattenBlocks(doc)) {
    if (block.kind === "kpi-grid") {
      block.items.forEach((i) => {
        count(i.measure);
        if (i.delta) count(i.delta.measure);
      });
    } else if (block.kind === "chart") {
      block.series.forEach((s) => s.points.forEach(count));
      if (block.gauge?.target) count(block.gauge.target);
    } else if (block.kind === "table") {
      const rows = block.totals ? [...block.rows, block.totals] : block.rows;
      rows.forEach((r) => r.cells.forEach((c) => c.type === "measure" && count(c.measure)));
    }
  }
  return { total, measured: measuredCount, unmeasured: total - measuredCount };
}

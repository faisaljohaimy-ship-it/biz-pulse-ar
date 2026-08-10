/**
 * طقم رسوم التقارير — الرموز المشتركة.
 *
 * لا لون في هذا الملف ولا في أي ملف tsx من الطقم. المكوّن يمرّر **صنفًا**
 * (`rpt-series-3` · `rpt-tone-danger`) والصنف يحمل `color` من
 * `src/styles/report-charts.css`؛ وكل ما يُرسم يقرأ `currentColor`. هذا هو
 * ما يجعل الوضعين صحيحين بلا شرط ثيم واحد في الترميز، ويمنع `fill="white"`
 * من الوجود أصلًا لا من المرور (المادتان ٣٢–٣٤).
 *
 * ## الشكل قبل اللون (WCAG 2.2 §1.4.1)
 *
 * «خطر» أحمر و«تحذير» كهرماني — وهما بالضبط الزوج الذي يطمسه عمى الألوان
 * الأحمر‑الأخضر. فلا يُترك اللون حاملًا وحيدًا: لكل نغمة **شكل** يتبع عرف
 * لوحات السلامة (مثمّن = خطر · مثلث = تحذير · دائرة = سليم) و**كلمة**
 * عربية تُكتب إلى جوارها. أسقِط اللون كلّه فيبقى الفرق قائمًا — وهذا هو
 * الاختبار الذي يحرسه `report-charts.contract.test.ts`.
 */
import type { ReactElement } from "react";

/** نصّ الغياب. المادة ٢٧: ما لم يُقَس لا يُرسم، ويُقال. */
export const NOT_MEASURED = "لم يُقَس";

export type ReportTone = "danger" | "warning" | "success" | "neutral";

export const TONE_WORD: Record<ReportTone, string> = {
  danger: "خطر",
  warning: "تحذير",
  success: "سليم",
  neutral: "غير مصنَّف",
};

export const TONE_CLASS: Record<ReportTone, string> = {
  danger: "rpt-tone-danger",
  warning: "rpt-tone-warning",
  success: "rpt-tone-success",
  neutral: "rpt-tone-neutral",
};

export type ToneShape = "octagon" | "triangle" | "circle" | "square";

/** عرف لوحات السلامة — لا يُعاد ترتيبه. */
export const TONE_SHAPE: Record<ReportTone, ToneShape> = {
  danger: "octagon",
  warning: "triangle",
  success: "circle",
  neutral: "square",
};

/* ─────────────────────────────── خانات السلاسل ───────────────────────── */

export const SERIES_SLOT_COUNT = 6;

export function seriesClass(index: number): string {
  return `rpt-series-${(Math.abs(Math.trunc(index)) % SERIES_SLOT_COUNT) + 1}`;
}

/**
 * نمط تقطيع لكل خانة. ليس زينة: لوحة السطح كلها زرقاء‑سماوية في الوضعين،
 * فسلسلتان متجاورتان تُقرآن لونًا واحدًا على طابعة رمادية أو لعينٍ لا تفرّق
 * الأزرق من السماوي. التقطيع يفصلهما بلا لون.
 */
export const SERIES_DASH: readonly (string | undefined)[] = [
  undefined,
  "7 4",
  "2 3",
  "11 4 2 4",
  "1 4",
  "9 3 2 3",
];

export function seriesDash(index: number): string | undefined {
  return SERIES_DASH[Math.abs(Math.trunc(index)) % SERIES_SLOT_COUNT];
}

/** الصنف اللوني لسلسلة: نغمتها إن كانت لها نغمة، وإلّا خانتها التصنيفية. */
export function seriesColorClass(index: number, tone?: ReportTone): string {
  return tone ? TONE_CLASS[tone] : seriesClass(index);
}

/* ──────────────────────────────── الأشكال ────────────────────────────── */

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * نقاط المضلّع لشكل نغمة عند مركز ونصف قطر. الدائرة تُعيد `null` — تُرسم
 * `<circle>` لأن تقريبها بمضلّع يجعلها تُقرأ مثمّنًا صغيرًا، فيضيع الفرق
 * الذي وُجدت الأشكال لأجله.
 */
export function tonePolygonPoints(shape: ToneShape, cx: number, cy: number, r: number) {
  if (shape === "circle") return null;
  const pts: string[] = [];
  if (shape === "square") {
    const h = r * 0.78;
    for (const [dx, dy] of [
      [-h, -h],
      [h, -h],
      [h, h],
      [-h, h],
    ]) {
      pts.push(`${r2(cx + dx)},${r2(cy + dy)}`);
    }
    return pts.join(" ");
  }
  const n = shape === "octagon" ? 8 : 3;
  // المثمّن يُدار نصف قطاع فيستوي ضلعه الأعلى أفقيًّا (شكل لوحة «قف»)،
  // والمثلث رأسه إلى الأعلى (شكل لوحة التحذير).
  const offset = shape === "octagon" ? Math.PI / 8 : Math.PI / 2;
  for (let i = 0; i < n; i += 1) {
    const a = offset + (i * 2 * Math.PI) / n;
    pts.push(`${r2(cx + r * Math.cos(a))},${r2(cy - r * Math.sin(a))}`);
  }
  return pts.join(" ");
}

/** علامة نغمة تُرسم **داخل** الـSVG (نقطة خطّ، رأس عمود، مؤشّر مقياس). */
export function ToneMark({
  tone,
  cx,
  cy,
  r = 4.5,
  className,
}: {
  tone: ReportTone;
  cx: number;
  cy: number;
  r?: number;
  className?: string;
}): ReactElement {
  const shape = TONE_SHAPE[tone];
  const cls = ["rpt-mark", TONE_CLASS[tone], className].filter(Boolean).join(" ");
  if (shape === "circle") {
    return <circle className={cls} cx={cx} cy={cy} r={r} fill="currentColor" />;
  }
  return (
    <polygon
      className={cls}
      points={tonePolygonPoints(shape, cx, cy, r) ?? ""}
      fill="currentColor"
    />
  );
}

/** علامة نغمة مستقلّة للوسائل والشارات. مخفيّة عن القارئات — الكلمة تجاورها. */
export function ToneGlyph({ tone, size = 12 }: { tone: ReportTone; size?: number }): ReactElement {
  return (
    <svg
      className={`rpt-glyph ${TONE_CLASS[tone]}`}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <ToneMark tone={tone} cx={8} cy={8} r={7} />
    </svg>
  );
}

/** عيّنة سلسلة: خطّ بنمط التقطيع نفسه المرسوم في الرسم البياني. */
export function SeriesSwatch({
  index,
  tone,
  dashed = true,
}: {
  index: number;
  tone?: ReportTone;
  dashed?: boolean;
}): ReactElement {
  if (tone) return <ToneGlyph tone={tone} />;
  return (
    <svg
      className={`rpt-swatch ${seriesClass(index)}`}
      width={18}
      height={12}
      viewBox="0 0 18 12"
      aria-hidden="true"
      focusable="false"
    >
      <line
        x1="0"
        y1="6"
        x2="18"
        y2="6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={dashed ? seriesDash(index) : undefined}
      />
    </svg>
  );
}

/* ──────────────────────────────── الأرقام ────────────────────────────── */

/**
 * أرقام لاتينية بفواصل عربية. لا `ar-SA` وحدها: تقويمها وأرقامها الهندية
 * تكسر `tabular-nums` فتتراقص الأعمدة في الجدول البديل وعلى المحاور.
 */
const NUM = new Intl.NumberFormat("ar-SA-u-nu-latn", { maximumFractionDigits: 2 });

/** صفرٌ يُطبع صفرًا، و`null` يُطبع «لم يُقَس». لا يُستبدل أحدهما بالآخر. */
export function formatValue(v: number | null | undefined, unit?: string): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return NOT_MEASURED;
  return unit ? `${NUM.format(v)} ${unit}` : NUM.format(v);
}

export function isMeasured(v: number | null | undefined): v is number {
  return v !== null && v !== undefined && Number.isFinite(v);
}

/* ──────────────────────────────── الأنواع ────────────────────────────── */

export interface ReportSeries {
  /** مفتاح القيمة داخل `values`. */
  key: string;
  /** التسمية العربية المعروضة. */
  label: string;
  /** نغمة دلالية — تُلغي الخانة التصنيفية وتُدخل الشكل والكلمة معها. */
  tone?: ReportTone;
}

export interface ReportCategory {
  /** تسمية الفئة على المحور السيني (عربية). */
  label: string;
  /** `null` = لم يُقَس. لا يُستبدل بصفر إطلاقًا (المادة ٢٧). */
  values: Record<string, number | null>;
  /** نغمة الفئة — تُرسم شكلًا إلى جانب تسميتها على المحور. */
  tone?: ReportTone;
}

export interface ReportSlice {
  label: string;
  /** `null` = لم يُقَس ⇐ لا قوس يُرسم. */
  value: number | null;
  tone?: ReportTone;
}

/** خصائص يشترك فيها كل رسم في الطقم. */
export interface ReportChartBase {
  title: string;
  caption?: string;
  /** وحدة القياس («٪» · «حادثة») — تدخل في الوصف والجدول البديل. */
  unit?: string;
  /** ارتفاع منطقة الرسم بالبكسل. */
  height?: number;
  /**
   * عرض ثابت. حين يُترك فارغًا يتمدّد الرسم إلى عرض حاويته.
   * **يُمرَّر دائمًا عند الالتقاط للـPDF**: المحرّك يلتقط قبل أن يقيس
   * المراقب عرض الحاوية، فالرسم المتمدّد يخرج بعرض صفر.
   */
  width?: number;
  /** يوقف كل حركة وانتقال وتلميح — وضع الالتقاط. */
  staticRender?: boolean;
  className?: string;
}

/** الهوامش الافتراضية: المحور الرأسي يمينًا في RTL فيتّسع له الهامش الأيمن. */
export const RTL_MARGIN = { top: 8, right: 44, bottom: 4, left: 8 } as const;

/** بنية الجدول البديل. */
export interface AltTable {
  columns: string[];
  rows: string[][];
}

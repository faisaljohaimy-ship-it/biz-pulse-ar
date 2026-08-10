/**
 * الأجزاء المشتركة للرسوم ذات المحاور (خطّي · أعمدة · مكدّس · مساحي).
 *
 * ## لماذا RTL هنا ليس `direction: rtl` وكفى
 *
 * `direction` تقلب النصّ لا الرسم: يبقى المحور السيني يبدأ يسارًا فتُقرأ
 * السلسلة الزمنية عكس اتجاه القراءة. القلب الحقيقي بندان:
 * `reversed` على `XAxis` فتبدأ الفئة الأولى **يمينًا**، و`orientation="right"`
 * على `YAxis` فتقع أرقامه في أوّل ما تقع عليه العين. والهامش الأيمن يتّسع
 * لهما (`RTL_MARGIN`).
 *
 * ## المادة ٢٧ في هذه الطبقة
 *
 * `null` تُمرَّر إلى recharts كما هي، ولا تُحوَّل إلى صفر ولا تُحذف الفئة.
 * recharts نفسه **لا يرسم** المستطيل ولا النقطة عند `null`، و
 * `connectNulls={false}` يمنع الخطّ من القفز فوق الفجوة كأن شيئًا قيس.
 * الفئة تبقى على المحور لأن غيابها معلومة، والحاشية تُسمّيها.
 */
import type { ReactElement } from "react";
import { CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import {
  NOT_MEASURED,
  RTL_MARGIN,
  ToneMark,
  formatValue,
  isMeasured,
  seriesColorClass,
  type AltTable,
  type ReportCategory,
  type ReportSeries,
  type ReportTone,
} from "./chart-tokens";

/** المفتاح الداخلي لتسمية الفئة — مسبوق بشرطتين فلا يصطدم بمفتاح سلسلة. */
export const LABEL_KEY = "__rptLabel";

export type ChartRow = Record<string, string | number | null>;

/** يبني صفوف recharts. `null` تُمرَّر كما هي — لا صفر ولا حذف. */
export function buildRows(data: readonly ReportCategory[], series: readonly ReportSeries[]) {
  return data.map((d) => {
    const row: ChartRow = { [LABEL_KEY]: d.label };
    for (const s of series) {
      const v = d.values[s.key];
      row[s.key] = isMeasured(v) ? v : null;
    }
    return row;
  });
}

/** تسميات الخانات التي لم يُقَس فيها شيء — لحاشية الغياب. */
export function missingCells(data: readonly ReportCategory[], series: readonly ReportSeries[]) {
  const out: string[] = [];
  for (const d of data) {
    for (const s of series) {
      if (!isMeasured(d.values[s.key])) {
        out.push(series.length > 1 ? `${d.label} · ${s.label}` : d.label);
      }
    }
  }
  return out;
}

export function hasAnyMeasurement(
  data: readonly ReportCategory[],
  series: readonly ReportSeries[],
) {
  return data.some((d) => series.some((s) => isMeasured(d.values[s.key])));
}

/** الجدول البديل: صفٌّ لكل فئة، وعمود لكل سلسلة. الغياب يُكتب «لم يُقَس». */
export function cartesianTable(
  data: readonly ReportCategory[],
  series: readonly ReportSeries[],
  unit?: string,
): AltTable {
  return {
    columns: ["الفئة", ...series.map((s) => (unit ? `${s.label} (${unit})` : s.label))],
    rows: data.map((d) => [d.label, ...series.map((s) => formatValue(d.values[s.key]))]),
  };
}

/** وصف عربي يُقرأ بدل الرسم: نوعه، ومَن فيه، ومداه، وما غاب منه. */
export function describeCartesian(
  kind: string,
  title: string,
  data: readonly ReportCategory[],
  series: readonly ReportSeries[],
  unit?: string,
): string {
  const values = data.flatMap((d) => series.map((s) => d.values[s.key])).filter(isMeasured);
  const parts = [
    `${kind}: ${title}.`,
    `${data.length} فئة على المحور الأفقي، يبدأ من اليمين.`,
    `السلاسل: ${series.map((s) => s.label).join(" · ")}.`,
  ];
  if (values.length > 0) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    parts.push(`القيم بين ${formatValue(min, unit)} و${formatValue(max, unit)}.`);
  }
  const missing = missingCells(data, series);
  if (missing.length > 0) parts.push(`${NOT_MEASURED} في ${missing.length} خانة.`);
  return parts.join(" ");
}

/* ────────────────────────── لافتة الفئة ذات النغمة ───────────────────── */

interface TickProps {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
  tones?: Record<string, ReportTone>;
}

/**
 * لافتة المحور السيني. حين تحمل الفئة نغمة يُرسم **شكلها** فوق التسمية —
 * لا لونها وحده: مثمّن أو مثلث أو دائرة، فيُقرأ الإنذار على طابعة رمادية
 * وبعينٍ لا تفرّق الأحمر من الكهرماني.
 */
export function CategoryTick({ x = 0, y = 0, payload, tones = {} }: TickProps): ReactElement {
  const label = String(payload?.value ?? "");
  const tone = tones[label];
  return (
    <g transform={`translate(${x},${y})`}>
      {tone ? <ToneMark tone={tone} cx={0} cy={7} r={3.5} /> : null}
      <text
        x={0}
        y={tone ? 22 : 14}
        textAnchor="middle"
        fontSize={11}
        fill="currentColor"
        className="rpt-tick-text"
      >
        {label}
      </text>
    </g>
  );
}

/* ───────────────────────────── محاور وشبكة ───────────────────────────── */

export interface AxesOptions {
  data: readonly ReportCategory[];
  unit?: string;
  /** إخفاء المحور الرأسي (المكدّس النسبي مثلًا). */
  hideValueAxis?: boolean;
}

/**
 * تُعاد **مصفوفة** لا جزءًا (`Fragment`): recharts يفتّش أبناءه المباشرين
 * بأنواعهم ليعرف أين المحور من الشبكة، وReact يفرد المصفوفة فيراها أبناءً
 * مباشرين — بينما الجزء يبقى عقدة واحدة مبهمة أمامه فيضيع المحور بصمت.
 */
export function cartesianAxes({ data, unit, hideValueAxis }: AxesOptions): ReactElement[] {
  const tones: Record<string, ReportTone> = {};
  for (const d of data) if (d.tone) tones[d.label] = d.tone;

  return [
    // `stroke` مكتوبٌ صراحةً على الشبكة والمحور: recharts يضع افتراضًا
    // `#ccc` للشبكة و`#666` لخطّ المحور — لونان **خامّان** يولدهما المكتبة
    // لا الكاتب، فلا يراهما فحصُ مصدرٍ ويراهما فحصُ الترميز المُخرَج. وهما
    // على الكحلي يكادان يختفيان وعلى الأبيض يثقلان.
    <CartesianGrid
      key="grid"
      strokeDasharray="3 3"
      vertical={false}
      stroke="currentColor"
      className="rpt-grid"
    />,
    <XAxis
      key="x"
      dataKey={LABEL_KEY}
      type="category"
      reversed
      tickLine={false}
      axisLine={{ stroke: "currentColor" }}
      interval={0}
      height={Object.keys(tones).length > 0 ? 34 : 24}
      tick={<CategoryTick tones={tones} />}
    />,
    <YAxis
      key="y"
      orientation="right"
      width={44}
      tickLine={false}
      axisLine={false}
      hide={hideValueAxis}
      // ١٢px لا ١١: أرضية القراءة على النصّ الحامل للمعنى، وأرقام المحور
      // هي ما يُقرأ منه الرسم.
      tick={{ fontSize: 12, fill: "currentColor" }}
      unit={unit ? ` ${unit}` : undefined}
    />,
  ];
}

/* ──────────────────────────────── التلميح ────────────────────────────── */

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { dataKey?: string | number; value?: number | null }[];
  series: readonly ReportSeries[];
  unit?: string;
}

function TooltipBody({ active, label, payload, series, unit }: TipProps): ReactElement | null {
  if (!active || !payload) return null;
  return (
    <div className="rpt-tip" dir="rtl">
      <p className="rpt-tip-label">{String(label ?? "")}</p>
      {series.map((s, i) => {
        const hit = payload.find((p) => p.dataKey === s.key);
        return (
          <p key={s.key} className={`rpt-tip-row ${seriesColorClass(i, s.tone)}`}>
            <span aria-hidden="true">◆</span>
            <span>{s.label}</span>
            <span className={isMeasured(hit?.value) ? undefined : "rpt-legend-unmeasured"}>
              {formatValue(hit?.value ?? null, unit)}
            </span>
          </p>
        );
      })}
    </div>
  );
}

/**
 * التلميح شاشةٌ فقط. في وضع الالتقاط لا يُخفى بل **لا يُركَّب**: مكوّن
 * يستمع للفأرة داخل لقطة PDF كلفةٌ بلا مقابل، وقد يومض إن مرّ المؤشر
 * أثناء الالتقاط الآلي.
 */
export function chartTooltip(
  series: readonly ReportSeries[],
  unit: string | undefined,
  staticRender: boolean | undefined,
): ReactElement | null {
  if (staticRender) return null;
  return (
    <Tooltip
      key="tip"
      isAnimationActive={false}
      cursor={{ className: "rpt-cursor", fillOpacity: 0.06 }}
      content={<TooltipBody series={series} unit={unit} />}
    />
  );
}

/* ─────────────────────────── نقطة السلسلة ────────────────────────────── */

interface DotProps {
  cx?: number;
  cy?: number;
  value?: number | null;
  tone?: ReportTone;
}

/**
 * نقطة على الخطّ. **الحارس الأول للمادة ٢٧ في هذه الطبقة**: عند `null`
 * يعطي recharts إحداثيًّا رأسيًّا `null`، فتُعاد `null` ولا تُرسم نقطة.
 * لو رُسمت عند حدٍّ افتراضي لظهر الغياب قياسًا واقعًا على الحافّة.
 * وحين تحمل السلسلة نغمة تصير النقطة **شكلها** لا قرصًا ملوّنًا.
 */
export function SeriesDot({ cx, cy, value, tone }: DotProps): ReactElement | null {
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  if (!isMeasured(value)) return null;
  if (tone) return <ToneMark tone={tone} cx={cx as number} cy={cy as number} r={4.5} />;
  return <circle className="rpt-dot" cx={cx} cy={cy} r={3} fill="currentColor" />;
}

/* ─────────────────────────────── التمدّد ─────────────────────────────── */

export { RTL_MARGIN };

/**
 * رسم أعمدة — مقارنة فئات. ومكدَّس حين `stacked`.
 *
 * ## عمودان لا واحد، ولماذا الملف واحد
 *
 * المكدّس ليس نوعًا آخر: هو العمود نفسه بـ`stackId` واحد. فصله ملفًّا
 * ثانيًا يضاعف كل قاعدة (المحاور RTL، الغياب، الجدول البديل) في موضعين
 * يفترقان مع أوّل تعديل. المصدَّر منه اسمان: `ReportBarChart` و
 * `ReportStackedBarChart`، والثاني غلافٌ يثبّت `stacked`.
 *
 * ## المكدّس والغياب
 *
 * `null` داخل مكدَّس **لا تُطوى صفرًا**: recharts لا يرسم قطعتها، فيبقى
 * ارتفاع العمود مجموع ما قِيس وحده. وهذا يعني أن عمودًا ناقصًا يبدو أقصر
 * من الحقيقة — ولذلك الحاشية تُسمّي الخانة الغائبة، والجدول البديل يكتب
 * «لم يُقَس» في موضعها. الرسم لا يُكمل ما لم يُقَس، والنصّ يقول إنه ناقص.
 */
import type { ReactElement } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer } from "recharts";
import { ChartShell, unmeasuredNote } from "./ChartShell";
import { SeriesLegend } from "./ChartLegend";
import {
  RTL_MARGIN,
  TONE_CLASS,
  seriesColorClass,
  type ReportCategory,
  type ReportChartBase,
  type ReportSeries,
} from "./chart-tokens";
import {
  buildRows,
  cartesianAxes,
  cartesianTable,
  chartTooltip,
  describeCartesian,
  hasAnyMeasurement,
  missingCells,
} from "./cartesian";

export interface ReportBarChartProps extends ReportChartBase {
  data: readonly ReportCategory[];
  series: readonly ReportSeries[];
  stacked?: boolean;
}

export function ReportBarChart({
  title,
  caption,
  unit,
  data,
  series,
  height = 240,
  width,
  staticRender,
  className,
  stacked = false,
}: ReportBarChartProps): ReactElement {
  const rows = buildRows(data, series);
  const missing = missingCells(data, series);
  const empty = !hasAnyMeasurement(data, series);
  const kind = stacked ? "رسم أعمدة مكدّسة" : "رسم أعمدة";

  const chart = (
    <BarChart data={rows} margin={RTL_MARGIN} barGap={2} {...(width ? { width, height } : {})}>
      {cartesianAxes({ data, unit })}
      {chartTooltip(series, unit, staticRender)}
      {series.map((s, si) => (
        <Bar
          key={s.key}
          dataKey={s.key}
          name={s.label}
          stackId={stacked ? "rpt" : undefined}
          className={seriesColorClass(si, s.tone)}
          fill="currentColor"
          radius={stacked ? undefined : [4, 4, 0, 0]}
          maxBarSize={54}
          isAnimationActive={!staticRender}
        >
          {/* نغمة الفئة تغلب خانة السلسلة: عمود «خطر» يُقرأ خطرًا مهما كانت
              سلسلته. والصنف مكتوب على `Bar` أيضًا فلو لم تُمرَّر خصائص
              الخلية بقي لون السلسلة صحيحًا. */}
          {data.map((d, di) => (
            <Cell
              key={`${s.key}-${di}`}
              className={d.tone ? TONE_CLASS[d.tone] : seriesColorClass(si, s.tone)}
              fill="currentColor"
            />
          ))}
        </Bar>
      ))}
    </BarChart>
  );

  return (
    <ChartShell
      title={title}
      caption={caption}
      ariaLabel={describeCartesian(kind, title, data, series, unit)}
      staticRender={staticRender}
      className={className}
      legend={<SeriesLegend series={series} />}
      note={unmeasuredNote(missing, data.length * Math.max(series.length, 1))}
      table={cartesianTable(data, series, unit)}
      empty={empty}
    >
      {width ? (
        chart
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {chart}
        </ResponsiveContainer>
      )}
    </ChartShell>
  );
}

/** أعمدة مكدّسة — نفس المكوّن بـ`stacked` مثبّتة. */
export function ReportStackedBarChart(props: Omit<ReportBarChartProps, "stacked">): ReactElement {
  return <ReportBarChart {...props} stacked />;
}

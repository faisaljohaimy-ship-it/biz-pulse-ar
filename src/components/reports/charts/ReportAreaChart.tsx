/**
 * رسم مساحي — حجمٌ عبر الزمن.
 *
 * ## لا تدرّج لوني، وهذا قرار لا إهمال
 *
 * التعبئة المتدرّجة عادةُ الرسوم المساحية، ولا تصلح هنا لسببين:
 * `stopColor="currentColor"` داخل `<linearGradient>` يُحلّ مقابل **عقدة
 * التدرّج نفسها** لا مقابل السلسلة التي تشير إليه، فلا يمكن أن يتبع
 * التدرّجُ لونَ سلسلته وهو في `<defs>` — أي أن التدرّج يفرض لونًا خامًّا
 * مكتوبًا، وهو ممنوع (المادة ٣٣). والثاني أن التدرّجات تُشرَّط (banding)
 * عند التنقيط للطباعة. تعبئة مسطّحة بشفافية تعطي القراءة نفسها وتطبع
 * نظيفة.
 */
import type { ReactElement } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ChartShell, unmeasuredNote } from "./ChartShell";
import { SeriesLegend } from "./ChartLegend";
import {
  RTL_MARGIN,
  seriesColorClass,
  seriesDash,
  type ReportCategory,
  type ReportChartBase,
  type ReportSeries,
} from "./chart-tokens";
import {
  SeriesDot,
  buildRows,
  cartesianAxes,
  cartesianTable,
  chartTooltip,
  describeCartesian,
  hasAnyMeasurement,
  missingCells,
} from "./cartesian";

export interface ReportAreaChartProps extends ReportChartBase {
  data: readonly ReportCategory[];
  series: readonly ReportSeries[];
  /** تكديس المساحات فوق بعضها بدل تراكبها. */
  stacked?: boolean;
  smooth?: boolean;
}

export function ReportAreaChart({
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
  smooth = true,
}: ReportAreaChartProps): ReactElement {
  const rows = buildRows(data, series);
  const missing = missingCells(data, series);
  const empty = !hasAnyMeasurement(data, series);

  const chart = (
    <AreaChart data={rows} margin={RTL_MARGIN} {...(width ? { width, height } : {})}>
      {cartesianAxes({ data, unit })}
      {chartTooltip(series, unit, staticRender)}
      {series.map((s, i) => (
        <Area
          key={s.key}
          type={smooth ? "monotone" : "linear"}
          dataKey={s.key}
          name={s.label}
          stackId={stacked ? "rpt" : undefined}
          className={seriesColorClass(i, s.tone)}
          stroke="currentColor"
          strokeWidth={2}
          strokeDasharray={s.tone ? undefined : seriesDash(i)}
          fill="currentColor"
          fillOpacity={0.16}
          connectNulls={false}
          dot={<SeriesDot tone={s.tone} />}
          activeDot={staticRender ? false : { r: 5, strokeWidth: 0, fill: "currentColor" }}
          isAnimationActive={!staticRender}
        />
      ))}
    </AreaChart>
  );

  return (
    <ChartShell
      title={title}
      caption={caption}
      ariaLabel={describeCartesian(
        stacked ? "رسم مساحي مكدّس" : "رسم مساحي",
        title,
        data,
        series,
        unit,
      )}
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

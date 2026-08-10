/**
 * رسم خطّي — اتجاه عبر الزمن.
 *
 * `connectNulls={false}` هو بيت القصيد هنا: مع `true` يمدّ recharts الخطّ
 * فوق الفجوة فيُقرأ الغياب استمرارًا سلسًا، وهو أسوأ من الكذب بصفر لأنه
 * لا يترك أثرًا يُشكّ فيه. الفجوة تبقى فجوة. (المادة ٢٧)
 */
import type { ReactElement } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { ChartShell, unmeasuredNote } from "./ChartShell";
import { SeriesLegend } from "./ChartLegend";
import { RTL_MARGIN, seriesColorClass, seriesDash, type ReportChartBase } from "./chart-tokens";
import type { ReportCategory, ReportSeries } from "./chart-tokens";
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

export interface ReportLineChartProps extends ReportChartBase {
  data: readonly ReportCategory[];
  series: readonly ReportSeries[];
  /** منحنى ناعم أم أضلاع مستقيمة. المستقيم أصدق مع القياسات المتفرّقة. */
  smooth?: boolean;
}

export function ReportLineChart({
  title,
  caption,
  unit,
  data,
  series,
  height = 240,
  width,
  staticRender,
  className,
  smooth = false,
}: ReportLineChartProps): ReactElement {
  const rows = buildRows(data, series);
  const missing = missingCells(data, series);
  const empty = !hasAnyMeasurement(data, series);

  const chart = (
    <LineChart data={rows} margin={RTL_MARGIN} {...(width ? { width, height } : {})}>
      {cartesianAxes({ data, unit })}
      {chartTooltip(series, unit, staticRender)}
      {series.map((s, i) => (
        <Line
          key={s.key}
          type={smooth ? "monotone" : "linear"}
          dataKey={s.key}
          name={s.label}
          className={seriesColorClass(i, s.tone)}
          stroke="currentColor"
          fill="none"
          strokeWidth={2}
          strokeDasharray={s.tone ? undefined : seriesDash(i)}
          strokeLinecap="round"
          connectNulls={false}
          dot={<SeriesDot tone={s.tone} />}
          activeDot={staticRender ? false : { r: 5, strokeWidth: 0, fill: "currentColor" }}
          isAnimationActive={!staticRender}
        />
      ))}
    </LineChart>
  );

  return (
    <ChartShell
      title={title}
      caption={caption}
      ariaLabel={describeCartesian("رسم خطّي", title, data, series, unit)}
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

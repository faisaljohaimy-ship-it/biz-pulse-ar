/**
 * طقم رسوم التقارير — سطح التصدير الوحيد.
 *
 * الأنماط في `src/styles/report-charts.css` وتُربط مرّة واحدة على مستوى
 * التطبيق؛ لا مكوّن هنا يستورد CSS بنفسه حتى لا تتكرّر الطبقة في كل حزمة
 * تستدعي رسمًا واحدًا.
 */
export { ReportLineChart, type ReportLineChartProps } from "./ReportLineChart";
export { ReportBarChart, ReportStackedBarChart, type ReportBarChartProps } from "./ReportBarChart";
export { ReportAreaChart, type ReportAreaChartProps } from "./ReportAreaChart";
export { ReportDonutChart, type ReportDonutChartProps } from "./ReportDonutChart";
export {
  ReportGaugeChart,
  type ReportGaugeChartProps,
  type GaugeThresholds,
} from "./ReportGaugeChart";

export { ChartShell, unmeasuredNote, type ChartShellProps } from "./ChartShell";
export { SeriesLegend, SliceLegend } from "./ChartLegend";
export {
  NOT_MEASURED,
  SERIES_DASH,
  SERIES_SLOT_COUNT,
  SeriesSwatch,
  TONE_CLASS,
  TONE_SHAPE,
  TONE_WORD,
  ToneGlyph,
  ToneMark,
  formatValue,
  isMeasured,
  seriesClass,
  seriesColorClass,
  seriesDash,
  tonePolygonPoints,
  type AltTable,
  type ReportCategory,
  type ReportChartBase,
  type ReportSeries,
  type ReportSlice,
  type ReportTone,
  type ToneShape,
} from "./chart-tokens";

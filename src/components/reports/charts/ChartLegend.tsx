/**
 * وسيلة الرسم. تُكتب هنا ولا تُستعمل وسيلة recharts لثلاثة أسباب:
 * ترتيبها لا يتبع RTL، ونصّها لا يرث خطّ الطقم داخل الـSVG، وهي تُرسم
 * **داخل** الـSVG فتدخل في `role="img"` وتُحجب عن قارئ الشاشة. هنا هي
 * نصّ HTML خارج الرسم: تُقرأ وتُطبع وتلتفّ.
 */
import type { ReactElement } from "react";
import {
  SeriesSwatch,
  ToneGlyph,
  TONE_WORD,
  formatValue,
  isMeasured,
  type ReportSeries,
  type ReportSlice,
} from "./chart-tokens";

/** وسيلة السلاسل — رسوم المحاور. */
export function SeriesLegend({ series }: { series: readonly ReportSeries[] }): ReactElement | null {
  if (series.length === 0) return null;
  return (
    <ul className="rpt-legend">
      {series.map((s, i) => (
        <li key={s.key} className="rpt-legend-item">
          <SeriesSwatch index={i} tone={s.tone} />
          <span className="rpt-legend-name">{s.label}</span>
          {s.tone ? <span className="rpt-legend-value">{TONE_WORD[s.tone]}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * وسيلة الشرائح — الحلقي. تحمل القيمة إلى جانب الاسم: القوس يقول «أكبر»
 * ولا يقول «كم»، والنسبة لا تُقرأ من زاوية بالعين.
 */
export function SliceLegend({
  slices,
  unit,
}: {
  slices: readonly ReportSlice[];
  unit?: string;
}): ReactElement | null {
  if (slices.length === 0) return null;
  return (
    <ul className="rpt-legend">
      {slices.map((s, i) => (
        <li key={s.label} className="rpt-legend-item">
          {s.tone ? <ToneGlyph tone={s.tone} /> : <SeriesSwatch index={i} dashed={false} />}
          <span className="rpt-legend-name">{s.label}</span>
          <span className={isMeasured(s.value) ? "rpt-legend-value" : "rpt-legend-unmeasured"}>
            {formatValue(s.value, unit)}
          </span>
        </li>
      ))}
    </ul>
  );
}

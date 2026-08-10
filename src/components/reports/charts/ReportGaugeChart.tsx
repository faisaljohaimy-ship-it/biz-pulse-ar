/**
 * مقياس نصف دائري — قيمة واحدة على مدى معلوم.
 *
 * ## لماذا SVG خالص لا recharts
 *
 * لا مقياس في recharts؛ ما يُبنى منه يُبنى بحيلة فطيرة نصفية تُخفى نصفها،
 * فتُورّث حاويةً تُقاس بجافاسكربت وزوايا لا تُتحكَّم بها. المقياس هنا أربعة
 * أقواس ومسطرة، وحسابها ثلاثة أسطر مثلثات — ومخرجه SVG ثابت لا يحتاج قياس
 * حاوية، وهو بالضبط ما تحتاجه لقطة الـPDF. ولا مكتبة جديدة تُضاف (الميزانية).
 *
 * ## وجه الجهاز يبقى، والقياس وحده يغيب
 *
 * `value === null` ⇐ **لا قوس قيمة ولا شارة حالة**، ويبقى وجه المقياس
 * ومسطرته لأنهما هيكل الأداة لا قراءتها. هي القاعدة نفسها المطبَّقة في
 * `InstrumentPanels`: الدائرة تبقى والقوس وحده يقول «قِيس». (المادة ٢٧)
 * وشارة الحالة لا تُخمَّن من غياب: لا قيمة ⇒ لا حكم.
 *
 * ## الاتجاه والشكل
 *
 * القوس يمتلئ من **اليمين** إلى اليسار (`0° → 180°` رياضيًّا)، فيتبع اتجاه
 * القراءة. وعتبتا التحذير والخطر تُعلَّمان على القوس بشكليهما — مثلث
 * وثماني — لا بلونين متجاورين يطمسهما عمى الألوان الأحمر‑الأخضر.
 */
import type { ReactElement } from "react";
import { ChartShell } from "./ChartShell";
import {
  NOT_MEASURED,
  TONE_CLASS,
  TONE_WORD,
  ToneGlyph,
  ToneMark,
  formatValue,
  isMeasured,
  type AltTable,
  type ReportChartBase,
  type ReportTone,
} from "./chart-tokens";

export interface GaugeThresholds {
  /** القيمة التي تبدأ عندها حالة «تحذير». */
  warning?: number;
  /** القيمة التي تبدأ عندها حالة «خطر». */
  danger?: number;
}

export interface ReportGaugeChartProps extends Omit<ReportChartBase, "height"> {
  /** `null` = لم يُقَس. لا يُستبدل بصفر إطلاقًا. */
  value: number | null;
  min?: number;
  max?: number;
  /** نصّ تحت الرقم. */
  centerLabel?: string;
  thresholds?: GaugeThresholds;
  /** الافتراضي: الارتفاع سوء. اقلبها لمؤشرات مثل «نسبة الامتثال». */
  higherIsWorse?: boolean;
  /** حكم صريح يغلب الاشتقاق من العتبات. */
  tone?: ReportTone;
  height?: number;
}

/* ── هندسة القوس ────────────────────────────────────────────────────────
   زوايا رياضية: 0° يمينًا، والزيادة عكس عقارب الساعة بصريًّا بعد قلب
   محور y. لذلك `sweep-flag = 0` دائمًا في هذا الملف. */
const CX = 100;
const CY = 100;
const R = 82;
const STROKE = 15;

const pt = (deg: number, r = R) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
};
const n2 = (v: number) => Math.round(v * 100) / 100;

function arcPath(fromDeg: number, toDeg: number, r = R): string {
  const [x1, y1] = pt(fromDeg, r);
  const [x2, y2] = pt(toDeg, r);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  return `M ${n2(x1)},${n2(y1)} A ${r},${r} 0 ${large} 0 ${n2(x2)},${n2(y2)}`;
}

function deriveTone(
  value: number,
  thresholds: GaugeThresholds | undefined,
  higherIsWorse: boolean,
): ReportTone | undefined {
  if (!thresholds) return undefined;
  const { warning, danger } = thresholds;
  const past = (t: number) => (higherIsWorse ? value >= t : value <= t);
  if (danger !== undefined && past(danger)) return "danger";
  if (warning !== undefined && past(warning)) return "warning";
  if (warning !== undefined || danger !== undefined) return "success";
  return undefined;
}

function gaugeTable(
  title: string,
  value: number | null,
  unit: string | undefined,
  tone: ReportTone | undefined,
  min: number,
  max: number,
): AltTable {
  return {
    columns: ["المؤشر", unit ? `القيمة (${unit})` : "القيمة", "المدى", "الحالة"],
    rows: [
      [
        title,
        formatValue(value, unit),
        `${formatValue(min)} — ${formatValue(max)}`,
        tone ? TONE_WORD[tone] : NOT_MEASURED,
      ],
    ],
  };
}

export function ReportGaugeChart({
  title,
  caption,
  unit,
  value,
  min = 0,
  max = 100,
  centerLabel,
  thresholds,
  higherIsWorse = true,
  tone: explicitTone,
  height = 176,
  width,
  staticRender,
  className,
}: ReportGaugeChartProps): ReactElement {
  const measured = isMeasured(value);
  const span = max - min || 1;
  const clamp = (v: number) => Math.min(1, Math.max(0, (v - min) / span));

  const tone = measured
    ? (explicitTone ?? deriveTone(value, thresholds, higherIsWorse))
    : undefined;
  const fraction = measured ? clamp(value) : 0;
  const valueClass = tone ? TONE_CLASS[tone] : "rpt-series-1";

  const aria = [
    `مقياس: ${title}.`,
    measured
      ? `القيمة ${formatValue(value, unit)} من مدى ${formatValue(min)} إلى ${formatValue(max)}.`
      : `${NOT_MEASURED}. لا قوس مرسوم ولا حالة.`,
    tone ? `الحالة: ${TONE_WORD[tone]}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const ticks = [0, 45, 90, 135, 180];

  return (
    <ChartShell
      title={title}
      caption={caption}
      ariaLabel={aria}
      staticRender={staticRender}
      className={className}
      table={gaugeTable(title, value, unit, tone, min, max)}
    >
      <div className="rpt-gauge">
        <svg
          viewBox="0 0 200 118"
          width={width ?? "100%"}
          height={height}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          focusable="false"
        >
          {/* وجه الجهاز — يبقى قِيس أو لم يُقَس. */}
          <path
            className="rpt-gauge-track"
            d={arcPath(0, 180)}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          {ticks.map((t) => {
            const [x1, y1] = pt(t, R - STROKE / 2 - 3);
            const [x2, y2] = pt(t, R - STROKE / 2 - 9);
            return (
              <line
                key={t}
                className="rpt-gauge-tick"
                x1={n2(x1)}
                y1={n2(y1)}
                x2={n2(x2)}
                y2={n2(y2)}
                strokeWidth={1.5}
              />
            );
          })}

          {/* قوس القيمة — الحارس: لا يُرسم إذا لم يُقَس (المادة ٢٧). */}
          {measured ? (
            <path
              className={`rpt-gauge-value ${valueClass}`}
              d={arcPath(0, 180 * fraction)}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
          ) : null}

          {/* علامتا العتبة — بشكليهما لا بلونيهما وحدهما. */}
          {thresholds?.warning !== undefined
            ? (() => {
                const [x, y] = pt(180 * clamp(thresholds.warning), R + STROKE / 2 + 6);
                return <ToneMark tone="warning" cx={n2(x)} cy={n2(y)} r={5} />;
              })()
            : null}
          {thresholds?.danger !== undefined
            ? (() => {
                const [x, y] = pt(180 * clamp(thresholds.danger), R + STROKE / 2 + 6);
                return <ToneMark tone="danger" cx={n2(x)} cy={n2(y)} r={5} />;
              })()
            : null}
        </svg>

        <div className="rpt-gauge-read" aria-hidden="true">
          <span className={measured ? "rpt-core-value" : "rpt-core-value rpt-legend-unmeasured"}>
            {measured ? formatValue(value, unit) : NOT_MEASURED}
          </span>
          {centerLabel ? <span className="rpt-core-label">{centerLabel}</span> : null}
          {tone ? (
            <span className={`rpt-badge ${TONE_CLASS[tone]}`}>
              <ToneGlyph tone={tone} />
              {TONE_WORD[tone]}
            </span>
          ) : null}
        </div>
      </div>
    </ChartShell>
  );
}

/**
 * رسوم التقرير — SVG مضمّن، مرسوم كاملًا عند أوّل رسم.
 *
 * لماذا SVG بخطوط اليد لا مكتبة رسم: `recharts` وأخواتها ترسم داخل
 * `ResponsiveContainer` الذي يقيس الحاوية عبر `ResizeObserver` — فيخرج
 * الرسم **فارغًا في أوّل إطار**، وفارغًا في الطباعة، وفارغًا في أي بيئة
 * بلا قياس. وذلك بالضبط ما يمنعه طلب المالك: «تفتح تلقائيًّا بمجرّد النظر
 * للتقرير». الـSVG المضمّن بـ`viewBox` يظهر بلا جافاسكربت ولا قياس ولا
 * تفاعل، ويطبع كما يُعرض.
 *
 * الألوان: `--rv-series-1..6` من طبقة الرموز عبر `data-series` — لا لون
 * مكتوب في الترميز، ولا `fill="white"` (المادة ٣٣ §٢): كل تعبئة
 * `currentColor` والـCSS هي من يمنح اللون.
 */
import type { ReportChartBlock, ReportChartPoint } from "./report-document.types";

const W = 480;
const H = 260;
const PAD_X = 44;
const PAD_TOP = 28;
const PAD_BOTTOM = 52;
const BASE_Y = H - PAD_BOTTOM;
const PLOT_W = W - PAD_X * 2;
const PLOT_H = BASE_Y - PAD_TOP;

/** أرقام لاتينية داخل نصّ عربي — الاتفاق المعتمد في لوحات سَدِيد. */
const NUM = new Intl.NumberFormat("ar-SA-u-nu-latn", { maximumFractionDigits: 2 });

export function formatReportNumber(value: number): string {
  return NUM.format(value);
}

function seriesIndex(i: number): number {
  return (i % 6) + 1;
}

function maxValue(points: ReportChartPoint[]): number {
  const max = Math.max(...points.map((p) => p.value), 0);
  return max > 0 ? max : 1;
}

/** وصف نصّي كامل للرسم — يقرأه القارئ الصوتي بدل الصورة. */
function chartSummary(block: ReportChartBlock): string {
  const unit = block.unitAr ? ` ${block.unitAr}` : "";
  const body = block.points
    .map((p) => `${p.labelAr}: ${formatReportNumber(p.value)}${unit}`)
    .join("، ");
  return `${block.titleAr} — ${body}`;
}

/** أعمدة. الترتيب من اليمين إلى اليسار احترامًا لاتجاه القراءة. */
function BarChart({ block }: { block: ReportChartBlock }) {
  const points = block.points;
  const max = maxValue(points);
  const step = PLOT_W / Math.max(points.length, 1);
  const barW = Math.min(step * 0.55, 64);
  const grid = [0.25, 0.5, 0.75, 1];

  return (
    <g>
      {grid.map((g) => (
        <line
          key={g}
          className="rv-chart-grid"
          x1={PAD_X}
          x2={W - PAD_X}
          y1={BASE_Y - g * PLOT_H}
          y2={BASE_Y - g * PLOT_H}
        />
      ))}
      <line className="rv-chart-axis" x1={PAD_X} x2={W - PAD_X} y1={BASE_Y} y2={BASE_Y} />
      {points.map((p, i) => {
        const slotRight = W - PAD_X - i * step;
        const x = slotRight - step + (step - barW) / 2;
        const h = (p.value / max) * PLOT_H;
        const y = BASE_Y - h;
        return (
          <g key={`${p.labelEn}-${i}`} data-series={seriesIndex(i)} className="rv-chart-series">
            <rect
              className="rv-chart-bar"
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 1)}
              rx="3"
            />
            <text className="rv-chart-value" x={x + barW / 2} y={y - 7} textAnchor="middle">
              {formatReportNumber(p.value)}
            </text>
            <text
              className="rv-chart-label"
              x={slotRight - step / 2}
              y={BASE_Y + 20}
              textAnchor="middle"
            >
              {p.labelAr}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** خط زمني. النقطة الأولى على اليمين. */
function LineChart({ block }: { block: ReportChartBlock }) {
  const points = block.points;
  const max = maxValue(points);
  const step = PLOT_W / Math.max(points.length, 1);
  const coords = points.map((p, i) => {
    const x = W - PAD_X - i * step - step / 2;
    const y = BASE_Y - (p.value / max) * PLOT_H;
    return { ...p, x, y };
  });
  const path = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area =
    coords.length > 0
      ? `M ${coords[0].x},${BASE_Y} L ${coords.map((c) => `${c.x},${c.y}`).join(" L ")} L ${
          coords[coords.length - 1].x
        },${BASE_Y} Z`
      : "";
  const grid = [0.25, 0.5, 0.75, 1];

  return (
    <g data-series={1} className="rv-chart-series">
      {grid.map((g) => (
        <line
          key={g}
          className="rv-chart-grid"
          x1={PAD_X}
          x2={W - PAD_X}
          y1={BASE_Y - g * PLOT_H}
          y2={BASE_Y - g * PLOT_H}
        />
      ))}
      <line className="rv-chart-axis" x1={PAD_X} x2={W - PAD_X} y1={BASE_Y} y2={BASE_Y} />
      {area && <path className="rv-chart-area" d={area} />}
      <polyline className="rv-chart-line" points={path} />
      {coords.map((c, i) => (
        <g key={`${c.labelEn}-${i}`}>
          <circle className="rv-chart-dot" cx={c.x} cy={c.y} r="4" />
          <text className="rv-chart-value" x={c.x} y={c.y - 10} textAnchor="middle">
            {formatReportNumber(c.value)}
          </text>
          <text className="rv-chart-label" x={c.x} y={BASE_Y + 20} textAnchor="middle">
            {c.labelAr}
          </text>
        </g>
      ))}
    </g>
  );
}

/** حلقة توزيع. المجموع في المركز. */
function DonutChart({ block }: { block: ReportChartBlock }) {
  const points = block.points;
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const safeTotal = total > 0 ? total : 1;
  const cx = W / 2;
  const cy = PAD_TOP + PLOT_H / 2;
  const r = 74;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <g>
      <circle className="rv-chart-donut-track" cx={cx} cy={cy} r={r} />
      {points.map((p, i) => {
        const len = (p.value / safeTotal) * circumference;
        const dash = `${len} ${circumference - len}`;
        const dashOffset = -offset;
        offset += len;
        return (
          <circle
            key={`${p.labelEn}-${i}`}
            className="rv-chart-donut-seg"
            data-series={seriesIndex(i)}
            cx={cx}
            cy={cy}
            r={r}
            strokeDasharray={dash}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
      })}
      <text className="rv-chart-total" x={cx} y={cy + 2} textAnchor="middle">
        {formatReportNumber(total)}
      </text>
      <text className="rv-chart-total-label" x={cx} y={cy + 24} textAnchor="middle">
        الإجمالي
      </text>
    </g>
  );
}

/**
 * كتلة الرسم: عنوان + رسم + مفتاح قِيَم **ظاهر**.
 *
 * المفتاح ليس زينة: قراءة الرسم لا تُترك للّون وحده (WCAG 2.2 §1.4.1)،
 * وكل نقطة تظهر بقيمتها نصًّا فيبقى الرسم مقروءًا مطبوعًا بالأبيض والأسود
 * ولمن لا يميّز الأطياف.
 */
export function ReportChart({ block, headingId }: { block: ReportChartBlock; headingId: string }) {
  const total = block.points.reduce((sum, p) => sum + p.value, 0) || 1;

  return (
    <figure
      className="rv-block rv-chart-block"
      data-block="chart"
      data-chart={block.chart}
      aria-labelledby={headingId}
    >
      <h3 className="rv-block-title" id={headingId}>
        {block.titleAr}
        <span className="rv-en" lang="en" dir="ltr">
          {block.titleEn}
        </span>
      </h3>
      <svg
        className="rv-chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={chartSummary(block)}
        preserveAspectRatio="xMidYMid meet"
      >
        {block.chart === "bar" && <BarChart block={block} />}
        {block.chart === "line" && <LineChart block={block} />}
        {block.chart === "donut" && <DonutChart block={block} />}
      </svg>
      <ul className="rv-chart-legend">
        {block.points.map((p, i) => (
          <li
            className="rv-chart-legend-item"
            key={`${p.labelEn}-${i}`}
            data-series={seriesIndex(i)}
          >
            <span className="rv-chart-swatch" aria-hidden="true" />
            <span className="rv-chart-legend-label">
              {p.labelAr}
              <span className="rv-en" lang="en" dir="ltr">
                {p.labelEn}
              </span>
            </span>
            <span className="rv-chart-legend-value">
              {formatReportNumber(p.value)}
              {block.unitAr ? <span className="rv-unit"> {block.unitAr}</span> : null}
              {block.chart === "donut" ? (
                <span className="rv-chart-legend-share">
                  {" "}
                  ({formatReportNumber(Math.round((p.value / total) * 100))}%)
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

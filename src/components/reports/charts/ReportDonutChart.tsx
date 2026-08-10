/**
 * رسم حلقي — تركيبة مجموع.
 *
 * ## القوس الغائب
 *
 * الشريحة التي قيمتها `null` **تُحذف من الرسم ولا تُعطى زاوية**، وتبقى في
 * الوسيلة وفي الجدول البديل مكتوبةً «لم يُقَس». وهذا ليس تجميلًا: لو
 * أُعطيت زاوية صفرية لبقيت في المجموع مقامًا، فتُقسَّم النسب على مجموع
 * يشمل ما لم يُقَس — وكل نسبة في الرسم تصير خطأً صامتًا. المقام هنا
 * **مجموع المقيس وحده**، والحاشية تقول إن جزءًا خارج الحساب. (المادة ٢٧)
 *
 * ## الاتجاه
 *
 * الأقواس تمضي من أعلى **عكس عقارب الساعة** (`90 → 450`)، فتُقرأ الشريحة
 * الأولى إلى يمين المحور الرأسي كما تبدأ القراءة العربية. اتجاه عقارب
 * الساعة عرفٌ لاتيني يضع الأولى يسارًا.
 */
import type { ReactElement } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { ChartShell, unmeasuredNote } from "./ChartShell";
import { SliceLegend } from "./ChartLegend";
import {
  NOT_MEASURED,
  TONE_CLASS,
  formatValue,
  isMeasured,
  seriesClass,
  type AltTable,
  type ReportChartBase,
  type ReportSlice,
} from "./chart-tokens";

export interface ReportDonutChartProps extends ReportChartBase {
  slices: readonly ReportSlice[];
  /** نصّ صغير تحت الرقم في اللبّ (مثل «إجمالي البلاغات»). */
  centerLabel?: string;
  /** سماكة الحلقة كنسبة من نصف القطر. صفر يعطي فطيرة مصمتة. */
  thickness?: number;
}

function donutTable(slices: readonly ReportSlice[], total: number, unit?: string): AltTable {
  return {
    columns: ["الشريحة", unit ? `القيمة (${unit})` : "القيمة", "النسبة"],
    rows: slices.map((s) => [
      s.label,
      formatValue(s.value, unit),
      isMeasured(s.value) && total > 0 ? `${((s.value / total) * 100).toFixed(1)}٪` : NOT_MEASURED,
    ]),
  };
}

export function ReportDonutChart({
  title,
  caption,
  unit,
  slices,
  centerLabel,
  height = 240,
  width,
  staticRender,
  className,
  thickness = 0.42,
}: ReportDonutChartProps): ReactElement {
  // الحذف صريح لا اتّكال على سلوك المكتبة: القارئ اللاحق يرى القاعدة هنا.
  const measured = slices.filter((s) => isMeasured(s.value));
  const total = measured.reduce((sum, s) => sum + (s.value as number), 0);
  const missing = slices.filter((s) => !isMeasured(s.value)).map((s) => s.label);
  const empty = measured.length === 0;

  const pieData = measured.map((s) => ({ label: s.label, value: s.value as number, tone: s.tone }));
  const outer = Math.max(40, Math.min(height, 320) / 2 - 12);
  const inner = Math.round(outer * (1 - thickness));

  const biggest = [...measured].sort((a, b) => (b.value as number) - (a.value as number))[0];
  const aria = [
    `رسم حلقي: ${title}.`,
    `${slices.length} شريحة، منها ${measured.length} مقيسة.`,
    `الإجمالي المقيس ${formatValue(total, unit)}.`,
    biggest && total > 0
      ? `أكبر شريحة ${biggest.label} بنسبة ${(((biggest.value as number) / total) * 100).toFixed(1)}٪.`
      : "",
    missing.length > 0 ? `${NOT_MEASURED}: ${missing.join(" · ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const chart = (
    <PieChart
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      {...(width ? { width, height } : {})}
    >
      <Pie
        data={pieData}
        dataKey="value"
        nameKey="label"
        cx="50%"
        cy="50%"
        innerRadius={inner}
        outerRadius={outer}
        startAngle={90}
        endAngle={450}
        paddingAngle={measured.length > 1 ? 1.5 : 0}
        /* الافتراضي `#fff` — لون خام يشقّ الحلقة أبيضَ في الوضع الداكن.
           `none` يمحوه من الترميز أصلًا، والفصل يقع بـ`paddingAngle`. */
        stroke="none"
        isAnimationActive={!staticRender}
        labelLine={false}
      >
        {pieData.map((s, i) => (
          <Cell
            key={s.label}
            className={s.tone ? TONE_CLASS[s.tone] : seriesClass(i)}
            fill="currentColor"
          />
        ))}
      </Pie>
    </PieChart>
  );

  return (
    <ChartShell
      title={title}
      caption={caption}
      ariaLabel={aria}
      staticRender={staticRender}
      className={className}
      legend={<SliceLegend slices={slices} unit={unit} />}
      note={unmeasuredNote(missing, slices.length)}
      table={donutTable(slices, total, unit)}
      empty={empty}
    >
      {width ? (
        chart
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {chart}
        </ResponsiveContainer>
      )}
      {/* اللبّ خارج الـSVG: نصّ HTML يرث خطّ الطقم ويلتفّ، ونصّ `<text>`
          العربي داخل SVG لا يفعل أيًّا منهما. `aria-hidden` لأن الوصف
          والجدول يحملانه. */}
      <div className="rpt-core" aria-hidden="true">
        <span className="rpt-core-value">{empty ? NOT_MEASURED : formatValue(total, unit)}</span>
        {centerLabel ? <span className="rpt-core-label">{centerLabel}</span> : null}
      </div>
    </ChartShell>
  );
}

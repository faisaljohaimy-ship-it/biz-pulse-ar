/**
 * وردة المناطق — القلب الهندسي للمُخطَّط التنفيذي.
 *
 * لماذا وردة بوصلة لا أربع بطاقات: المناطق الأربع ليست قائمة اعتباطية، لها
 * مواضع على الأرض. فحين توضع الغربية غربَ الرسم والشرقية شرقه والجنوبية
 * جنوبه، صار الشكل يحمل معنى لا زينة — والعين تقرأ الموضع قبل أن تقرأ الاسم.
 * الوسطى وحدها بلا اتجاه، فتأخذ رأس المحور.
 *
 * الترميز صادق (المادة ٢٧): طول القوس ∝ نسبة الامتثال، ينمو متناظرًا حول محور
 * المنطقة. وما لم يُقَس لا يُرسم له قوس قيمة إطلاقًا — يبقى المسار وحده،
 * ويُقرأ «لم يُقَس» في الوسم النصّي. الصفر ليس بديلًا عن الغياب.
 *
 * الرسم نفسه مُخفى عن القارئات (`aria-hidden`): هو تمثيل بصري لأرقام تُقرأ
 * كاملةً في الأزرار تحته. لا معلومة تعيش في الشكل وحده.
 */
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";

/** موضع كل منطقة على البوصلة — صفر عند الأعلى، ويزيد مع عقارب الساعة. */
const COMPASS: Record<RegionId, number> = {
  central: 0, // الوسطى — رأس المحور، إذ لا اتجاه لها
  eastern: 90, // الشرقية — شرق الرسم
  southern: 180, // الجنوبية — جنوبه
  western: 270, // الغربية — غربه
};

const SIZE = 260;
const C = SIZE / 2;
const R_ARC = 84;
/** نصف اتساع قوس المنطقة بالدرجات — يترك فجوة ١٤° بين كل قوسين. */
const HALF_SPAN = 38;
const R_TICK = 101;
/** حلقة الأسماء خارج حلقة القياس — تجعل الوردة مقروءة بذاتها لا بجدول جانبي. */
const R_LABEL = 116;
const R_HUB = 31;

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) };
}

/** مسار قوس دائري بين زاويتين — يُدار دائمًا مع عقارب الساعة. */
function arcPath(r: number, from: number, to: number) {
  const a = polar(r, from);
  const b = polar(r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/** طول القوس بالبكسل — يُمرَّر إلى CSS ليرسم نفسه بالتدريج. */
const arcLength = (r: number, deg: number) => (2 * Math.PI * r * deg) / 360;

export interface RegionRosetteProps {
  /** نسبة الامتثال لكل منطقة. الغياب = لم يُقَس، لا صفر. */
  values: Partial<Record<RegionId, number>>;
  /** المتوسط المعروض في القلب — `null` حين لا يُقاس. */
  average: number | null;
  activeRegion: RegionId;
  ar: boolean;
}

export function RegionRosette({ values, average, activeRegion, ar }: RegionRosetteProps) {
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);

  return (
    // `relative` تُدخل الرسم في طبقة العناصر الموضوعة فيُرسم فوق هالة الفن
    // ومداريها المجاورين — المطلقُ الموضع يعلو غيرَ الموضوع مهما تأخّر في DOM.
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="nx-bp-rosette relative h-full w-full text-[color:var(--ink)]"
      aria-hidden
      focusable="false"
    >
      {/* حَلْقة القياس — إطار الآلة. الدرجات الأربع الأصلية أطول وأوضح. */}
      <g className="nx-bp-bezel">
        {ticks.map((deg) => {
          const major = deg % 90 === 0;
          const inner = polar(R_TICK - (major ? 8 : 3.5), deg);
          const outer = polar(R_TICK, deg);
          return (
            <line
              key={deg}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="currentColor"
              strokeWidth={major ? 1.4 : 0.8}
              opacity={major ? 0.34 : 0.13}
            />
          );
        })}
      </g>

      {REGIONS.map((region, index) => {
        const axis = COMPASS[region.id];
        const raw = values[region.id];
        const measured = typeof raw === "number" && Number.isFinite(raw);
        const pct = measured ? Math.max(0, Math.min(100, raw)) : null;
        const half = pct === null ? 0 : (HALF_SPAN * pct) / 100;
        const spoke = polar(64, axis);
        const hub = polar(R_HUB + 5, axis);

        return (
          <g
            key={region.id}
            className="nx-bp-region"
            data-active={region.id === activeRegion || undefined}
            style={{ ["--bp-accent" as string]: REGION_ACCENT_HEX[region.id] }}
          >
            {/* خط الإنشاء — أثر الفرجار من القلب إلى القوس. */}
            <line
              x1={hub.x}
              y1={hub.y}
              x2={spoke.x}
              y2={spoke.y}
              className="nx-bp-spoke"
              strokeWidth="1"
              strokeDasharray="2 5"
            />

            {/* المسار: مدى المنطقة كاملًا، حاضر دائمًا حتى حين لا يُقاس شيء. */}
            <path
              d={arcPath(R_ARC, axis - HALF_SPAN, axis + HALF_SPAN)}
              className="nx-bp-track"
              fill="none"
              strokeWidth="11"
              strokeLinecap="round"
            />

            {/* القيمة: تنمو متناظرة حول المحور. لا تُرسم إن لم تُقَس. */}
            {pct !== null && pct > 0 && (
              <>
                <path
                  d={arcPath(R_ARC, axis - half, axis + half)}
                  className="nx-bp-arc"
                  fill="none"
                  strokeWidth="11"
                  strokeLinecap="round"
                  style={{
                    ["--bp-arc-len" as string]: `${arcLength(R_ARC, half * 2).toFixed(2)}`,
                    ["--bp-arc-i" as string]: index,
                  }}
                />
                {/* لمعتا الطرفين — تظهران بعد اكتمال رسم القوس، فتقرأ العين
                    حدَّي القياس نقطتي ضوء لا نهايتين مبتورتين. */}
                {[axis - half, axis + half].map((deg) => {
                  const tip = polar(R_ARC, deg);
                  return (
                    <circle
                      key={deg}
                      cx={tip.x.toFixed(2)}
                      cy={tip.y.toFixed(2)}
                      r="2.4"
                      className="nx-bp-arc-tip"
                      style={{ ["--bp-arc-i" as string]: index }}
                    />
                  );
                })}
              </>
            )}

            {/* الاسم عند محور المنطقة — الوردة تُقرأ وحدها بلا مفتاح جانبي،
                وتبقى مؤلَّفة حتى حين لا يُقاس شيء فلا تظهر حلقةً مكسورة. */}
            <text
              x={polar(R_LABEL, axis).x}
              y={polar(R_LABEL, axis).y + 3}
              textAnchor="middle"
              fill="currentColor"
              className="nx-bp-region-name"
            >
              {ar ? region.shortAr : region.shortEn}
            </text>
          </g>
        );
      })}

      {/* القلب — المتوسط، أو «لم يُقَس» صراحةً. */}
      <circle cx={C} cy={C} r={R_HUB} className="nx-bp-hub" strokeWidth="1" />
      {/* المقاسات في الطبقة لا هنا: الأسلوب المضمّن يُعفي حامله من كل قاعدة
          عامة، فتُترك له الهندسة (`y`) وحدها وتُنقل الطباعة إلى CSS. */}
      <text
        x={C}
        y={average === null ? C + 2 : C - 1}
        textAnchor="middle"
        fill="currentColor"
        className="nx-bp-hub-value"
        data-empty={average === null || undefined}
      >
        {average === null ? (ar ? "لم يُقَس" : "not measured") : `${Math.round(average)}%`}
      </text>
      {average !== null && (
        <text
          x={C}
          y={C + 13}
          textAnchor="middle"
          fill="currentColor"
          className="nx-bp-hub-label"
          /* التباعد الحرفي يكسر وصل الحروف العربية — يُقصر على اللاتينية. */
          data-latin={!ar || undefined}
        >
          {ar ? "الامتثال" : "COMPLIANCE"}
        </text>
      )}
    </svg>
  );
}

export default RegionRosette;

/**
 * أدوات القياس — مسطرة المُخطَّط ولوحاته العدديّة.
 *
 * قاعدة واحدة تحكم الملف كلّه: **ما لم يُقَس لا يُرسم ولا يُلوَّن** (المادة ٢٧).
 * القيمة `null` تُقرأ «لم يُقَس»، ويبقى الشكل هيكلًا فارغًا — لا شريطًا بطول
 * صفر ولا رقمًا صفريًّا يوهم بقياس وقع. الصفر قياسٌ، والغياب ليس صفرًا.
 *
 * الأشكال مُخفاة عن القارئات: كل ما تحمله مكتوب رقمًا ونصًّا إلى جوارها.
 */

/** المسطرة الهندسية — تُعلن الوحدة التي يلتزمها التخطيط كلّه (٨px / ٦٤px). */
export function MeasureRail({ label }: { label: string }) {
  return (
    <div className="nx-bp-rail-wrap flex items-end gap-3">
      <span className="shrink-0 text-[12px] font-bold uppercase tracking-[0.34em] text-[color:var(--ink-3)]">
        {label}
      </span>
      <span aria-hidden className="nx-bp-rail relative block h-3 flex-1">
        <span className="nx-bp-rail-sweep" />
      </span>
    </div>
  );
}

/** رَكام مدرَّج — سبعة أعمدة، يضيء منها ما يوازي النسبة. */
function RidgeGlyph({ ratio }: { ratio: number | null }) {
  const steps = [10, 16, 13, 22, 18, 27, 24];
  const lit = ratio === null ? -1 : Math.round(ratio * steps.length);
  return (
    <svg viewBox="0 0 84 30" className="h-8 w-24" aria-hidden focusable="false">
      {steps.map((h, i) => (
        <rect
          key={i}
          x={i * 12}
          y={30 - h}
          width="7"
          height={h}
          rx="1.5"
          className={i < lit ? "nx-bp-glyph-on" : "nx-bp-glyph-off"}
        />
      ))}
    </svg>
  );
}

/** قوس مجزّأ — اثنا عشر قطاعًا على نصف دائرة. */
function SegmentGlyph({ ratio }: { ratio: number | null }) {
  const total = 12;
  const lit = ratio === null ? -1 : Math.round(ratio * total);
  return (
    <svg viewBox="0 0 84 44" className="h-8 w-24" aria-hidden focusable="false">
      {Array.from({ length: total }, (_, i) => {
        const deg = 180 + (i + 0.5) * (180 / total);
        const rad = (deg * Math.PI) / 180;
        const [cx, cy, r1, r2] = [42, 40, 22, 34];
        return (
          <line
            key={i}
            x1={cx + r1 * Math.cos(rad)}
            y1={cy + r1 * Math.sin(rad)}
            x2={cx + r2 * Math.cos(rad)}
            y2={cy + r2 * Math.sin(rad)}
            strokeWidth="4"
            strokeLinecap="round"
            className={i < lit ? "nx-bp-glyph-on-stroke" : "nx-bp-glyph-off-stroke"}
          />
        );
      })}
    </svg>
  );
}

/** مربّعات متداخلة مائلة — هدف الرسم الهندسي. */
function NestGlyph({ ratio }: { ratio: number | null }) {
  const rings = [30, 22, 14, 7];
  const lit = ratio === null ? -1 : Math.round(ratio * rings.length);
  return (
    <svg viewBox="0 0 84 44" className="h-8 w-24" aria-hidden focusable="false">
      <g transform="translate(42 22) rotate(45)">
        {rings.map((s, i) => (
          <rect
            key={s}
            x={-s / 2}
            y={-s / 2}
            width={s}
            height={s}
            rx="1.5"
            fill="none"
            strokeWidth="2.5"
            className={rings.length - i <= lit ? "nx-bp-glyph-on-stroke" : "nx-bp-glyph-off-stroke"}
          />
        ))}
      </g>
    </svg>
  );
}

const GLYPHS = { ridge: RidgeGlyph, segment: SegmentGlyph, nest: NestGlyph } as const;

export interface InstrumentPanelProps {
  label: string;
  /** `null` = لم يُقَس. لا يُستبدل بصفر إطلاقًا. */
  value: number | null;
  /** لاحقة العرض (مثل «٪») — تُهمَل حين لا يُقاس شيء. */
  suffix?: string;
  /** نسبة التعبئة ٠..١ لرسم الشكل، أو `null`. */
  ratio: number | null;
  glyph: keyof typeof GLYPHS;
  /** ثلاثي RGB للهجة اللوحة — يمرّ متغيّرًا لا لونًا نهائيًّا (المادة ٣٣). */
  accent: string;
  caption: string;
  notMeasured: string;
  index: number;
}

export function InstrumentPanel({
  label,
  value,
  suffix,
  ratio,
  glyph,
  accent,
  caption,
  notMeasured,
  index,
}: InstrumentPanelProps) {
  const Glyph = GLYPHS[glyph];
  const measured = value !== null;

  return (
    <article
      className="nx-bp-panel nx-bp-card relative overflow-hidden rounded-2xl p-4"
      style={{ ["--bp-accent-rgb" as string]: accent, ["--nx-bp-i" as string]: index }}
    >
      <span aria-hidden className="nx-bp-panel-corner" />

      <p className="text-xs font-semibold text-[color:var(--ink-2)]">{label}</p>

      <div className="mt-2 flex items-end justify-between gap-3">
        <p
          className={`font-black tabular-nums leading-none ${
            measured ? "text-3xl text-[color:var(--ink)]" : "text-base text-[color:var(--ink-3)]"
          }`}
        >
          {measured ? `${value}${suffix ?? ""}` : notMeasured}
        </p>
        <Glyph ratio={ratio} />
      </div>

      <p className="mt-3 border-t border-[color:var(--hairline-soft)] pt-2 text-[12px] text-[color:var(--ink-3)]">
        {caption}
      </p>
    </article>
  );
}

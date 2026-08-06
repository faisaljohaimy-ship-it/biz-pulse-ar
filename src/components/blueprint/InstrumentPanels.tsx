/**
 * أدوات القياس — مسطرة المُخطَّط ولوحاته العدديّة.
 *
 * قاعدة واحدة تحكم الملف كلّه: **ما لم يُقَس لا يُرسم ولا يُلوَّن** (المادة ٢٧).
 * القيمة `null` تُقرأ «لم يُقَس»، ويبقى الشكل هيكلًا فارغًا — لا شريطًا بطول
 * صفر ولا رقمًا صفريًّا يوهم بقياس وقع. الصفر قياسٌ، والغياب ليس صفرًا.
 *
 * الأشكال مُخفاة عن القارئات: كل ما تحمله مكتوب رقمًا ونصًّا إلى جوارها.
 *
 * ## أيقونة اللوحة — دائرة نبض (قرار المالك ٢٠٢٦/٠٨/٠٦)
 *
 * كانت لكل لوحة رسمٌ هندسي خاص بها (رَكام مدرَّج · قوس مجزّأ · مربّعات
 * متداخلة)، وكلٌّ يُكمّم النسبة إلى خطوات: سبعة أعمدة، اثنا عشر قطاعًا،
 * أربع حلقات. صارت الثلاثة **دائرة نبض واحدة** بلون اللوحة، والنسبة تُرسم
 * قوسًا متّصلًا على محيطها.
 *
 * ما رُبح بالتبديل، لا مجرّد ذوق: القوس المتّصل **أدقّ** من الرسوم
 * المكمَّمة — نسبة ٪٥٨ كانت تُدوَّر إلى ٤ أعمدة من ٧ فتُقرأ ٪٥٧، والقوس
 * يرسمها كما هي. ولغة الأيقونة صارت واحدة عبر النظام (نفس دائرة مركز
 * القيادة) بدل ثلاث لغات على بطاقة واحدة.
 *
 * وما حُفظ: `ratio === null` ⇐ **لا قوس يُرسم إطلاقًا**. الدائرة تنبض
 * لأن اللوحة حيّة، والقوس وحده يقول «قِيس». (المادة ٢٧)
 */
import { PulseGlyph } from "@/components/pulse/PulseGlyph";

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

export interface InstrumentPanelProps {
  label: string;
  /** `null` = لم يُقَس. لا يُستبدل بصفر إطلاقًا. */
  value: number | null;
  /** لاحقة العرض (مثل «٪») — تُهمَل حين لا يُقاس شيء. */
  suffix?: string;
  /** نسبة التعبئة ٠..١ لرسم قوس الدائرة، أو `null`. */
  ratio: number | null;
  /**
   * زمن نبضة الأيقونة بالثواني. يختلف بين اللوحات عمدًا: الوحدة في
   * الإيقاع تجعل الثلاث تخفق دفعةً واحدة فتُقرأ وميضًا متزامنًا مزعجًا،
   * والتفاوت يجعلها تُقرأ ثلاثة أجهزة قياس مستقلّة — وهي كذلك.
   */
  beatSeconds: number;
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
  beatSeconds,
  accent,
  caption,
  notMeasured,
  index,
}: InstrumentPanelProps) {
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
            measured
              ? "nx-bp-panel-value text-3xl text-[color:var(--ink)]"
              : "text-base text-[color:var(--ink-3)]"
          }`}
        >
          {measured ? `${value}${suffix ?? ""}` : notMeasured}
        </p>
        {/* بلا `label` ⇐ الدائرة تُخفي نفسها عن القارئات، والرقم إلى جوارها
            هو ما يُقرأ. لون اللكنة يُبنى من الثلاثي نفسه فلا لون ثانٍ. */}
        <PulseGlyph accent={`rgb(${accent})`} beatSeconds={beatSeconds} size={46} ratio={ratio} />
      </div>

      <p className="mt-3 border-t border-[color:var(--hairline-soft)] pt-2 text-[12px] text-[color:var(--ink-3)]">
        {caption}
      </p>
    </article>
  );
}

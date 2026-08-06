/**
 * PulseGlyph — الدائرة الرقمية المشعّة: حلقة زجاجية يسري داخلها نبضٌ سريع.
 *
 * قرار المالك ٢٠٢٦/٠٨/٠٦: تحمل أيقونات الصفحة الرئيسية هذه الدائرة بداخلها،
 * كلٌّ بلونها. وهي نفسها لغة أيقونات مركز القيادة (قرار ٢٠٢٦/٠٨/٠٥) — فمصدر
 * واحد يخدم السطحين بدل رسمين يتباعدان مع الوقت.
 *
 * **لماذا مكوّن واحد لا اثنان:** كانت هذه الطبقات مكتوبة داخل
 * `AgentPulseIcon` وحده. نسخُها إلى الرئيسية كان سيولّد نسختين من نفس
 * الشكل، وأول تعديل على إحداهما يفتح الفجوة. صارت الطبقات هنا،
 * و`AgentPulseIcon` يضيف فوقها معنى الحالة وحده.
 *
 * ## الطبقات (الإشعاع من الضوء لا من التشبّع)
 *   ① هالة تتنفّس خارج الحلقة        ② حلقة زجاجية + قرص داخلي
 *   ③ قوس القياس (اختياري)           ④ أثر الموجة الساكن
 *   ⑤ ضوء جارٍ فوق الموجة بـ`drop-shadow` بلون العنصر
 *
 * ## الصدق العددي (المادة ٢٧)
 * `ratio === null` ⇐ **لا قوس يُرسم**. الدائرة تبقى نابضة (النبض يقول «حيّ»
 * لا «مقيس»)، والقوس وحده يقول «قِيس وبلغ كذا». صفرٌ مرسوم مكان الغياب هو
 * ما تمنعه المادة، ورسمُ قوسٍ كامل مكان الغياب أسوأ منه.
 *
 * ## لا لون نهائي في الترميز (المادة ٣٣)
 * كل قيمة تمرّ متغيّرًا — `--pulse-accent` و`--pulse-beat` — فتبقى تحت طبقة
 * الرموز وقواعد الوضعين. والحركة تسكن مع `prefers-reduced-motion` ومع إيقاف
 * المستخدم للحركة (`html[data-nx-motion="off"]`)، وكلاهما في styles.css.
 */
import { cn } from "@/lib/utils";

/** مسار موجة النبض داخل مربّع 100×100 — قمّة حادّة واحدة كتخطيط القلب. */
export const PULSE_PATH = "M8 52 H30 L37 52 L43 30 L50 70 L57 46 L63 52 H92";

/** محيط حلقة القياس (r = 46) — ثابت مشتقّ لا رقم سحري. */
const ARC_CIRCUMFERENCE = 2 * Math.PI * 46;

export interface PulseGlyphProps {
  /** لون العنصر — قيمة لونية أو `var(--tone-*)`. يُمرَّر متغيّرًا لا يُكتب مباشرة. */
  accent: string;
  /** زمن النبضة بالثواني. أسرع = أنشط. */
  beatSeconds: number;
  /** الضلع بالبكسل. */
  size: number;
  /** هالة أوسع للعناصر البطلة. */
  ambient?: boolean;
  /** نسبة القياس ٠..١ لرسم قوس الحلقة، أو `null` = لم يُقَس ⇐ لا قوس. */
  ratio?: number | null;
  /** خافت: بلا ضوء جارٍ — للحالات الساكنة. الشكل يبقى مقروءًا بالأثر الساكن. */
  muted?: boolean;
  /** حلقة متقطّعة — تمييز بالشكل لا باللون وحده (WCAG 1.4.1). */
  dashedRing?: boolean;
  /**
   * وصف للقارئات. حين يُترك فارغًا يُخفى الشكل كليًّا (`aria-hidden`) —
   * وهذا هو الوضع الصحيح متى كان النص المجاور يقول ما تقوله الأيقونة.
   */
  label?: string;
  className?: string;
  /**
   * سمة حالة للمحدِّدات — تُكتب `data-pulse-state` **لا** `data-state`.
   *
   * السبب حادثة لا ذوق: في الطبقة العامة قاعدة غير مُطبَّقة
   * `[data-state="active"] { box-shadow: inset 0 -2px 0 0 var(--pv-edge) }`
   * موضوعة لمؤشّر التبويب النشط. وحالة الوكيل على الرئيسية اسمها `active`
   * أيضًا، فمرّرها المكوّن في `data-state` فرسمت القاعدة شريطًا سماويًّا
   * تحت الأيقونة. النقطة المحذوفة كانت تحجبه بظلّها الخاص بالمصادفة لا
   * بالتصميم. الاسم المُنَمذَج يُنهي التصادم من أصله بدل مطاردة أعراضه.
   */
  dataState?: string;
}

export function PulseGlyph({
  accent,
  beatSeconds,
  size,
  ambient = false,
  ratio = null,
  muted = false,
  dashedRing = false,
  label,
  className,
  dataState,
}: PulseGlyphProps) {
  const measured = ratio !== null && Number.isFinite(ratio);
  const clamped = measured ? Math.min(1, Math.max(0, ratio as number)) : 0;

  return (
    <span
      className={cn(
        "nx-pulse-icon",
        ambient && "nx-pulse-icon--ambient",
        muted && "nx-pulse-icon--muted",
        className,
      )}
      style={{
        ["--pulse-accent" as string]: accent,
        ["--pulse-beat" as string]: `${beatSeconds}s`,
        inlineSize: size,
        blockSize: size,
      }}
      data-pulse-state={dataState}
    >
      {/* ① الهالة المتنفّسة */}
      <span aria-hidden className="nx-pulse-halo" />

      <svg
        viewBox="0 0 100 100"
        className="nx-pulse-svg"
        {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
        focusable="false"
      >
        {/* ② الحلقة الزجاجية والقرص الداخلي */}
        <circle
          cx="50"
          cy="50"
          r="46"
          className="nx-pulse-ring"
          strokeDasharray={dashedRing ? "6 7" : undefined}
        />
        <circle cx="50" cy="50" r="38" className="nx-pulse-disc" />

        {/* ③ قوس القياس — يُرسم فقط حين يوجد قياس فعلي (المادة ٢٧). يبدأ من
            أعلى الحلقة: التدوير على العنصر نفسه لا على الأب، فلا يُزيح غيره.

            الطرف يصير `butt` عند الصفر بالذات: `round` على شرطة طولها صفر
            يرسم **نقطة** (سلوك SVG للمسار الصفري بطرف مستدير)، فيُقرأ قياسُ
            الصفر قيمةً ضئيلة غير صفرية. الصفر قياسٌ يُقال بالرقم إلى جوار
            الدائرة، ولا يُقال بقوسٍ لا طول له. */}
        {measured && (
          <circle
            cx="50"
            cy="50"
            r="46"
            className="nx-pulse-arc"
            strokeDasharray={`${(clamped * ARC_CIRCUMFERENCE).toFixed(2)} ${ARC_CIRCUMFERENCE.toFixed(2)}`}
            strokeLinecap={clamped === 0 ? "butt" : undefined}
            transform="rotate(-90 50 50)"
          />
        )}

        {/* ④⑤ أثر الموجة ثم الضوء الجاري فوقه */}
        <path d={PULSE_PATH} className="nx-pulse-track" />
        {!muted && <path d={PULSE_PATH} className="nx-pulse-spark" />}
      </svg>
    </span>
  );
}

export default PulseGlyph;

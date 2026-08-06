/**
 * AgentPulseIcon — أيقونة الوكيل المشعّة: نبضٌ سريع بدل الرسم الكرتوني.
 *
 * قرار المالك ٢٠٢٦/٠٨/٠٥: تُزال الوجوه الكرتونية من نوافذ مركز القيادة
 * وتحلّ محلّها أيقونات مشعّة لامعة على شكل نبض سريع.
 *
 * لماذا النبض بالذات: هذه بطاقات **حالة تشغيلية** لا صور أشخاص — وموجة
 * النبض تقول «حيّ ويعمل» بلغة لوحات المراقبة الصناعية نفسها، وتتفاوت
 * سرعتها بالحالة فيُقرأ نشاط الوكيل قبل أن يُقرأ نصّه:
 *   يتحدّث/يحلّل ← نبض سريع، ينصت/يبحث ← متوسط، جاهز ← هادئ،
 *   تعذّر ← بطيء بلون التحذير.
 *
 * الإشعاع مبنيّ من ثلاث طبقات لا من ظلٍّ واحد: هالة خارجية تتنفّس، وحلقة
 * زجاجية، وخطُّ نبضٍ يسري عليه ضوء متحرّك (stroke-dashoffset) مع
 * `drop-shadow` بلون الوكيل — فاللمعان يأتي من الضوء لا من التشبّع.
 *
 * اللون من لكنة الوكيل في السجل (`spec.palette.accent`)، ولا لون نهائيًّا في
 * الترميز: كل قيمة تمرّ متغيّرًا (`--pulse-accent`) فتحترم طبقة الرموز.
 * والحركة تسكن كاملةً مع `prefers-reduced-motion` (الأنماط في styles.css).
 */
import { cn } from "@/lib/utils";
import type { DigitalHumanSpec, DigitalHumanState } from "@/lib/digital-humans/registry";

interface Props {
  spec: DigitalHumanSpec;
  state: DigitalHumanState;
  size?: number;
  className?: string;
  ar?: boolean;
  /** هالة محيطة أوسع — للبطاقة الرئيسية (فِن) لا لبطاقات الشبكة. */
  ambient?: boolean;
}

/** إيقاع النبض بالحالة — بالثواني، أسرع ما يكون حين يعمل الوكيل فعلًا. */
const BEAT_SECONDS: Record<DigitalHumanState, number> = {
  speaking: 0.72,
  analyzing: 0.78,
  thinking: 0.9,
  searching: 0.9,
  reading: 1.05,
  listening: 1.05,
  idle: 1.6,
  waiting: 1.8,
  completed: 1.4,
  error: 2.2,
};

const STATE_LABEL: Record<DigitalHumanState, { ar: string; en: string }> = {
  idle: { ar: "جاهز", en: "Idle" },
  listening: { ar: "ينصت", en: "Listening" },
  thinking: { ar: "يفكّر", en: "Thinking" },
  searching: { ar: "يبحث", en: "Searching" },
  reading: { ar: "يقرأ", en: "Reading" },
  analyzing: { ar: "يحلّل", en: "Analyzing" },
  speaking: { ar: "يتحدّث", en: "Speaking" },
  waiting: { ar: "بانتظار", en: "Waiting" },
  completed: { ar: "اكتمل", en: "Completed" },
  error: { ar: "تعذّر", en: "Error" },
};

/** مسار موجة النبض داخل مربّع 100×100 — قمّة حادّة واحدة كتخطيط القلب. */
const PULSE_PATH = "M8 52 H30 L37 52 L43 30 L50 70 L57 46 L63 52 H92";

export function AgentPulseIcon({
  spec,
  state,
  size = 64,
  className,
  ar = true,
  ambient = false,
}: Props) {
  const label = ar ? STATE_LABEL[state].ar : STATE_LABEL[state].en;
  const name = ar ? spec.name_ar : spec.name_en;

  return (
    <div
      className={cn("nx-pulse-icon", ambient && "nx-pulse-icon--ambient", className)}
      style={{
        ["--pulse-accent" as string]: spec.palette.accent,
        ["--pulse-beat" as string]: `${BEAT_SECONDS[state]}s`,
        inlineSize: size,
        blockSize: size,
      }}
      data-state={state}
    >
      {/* الطبقة ١ — الهالة المتنفّسة */}
      <span aria-hidden className="nx-pulse-halo" />

      <svg
        viewBox="0 0 100 100"
        className="nx-pulse-svg"
        role="img"
        aria-label={`${name} — ${label}`}
      >
        {/* الطبقة ٢ — الحلقة الزجاجية والقرص الداخلي */}
        <circle cx="50" cy="50" r="46" className="nx-pulse-ring" />
        <circle cx="50" cy="50" r="38" className="nx-pulse-disc" />

        {/* الطبقة ٣ — أثر الموجة الساكن ثم الضوء الجاري فوقه */}
        <path d={PULSE_PATH} className="nx-pulse-track" />
        <path d={PULSE_PATH} className="nx-pulse-spark" />
      </svg>
    </div>
  );
}

export default AgentPulseIcon;

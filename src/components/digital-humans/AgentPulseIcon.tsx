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
 * **الطبقات نفسها مشتركة مع الرئيسية** منذ ٢٠٢٦/٠٨/٠٦: الرسم في
 * `PulseGlyph`، وهذا الملف يضيف فوقه معنى الحالة وحده (الإيقاع، الوصف،
 * والحلقة المتقطّعة عند التعذّر). فلغة الأيقونة واحدة في السطحين ولا يمكن
 * لأحدهما أن ينحرف عن الآخر بصمت.
 *
 * اللون من لكنة الوكيل في السجل (`spec.palette.accent`)، ولا لون نهائيًّا في
 * الترميز: كل قيمة تمرّ متغيّرًا فتحترم طبقة الرموز.
 */
import { PulseGlyph } from "@/components/pulse/PulseGlyph";
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
    <PulseGlyph
      accent={spec.palette.accent}
      beatSeconds={BEAT_SECONDS[state]}
      size={size}
      ambient={ambient}
      // «تعذّر» يُقال بالشكل لا باللون وحده (WCAG 1.4.1).
      dashedRing={state === "error"}
      label={`${name} — ${label}`}
      className={className}
      dataState={state}
    />
  );
}

export default AgentPulseIcon;

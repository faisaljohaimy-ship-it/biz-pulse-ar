/**
 * SadeedStagePresence — حضور المساعد في وسط الصفحة الرئيسية.
 *
 * ── طلب المالك (بند ٧) ──
 * «سديد يكون بنفس وضوح التجربة السابقة في منتصف الصفحة ويتكلم ونقدر نصمته».
 * الوضوح هو المقصود، لا الشكل الحرفي: وجهٌ بحجم يُرى، واسمٌ مقروء، وحالةٌ
 * منطوقة بالكلمات، وفعلٌ واحد ظاهر يبدأ الكلام. الزرّ العائم في الزاوية
 * (‏56px‏ في ركن الشاشة) يبقى كما هو للوصول السريع من كل صفحة — لكنه لا
 * يصلح أن يكون **التعريف** بالمساعد على الصفحة الأولى.
 *
 * ── لماذا كتلة في مجرى الصفحة، لا طبقة عائمة ──
 * الطبقة العائمة في المنتصف كانت ستحجب ما تحتها وتبتلع لمسة التمرير على
 * ‏390px‏. هذه الكتلة عنصر عادي في التدفّق: تدفع ما بعدها ولا تغطّيه، ولا
 * تحمل `position: fixed` ولا `inset-0`، فالتمرير يمرّ خلالها وفوقها سواء.
 *
 * ── التباين ──
 * كل لون من طبقة الرموز (`--ink` · `--surface-2` · `--chip` · `--hairline` ·
 * `--tone-*`) فيعمل السطح في الوضعين. ولا يُعتمد على شفافية أي خلفية: الكتلة
 * تفرش أرضيتها بنفسها، فلو صارت الخلفية ساكنة داكنة أو فاتحة بقي النص مقروءًا.
 *
 * ── الصوت ──
 * لا نطق من هنا مباشرة. الزرّ الأول يفتح اللوحة **ويطلب** المخاطبة الصوتية،
 * فينطق المساعد من مساره الوحيد: الخادم `‎/api/sadeed/tts`‎ عبر `SadeedAudioBus`.
 * `speechSynthesis` ممنوع في كل المسارات (عقيدة غير قابلة للتفاوض)، ولا
 * مزوّد ولا صوت يُبدَّل من هنا.
 */
import { useCallback } from "react";
import { Mic, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSadeedStore } from "@/lib/sadeed-core/store";
import { useSadeedPresenceState } from "@/lib/sadeed/sadeed-state";
import { SadeedAudioBus } from "@/lib/sadeed/audio-bus";
import { SadeedVideoAvatar } from "@/components/sadeed/SadeedVideoAvatar";
import { SadeedMuteToggle } from "@/components/sadeed/SadeedMuteToggle";
import { SADEED_DISPLAY_NAME_AR, SADEED_DISPLAY_NAME_AR_PLAIN } from "@/lib/sadeed-core/branding";

const PORTRAIT_SRC = "/sadeed-portrait.webp";

/** الحالة بالكلمات لا باللون وحده (WCAG 2.2 §1.4.1). */
const STATE_LABEL_AR: Record<string, string> = {
  idle: "جاهز للمخاطبة",
  listening: "يُصغي إليك",
  thinking: "يفكّر…",
  speaking: "يتحدّث الآن",
};

export interface SadeedStagePresenceProps {
  className?: string;
}

export function SadeedStagePresence({ className }: SadeedStagePresenceProps) {
  const presence = useSadeedPresenceState();
  const requestVoiceConversation = useSadeedStore((s) => s.requestVoiceConversation);
  const setMode = useSadeedStore((s) => s.setMode);
  const speaking = presence === "speaking";
  const live = presence !== "idle";

  // فتح قفل الصوت داخل اللمسة نفسها. متصفّحات الجوال ترفض أول تشغيل صوتي
  // يقع خارج إيماءة حقيقية، والإيماءة هنا هي `pointerdown` لا `click`:
  // الأخيرة تقع بعد رفع الإصبع وقد تخرج من نافذة الإذن.
  const unlockAudio = useCallback(() => {
    try {
      SadeedAudioBus.unlock();
    } catch {
      /* لمسة لاحقة تعيد المحاولة */
    }
  }, []);

  return (
    <section
      dir="rtl"
      aria-label={`المساعد ${SADEED_DISPLAY_NAME_AR_PLAIN}`}
      className={cn(
        "relative mx-auto w-full max-w-[720px] overflow-hidden rounded-[1.75rem]",
        "border border-[color:var(--hairline)] bg-[color:var(--surface-2)]",
        "px-5 py-6 text-center shadow-[0_18px_48px_-24px_rgba(0,0,0,0.55)]",
        "sm:px-8 sm:py-8",
        className,
      )}
    >
      {/* هالة خافتة خلف الوجه — زينة صرفة، تحت النص لا فوقه. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_srgb,var(--tone-cyan)_18%,transparent)_0%,transparent_100%)]"
      />

      <div className="relative flex flex-col items-center gap-4 sm:gap-5">
        {/* الوجه: ‏128px‏ على الجوال و‏160px‏ على الشاشات الأوسع — حجمٌ يُرى
            من مسافة الجلوس، وهو المقصود بـ«الوضوح». الحلقة تشتدّ عند النطق،
            والحالة مكتوبة تحتها فلا تُنقل بالحركة وحدها. */}
        <div
          className={cn(
            "relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-2 bg-[#04070F]",
            "transition-[border-color,box-shadow] duration-300 sm:h-40 sm:w-40",
            speaking
              ? "border-[color:var(--tone-emerald)] shadow-[0_0_36px_-4px_color-mix(in_srgb,var(--tone-emerald)_60%,transparent)]"
              : "border-[color:var(--hairline)]",
          )}
        >
          <SadeedVideoAvatar
            poster={PORTRAIT_SRC}
            className="absolute inset-0"
            mediaStyle={{ objectFit: "cover", objectPosition: "center top" }}
            active={speaking}
          />
        </div>

        <div className="flex flex-col items-center gap-1">
          <h2 className="text-3xl font-black leading-tight text-[color:var(--ink)] sm:text-4xl">
            {SADEED_DISPLAY_NAME_AR}
          </h2>
          <p className="max-w-[46ch] text-sm text-[color:var(--ink-2)]">
            مساعدك التنفيذي للأمن الصناعي — اسأله بصوتك أو بالكتابة.
          </p>
        </div>

        {/* الحالة: نصّ حيّ يُعلَن للقارئ الآلي عند تبدّله. النقطة زينة
            مصاحبة للنص، لا بديلًا عنه. */}
        <p
          aria-live="polite"
          className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[color:var(--hairline-soft)] bg-[color:var(--chip)] px-3 py-1 text-[13px] font-semibold text-[color:var(--ink-2)]"
        >
          <span
            aria-hidden
            className={cn(
              "h-2 w-2 rounded-full",
              live
                ? "bg-[color:var(--tone-emerald)] motion-safe:animate-pulse"
                : "bg-[color:var(--tone-cyan)]",
            )}
          />
          {STATE_LABEL_AR[presence] ?? STATE_LABEL_AR.idle}
        </p>

        {/* الأفعال: عمود على الجوال وصفّ على الشاشات الأوسع. كل هدف ≥ ٤٤px
            ارتفاعًا (‏min-h-12‏ = ‏48px‏) — §2.5.8. */}
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-center sm:gap-3">
          <button
            type="button"
            onPointerDown={unlockAudio}
            onClick={() => {
              unlockAudio();
              requestVoiceConversation();
            }}
            className={cn(
              "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6",
              "border border-[color:var(--tone-emerald)] bg-[color:var(--tone-emerald)]",
              "text-base font-black text-[color:var(--surface)] transition-[filter]",
              "hover:brightness-110",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-[color:var(--tone-cyan)]",
            )}
          >
            <Mic className="h-5 w-5 shrink-0" aria-hidden />
            {`تحدّث مع ${SADEED_DISPLAY_NAME_AR}`}
          </button>

          <button
            type="button"
            onPointerDown={unlockAudio}
            onClick={() => setMode("docked")}
            className={cn(
              "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5",
              "border border-[color:var(--hairline)] bg-[color:var(--chip)]",
              "text-base font-bold text-[color:var(--ink)] transition-colors",
              "hover:border-[color:var(--hairline-hover)] hover:bg-[color:var(--chip-hover)]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-[color:var(--tone-cyan)]",
            )}
          >
            <MessageSquare className="h-5 w-5 shrink-0" aria-hidden />
            اكتب رسالة
          </button>

          <SadeedMuteToggle withLabel className="min-h-12" />
        </div>
      </div>
    </section>
  );
}

export default SadeedStagePresence;

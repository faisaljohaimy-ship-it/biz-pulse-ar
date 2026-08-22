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
import {
  useCallback,
  useRef,
  useState,
  type AnimationEvent as ReactAnimationEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Mic, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSadeedStore } from "@/lib/sadeed-core/store";
import { useSadeedPresenceState } from "@/lib/sadeed/sadeed-state";
import { SadeedAudioBus } from "@/lib/sadeed/audio-bus";
import { SadeedVideoAvatar } from "@/components/sadeed/SadeedVideoAvatar";
import { SadeedMuteToggle } from "@/components/sadeed/SadeedMuteToggle";
import { SADEED_DISPLAY_NAME_AR, SADEED_DISPLAY_NAME_AR_PLAIN } from "@/lib/sadeed-core/branding";

const PORTRAIT_SRC = "/sadeed-portrait.webp";

/** خلفية البطاقة كاملةً (أمر المالك ٢٠٢٦/٠٨/١١). */
const CARD_BG_SRC = "/sadeed-stage-poster.webp";

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

  // ── REQ-020: هولوغرام تفاعلي فوق الشخصية ──
  // الحالة الساكنة مكتملة (تلوين + خطوط مسح + توهج قاعدي + لمعة دورية من
  // CSS وحدها)؛ الإمالة والنبضة **إضافة حياة** لا شرط مظهر — فعلى الجوال
  // بلا مؤشر يبقى الهولوغرام بكامل هيئته. الإمالة تُكتب متغيّرَي CSS على
  // الإطار مباشرة (بلا إعادة رسم React لكل حركة مؤشر)، والقيم النهائية في
  // `styles.css` — الأسلوب المضمّن يمرّر متغيّرات لا قيمًا.
  const holoFrameRef = useRef<HTMLDivElement>(null);
  const [holoPulsing, setHoloPulsing] = useState(false);

  const tiltHologram = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = holoFrameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--holo-ry", `${(px * 10).toFixed(2)}deg`);
    el.style.setProperty("--holo-rx", `${(py * -8).toFixed(2)}deg`);
  }, []);

  const restHologram = useCallback(() => {
    const el = holoFrameRef.current;
    if (!el) return;
    el.style.setProperty("--holo-rx", "0deg");
    el.style.setProperty("--holo-ry", "0deg");
  }, []);

  const endHoloPulse = useCallback((e: ReactAnimationEvent<HTMLDivElement>) => {
    if (e.animationName === "sd-holo-pulse") setHoloPulsing(false);
  }, []);

  return (
    <section
      dir="rtl"
      aria-label={`المساعد ${SADEED_DISPLAY_NAME_AR_PLAIN}`}
      className={cn(
        "sd-stage-card relative mx-auto w-full max-w-[720px] overflow-hidden rounded-[1.75rem]",
        "border border-[color:var(--hairline)]",
        "px-5 py-6 text-center shadow-[0_18px_48px_-24px_rgba(0,0,0,0.55)]",
        "sm:px-8 sm:py-8",
        className,
      )}
    >
      {/* خلفية البطاقة كاملةً — صورة المالك ٢٠٢٦/٠٨/١١.
          `alt=""` و`aria-hidden`: زينةٌ لا معلومة؛ كل ما تقوله الصورة مكتوبٌ
          نصًّا في البطاقة نفسها، فوصفها لقارئ الشاشة تكرارٌ لا إفادة.
          و`object-cover` تملأ البطاقة وتقصّ الفائض — الصورة عمودية
          (‏941×1672) والبطاقة عريضة، فالقصّ حتميّ ومقصود.

          **والضبابة شرطُ صدقٍ لا ذوقٍ (المادة ٢٧).** الصورة تحمل داخلها
          لوحةَ مؤشّرات مرسومة: «١٢٨ مواقع» و«٣٤٢ دوريات» و«١٬٢٤٨ موظفون»
          و«٩٤٫٢٪ مؤشر الأداء». قِيست مقروءةً تمامًا في اللقطتين قبل
          الضبابة — فصارت أرقامًا تُقرأ قياسًا على الصفحة الأولى ولم يقع
          قياسها، وهي بالضبط الفبركة التي تحرسها `measured-counters`. والحلّ
          ليس حذف الصورة (أمر المالك صريح) بل نزع **المقروئية** مع إبقاء
          **الهوية**: الضبابة تمحو الحروف الصغيرة ولا تمحو المشهد.
          و`scale-110` تُخفي حافّة الضبابة الشفّافة عند أطراف البطاقة. */}
      <img
        src={CARD_BG_SRC}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 select-none object-cover blur-[5px]"
      />
      {/* الطبقة الحاجبة: بلا حجبٍ يهبط تباين النصّ فوق تفاصيل الصورة إلى ما
          دون العتبة. تُقاس ولا تُقدَّر — انظر ملحوظة القياس في `styles.css`. */}
      <span aria-hidden className="sd-stage-scrim pointer-events-none absolute inset-0" />
      {/* هالة خافتة خلف الوجه — زينة صرفة، تحت النص لا فوقه. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_srgb,var(--tone-cyan)_18%,transparent)_0%,transparent_100%)]"
      />

      <div className="relative flex flex-col items-center gap-4 sm:gap-5">
        {/* الوجه: ‏128px‏ على الجوال و‏160px‏ على الشاشات الأوسع — حجمٌ يُرى
            من مسافة الجلوس، وهو المقصود بـ«الوضوح». الحلقة تشتدّ عند النطق،
            والحالة مكتوبة تحتها فلا تُنقل بالحركة وحدها.

            REQ-020: الإطار الهولوغرامي يلفّ الدائرة وحدها — طبقة فوق
            الشخصية نفسها لا فوق خلفية البطاقة. كل طبقات الزينة `aria-hidden`
            و`pointer-events: none` (في CSS)، فلا تحجب لمسًا ولا تُقرأ آليًّا. */}
        <div
          ref={holoFrameRef}
          className={cn("sd-holo-frame shrink-0", holoPulsing && "is-pulsing")}
          onPointerMove={tiltHologram}
          onPointerLeave={restHologram}
          onPointerCancel={restHologram}
          onPointerDown={() => setHoloPulsing(true)}
          onAnimationEnd={endHoloPulse}
        >
          {/* التوهج القاعدي: قبل الدائرة في DOM فيُرسم خلفها ويمتد تحتها. */}
          <span aria-hidden className="sd-holo-base" />
          <div className="sd-holo-tilt">
            <div
              className={cn(
                "relative h-32 w-32 overflow-hidden rounded-full border-2 bg-[#04070F]",
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
              {/* طبقات الهولوغرام داخل الدائرة — يقصّها `overflow-hidden` القائم. */}
              <span aria-hidden className="sd-holo-tint" />
              <span aria-hidden className="sd-holo-scanlines" />
              <span aria-hidden className="sd-holo-sweep" />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          {/* اسم الشخصية بخط النطاق التحريري — لمسة نسخية على الاسم وحده،
              والجسم والحالة والأزرار تبقى سانس. المقاسان ‎2.125rem/2.5rem‎
              هما ‎3xl/4xl‎ السابقان +١١–١٣٪: الخط النسخي أصغر بصريًّا من
              مكافئه السانس عند نفس الرقم.

              **الفئة على span داخلي لا على العنوان نفسه — قِيس لا افتُرض:**
              قاعدة `:where(h1..h6) { line-height: 1.3 }` خارج الطبقات تغلب
              الصنف المرافق للفئة (طبقة المكوّنات) على عنصر العنوان مهما
              كانت النوعية، و1.3 دون صندوق حبر الخط ‎1.76em‎ — فتُقصّ الفتحة
              فوق السين والكسرة تحت الدال بصريًّا. على الـspan لا منافس
              مباشر، فيقيس 1.8 ويرفع صندوق سطر العنوان معه. والوزن: توجيه
              البولد الشامل يقيس للـspan وزن 700 — وجه Bold المودَع الحقيقي.
              لا مساس بطبقات `sd-holo-*`. */}
          <h2 className="text-[2.125rem] text-[color:var(--ink)] sm:text-[2.5rem]">
            <span className="font-amiri">{SADEED_DISPLAY_NAME_AR}</span>
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

        {/* الأفعال: عمود على الجوال وصفّ على الشاشات الأوسع.
            وارتفاع الهدف **مقيسٌ لا مُفترض**: `min-h-12` لا تصل ‏48px‏ هنا،
            لأن أرضيّتَي اللمس في `styles.css` مكتوبتان **خارج الطبقات**
            (`:where(button…) { min-block-size: 44px | 40px }`)، والقاعدة غير
            المُطبَّقة تعلو `@layer utilities` مهما كانت النوعية — حتى بنوعية
            `:where` الصفرية. فالمقيس ‏44px‏ على اللمس (‏pointer: coarse‏، وهو
            الجوال الحقيقي) و‏40px‏ على الفأرة. و‏44px‏ يفي §2.5.5.
            و`flex-wrap` واجبة منذ ٢٠٢٦/٠٨/٠٩: صار السطح يعيش في العمود
            الأوسط من ثلاثة، فثلاثة أزرار في صفٍّ واحد تتجاوز عرض العمود
            (قِيس ٣١px فائضًا على ١٠٢٤px). تلتفّ فتنزل تحتها بدل أن تُقصّ. */}
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
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

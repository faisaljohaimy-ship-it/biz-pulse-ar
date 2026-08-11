/**
 * SadeedWelcomeVideo — فيديو ترحيب سَدِيد يتصدّر بطاقة الحضور.
 *
 * ── أمر المالك ──
 * «اضبط الفيديو واجعله مستخدمًا عند الدخول على بطاقة سَدِيد بحيث يبدأ
 * الفيديو أولًا، واجعل الصورة المرفقة هي الخلفية مع تفعيل الضغط عليها».
 *
 * ── ثلاث حالات ──
 * `poster` (الافتراضية) ← `playing` ← `done`، ثم يعود الملصق فيمكن إعادة
 * التشغيل. في `done` يُفكّ تركيب `<video>` كليًّا فيتحرّر عازله.
 *
 * ── لماذا الصوت مسموح هنا ──
 * لا autoplay بصوت إطلاقًا: `preload="none"` والملصق صورة ساكنة، و`.play()`
 * لا يُستدعى إلا داخل معالج النقر نفسه — الإيماءة هي ما يفتح إذن الصوت.
 * التركيب يتمّ متزامنًا عبر `flushSync` كي يقع `.play()` داخل نافذة
 * الإيماءة لا بعدها. رفض الوعد يُمسك ويُعرض زر إعادة محاولة بدل انهيار
 * صامت (وفي jsdom قد لا يعيد `play()` وعدًا أصلًا، فالفحص دفاعي).
 *
 * ── القيود الدستورية ──
 * لا `speechSynthesis` ولا أي وحدة كوبايلوت/صوت — فيديو خام فقط. الألوان
 * من طبقة الرموز حصرًا (`--ink` · `--surface` · `--chip` · `--hairline` ·
 * `--tone-*`) وصفر لون سداسي. أيقونة التشغيل SVG بـ`currentColor`. لا حركة
 * تلقائية على الملصق أصلًا فلا شيء يحتاج تسكينًا عند
 * `prefers-reduced-motion`. أهداف اللمس ≥44px (§2.5.8).
 */
import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

const POSTER_SRC = "/sadeed-stage-poster.webp";
const VIDEO_SRC = "/sadeed-welcome.mp4";

type Stage = "poster" | "playing" | "done";

export interface SadeedWelcomeVideoProps {
  className?: string;
}

export function SadeedWelcomeVideo({ className }: SadeedWelcomeVideoProps) {
  const [stage, setStage] = useState<Stage>("poster");
  const [playFailed, setPlayFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /** يُستدعى داخل إيماءة نقر حصرًا — فتُمنح صلاحية الصوت. */
  const tryPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setPlayFailed(false);
    try {
      const result = video.play();
      // بعض البيئات (jsdom) لا تعيد وعدًا من play().
      if (result && typeof result.catch === "function") {
        result.catch(() => setPlayFailed(true));
      }
    } catch {
      setPlayFailed(true);
    }
  }, []);

  const handlePosterClick = useCallback(() => {
    // تركيب متزامن كي يقع play() داخل معالج النقر نفسه لا في effect لاحق.
    flushSync(() => {
      setStage("playing");
      setPlayFailed(false);
    });
    tryPlay();
  }, [tryPlay]);

  /** `ended` أو تخطّي: فكّ تركيب الفيديو كليًّا والعودة إلى الملصق. */
  const finish = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch {
        /* التفكيك يوقفه على أي حال */
      }
    }
    setPlayFailed(false);
    setStage("done");
  }, []);

  if (stage !== "playing") {
    // «poster» الافتراضية و«done» بعد الانتهاء/التخطّي كلتاهما تعرضان
    // الملصق سطحَ نقر — فإعادة التشغيل ممكنة دائمًا.
    return (
      <div dir="rtl" className={cn("relative w-full", className)}>
        <button
          type="button"
          onClick={handlePosterClick}
          aria-label="شغّل فيديو الترحيب"
          className={cn(
            "relative mx-auto block min-h-11 min-w-11 max-w-full overflow-hidden rounded-[1.25rem]",
            "border border-[color:var(--hairline)] bg-[color:var(--surface)]",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            "focus-visible:outline-[color:var(--tone-cyan)]",
          )}
        >
          <img
            src={POSTER_SRC}
            alt=""
            draggable={false}
            decoding="async"
            loading="eager"
            className="block h-auto max-h-[60vh] w-auto max-w-full select-none"
          />
          {/* أيقونة التشغيل: زينة فوق الصورة، والاسم المسموع على الزرّ نفسه. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full shadow-lg",
                "border border-[color:var(--hairline)] bg-[color:var(--chip)]",
                "text-[color:var(--ink)]",
              )}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden>
                <path d="M8 5.5v13l10.5-6.5z" />
              </svg>
            </span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" className={cn("relative flex w-full flex-col items-center gap-3", className)}>
      <div className="relative w-full">
        {/* 1320×2316 عمودي: يُحصر بارتفاع أقصى ويُحفظ كاملًا بـobject-contain. */}
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          playsInline
          preload="none"
          data-testid="sadeed-welcome-video"
          onEnded={finish}
          className={cn(
            "mx-auto block h-auto max-h-[70vh] w-auto max-w-full rounded-[1.25rem]",
            "border border-[color:var(--hairline)] object-contain",
          )}
        />
        {playFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p
              role="status"
              className={cn(
                "rounded-full border border-[color:var(--hairline)] bg-[color:var(--chip)]",
                "px-4 py-1.5 text-sm font-semibold text-[color:var(--ink)]",
              )}
            >
              تعذّر تشغيل الفيديو
            </p>
            <button
              type="button"
              onClick={tryPlay}
              className={cn(
                "inline-flex min-h-12 items-center justify-center rounded-full px-6",
                "border border-[color:var(--tone-emerald)] bg-[color:var(--tone-emerald)]",
                "text-base font-black text-[color:var(--surface)] transition-[filter]",
                "hover:brightness-110",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                "focus-visible:outline-[color:var(--tone-cyan)]",
              )}
            >
              أعد المحاولة
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={finish}
        aria-label="تخطّي"
        className={cn(
          "inline-flex min-h-12 items-center justify-center rounded-full px-6",
          "border border-[color:var(--hairline)] bg-[color:var(--chip)]",
          "text-base font-bold text-[color:var(--ink)] transition-colors",
          "hover:border-[color:var(--hairline-hover)] hover:bg-[color:var(--chip-hover)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          "focus-visible:outline-[color:var(--tone-cyan)]",
        )}
      >
        تخطّي
      </button>
    </div>
  );
}

export default SadeedWelcomeVideo;

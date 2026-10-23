import { useEffect, useId, useRef, useState } from "react";
import { hasDecodedVideoFrame } from "@/lib/cinematic/mp4-validation";
import "@/styles/sadeed-film-preview.css";

// Existing repository asset (1,338,316 bytes); no paid generation or new binary.
const FILM_SOURCE = "/media/brand/sadeed-film-804.mp4";

export function RecordedFilmPlayer({ onPlaybackStart }: { onPlaybackStart?: () => void }) {
  const id = useId();
  const player = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.visibilityState === "hidden") player.current?.pause();
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  return (
    <section className="sd-film-preview" aria-labelledby={`${id}-title`} data-film-phase={phase}>
      <div className="sd-film-preview-heading">
        <div>
          <h2 id={`${id}-title`}>فيديو سديد المسجل</h2>
          <p>ملف MP4 موجود في أصول المشروع — النسخة الخفيفة، نحو 1.34 ميجابايت.</p>
        </div>
        <button
          type="button"
          className="sd-cinema-control"
          aria-expanded={open}
          onClick={() => {
            player.current?.pause();
            setOpen(!open);
            setPhase("idle");
          }}
        >
          {open ? "إغلاق الفيديو" : "فتح فيديو MP4"}
        </button>
      </div>
      {open && (
        <video
          key={attempt}
          ref={player}
          src={FILM_SOURCE}
          controls
          playsInline
          preload="metadata"
          className="sd-film-video"
          aria-label="فيديو سديد مسجل — ليس بث كاميرات"
          onPlay={onPlaybackStart}
          onLoadedData={(event) => {
            setPhase(hasDecodedVideoFrame(event.currentTarget) ? "decoded" : "error");
          }}
          onError={() => setPhase("error")}
        />
      )}
      {open && (
        <p role={phase === "error" ? "alert" : "status"} aria-live="polite">
          {phase === "decoded"
            ? "فُك إطار الفيديو بنجاح على هذا الجهاز."
            : phase === "error"
              ? "تعذر تحميل الفيديو أو فك إطاره؛ يمكنك متابعة المشهد التوضيحي أعلاه."
              : "اضغط تشغيل في المشغّل للتحقق من عرض الفيديو."}
        </p>
      )}
      {open && phase === "error" && (
        <button
          type="button"
          className="sd-cinema-control"
          onClick={() => {
            setPhase("idle");
            setAttempt((value) => value + 1);
          }}
        >
          إعادة تحميل الفيديو
        </button>
      )}
      <p className="sd-cinema-disclosure">
        فيديو مسجل معاد استخدامه، لا تصوير مباشر ولا قياس لبيانات الأصول. لا يبدأ تلقائيًا.
      </p>
    </section>
  );
}

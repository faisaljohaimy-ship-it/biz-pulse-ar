import { useEffect, useRef, useState } from "react";
import { SadeedAudioBus } from "@/lib/sadeed/audio-bus";
import "@/styles/home/sadeed-intro.css";

/** A pre-rendered film: opening the page never generates paid speech. */
export function SadeedIntroFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [narrated, setNarrated] = useState(false);
  const [audible, setAudible] = useState(false);
  const [chapter, setChapter] = useState(0);
  const chapters = [
    "سديد — منظومة القرار والإنجاز الذكي",
    "الصورة كاملة: العمليات والبلاغات والصيانة في مساحة واحدة",
    "كل مهمة لها مسار: التصاريح والمخاطر والتقارير",
    "اسأل سديد: مساعدك لفهم المعلومات بالعربية",
    "خطّط مع fnn: الأتمتة تقترح وصاحب الصلاحية يعتمد",
    "سديد: قرار أدق. إنجاز أسرع.",
  ];
  const ownsAudio = useRef(false);

  function releaseSound() {
    if (video.current) video.current.muted = true;
    setAudible(false);
    if (ownsAudio.current) SadeedAudioBus.release("hero-soundtrack");
    ownsAudio.current = false;
  }

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (
      !motion.matches &&
      !connection?.saveData &&
      document.documentElement.dataset.nxMotion !== "off"
    ) {
      void el.play().catch(() => setPlaying(false));
    }
    const pauseHidden = () => {
      if (document.hidden) el.pause();
    };
    const pauseReduced = () => {
      if (motion.matches) el.pause();
    };
    document.addEventListener("visibilitychange", pauseHidden);
    motion.addEventListener("change", pauseReduced);
    const controller = new AbortController();
    void fetch("/media/sadeed-intro-status.json", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((status) => setNarrated(status?.hasNarration === true))
      .catch(() => {});
    return () => {
      controller.abort();
      el.pause();
      if (ownsAudio.current) SadeedAudioBus.release("hero-soundtrack");
      document.removeEventListener("visibilitychange", pauseHidden);
      motion.removeEventListener("change", pauseReduced);
    };
  }, []);

  function enableSound() {
    const el = video.current;
    if (!el || !narrated) return;
    SadeedAudioBus.unlock();
    if (
      !SadeedAudioBus.acquire("hero-soundtrack", () => {
        el.muted = true;
        ownsAudio.current = false;
        setAudible(false);
      })
    )
      return;
    ownsAudio.current = true;
    el.currentTime = 0;
    el.muted = false;
    setAudible(true);
    void el.play().catch(() => {
      el.muted = true;
      setAudible(false);
      ownsAudio.current = false;
      SadeedAudioBus.release("hero-soundtrack");
    });
  }

  return (
    <section className="sadeed-intro" dir="rtl" aria-label="سديد في دقيقة">
      <video
        ref={video}
        src="/media/sadeed-intro-60.mp4"
        poster="/media/sadeed-intro-poster.webp"
        muted={!audible}
        playsInline
        preload="metadata"
        onTimeUpdate={(event) =>
          setChapter(Math.min(5, Math.floor(event.currentTarget.currentTime / 10)))
        }
        aria-label="فيلم سديد التعريفي — دقيقة واحدة"
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          releaseSound();
        }}
        onEnded={() => {
          setPlaying(false);
          releaseSound();
        }}
        onError={() => {
          setFailed(true);
          setPlaying(false);
          releaseSound();
        }}
      />
      <p className="sadeed-intro-caption">{chapters[chapter]}</p>
      <div className="sadeed-intro-controls">
        <span>سديد في دقيقة · 01:00</span>
        {failed ? (
          <span role="status">تعذّر تحميل الفيلم. أعد تحميل الصفحة للمحاولة.</span>
        ) : (
          <button
            type="button"
            onClick={() => {
              const el = video.current;
              if (!el) return;
              if (playing) el.pause();
              else {
                if (el.ended) el.currentTime = 0;
                void el.play().catch(() => setPlaying(false));
              }
            }}
          >
            {playing ? "إيقاف مؤقت" : "تشغيل الفيلم"}
          </button>
        )}
        {narrated && (
          <button
            type="button"
            onClick={() => {
              if (audible && video.current) {
                video.current.muted = true;
                setAudible(false);
                if (ownsAudio.current) SadeedAudioBus.release("hero-soundtrack");
                ownsAudio.current = false;
              } else enableSound();
            }}
          >
            {audible ? "كتم الصوت" : "شاهد من البداية بالصوت"}
          </button>
        )}
        {!narrated && <span>نسخة مرئية · التعليق الصوتي قيد التجهيز</span>}
      </div>
      <p className="sr-only">
        سديد منظومة القرار والإنجاز الذكي. تجمع العمليات والبلاغات والصيانة وتصاريح العمل والمخاطر
        والتقارير. يساعد سديد في فهم المعلومات، ويجهّز fnn مسارات الأتمتة لاعتماد صاحب الصلاحية.
      </p>
    </section>
  );
}

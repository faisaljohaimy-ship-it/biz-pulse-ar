// Nexios Cinematic Film Suite — shared shell for /promo/f1..f4.
// Handles: play gate (user gesture unlocks audio), scene timeline,
// audio sync with hard-stop on exit, download button with graceful
// disabled state, captions, replay, prefers-reduced-motion fallback.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ScenePlayer, type Scene } from "@/components/promo/ScenePlayer";

export interface FilmDefinition {
  slug: string; // f1 | f2 | f3 | f4 | f5
  titleAr: string;
  subtitleAr?: string;
  accent: string; // hex
  duration: number; // seconds
  scenes: Scene[];
  captions: { start: number; end: number; text: string }[];
  videoOverrideUrl?: string; // optional CDN url overriding /promo/video/<slug>.mp4
}

interface Props {
  film: FilmDefinition;
}

function useMediaExists(url: string) {
  const [state, setState] = useState<"checking" | "present" | "absent">("checking");
  useEffect(() => {
    let cancelled = false;
    fetch(url, { method: "HEAD" })
      .then((r) => {
        if (cancelled) return;
        setState(r.ok ? "present" : "absent");
      })
      .catch(() => !cancelled && setState("absent"));
    return () => {
      cancelled = true;
    };
  }, [url]);
  return state;
}

function usePrefersReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setRm(mq.matches);
    const h = () => setRm(mq.matches);
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, []);
  return rm;
}

export function FilmShell({ film }: Props) {
  const audioUrl = `/promo/audio/${film.slug}.mp3`;
  const videoUrl = `/promo/video/${film.slug}.mp4`;
  const audioState = useMediaExists(audioUrl);
  const videoState = useMediaExists(videoUrl);
  const reducedMotion = usePrefersReducedMotion();

  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [t, setT] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [runKey, setRunKey] = useState(0);

  // Hard-stop audio on unmount / route exit.
  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (paused) a.pause();
    else if (started && !ended) a.play().catch(() => {});
  }, [paused, started, ended]);

  const start = () => {
    setStarted(true);
    setEnded(false);
    setPaused(false);
    setT(0);
    setRunKey((k) => k + 1);
    // Prime audio inside user gesture.
    const a = audioRef.current;
    if (a && audioState === "present") {
      try {
        a.currentTime = 0;
        void a.play().catch(() => {});
      } catch {
        /* noop */
      }
    }
  };

  const replay = () => {
    const a = audioRef.current;
    if (a) {
      a.currentTime = 0;
      if (audioState === "present") void a.play().catch(() => {});
    }
    setEnded(false);
    setPaused(false);
    setT(0);
    setRunKey((k) => k + 1);
  };

  const togglePause = () => setPaused((p) => !p);

  const currentCaption = useMemo(() => {
    return film.captions.find((c) => t >= c.start && t <= c.end)?.text ?? "";
  }, [t, film.captions]);

  const accent = film.accent;

  return (
    <div dir="rtl" className="fixed inset-0 z-[100] bg-[#04070F] text-white">
      <audio ref={audioRef} src={audioUrl} preload="auto" playsInline />

      {/* Back link */}
      <Link
        to="/promo"
        className="absolute top-3 right-3 z-[110] rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-xs text-white/80 backdrop-blur hover:bg-white/10"
      >
        ← الأفلام
      </Link>

      {/* Reduced motion: static outline */}
      {reducedMotion && !started ? (
        <ReducedMotionFallback film={film} />
      ) : started ? (
        <>
          {!reducedMotion && (
            <ScenePlayer
              key={runKey}
              scenes={film.scenes}
              duration={film.duration}
              paused={paused}
              onTimeUpdate={setT}
              onEnded={() => {
                setEnded(true);
                const a = audioRef.current;
                if (a) {
                  try {
                    a.pause();
                  } catch {
                    /* noop */
                  }
                }
              }}
            />
          )}

          {/* caption */}
          {currentCaption && (
            <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[105] flex justify-center px-6">
              <p
                className="max-w-3xl text-center text-lg font-semibold leading-relaxed text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)] md:text-2xl"
                style={{ textShadow: `0 0 24px ${accent}55` }}
              >
                {currentCaption}
              </p>
            </div>
          )}

          {/* controls */}
          <div className="absolute inset-x-0 bottom-6 z-[110] flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={togglePause}
              className="rounded-full border border-white/20 bg-black/60 px-4 py-2 text-sm text-white backdrop-blur hover:bg-white/10"
            >
              {paused ? "▶ متابعة" : "⏸ إيقاف"}
            </button>
            <button
              type="button"
              onClick={replay}
              className="rounded-full border border-white/20 bg-black/60 px-4 py-2 text-sm text-white backdrop-blur hover:bg-white/10"
            >
              ⟲ إعادة
            </button>
            <a
              href={videoUrl}
              download
              aria-disabled={videoState !== "present"}
              onClick={(e) => {
                if (videoState !== "present") e.preventDefault();
              }}
              className={`rounded-full border px-4 py-2 text-sm backdrop-blur transition ${
                videoState === "present"
                  ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
                  : "cursor-not-allowed border-white/10 bg-white/5 text-white/40"
              }`}
            >
              {videoState === "present" ? "⬇ تحميل الفيديو MP4" : "قريبًا"}
            </a>
          </div>

          {audioState === "absent" && (
            <div className="absolute top-3 left-3 z-[110] rounded-full border border-amber-400/50 bg-amber-500/15 px-3 py-1 text-[11px] font-semibold text-amber-200 backdrop-blur">
              الصوت قيد الإضافة
            </div>
          )}
        </>
      ) : (
        <PlayGate film={film} onStart={start} audioMissing={audioState === "absent"} />
      )}
    </div>
  );
}

function PlayGate({
  film,
  onStart,
  audioMissing,
}: {
  film: FilmDefinition;
  onStart: () => void;
  audioMissing: boolean;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(60% 60% at 50% 50%, ${film.accent}33 0%, transparent 70%)`,
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div
          className="text-xs uppercase tracking-[0.4em]"
          style={{ color: film.accent }}
        >
          Nexios · Film {film.slug.toUpperCase()}
        </div>
        <h1 className="text-3xl font-black leading-tight text-white md:text-5xl">
          {film.titleAr}
        </h1>
        {film.subtitleAr && (
          <p className="max-w-xl text-sm text-white/70 md:text-base">{film.subtitleAr}</p>
        )}
        <button
          type="button"
          onClick={onStart}
          className="mt-4 rounded-full px-6 py-3 text-base font-bold text-black shadow-2xl transition-transform hover:scale-105"
          style={{ background: film.accent, boxShadow: `0 20px 60px -10px ${film.accent}` }}
        >
          ▶ شغّل الفيلم
        </button>
        {audioMissing && (
          <span className="mt-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-200">
            الصوت قيد الإضافة — سيتم عرض المشاهد والنصوص
          </span>
        )}
      </div>
    </div>
  );
}

function ReducedMotionFallback({ film }: { film: FilmDefinition }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-6">
      <div className="max-w-2xl space-y-4 text-center">
        <h1 className="text-3xl font-black" style={{ color: film.accent }}>
          {film.titleAr}
        </h1>
        <ol className="space-y-3 text-right text-sm leading-relaxed text-white/85">
          {film.captions.map((c, i) => (
            <li key={i} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <span className="me-2 text-xs text-white/50">{i + 1}.</span>
              {c.text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ------------- Common cinematic primitives ------------- */

export function TitleCard({
  progress,
  title,
  accent,
  eyebrow,
}: {
  progress: number;
  title: string;
  accent: string;
  eyebrow?: string;
}) {
  const inO = Math.min(1, progress * 3);
  const outO = 1 - Math.max(0, (progress - 0.75) * 4);
  const o = Math.min(inO, Math.max(0, outO));
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#04070F]">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 70% at 50% 50%, ${accent}22 0%, transparent 70%)`,
          opacity: o,
        }}
      />
      <div style={{ opacity: o, transform: `translateY(${(1 - o) * 12}px)` }} className="text-center">
        {eyebrow && (
          <div
            className="mb-4 text-[10px] uppercase tracking-[0.55em]"
            style={{ color: accent }}
          >
            {eyebrow}
          </div>
        )}
        <h1 className="text-4xl font-black text-white md:text-6xl">{title}</h1>
        <div
          className="mx-auto mt-6 h-[2px] w-24"
          style={{ background: accent, boxShadow: `0 0 20px ${accent}` }}
        />
      </div>
    </div>
  );
}

export function ClosingLockup({
  progress,
  title,
  accent,
  cta,
  smallPrint,
}: {
  progress: number;
  title: string;
  accent: string;
  cta?: string;
  smallPrint?: string;
}) {
  const o = Math.min(1, progress * 2);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#04070F]">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(80% 80% at 50% 55%, ${accent}33 0%, transparent 70%)`,
          opacity: o,
        }}
      />
      <div style={{ opacity: o }} className="text-center">
        <div
          className="mb-3 text-[10px] uppercase tracking-[0.5em]"
          style={{ color: accent }}
        >
          Nexios
        </div>
        <h2 className="text-3xl font-black text-white md:text-5xl">{title}</h2>
        {cta && (
          <div
            className="mt-8 inline-block rounded-full px-6 py-3 text-sm font-bold text-black"
            style={{ background: accent }}
          >
            {cta}
          </div>
        )}
        {smallPrint && (
          <div className="mt-6 text-[10px] text-white/40">{smallPrint}</div>
        )}
      </div>
    </div>
  );
}

export function CaptionBackdrop({
  progress,
  accent,
  variant = "pulse",
}: {
  progress: number;
  accent: string;
  variant?: "pulse" | "grid" | "flow" | "counter";
}) {
  const pulse = 0.4 + 0.6 * Math.abs(Math.sin(progress * Math.PI * 2));
  if (variant === "grid") {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `linear-gradient(${accent}22 1px, transparent 1px), linear-gradient(90deg, ${accent}22 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            transform: `perspective(600px) rotateX(55deg) translateY(${-40 + progress * 40}px)`,
            transformOrigin: "center bottom",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(50% 50% at 50% 50%, ${accent}22 0%, transparent 70%)`,
          }}
        />
      </div>
    );
  }
  if (variant === "flow") {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(24)].map((_, i) => {
          const y = (i / 24) * 100;
          const x = (progress * 200 + i * 13) % 120;
          return (
            <div
              key={i}
              className="absolute h-[2px] w-24"
              style={{
                top: `${y}%`,
                left: `${x - 20}%`,
                background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                opacity: 0.5,
              }}
            />
          );
        })}
      </div>
    );
  }
  if (variant === "counter") {
    return (
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(60% 60% at 50% 50%, ${accent}22 0%, transparent 70%)`,
            opacity: pulse,
          }}
        />
      </div>
    );
  }
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(45% 45% at 50% 50%, ${accent}55 0%, transparent 70%)`,
          opacity: pulse,
        }}
      />
    </div>
  );
}

export function BigCounter({
  progress,
  target,
  suffix = "",
  accent,
  label,
}: {
  progress: number;
  target: number;
  suffix?: string;
  accent: string;
  label?: string;
}) {
  const ease = 1 - Math.pow(1 - progress, 3);
  const value = Math.round(target * ease);
  const AR = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const ar = String(value).replace(/[0-9]/g, (d) => AR[+d]);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      {label && (
        <div className="mb-3 text-xs uppercase tracking-[0.4em]" style={{ color: accent }}>
          {label}
        </div>
      )}
      <div
        className="text-[24vw] font-black leading-none md:text-[14vw]"
        style={{
          color: accent,
          textShadow: `0 0 60px ${accent}, 0 0 120px ${accent}55`,
        }}
      >
        {ar}
        {suffix}
      </div>
    </div>
  );
}

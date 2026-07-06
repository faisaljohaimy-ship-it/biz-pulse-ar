import { useEffect, useRef, useState } from "react";
import videoAsset from "@/assets/hero-assembly.mp4.asset.json";
import audioAsset from "@/assets/hero-assembly-11.mp3.asset.json";
import posterAsset from "@/assets/hero-assembly-poster.jpg.asset.json";
import { setIntroActive } from "@/lib/intro-store";
import { AriaAudioBus } from "@/lib/aria/audio-bus";


/**
 * HeroZeroIntro — cinematic "assembly" hero that plays once per session
 * before the executive landing hero. Video + parallel audio track, with the
 * NEXIOS AI wordmark igniting on fire beneath the winged figure.
 *
 * Playback contract:
 *  - autoplay muted (browser policy) — audio track runs separately, unlocked
 *    on first user gesture if the browser blocks silent autoplay.
 *  - hard cap: 34s or video `ended`, whichever comes first.
 *  - session-gated via sessionStorage; ?intro=1 forces replay for demos.
 *  - respects prefers-reduced-motion.
 */

const SESSION_KEY = "nexios:intro:seen";
const HARD_CAP_MS = 34_000;
const IGNITION_MS = 9_200; // fallback beat if audio analysis is unavailable
const CROSSFADE_MS = 700;

function shouldSkipInitial(): boolean {
  if (typeof window === "undefined") return true; // SSR: never render
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("intro") === "1") return false;
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function HeroZeroIntro() {
  const [mounted, setMounted] = useState<null | "playing" | "closing" | "done">(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const hardCapRef = useRef<number | null>(null);
  const reducedMotion = useRef(false);

  // Client-only mount decision (avoids SSR flash).
  useEffect(() => {
    if (shouldSkipInitial()) {
      setMounted("done");
      return;
    }
    setMounted("playing");
    setIntroActive(true);
    try {
      reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reducedMotion.current = false;
    }
    return () => setIntroActive(false);
  }, []);

  const finish = () => {
    if (mounted === "closing" || mounted === "done") return;
    setMounted("closing");
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* noop */
    }
    window.setTimeout(() => {
      setMounted("done");
      setIntroActive(false);
    }, CROSSFADE_MS);
  };

  // Body scroll lock while the intro is mounted — no scrollbars, no jump.
  useEffect(() => {
    if (mounted !== "playing") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  // Playback contract — video + hero narration audio start together on the
  // same event tick and stay in sync. The audio is the master clock; the
  // muted video is snapped to it on drift > 0.15s. Autoplay-with-sound may
  // be blocked by the browser — we then keep the muted video alive and
  // start the audio on the first user gesture so both begin from t=0
  // together. ARIA's audio bus is acquired as "hero-greeting" so any other
  // ARIA source (chat, panel greeting, tour) preempts cleanly.
  useEffect(() => {
    if (mounted !== "playing") return;
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    let cancelled = false;
    const cleanupFns: Array<() => void> = [];

    const waitReady = (el: HTMLMediaElement) =>
      new Promise<void>((resolve) => {
        if (el.readyState >= 2) { resolve(); return; }
        const onReady = () => {
          el.removeEventListener("canplay", onReady);
          el.removeEventListener("loadeddata", onReady);
          resolve();
        };
        el.addEventListener("canplay", onReady, { once: true });
        el.addEventListener("loadeddata", onReady, { once: true });
        try { el.load(); } catch { /* noop */ }
      });

    const resetClocks = () => {
      try {
        video.pause(); audio.pause();
        video.currentTime = 0; audio.currentTime = 0;
        audio.volume = 1;
      } catch { /* noop */ }
    };

    const startBoth = async () => {
      resetClocks();
      try {
        await Promise.all([video.play(), audio.play()]);
        AriaAudioBus.notifyPlaying("hero-greeting", audio);
        return true;
      } catch {
        return false;
      }
    };

    const armUnlock = () => {
      const unlock = async () => {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("touchstart", unlock);
        await startBoth();
      };
      window.addEventListener("pointerdown", unlock, { once: true });
      window.addEventListener("keydown", unlock, { once: true });
      window.addEventListener("touchstart", unlock, { once: true });
      cleanupFns.push(() => {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("touchstart", unlock);
      });
    };

    // Acquire the ARIA bus — hero narration is the lowest-priority source,
    // so any other ARIA voice (chat, tour) will preempt and stop us.
    AriaAudioBus.unlock();
    const granted = AriaAudioBus.acquire("hero-greeting", () => {
      try { audio.pause(); } catch { /* noop */ }
    });

    const kick = async () => {
      await Promise.all([waitReady(video), waitReady(audio)]);
      if (cancelled) return;
      const ok = granted ? await startBoth() : false;
      if (!ok) {
        void video.play().catch(() => {});
        if (granted) armUnlock();
      }
    };
    void kick();

    // Audio-master drift correction — smooth, continuous. We check frequently
    // and nudge the muted video's playbackRate for sub-frame drift; only
    // hard-seek when drift exceeds ~0.35s (a real stall). This keeps the
    // picture from ever "snapping" and staying visually married to the voice.
    const driftInterval = window.setInterval(() => {
      if (video.paused || audio.paused) return;
      const drift = video.currentTime - audio.currentTime; // +ve = video ahead
      const abs = Math.abs(drift);
      if (abs > 0.35) {
        try {
          video.currentTime = audio.currentTime;
          video.playbackRate = 1;
        } catch { /* noop */ }
      } else if (abs > 0.04) {
        // 4% max nudge — imperceptible, gently converges within ~1s.
        const target = drift > 0 ? 0.96 : 1.04;
        try { video.playbackRate = target; } catch { /* noop */ }
      } else if (video.playbackRate !== 1) {
        try { video.playbackRate = 1; } catch { /* noop */ }
      }
    }, 250);


    const onVideoWaiting = () => { if (!audio.paused) audio.pause(); };
    const onVideoPlaying = () => {
      try { video.currentTime = audio.currentTime; } catch { /* noop */ }
      if (audio.paused) void audio.play().catch(() => {});
    };
    video.addEventListener("waiting", onVideoWaiting);
    video.addEventListener("playing", onVideoPlaying);

    const onVisibility = () => {
      if (document.hidden) { video.pause(); audio.pause(); }
      else {
        try { video.currentTime = audio.currentTime; } catch { /* noop */ }
        void audio.play().catch(() => {});
        void video.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    hardCapRef.current = window.setTimeout(finish, HARD_CAP_MS);

    const onAudioEnded = () => finish();
    const onVideoEnded = () => { /* audio is master — let it finish */ };
    audio.addEventListener("ended", onAudioEnded);
    video.addEventListener("ended", onVideoEnded);

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
      window.clearInterval(driftInterval);
      if (hardCapRef.current !== null) clearTimeout(hardCapRef.current);
      audio.removeEventListener("ended", onAudioEnded);
      video.removeEventListener("ended", onVideoEnded);
      video.removeEventListener("waiting", onVideoWaiting);
      video.removeEventListener("playing", onVideoPlaying);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
      try { audio.pause(); audio.currentTime = 0; } catch { /* noop */ }
      try { video.pause(); } catch { /* noop */ }
      AriaAudioBus.release("hero-greeting");
    };
    // finish is stable via setState functional pattern
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);





  // Ember/fire particle canvas — intentionally disabled. The wordmark now
  // uses a cool cyan palette, and the orange sparks were clashing with the
  // scene. The canvas element is kept in the JSX only as a transparent
  // no-op layer to preserve stacking; no effect is attached.
  useEffect(() => {
    // no-op
  }, [mounted]);


  if (mounted === null || mounted === "done") return null;

  const closing = mounted === "closing";

  return (
    <div
      role="dialog"
      aria-label="NEXIOS AI · Cinematic intro"
      aria-modal="true"
      dir="ltr"
      className="hero-zero-shell fixed inset-0 z-[80] overflow-hidden"
      style={{
        width: "100vw",
        height: "100dvh",
        background: "#05070B",
        opacity: closing ? 0 : 1,
        transition: `opacity ${CROSSFADE_MS}ms ease-out`,
        pointerEvents: closing ? "none" : "auto",
      }}
    >


      {/* Deep cosmic backdrop — sits BEHIND the transparent winged figure so
          the scene has depth even when the video is faded to ~25%. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 90% 60% at 50% 40%, rgba(0,212,255,0.18) 0%, rgba(6,26,46,0.0) 55%)",
            "radial-gradient(ellipse 70% 50% at 50% 78%, rgba(255,120,30,0.22) 0%, rgba(0,0,0,0) 60%)",
            "radial-gradient(circle at 50% 50%, #061A2E 0%, #02070E 70%, #000 100%)",
          ].join(","),
        }}
      />
      {/* Subtle horizon light beam */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.55) 50%, transparent 100%)",
          boxShadow: "0 0 60px 8px rgba(0,212,255,0.35)",
          opacity: 0.7,
        }}
      />

      <video
        ref={videoRef}
        className="hero-zero-video absolute inset-0 z-10"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          animation: reducedMotion.current
            ? undefined
            : "hero-zero-fadein 1400ms 300ms both ease-out",
          opacity: reducedMotion.current ? 1 : 0,
          filter: "contrast(1.05) brightness(1.1)",
        }}
        src={videoAsset.url}
        poster={posterAsset.url}
        muted
        playsInline
        autoPlay
        preload="auto"
      />
      <audio ref={audioRef} src={audioAsset.url} preload="auto" />

      {/* Ember particle layer — pointer-events none, sits above the figure
          but below the Vision 2030 crest so sparks never wash it out. */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 h-full w-full mix-blend-screen"
      />

      {/* TOP-CENTER Vision 2030 emblem — the crown of the hero. A hand-drawn
          SVG sigil (palm + crossed swords motif) sits above a bilingual
          wordmark set in Saudi-green with a warm gold underline. Anchored to
          the top with safe-area padding so it never collides with the
          browser chrome on iOS. Pointer-events none — purely decorative. */}
      <div
        aria-hidden
        className="hero-zero-topcrest pointer-events-none absolute inset-x-0 z-40 flex flex-col items-center text-center"
        style={{
          top: "calc(env(safe-area-inset-top) + clamp(0.75rem, 2.4dvh, 1.75rem))",
          opacity: 0,
          animation: reducedMotion.current
            ? "hero-zero-topcrest-quiet 700ms 300ms forwards ease-out"
            : "hero-zero-topcrest 2200ms 900ms forwards cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* Sigil — palm frond with two crossed swords, drawn in Saudi green
            with a soft gold rim-light. Sized responsively. */}
        <svg
          viewBox="0 0 120 84"
          className="hero-zero-topcrest-sigil"
          style={{
            width: "clamp(56px, 12vw, 96px)",
            height: "auto",
            filter:
              "drop-shadow(0 0 6px rgba(74,222,128,0.55)) drop-shadow(0 0 22px rgba(0,140,90,0.45))",
          }}
        >
          <defs>
            <linearGradient id="v2030-blade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F5FBFF" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#D9E4EC" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#8FA0AE" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="v2030-hilt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F6D07A" />
              <stop offset="100%" stopColor="#B8892F" />
            </linearGradient>
            <linearGradient id="v2030-palm" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#7EE9A6" />
              <stop offset="50%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#0F7A3B" />
            </linearGradient>
          </defs>

          {/* Crossed swords */}
          <g strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M18 62 L88 14"
              stroke="url(#v2030-blade)"
              strokeWidth="3.2"
              fill="none"
            />
            <path
              d="M32 14 L102 62"
              stroke="url(#v2030-blade)"
              strokeWidth="3.2"
              fill="none"
            />
            {/* Hilts */}
            <circle cx="16" cy="64" r="3.2" fill="url(#v2030-hilt)" />
            <circle cx="104" cy="64" r="3.2" fill="url(#v2030-hilt)" />
            <rect x="12" y="66" width="8" height="2.4" rx="1.2" fill="url(#v2030-hilt)" />
            <rect x="100" y="66" width="8" height="2.4" rx="1.2" fill="url(#v2030-hilt)" />
          </g>

          {/* Palm frond — layered leaflets rising from the crossing point */}
          <g fill="url(#v2030-palm)">
            <path d="M60 46 C58 34 54 26 46 20 C52 26 55 34 56 44 Z" />
            <path d="M60 46 C62 34 66 26 74 20 C68 26 65 34 64 44 Z" />
            <path d="M60 44 C58 30 52 22 42 16 C50 22 54 30 56 42 Z" />
            <path d="M60 44 C62 30 68 22 78 16 C70 22 66 30 64 42 Z" />
            <path d="M60 42 C59 26 52 18 40 12 C50 18 55 26 57 40 Z" />
            <path d="M60 42 C61 26 68 18 80 12 C70 18 65 26 63 40 Z" />
            {/* Trunk */}
            <path d="M58.5 46 L58.5 60 L61.5 60 L61.5 46 Z" />
          </g>
        </svg>

        {/* Bilingual wordmark — Arabic on top, English underneath */}
        <div
          dir="rtl"
          className="hero-zero-topcrest-ar mt-2 whitespace-nowrap font-black leading-none"
          style={{
            fontFamily: '"Tajawal", "Space Grotesk", ui-sans-serif, system-ui',
            fontWeight: 900,
            letterSpacing: "0.04em",
            fontSize: "clamp(0.78rem, 2.1vw, 1.35rem)",
            color: "#F5FBFF",
            textShadow: [
              "0 0 4px rgba(220,240,255,0.9)",
              "0 0 16px rgba(74,222,128,0.6)",
              "0 0 34px rgba(0,140,90,0.45)",
            ].join(","),
          }}
        >
          رؤية المملكة العربية السعودية{" "}
          <span style={{ color: "#4ADE80" }}>2030</span>
        </div>
        <div
          className="hero-zero-topcrest-en mt-1 whitespace-nowrap font-bold uppercase"
          style={{
            fontFamily: '"Space Grotesk", ui-sans-serif, system-ui',
            fontWeight: 700,
            letterSpacing: "0.32em",
            fontSize: "clamp(0.46rem, 0.9vw, 0.68rem)",
            color: "rgba(230,245,235,0.88)",
            textShadow: "0 0 12px rgba(74,222,128,0.55)",
          }}
        >
          Vision 2030 · Kingdom of Saudi Arabia
        </div>
        {/* Gold underline — a subtle regal accent */}
        <div
          className="mt-2"
          style={{
            width: "clamp(52px, 9vw, 92px)",
            height: "1.5px",
            background:
              "linear-gradient(90deg, rgba(184,137,47,0) 0%, #F6D07A 50%, rgba(184,137,47,0) 100%)",
            boxShadow: "0 0 8px rgba(246,208,122,0.7)",
            opacity: 0.9,
          }}
        />
      </div>


      {/* Lower stack — NEXIOS AI wordmark on top, then Vision 2030 crest,
          then the tagline. Anchored to the bottom of the viewport so the
          winged ARIA figure in the center of the frame stays clear while
          she speaks. Safe-area padding keeps clear of the iPhone home
          indicator.

          Accessibility: single `role="img"` region with a bilingual
          aria-label; decorative glyphs are `aria-hidden` and an `.sr-only`
          string carries the canonical label. */}
      <div
        role="img"
        aria-label="NEXIOS AI · نكسيوس — رؤية 2030 — Enterprise AI · Executive OS"
        dir="ltr"
        className="pointer-events-none absolute inset-x-0 z-40 flex flex-col items-center text-center"
        style={{
          bottom: "clamp(5dvh, 7dvh, 10dvh)",
          paddingBottom: "env(safe-area-inset-bottom)",
          unicodeBidi: "isolate",
        }}
      >
        {/* 1) NEXIOS AI wordmark (top of the stack) — brushed-nickel metallic
            treatment with a moving shine sweep. Halo intentionally tight so
            it never spills upward onto ARIA's face on any viewport. */}
        <span
          aria-hidden="true"
          className="hero-zero-wordmark-glow font-black uppercase leading-none"
          style={{
            fontFamily: '"Space Grotesk", ui-sans-serif, system-ui',
            fontWeight: 900,
            letterSpacing: "0.14em",
            fontSize: "clamp(1.5rem, 6vw, 3.25rem)",
            opacity: 0,
            animation: reducedMotion.current
              ? "hero-zero-wordmark-quiet 400ms 200ms forwards ease-out"
              : "hero-zero-wordmark 1400ms 8800ms forwards cubic-bezier(0.22,1,0.36,1), hero-zero-wordmark-pulse 4.8s 10200ms ease-in-out infinite, hero-zero-wordmark-shimmer 5.6s 10200ms linear infinite",
            willChange: "opacity, transform, filter",
          }}
        >
          NEXIOS AI
        </span>

        {/* 2) رؤية 2030 crest — sits directly beneath the wordmark */}
        <div
          aria-hidden
          className="hero-zero-crest relative mt-3"
          style={{
            opacity: 0,
            animation: reducedMotion.current
              ? "hero-zero-vision-quiet 600ms 400ms forwards ease-out"
              : "hero-zero-vision 4200ms 2400ms forwards cubic-bezier(0.22,1,0.36,1)",
            willChange: "opacity, transform, filter",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[220%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(3,10,18,0.55) 0%, rgba(3,10,18,0.28) 45%, rgba(3,10,18,0) 75%)",
              filter: "blur(6px)",
            }}
          />
          <div
            dir="rtl"
            className="whitespace-nowrap font-black leading-none"
            style={{
              fontFamily: '"Space Grotesk", "Tajawal", ui-sans-serif, system-ui',
              fontWeight: 900,
              letterSpacing: "0.06em",
              fontSize: "clamp(1rem, 2.6vw, 1.9rem)",
              color: "#F5FBFF",
              textShadow: [
                "0 0 4px rgba(220,240,255,0.9)",
                "0 0 18px rgba(0,180,120,0.65)",
                "0 0 40px rgba(0,140,90,0.55)",
                "0 0 90px rgba(0,120,80,0.35)",
              ].join(","),
            }}
          >
            رؤية <span style={{ color: "#4ADE80" }}>2030</span>
          </div>
          <div
            className="mt-1 whitespace-nowrap font-bold uppercase"
            style={{
              fontFamily: '"Space Grotesk", ui-sans-serif, system-ui',
              fontWeight: 800,
              letterSpacing: "0.28em",
              fontSize: "clamp(0.5rem, 0.95vw, 0.72rem)",
              color: "rgba(220,240,230,0.85)",
              textShadow: "0 0 12px rgba(0,180,120,0.55)",
            }}
          >
            Vision 2030 · Kingdom of Saudi Arabia
          </div>
        </div>

        {/* 3) Tagline */}
        <span
          aria-hidden="true"
          className="mt-3 text-[10px] font-medium uppercase tracking-[0.4em] text-white/60"
          style={{
            opacity: 0,
            animation: "hero-zero-tagline 800ms 9800ms forwards ease-out",
          }}
        >
          Enterprise AI · Executive OS
        </span>
        <span className="sr-only">
          NEXIOS AI · نكسيوس — رؤية 2030 — Enterprise AI · Executive OS
        </span>
      </div>




      {/* Skip chip */}
      <button
        type="button"
        onClick={finish}
        aria-label="Skip intro · تخطّي المقدمة"
        className="group absolute z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-white/80 backdrop-blur-md transition hover:border-white/40 hover:bg-white/[0.12] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF]"
        style={{
          bottom: "calc(1.5rem + env(safe-area-inset-bottom))",
          right: "1.5rem",
        }}
      >
        <span>تخطّي · Skip</span>
        <span className="inline-block transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
          ⏵
        </span>
      </button>

      <style>{`
        /* Fullscreen framing: portrait viewports show the film near-native,
           landscape/laptop viewports anchor the crop 28% from the top so the
           winged figure's head and wings stay in frame under object-cover. */
        .hero-zero-video { object-position: center center; }
        @media (min-aspect-ratio: 1/1) {
          .hero-zero-video { object-position: center 28%; }
        }
        @keyframes hero-zero-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes hero-zero-wordmark {
          0%   { opacity: 0; transform: translateY(28px) scale(0.92); filter: blur(14px); }
          55%  { opacity: 1; filter: blur(2px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes hero-zero-wordmark-quiet {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        /* Brushed-nickel metallic wordmark. A cool neutral gradient (silver
           → white highlight → nickel-graphite → silver) is clipped to the
           glyphs and animated by a shimmering background-position sweep.
           The outer halo is intentionally small so it never spills upward
           onto the ARIA figure on any viewport. */
        .hero-zero-wordmark-glow {
          color: #E6E9EE;
          background-image: linear-gradient(
            110deg,
            #C7CDD4 0%,
            #E8ECEF 18%,
            #FAFBFC 30%,
            #FFFFFF 34%,
            #FAFBFC 38%,
            #B7BEC6 55%,
            #8E959D 68%,
            #C7CDD4 82%,
            #E8ECEF 100%
          );
          background-size: 240% 100%;
          background-position: -60% 0;
          background-repeat: no-repeat;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow:
            0 0 1px rgba(240,244,248,0.85),
            0 0 6px rgba(210,220,230,0.55),
            0 0 18px rgba(170,185,200,0.35),
            0 0 36px rgba(120,140,160,0.22);
        }
        @keyframes hero-zero-wordmark-pulse {
          0%,100% {
            text-shadow:
              0 0 1px rgba(240,244,248,0.85),
              0 0 6px rgba(210,220,230,0.55),
              0 0 18px rgba(170,185,200,0.35),
              0 0 36px rgba(120,140,160,0.22);
          }
          50% {
            text-shadow:
              0 0 2px rgba(250,252,255,1),
              0 0 10px rgba(225,235,245,0.75),
              0 0 26px rgba(190,205,220,0.5),
              0 0 52px rgba(140,160,180,0.32);
          }
        }
        @keyframes hero-zero-wordmark-shimmer {
          0%   { background-position: -60% 0; }
          100% { background-position: 160% 0; }
        }

        /* Shorter viewports: shrink the wordmark further so it can never
           reach the ARIA figure's face on landscape phones or laptops. */
        @media (max-height: 620px) {
          .hero-zero-wordmark-glow { font-size: clamp(1.1rem, 3.6vw, 1.85rem) !important; }
        }

        @keyframes hero-zero-tagline {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Crest now lives inside a flex column — no horizontal translate. */
        @keyframes hero-zero-vision {
          0%   { opacity: 0;   transform: translateY(-8px) scale(0.72); filter: blur(8px); }
          35%  { opacity: 0.85; filter: blur(3px); }
          75%  { opacity: 1;   transform: translateY(0) scale(1.02); filter: blur(0.4px); }
          100% { opacity: 1;   transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes hero-zero-vision-quiet {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* Top-center Vision 2030 emblem — descends from above with a soft
           bloom, then rests. Reduced-motion variant just fades in. */
        @keyframes hero-zero-topcrest {
          0%   { opacity: 0;   transform: translateY(-14px) scale(0.94); filter: blur(6px); }
          45%  { opacity: 0.9; filter: blur(1.5px); }
          100% { opacity: 1;   transform: translateY(0) scale(1);       filter: blur(0); }
        }
        @keyframes hero-zero-topcrest-quiet {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        /* On very short viewports (landscape phones) tighten the top crest
           so it never crowds the ARIA figure. */
        @media (max-height: 620px) {
          .hero-zero-topcrest-sigil { width: clamp(40px, 8vw, 64px) !important; }
          .hero-zero-topcrest-ar    { font-size: clamp(0.7rem, 1.6vw, 1rem) !important; }
          .hero-zero-topcrest-en    { font-size: clamp(0.42rem, 0.7vw, 0.58rem) !important; }
        }
      `}</style>

    </div>
  );
}

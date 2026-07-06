import { useEffect, useRef, useState } from "react";
import videoAsset from "@/assets/hero-assembly.mp4.asset.json";
import audioAsset from "@/assets/hero-assembly.mp3.asset.json";
import posterAsset from "@/assets/hero-assembly-poster.jpg.asset.json";
import { setIntroActive } from "@/lib/intro-store";

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

  // Playback contract — the video and audio behave as ONE synchronized unit.
  //  1. Both tracks start together in the SAME event tick via
  //     Promise.all([video.play(), audio.play()]) after resetting both to 0.
  //  2. Audio is the master clock; every 2s we snap the video to audio when
  //     drift > 0.15s.
  //  3. Buffer stalls: video "waiting" pauses audio; video "playing" resumes
  //     both from audio.currentTime — one never runs while the other stalls.
  //  4. Tab hidden / visible: both pause and resume from the audio master.
  //  5. Audio "ended" triggers the 700ms crossfade exit; skip kills instantly.
  useEffect(() => {
    if (mounted !== "playing") return;
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    let cancelled = false;
    const cleanupFns: Array<() => void> = [];

    const waitReady = (el: HTMLMediaElement) =>
      new Promise<void>((resolve) => {
        if (el.readyState >= 2) {
          resolve();
          return;
        }
        const onReady = () => {
          el.removeEventListener("canplay", onReady);
          el.removeEventListener("loadeddata", onReady);
          resolve();
        };
        el.addEventListener("canplay", onReady, { once: true });
        el.addEventListener("loadeddata", onReady, { once: true });
        try {
          el.load();
        } catch {
          /* noop */
        }
      });

    const resetClocks = () => {
      try {
        video.pause();
        audio.pause();
        video.currentTime = 0;
        audio.currentTime = 0;
        audio.volume = 1;
      } catch {
        /* noop */
      }
    };

    // Start BOTH in the same event handler — never sequential awaits.
    const startBoth = async () => {
      resetClocks();
      try {
        await Promise.all([video.play(), audio.play()]);
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

    const kick = async () => {
      resetClocks();
      await Promise.all([waitReady(video), waitReady(audio)]);
      if (cancelled) return;
      const ok = await startBoth();
      if (!ok) {
        // Autoplay of unmuted audio blocked. Keep the muted video alive so
        // the scene shows, then wait for a gesture that starts BOTH together.
        void video.play().catch(() => {});
        armUnlock();
      }
    };
    void kick();

    // Audio-master drift correction every 2s (spec: >0.15s → snap video).
    const driftInterval = window.setInterval(() => {
      if (video.paused || audio.paused) return;
      const drift = video.currentTime - audio.currentTime;
      if (Math.abs(drift) > 0.15) {
        try {
          video.currentTime = audio.currentTime;
        } catch {
          /* noop */
        }
      }
    }, 2000);

    // Buffer stall handling — never let one run while the other stalls.
    const onVideoWaiting = () => {
      if (!audio.paused) audio.pause();
    };
    const onVideoPlaying = () => {
      try {
        video.currentTime = audio.currentTime;
      } catch {
        /* noop */
      }
      if (audio.paused) void audio.play().catch(() => {});
    };
    video.addEventListener("waiting", onVideoWaiting);
    video.addEventListener("playing", onVideoPlaying);

    // Mirror explicit seeks onto audio (dev-tools scrub / native controls).
    const onVideoSeeked = () => {
      if (Math.abs(video.currentTime - audio.currentTime) > 0.1) {
        try {
          audio.currentTime = video.currentTime;
        } catch {
          /* noop */
        }
      }
    };
    video.addEventListener("seeked", onVideoSeeked);

    // Tab visibility — pause/resume BOTH from the audio master clock.
    const onVisibility = () => {
      if (document.hidden) {
        video.pause();
        audio.pause();
      } else {
        try {
          video.currentTime = audio.currentTime;
        } catch {
          /* noop */
        }
        void audio.play().catch(() => {});
        void video.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Hard cap — safety net if audio never ends.
    hardCapRef.current = window.setTimeout(finish, HARD_CAP_MS);

    // Audio ended → 700ms crossfade exit (per spec). Video ended alone does
    // NOT exit — audio is the master and may be longer.
    const onAudioEnded = () => finish();
    audio.addEventListener("ended", onAudioEnded);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);


    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
      window.clearInterval(driftInterval);
      if (hardCapRef.current !== null) clearTimeout(hardCapRef.current);
      audio.removeEventListener("ended", onAudioEnded);
      video.removeEventListener("waiting", onVideoWaiting);
      video.removeEventListener("playing", onVideoPlaying);
      video.removeEventListener("seeked", onVideoSeeked);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
      // Skip / exit — kill BOTH tracks instantly (no fade on skip path).
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        /* noop */
      }
      try {
        video.pause();
      } catch {
        /* noop */
      }
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

      {/* Vision 2030 crest — video is fullscreen object-cover, so the crest
          is positioned relative to the viewport. Portrait viewports sit near
          the very top; landscape viewports drop slightly to clear the head. */}
      <div
        dir="ltr"
        aria-hidden
        className="hero-zero-crest pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 text-center"
        style={{
          top: "4dvh",
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
            fontSize: "clamp(1.15rem, 3.2vw, 2.4rem)",
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
            fontSize: "clamp(0.55rem, 1.05vw, 0.8rem)",
            color: "rgba(220,240,230,0.85)",
            textShadow: "0 0 12px rgba(0,180,120,0.55)",
          }}
        >
          Vision 2030 · Kingdom of Saudi Arabia
        </div>
      </div>


      {/* NEXIOS AI wordmark — lower third across all devices. Safe-area
          padding keeps clear of the iPhone home indicator. */}
      <div
        className="pointer-events-none absolute inset-x-0 z-30 flex flex-col items-center text-center"
        style={{
          bottom: "clamp(8dvh, 12dvh, 16dvh)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div
          className="font-black uppercase leading-none"
          style={{
            fontFamily: '"Space Grotesk", ui-sans-serif, system-ui',
            fontWeight: 900,
            letterSpacing: "0.14em",
            fontSize: "clamp(2rem, 8vw, 4.5rem)",
            color: "#F5FBFF",
            textShadow: [
              "0 0 2px rgba(220,240,255,0.9)",
              "0 0 14px rgba(0,212,255,0.55)",
              "0 0 44px rgba(0,180,220,0.35)",
              "0 0 90px rgba(0,140,200,0.25)",
            ].join(","),
            opacity: 0,
            animation: reducedMotion.current
              ? "hero-zero-wordmark-quiet 400ms 200ms forwards ease-out"
              : "hero-zero-wordmark 1400ms 8800ms forwards cubic-bezier(0.22,1,0.36,1)",
            willChange: "opacity, transform, filter",
          }}
        >
          NEXIOS AI
        </div>
        <div
          className="mt-2 text-[10px] font-medium uppercase tracking-[0.4em] text-white/60"
          style={{
            opacity: 0,
            animation: "hero-zero-tagline 800ms 9800ms forwards ease-out",
          }}
        >
          Enterprise AI · Executive OS
        </div>
      </div>



      {/* Skip chip */}
      <button
        type="button"
        onClick={finish}
        aria-label="Skip intro · تخطّي المقدمة"
        className="group absolute bottom-6 right-6 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-white/80 backdrop-blur-md transition hover:border-white/40 hover:bg-white/[0.12] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF] rtl:right-auto rtl:left-6"
      >
        <span>تخطّي · Skip</span>
        <span className="inline-block transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
          ⏵
        </span>
      </button>

      <style>{`
        @keyframes hero-zero-fadein {
          from { opacity: 0; }
          to   { opacity: 0.28; }
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
        @keyframes hero-zero-flicker {
          0%,100% { text-shadow:
            0 0 4px rgba(255,220,140,1),
            0 0 14px rgba(255,180,60,1),
            0 0 36px rgba(255,110,20,0.95),
            0 0 80px rgba(240,70,15,0.85),
            0 0 140px rgba(220,45,10,0.75),
            0 0 220px rgba(200,30,5,0.55); }
          45%     { text-shadow:
            0 0 6px rgba(255,235,170,1),
            0 0 20px rgba(255,200,80,1),
            0 0 50px rgba(255,130,30,1),
            0 0 110px rgba(245,80,20,0.95),
            0 0 180px rgba(225,50,12,0.85),
            0 0 280px rgba(200,30,5,0.7); }
          70%     { text-shadow:
            0 0 5px rgba(255,225,150,1),
            0 0 18px rgba(255,190,70,1),
            0 0 44px rgba(255,120,25,1),
            0 0 96px rgba(240,70,15,0.9),
            0 0 160px rgba(220,45,10,0.8),
            0 0 240px rgba(200,30,5,0.6); }
        }
        @keyframes hero-zero-flame {
          from { opacity: 0; transform: translateX(-50%) scaleY(0.6); }
          to   { opacity: 0.85; transform: translateX(-50%) scaleY(1); }
        }
        @keyframes hero-zero-tagline {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-zero-vision {
          0%   { opacity: 0;   transform: translateX(-50%) translateY(-14px) scale(0.42); filter: blur(10px); }
          35%  { opacity: 0.85; filter: blur(4px); }
          75%  { opacity: 1;   transform: translateX(-50%) translateY(0) scale(1.02); filter: blur(0.4px); }
          100% { opacity: 1;   transform: translateX(-50%) translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes hero-zero-vision-quiet {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

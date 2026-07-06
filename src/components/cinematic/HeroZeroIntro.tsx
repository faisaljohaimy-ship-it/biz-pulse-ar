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

  // Playback contract — video-only. The narration audio track is NEVER
  // auto-started; ARIA only speaks when the user explicitly presses the
  // greeting / conversation buttons in the executive hero. The muted video
  // plays under browser autoplay policy; audio element is kept in the DOM
  // (for potential future manual playback) but no code calls audio.play().
  useEffect(() => {
    if (mounted !== "playing") return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

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

    const kick = async () => {
      try {
        video.pause();
        video.currentTime = 0;
      } catch {
        /* noop */
      }
      await waitReady(video);
      if (cancelled) return;
      void video.play().catch(() => {});
    };
    void kick();

    // Tab visibility — pause/resume the muted video.
    const onVisibility = () => {
      if (document.hidden) {
        video.pause();
      } else {
        void video.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Hard cap — safety net so the intro always exits.
    hardCapRef.current = window.setTimeout(finish, HARD_CAP_MS);

    // Video ended → exit via the same crossfade path.
    const onVideoEnded = () => finish();
    video.addEventListener("ended", onVideoEnded);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);


    return () => {
      cancelled = true;
      if (hardCapRef.current !== null) clearTimeout(hardCapRef.current);
      video.removeEventListener("ended", onVideoEnded);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
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
          padding keeps clear of the iPhone home indicator.

          Accessibility: the whole block is a single `role="img"` region with
          a bilingual aria-label so a screen reader announces
          "NEXIOS AI, Enterprise AI Executive OS" once, in one voice, instead
          of reading the decorative letters and dot separator. The individual
          visual glyphs are marked `aria-hidden` and an `.sr-only` string
          carries the canonical bilingual label. */}
      <div
        role="img"
        aria-label="NEXIOS AI · نكسيوس — Enterprise AI · Executive OS"
        dir="ltr"
        className="pointer-events-none absolute inset-x-0 z-30 flex flex-col items-center text-center"
        style={{
          bottom: "clamp(8dvh, 12dvh, 16dvh)",
          paddingBottom: "env(safe-area-inset-bottom)",
          unicodeBidi: "isolate",
        }}
      >

        <span
          aria-hidden="true"
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
        </span>
        <span
          aria-hidden="true"
          className="mt-2 text-[10px] font-medium uppercase tracking-[0.4em] text-white/60"
          style={{
            opacity: 0,
            animation: "hero-zero-tagline 800ms 9800ms forwards ease-out",
          }}
        >
          Enterprise AI · Executive OS
        </span>
        <span className="sr-only">
          NEXIOS AI · نكسيوس — Enterprise AI · Executive OS
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

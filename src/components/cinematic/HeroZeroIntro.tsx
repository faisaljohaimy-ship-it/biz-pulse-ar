import { useEffect, useRef, useState } from "react";
import videoAsset from "@/assets/hero-assembly.mp4.asset.json";
import audioAsset from "@/assets/hero-assembly-audio-12.mp3.asset.json";
import posterAsset from "@/assets/hero-assembly-poster.jpg.asset.json";
import saudiEmblem from "@/assets/saudi-emblem.png";
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
  // MAXIMUM-LEGAL AUTOPLAY: video is muted+autoplay on mount (always allowed).
  // Audio uses a three-tier ignition strategy — see the media effect below.
  const [audioStarted, setAudioStarted] = useState(false);
  const audioStartedRef = useRef(false);
  const igniteAudioRef = useRef<null | (() => Promise<void>)>(null);
  const soundOnRef = useRef(true);
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

    // ── THREE-TIER AUDIO IGNITION ────────────────────────────────────────
    // Tier 1: optimistic autoplay() on mount. If the browser grants sound
    //         autoplay (returning/engaged users, PWA), audio starts at t=0.
    // Tier 2: on rejection, attach ONE-TIME listeners for the FIRST natural
    //         interaction (pointerdown / touchstart / keydown / wheel /
    //         scroll) anywhere on document. First fire → snap both media to
    //         t=0 → play together. Listeners self-remove.
    // Tier 3: while audio is silent, a small pulsing chip is visible in JSX;
    //         its own tap is a valid gesture and reuses igniteAudioRef.
    // Discipline: exactly ONE optimistic try (no repeated blocked play()
    // calls). prefers-reduced-motion skips Tier 1 — chip tap only.
    const markStarted = () => {
      if (audioStartedRef.current) return;
      audioStartedRef.current = true;
      setAudioStarted(true);
    };

    // Tier 2/3 igniter — invoked ONLY from real user gestures (document
    // event listeners below or the chip's onClick). Calls AriaAudioBus.unlock()
    // because this IS a real gesture. ARIA/tour sources remain silent — they
    // require their own explicit user actions to acquire the bus.
    const igniteAudio = async (resnap: boolean) => {
      if (audioStartedRef.current) return;
      if (!soundOnRef.current) return;
      AriaAudioBus.unlock(); // real user gesture — safe to unlock the bus
      const granted = AriaAudioBus.acquire("hero-soundtrack", () => {
        try { audio.pause(); } catch { /* noop */ }
      });
      if (!granted) return;
      try {
        await waitReady(audio);
        if (resnap) {
          try { video.currentTime = 0; audio.currentTime = 0; } catch { /* noop */ }
        } else {
          try { audio.currentTime = video.currentTime; } catch { /* noop */ }
        }
        await audio.play();
        if (resnap) { try { await video.play(); } catch { /* noop */ } }
        AriaAudioBus.notifyPlaying("hero-soundtrack", audio);
        markStarted();
      } catch {
        AriaAudioBus.release("hero-soundtrack");
      }
    };
    igniteAudioRef.current = () => igniteAudio(true);

    const attachGestureListeners = () => {
      const events: Array<keyof DocumentEventMap> = [
        "pointerdown", "touchstart", "keydown", "wheel",
      ];
      const onFirst = () => {
        for (const ev of events) {
          document.removeEventListener(ev, onFirst, true);
        }
        void igniteAudio(true);
      };
      for (const ev of events) {
        document.addEventListener(ev, onFirst, { capture: true, passive: true, once: true });
      }
      cleanupFns.push(() => {
        for (const ev of events) document.removeEventListener(ev, onFirst, true);
      });
    };

    const kick = async () => {
      await waitReady(video);
      if (cancelled) return;
      void video.play().catch(() => {});
      if (reducedMotion.current) {
        // Reduced motion: no optimistic audio try. Chip tap only.
        return;
      }
      // Tier 1: exactly ONE optimistic play attempt. This is NOT a real
      // user gesture, so we do NOT call AriaAudioBus.unlock(). We acquire
      // the bus using the "hero-soundtrack" gesture-bypass exemption —
      // ARIA/tour sources are NOT exempt and remain fully locked.
      try {
        const granted = AriaAudioBus.acquire(
          "hero-soundtrack",
          () => { try { audio.pause(); } catch { /* noop */ } },
          { bypassGesture: true },
        );
        if (!granted) { attachGestureListeners(); return; }
        await waitReady(audio);
        audio.currentTime = 0;
        await audio.play();
        AriaAudioBus.notifyPlaying("hero-soundtrack", audio);
        markStarted();
      } catch {
        // Browser refused Tier 1. Release the bus so a real gesture path
        // (Tier 2 / chip) can re-acquire and legitimately unlock().
        AriaAudioBus.release("hero-soundtrack");
        attachGestureListeners();
      }
    };
    void kick();






    // Audio-master drift correction — only runs while the user has enabled
    // sound. Nudges the muted video's playbackRate for sub-frame drift; hard
    // seek only when drift exceeds ~0.35s. When sound is off there is no
    // clock to lock to, so the video simply runs on its own.
    const driftInterval = window.setInterval(() => {
      if (!soundOnRef.current) return;
      if (video.paused || audio.paused) return;
      const drift = video.currentTime - audio.currentTime; // +ve = video ahead
      const abs = Math.abs(drift);
      if (abs > 0.35) {
        try {
          video.currentTime = audio.currentTime;
          video.playbackRate = 1;
        } catch { /* noop */ }
      } else if (abs > 0.04) {
        const target = drift > 0 ? 0.96 : 1.04;
        try { video.playbackRate = target; } catch { /* noop */ }
      } else if (video.playbackRate !== 1) {
        try { video.playbackRate = 1; } catch { /* noop */ }
      }
    }, 250);

    const onVideoWaiting = () => {
      if (soundOnRef.current && !audio.paused) audio.pause();
    };
    const onVideoPlaying = () => {
      if (!soundOnRef.current) return;
      try { video.currentTime = audio.currentTime; } catch { /* noop */ }
      if (audio.paused) void audio.play().catch(() => {});
    };
    video.addEventListener("waiting", onVideoWaiting);
    video.addEventListener("playing", onVideoPlaying);

    // Tab-switch / backgrounding — pause both while hidden. On resume, if
    // sound is on, restart audio first (master clock) then snap the muted
    // video to it. If sound is off, just resume the video.
    let resuming = false;
    const onVisibility = () => {
      if (document.hidden) {
        try { video.pause(); if (soundOnRef.current) audio.pause(); } catch { /* noop */ }
        return;
      }
      if (resuming) return;
      resuming = true;
      (async () => {
        try {
          video.playbackRate = 1;
          if (soundOnRef.current) {
            await audio.play().catch(() => {});
            await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
            try { video.currentTime = audio.currentTime; } catch { /* noop */ }
          }
          await video.play().catch(() => {});
        } finally {
          resuming = false;
        }
      })();
    };
    document.addEventListener("visibilitychange", onVisibility);
    // iOS bfcache / page-freeze recovery
    window.addEventListener("pageshow", onVisibility);
    cleanupFns.push(() => window.removeEventListener("pageshow", onVisibility));



    hardCapRef.current = window.setTimeout(finish, HARD_CAP_MS);

    const onAudioEnded = () => finish();
    const onVideoEnded = () => {
      // When sound is on, audio is master and will fire its own `ended`.
      // When sound is off, the video is the only clock — end when it ends.
      if (!soundOnRef.current) finish();
    };
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
    if (mounted !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sync = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, [mounted]);


  // Chip tap = valid user gesture. Re-uses the same ignition path (Tier 2/3).
  const handleChipTap = () => {
    void igniteAudioRef.current?.();
  };



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
        className="hero-zero-video absolute inset-0 z-10 block"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
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

      {/* Ember particle layer — pointer-events none, sits above the figure. */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 h-full w-full mix-blend-screen"
      />

      {/* Top-center Saudi national emblem (crossed swords + palm tree).
          Rendered above the figure but sized/placed inside the top safe-area
          so ARIA's face remains fully visible below. No text overlay. */}
      <div
        aria-hidden
        className="hero-zero-emblem-top pointer-events-none absolute inset-x-0 z-40 flex flex-col items-center"
        style={{
          top: "calc(env(safe-area-inset-top) + clamp(0.35rem, 1.4vh, 1rem))",
        }}
      >
        <img
          src={saudiEmblem}
          srcSet={`${saudiEmblem} 1x, ${saudiEmblem} 2x`}
          alt=""
          data-testid="hero-saudi-emblem"
          width={768}
          height={768}
          decoding="async"
          fetchPriority="high"
          style={{
            width: "clamp(96px, min(15vw, 18vh), 200px)",
            height: "auto",
            opacity: 0,
            filter: [
              "drop-shadow(0 0 1px rgba(255,255,255,0.55))",
              "drop-shadow(0 0 6px rgba(74,222,128,0.55))",
              "drop-shadow(0 0 22px rgba(0,140,90,0.32))",
              "contrast(1.06) saturate(1.08)",
            ].join(" "),
            imageRendering: "auto",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            animation: reducedMotion.current
              ? "hero-zero-vision-quiet 600ms 300ms forwards ease-out"
              : "hero-zero-vision 3200ms 1200ms forwards cubic-bezier(0.22,1,0.36,1)",
            willChange: "opacity, transform, filter",
          }}
        />
      </div>





      {/* Lower stack — ONE chrome "NEXIOS AI" wordmark, cold silver to match
          the winged figure. Sweep + gleam via ::after. All other lines
          (green-AI crest, KSA line, tagline) removed for a single statement. */}
      <div
        role="img"
        aria-label="NEXIOS AI"
        dir="ltr"
        className="hero-zero-bottom-stack pointer-events-none absolute inset-x-0 z-40 flex flex-col items-center text-center"
        style={{
          bottom: "clamp(10dvh, 22dvh, 34dvh)",
          paddingBottom: "env(safe-area-inset-bottom)",
          unicodeBidi: "isolate",
        }}
      >
        <span
          aria-hidden="true"
          data-chrome-wordmark
          className="hero-zero-chrome-wordmark relative inline-block whitespace-nowrap uppercase leading-none"
          data-text="NEXIOS AI"
          style={{
            fontFamily: '"Space Grotesk", ui-sans-serif, system-ui',
            fontWeight: 800,
            letterSpacing: "0.06em",
            fontSize: "clamp(2.6rem, 11vw, 6rem)",
            maxWidth: "90vw",
          }}
        >
          NEXIOS AI
        </span>
        <span className="sr-only">NEXIOS AI</span>
        <p
          aria-hidden="true"
          className="whitespace-nowrap"
          style={{
            marginTop: "clamp(6px, 1dvh, 12px)",
            fontFamily: '"Space Grotesk", ui-sans-serif, system-ui',
            fontWeight: 700,
            fontSize: "clamp(0.65rem, 2vw, 0.9rem)",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "rgba(227,232,238,0.85)",
            textShadow: "0 0 12px rgba(190,205,225,0.35)",
            opacity: 0,
            animation: "hero-zero-chrome-in 700ms 9400ms ease-out forwards",
          }}
        >
          Digital Transformation
        </p>
      </div>





      {/* TIER 3 — pulsing speaker hint. Any interaction anywhere ignites
          audio (Tier 2). Tapping the chip itself also counts as a gesture.
          Fades out the instant audio starts. */}
      {!audioStarted && (
        <button
          type="button"
          onClick={handleChipTap}
          aria-label="اضغط لتشغيل الصوت · Tap for sound"
          className="absolute z-[65] inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/55 bg-[#03111f]/80 px-4 py-2 text-[12px] font-semibold text-white backdrop-blur-md shadow-[0_0_28px_rgba(0,212,255,0.35)] transition hover:border-[#3AE8FF] hover:bg-[#03111f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF]"
          style={{
            bottom: "calc(1.5rem + env(safe-area-inset-bottom))",
            left: "1.5rem",
            animation: "hero-zero-chip-pulse 1.8s ease-in-out infinite",
          }}
          dir="rtl"
        >
          <span aria-hidden className="text-[15px]">🔊</span>
          <span>اضغط في أي مكان لتشغيل الصوت</span>
        </button>
      )}




      {/* Skip chip */}
      <button
        type="button"
        onClick={finish}
        aria-label="Skip intro · تخطّي المقدمة"
        className="group absolute z-30 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-white/80 backdrop-blur-md transition hover:border-white/40 hover:bg-white/[0.12] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF]"
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
        /* ── Chrome NEXIOS AI wordmark ─────────────────────────────
           Cold silver background-clip:text, entrance fade-up, and a
           diagonal light sweep every 5s. Reduced-motion: static. */
        .hero-zero-chrome-wordmark {
          background: linear-gradient(178deg,
            #ffffff 0%, #e3e8ee 14%, #aab3bf 32%, #5e6672 48%,
            #2e343d 56%, #8b94a1 70%, #dfe4ea 86%, #f7f9fb 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          filter:
            drop-shadow(0 1px 0 rgba(255,255,255,0.35))
            drop-shadow(0 0 22px rgba(190,205,225,0.45))
            drop-shadow(0 0 60px rgba(140,160,190,0.25));
          opacity: 0;
          transform: translateY(14px);
          animation: hero-zero-chrome-in 700ms 9200ms ease-out forwards;
        }
        .hero-zero-chrome-wordmark::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 22%);
          -webkit-mask: linear-gradient(#000, #000);
                  mask: linear-gradient(#000, #000);
          mix-blend-mode: screen;
          opacity: 0.5;
        }
        .hero-zero-chrome-wordmark::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          pointer-events: none;
          font: inherit;
          letter-spacing: inherit;
          text-transform: inherit;
          color: transparent;
          background: linear-gradient(115deg,
            transparent 30%,
            rgba(255,255,255,0.15) 42%,
            rgba(255,255,255,0.85) 50%,
            rgba(255,255,255,0.15) 58%,
            transparent 70%);
          background-size: 300% 100%;
          background-position: 150% 0;
          -webkit-background-clip: text;
                  background-clip: text;
          -webkit-text-fill-color: transparent;
          mix-blend-mode: screen;
          animation: hero-zero-chrome-sweep 5s 10000ms linear infinite;
        }
        @keyframes hero-zero-chrome-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-zero-chrome-sweep {
          0%   { background-position: 150% 0; }
          22%  { background-position: -150% 0; }
          100% { background-position: -150% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-zero-chrome-wordmark {
            opacity: 1;
            transform: none;
            animation: none;
          }
          .hero-zero-chrome-wordmark::after { animation: none; opacity: 0; }
        }





        /* Universal full-bleed fit. Portrait viewports render the portrait
           film near-native; landscape viewports crop top/bottom so the winged
           figure stays framed. Ultrawide steps the anchor further up so the
           head + wings survive very wide aspect ratios. */
        .hero-zero-video { object-position: center center; }
        @media (orientation: portrait) {
          .hero-zero-video { object-position: center center; }
        }
        @media (orientation: landscape) {
          .hero-zero-video { object-position: center 28%; }
        }
        @media (orientation: landscape) and (min-aspect-ratio: 2/1) {
          .hero-zero-video { object-position: center 22%; }
        }
        /* Laptop landscape: tighten top emblem and bottom stack so the entire
           composition (emblem → figure → wordmark → tagline) fits
           within a single laptop viewport without vertical clipping. */
        @media (min-width: 1024px) and (max-height: 900px) {
          .hero-zero-emblem-top { top: calc(env(safe-area-inset-top) + 0.25rem) !important; }
          .hero-zero-emblem-top img { width: clamp(72px, 10vh, 128px) !important; }
          .hero-zero-bottom-stack { bottom: clamp(2dvh, 3.5dvh, 5dvh) !important; }
        }
        @media (min-width: 1280px) and (max-height: 820px) {
          .hero-zero-emblem-top img { width: clamp(64px, 9vh, 112px) !important; }
          .hero-zero-bottom-stack { bottom: clamp(1.5dvh, 2.5dvh, 4dvh) !important; }
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
        @media (min-width: 1024px) and (max-height: 900px) {
          .hero-zero-wordmark-glow { font-size: clamp(1.4rem, 3vw, 2.4rem) !important; }
        }
        @media (min-width: 1280px) and (max-height: 820px) {
          .hero-zero-wordmark-glow { font-size: clamp(1.25rem, 2.4vw, 2rem) !important; }
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

        /* Sound toggle idle pulse — gently signals "tap to hear ARIA"
           without being noisy. Stops the moment the user enables sound. */
        @keyframes hero-zero-sound-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.35); }
          50%      { box-shadow: 0 0 0 10px rgba(0, 212, 255, 0); }
        }
        @keyframes hero-zero-chip-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.45), 0 0 28px rgba(0, 212, 255, 0.35); transform: translateY(0); }
          50%      { box-shadow: 0 0 0 14px rgba(0, 212, 255, 0), 0 0 32px rgba(0, 212, 255, 0.55); transform: translateY(-2px); }
        }
      `}</style>

    </div>
  );
}

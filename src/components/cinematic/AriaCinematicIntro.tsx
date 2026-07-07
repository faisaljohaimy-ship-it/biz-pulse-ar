// ─────────────────────────────────────────────────────────────────────────────
// AriaCinematicIntro — the cinematic overture that plays BEFORE the first system
// page. Recreates the reference scene's beats (darkness → a central presence
// emerging under volumetric light → assembly → gated entrance) with ARIA as the
// figure instead of the original man.
//
// Figure source (in priority order):
//   1. <video src={videoSrc}>  → drop your HeyGen ARIA render here for a
//      photorealistic, moving ARIA (recommended; you have HeyGen Creator).
//   2. poster still (aria-hero-presence / aria-backdrop) with a slow Ken-Burns
//      push when no video is provided or motion is reduced.
//
// Browser-policy compliant: ARIA's greeting audio is armed only on the single
// user gesture ("دخول / Enter"). Respects prefers-reduced-motion. RTL + mobile.
// No secrets. Self-contained. Drop into the landing route before the hero.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import { setIntroActive } from "@/lib/intro-store";

type Phase = "black" | "emerge" | "presence" | "wordmark" | "ready" | "exit";

export interface AriaCinematicIntroProps {
  /** Called once the user enters (after the exit crossfade). */
  onEnter?: () => void;
  /** ARIA motion clip (HeyGen render). Falls back to the still if omitted. */
  videoSrc?: string;
  /** Poster / still presence used before video is ready or when motion is reduced. */
  posterSrc?: string;
  /** ARIA greeting audio, played on the Enter gesture. */
  audioSrc?: string;
  /** Optional ambient bed played under the intro after the first user gesture. */
  ambientSrc?: string;
  /** Wordmark text assembled at the climax. */
  wordmark?: string;
  tagline?: string;
}

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function AriaCinematicIntro({
  onEnter,
  videoSrc = "/aria-hero-motion.mp4",
  posterSrc = "/aria-backdrop.webp",
  audioSrc = "/aria-greeting-voice.mp3",
  ambientSrc = "/aria-ambient.mp3",
  wordmark = "NEXIOS",
  tagline = "منظومة الذكاء التنفيذية · إدارة الأمن الصناعي",
}: AriaCinematicIntroProps) {
  const [phase, setPhase] = useState<Phase>("black");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [ambientReady, setAmbientReady] = useState(false);
  const [ambientOn, setAmbientOn] = useState(false);
  const [userMuted, setUserMuted] = useState(false);

  // Mark the intro active so the rest of the shell (watermark, greeter) can hide.
  useEffect(() => {
    setIntroActive(true);
    return () => setIntroActive(false);
  }, []);

  // Cinematic timeline. Reduced motion jumps straight to a ready presence.
  useEffect(() => {
    if (REDUCED) {
      setPhase("ready");
      return;
    }
    const timers = [
      setTimeout(() => setPhase("emerge"), 350),
      setTimeout(() => setPhase("presence"), 1500),
      setTimeout(() => setPhase("wordmark"), 3600),
      setTimeout(() => setPhase("ready"), 5200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Lightweight volumetric particle field (dust motes drifting up through light).
  useEffect(() => {
    if (REDUCED) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);
    const N = Math.min(70, Math.floor((w * h) / 26000));
    const parts = Array.from({ length: N }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.8 + 0.4,
      s: Math.random() * 0.35 + 0.08,
      a: Math.random() * 0.5 + 0.15,
    }));

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", onResize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y -= p.s;
        p.x += Math.sin(p.y * 0.01) * 0.15;
        if (p.y < -4) {
          p.y = h + 4;
          p.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52, 211, 153, ${p.a})`;
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Ambient bed — arm on the first user gesture (browser autoplay policy).
  // Silent no-op if the file is missing or blocked; a tiny toggle exposes it.
  const startAmbient = useCallback(() => {
    if (REDUCED || userMuted) return;
    const el = ambientRef.current;
    if (!el || ambientOn) return;
    el.volume = 0;
    el.loop = true;
    el.muted = false;
    const p = el.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        setAmbientOn(true);
        // Gentle fade-in to ~22% so it never fights ARIA's voice.
        const target = 0.22;
        const step = () => {
          if (!ambientRef.current) return;
          const next = Math.min(target, ambientRef.current.volume + 0.02);
          ambientRef.current.volume = next;
          if (next < target) window.setTimeout(step, 90);
        };
        step();
      }).catch(() => {
        /* blocked or file missing — stay silent, hide toggle */
      });
    }
  }, [ambientOn, userMuted]);

  const stopAmbient = useCallback(() => {
    const el = ambientRef.current;
    if (!el) return;
    // Quick fade-out then pause, so it never overlaps ARIA's voice.
    const fade = () => {
      if (!ambientRef.current) return;
      const next = Math.max(0, ambientRef.current.volume - 0.06);
      ambientRef.current.volume = next;
      if (next > 0) window.setTimeout(fade, 50);
      else {
        try { ambientRef.current.pause(); } catch { /* noop */ }
        setAmbientOn(false);
      }
    };
    fade();
  }, []);

  // Listen for the first user gesture on the intro root and arm the ambient bed.
  useEffect(() => {
    if (REDUCED || userMuted) return;
    const arm = () => {
      startAmbient();
    };
    const opts: AddEventListenerOptions = { once: true, passive: true };
    window.addEventListener("pointerdown", arm, opts);
    window.addEventListener("touchstart", arm, opts);
    window.addEventListener("keydown", arm, opts);
    window.addEventListener("wheel", arm, opts);
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("touchstart", arm);
      window.removeEventListener("keydown", arm);
      window.removeEventListener("wheel", arm);
    };
  }, [startAmbient, userMuted]);

  // Clean up ambient on unmount.
  useEffect(() => {
    return () => {
      const el = ambientRef.current;
      if (el) {
        try { el.pause(); } catch { /* noop */ }
      }
    };
  }, []);

  const handleEnter = useCallback(() => {
    // Stop ambient cleanly so it never overlaps ARIA's greeting.
    stopAmbient();
    // Arm ARIA's voice on the user gesture (autoplay-policy compliant).
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        /* user may have muted — proceed silently */
      });
    }
    setPhase("exit");
    window.setTimeout(() => {
      setIntroActive(false);
      onEnter?.();
    }, 900);
  }, [onEnter, stopAmbient]);

  const toggleAmbient = useCallback(() => {
    if (ambientOn) {
      setUserMuted(true);
      stopAmbient();
    } else {
      setUserMuted(false);
      startAmbient();
    }
  }, [ambientOn, startAmbient, stopAmbient]);

  const showFigure = phase !== "black";
  const showWord = phase === "wordmark" || phase === "ready" || phase === "exit";
  const showGate = phase === "ready";

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-label="مقدمة NEXIOS السينمائية"
      className="aci-root"
      data-phase={phase}
      onKeyDown={(e) => {
        if (showGate && (e.key === "Enter" || e.key === " ")) handleEnter();
      }}
      tabIndex={-1}
    >
      {/* Figure layer — ARIA (video if provided, else Ken-Burns still) */}
      <div className={`aci-figure ${showFigure ? "in" : ""}`}>
        {videoSrc && !REDUCED ? (
          <video
            className="aci-media"
            src={videoSrc}
            poster={posterSrc}
            autoPlay
            muted
            playsInline
            loop
            preload="auto"
          />
        ) : (
          <img className="aci-media aci-kenburns" src={posterSrc} alt="ARIA" />
        )}
        {/* Volumetric glow + vignette + emerald rim */}
        <div className="aci-glow" aria-hidden />
        <div className="aci-vignette" aria-hidden />
      </div>

      {/* Particle field */}
      {!REDUCED && <canvas ref={canvasRef} className="aci-particles" aria-hidden />}

      {/* Wordmark assembly */}
      <div className={`aci-word ${showWord ? "in" : ""}`}>
        <h1 className="aci-mark">
          {wordmark.split("").map((ch, i) => (
            <span key={i} style={{ ["--i" as string]: i }} className="aci-letter">
              {ch}
            </span>
          ))}
        </h1>
        <p className="aci-tag">{tagline}</p>
      </div>

      {/* Entrance gate */}
      {showGate && (
        <button type="button" className="aci-enter" onClick={handleEnter} autoFocus>
          <span>دخول</span>
          <span className="aci-enter-en">Enter</span>
        </button>
      )}

      <audio ref={audioRef} src={audioSrc} preload="auto" className="sr-only" />

      <style>{`
        .aci-root{
          position:fixed; inset:0; z-index:80; overflow:hidden;
          background:#02080f; color:#E6FFF6;
          font-family:"Tajawal","Space Grotesk",ui-sans-serif,system-ui;
          display:flex; align-items:center; justify-content:center;
          transition:opacity .9s ease;
        }
        .aci-root[data-phase="exit"]{ opacity:0; pointer-events:none; }

        .aci-figure{ position:absolute; inset:0; opacity:0; transform:scale(1.08);
          transition:opacity 1.4s ease, transform 6s ease; }
        .aci-figure.in{ opacity:1; transform:scale(1); }
        .aci-media{ position:absolute; inset:0; width:100%; height:100%;
          object-fit:cover; object-position:center 32%; }
        @keyframes aci-kb{ from{transform:scale(1.02)} to{transform:scale(1.14)} }
        .aci-kenburns{ animation:aci-kb 12s ease-out forwards; }

        .aci-glow{ position:absolute; inset:0; pointer-events:none;
          background:
            radial-gradient(60% 45% at 50% 42%, rgba(16,185,129,.28), transparent 70%),
            radial-gradient(80% 60% at 50% 60%, rgba(6,26,46,.55), transparent 75%);
          mix-blend-mode:screen; }
        .aci-vignette{ position:absolute; inset:0; pointer-events:none;
          background:radial-gradient(120% 90% at 50% 40%, transparent 45%, rgba(2,8,15,.92) 100%); }

        .aci-particles{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }

        .aci-word{ position:relative; z-index:2; text-align:center; padding:0 24px;
          opacity:0; transform:translateY(14px); transition:opacity 1s ease, transform 1s ease;
          margin-top:38vh; }
        .aci-word.in{ opacity:1; transform:translateY(0); }
        .aci-mark{ display:flex; gap:.08em; justify-content:center;
          font-family:"Space Grotesk",ui-sans-serif; font-weight:800;
          font-size:clamp(38px,11vw,86px); letter-spacing:.14em; margin:0;
          background:linear-gradient(180deg,#fff 0%,#bfeee0 45%,#34D399 100%);
          -webkit-background-clip:text; background-clip:text; color:transparent;
          filter:drop-shadow(0 0 26px rgba(16,185,129,.35)); }
        .aci-letter{ display:inline-block; opacity:0; transform:translateY(18px);
          animation:aci-rise .6s cubic-bezier(.2,.7,.2,1) forwards;
          animation-delay:calc(var(--i) * 90ms); }
        @keyframes aci-rise{ to{ opacity:1; transform:translateY(0);} }
        .aci-tag{ margin:.9rem 0 0; font-size:clamp(12px,3.4vw,15px);
          font-weight:600; letter-spacing:.02em; color:rgba(230,255,246,.72); }

        .aci-enter{ position:absolute; bottom:9vh; left:50%; transform:translateX(-50%);
          z-index:3; display:inline-flex; flex-direction:column; align-items:center; gap:2px;
          min-width:180px; min-height:52px; padding:12px 34px; cursor:pointer;
          border-radius:9999px; border:1px solid rgba(52,211,153,.5);
          background:rgba(4,17,31,.7); backdrop-filter:blur(8px);
          color:#E6FFF6; font-weight:700; font-size:16px; letter-spacing:.02em;
          box-shadow:0 8px 40px rgba(16,185,129,.28);
          animation:aci-pulse 2.4s ease-in-out infinite;
          transition:border-color .2s, background .2s, transform .2s; }
        .aci-enter:hover{ border-color:#34D399; background:rgba(4,17,31,.92); transform:translateX(-50%) translateY(-1px); }
        .aci-enter:focus-visible{ outline:2px solid #34D399; outline-offset:3px; }
        .aci-enter-en{ font-size:10px; font-weight:600; letter-spacing:.34em;
          text-transform:uppercase; color:rgba(230,255,246,.55); }
        @keyframes aci-pulse{ 0%,100%{box-shadow:0 8px 40px rgba(16,185,129,.22)} 50%{box-shadow:0 8px 54px rgba(16,185,129,.45)} }

        .sr-only{ position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); }

        @media (prefers-reduced-motion: reduce){
          .aci-figure{ transition:none; opacity:1; transform:none; }
          .aci-letter{ animation:none; opacity:1; transform:none; }
          .aci-enter{ animation:none; }
          .aci-kenburns{ animation:none; }
        }
      `}</style>
    </div>
  );
}

export default AriaCinematicIntro;

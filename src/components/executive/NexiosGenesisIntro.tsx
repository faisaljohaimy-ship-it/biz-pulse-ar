import { useEffect, useRef, useState } from "react";
import heroVideo from "@/assets/hero-assembly-video.mp4.asset.json";
import heroAudio from "@/assets/hero-assembly-audio.mp3.asset.json";
import { useI18n } from "@/lib/i18n";

/**
 * NEXIOS AI — Winged Genesis (Fire Edition)
 * Pre-system cinematic opening. Full-viewport overlay, once per session.
 * Video autoplays muted; first tap syncs audio + restarts video from 0.
 * Fiery "NEXIOS AI" wordmark in lower third, ember particles rise from figure.
 * Route change / audio end / skip → crossfade into homepage.
 */

const SEEN_KEY = "nexios-genesis-seen";
const WORD = "NEXIOS AI";
const T_FADE = 700;
const T_MAX = 34_000;
const T_IGNITE_DELAY = 3000; // letters begin igniting after audio starts

function useReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setRm(mq.matches);
    const h = (e: MediaQueryListEvent) => setRm(e.matches);
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, []);
  return rm;
}

type EmberDensity = "pre" | "peak" | "calm";

export function NexiosGenesisIntro() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const reducedMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [started, setStarted] = useState(false);
  const [ignited, setIgnited] = useState(false);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);
  const [showSkip, setShowSkip] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const dismissedRef = useRef(false);
  const densityRef = useRef<EmberDensity>("pre");

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const letters = WORD.split("");

  // Mount once per session
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(SEEN_KEY)) return;
    } catch {
      /* noop */
    }
    setMounted(true);
  }, []);

  const dismiss = (instant = false) => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    try {
      window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* noop */
    }
    const a = audioRef.current,
      v = videoRef.current;
    if (instant) {
      if (a) {
        try {
          a.pause();
          a.src = "";
        } catch {
          /* noop */
        }
      }
      if (v) {
        try {
          v.pause();
          v.removeAttribute("src");
          v.load();
        } catch {
          /* noop */
        }
      }
      setFading(true);
      window.setTimeout(() => setGone(true), 60);
      return;
    }
    if (a) {
      const start = a.volume || 0.9;
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / T_FADE);
        try {
          a.volume = start * (1 - k);
        } catch {
          /* noop */
        }
        if (k < 1) requestAnimationFrame(step);
        else {
          try {
            a.pause();
          } catch {
            /* noop */
          }
        }
      };
      requestAnimationFrame(step);
    }
    setFading(true);
    window.setTimeout(() => {
      setGone(true);
      const v2 = videoRef.current;
      if (v2) {
        try {
          v2.pause();
          v2.removeAttribute("src");
          v2.load();
        } catch {
          /* noop */
        }
      }
    }, T_FADE);
  };

  // Autoplay video muted on mount
  useEffect(() => {
    if (!mounted || reducedMotion) return;
    const v = videoRef.current;
    if (v) {
      try {
        void v.play();
      } catch {
        /* noop */
      }
    }
  }, [mounted, reducedMotion]);

  // Skip chip after 1.5s
  useEffect(() => {
    if (!mounted) return;
    const t = window.setTimeout(() => setShowSkip(true), 1500);
    timersRef.current.push(t);
    return () => window.clearTimeout(t);
  }, [mounted]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      const a = audioRef.current,
        v = videoRef.current;
      try {
        a?.pause();
      } catch {
        /* noop */
      }
      try {
        v?.pause();
      } catch {
        /* noop */
      }
      timersRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const beginSequence = () => {
    if (started || dismissedRef.current) return;
    setStarted(true);
    densityRef.current = "peak";
    const a = audioRef.current,
      v = videoRef.current;
    if (v) {
      try {
        v.currentTime = 0;
        void v.play();
      } catch {
        /* noop */
      }
    }
    if (a) {
      a.volume = 0.9;
      a.muted = false;
      try {
        a.currentTime = 0;
        void a.play();
      } catch {
        /* noop */
      }
      const onEnd = () => dismiss(false);
      a.addEventListener("ended", onEnd, { once: true });
    }
    const tIgnite = window.setTimeout(() => {
      setIgnited(true);
      densityRef.current = "calm";
    }, T_IGNITE_DELAY);
    const cap = window.setTimeout(() => dismiss(false), T_MAX);
    timersRef.current.push(tIgnite, cap);
  };

  // Ember particle canvas
  useEffect(() => {
    if (!mounted || reducedMotion || gone) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      max: number;
      r: number;
      spark: boolean;
    };
    const maxParticles = isMobile ? 50 : 90;
    const particles: P[] = [];

    const spawnOne = () => {
      const w = window.innerWidth,
        h = window.innerHeight;
      // elliptical spawn: center, 25–55% viewport height
      const cx = w * 0.5;
      const cy = h * (0.25 + Math.random() * 0.3);
      const ex = (Math.random() * 2 - 1) * w * 0.22;
      const ey = (Math.random() * 2 - 1) * h * 0.06;
      const spark = Math.random() < 0.08;
      particles.push({
        x: cx + ex,
        y: cy + ey,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.6 - Math.random() * 1.1,
        life: 0,
        max: 1.8 + Math.random() * 1.2,
        r: spark ? 2.2 + Math.random() * 1.6 : 1 + Math.random() * 1.4,
        spark,
      });
    };

    let hidden = false;
    const onVis = () => {
      hidden = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      if (hidden) {
        last = now;
        raf = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Density ramp
      const density = densityRef.current;
      const target = density === "pre" ? 0.3 : density === "peak" ? 1.0 : 0.5;
      const desired = Math.floor(maxParticles * target);
      const spawnRate = desired * 0.9; // per second
      const toSpawn = Math.min(6, Math.floor(spawnRate * dt + Math.random()));
      for (let i = 0; i < toSpawn && particles.length < maxParticles; i++) spawnOne();

      // Trail: darken instead of clear for spark motion blur
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      ctx.globalCompositeOperation = "lighter";
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.max) {
          particles.splice(i, 1);
          continue;
        }
        // horizontal sway
        p.vx += Math.sin(now * 0.001 + p.y * 0.01) * 0.02 * dt * 60;
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.02 * dt * 60; // buoyancy up

        const t = p.life / p.max;
        // color interpolation ffd984 -> ff6a00 -> transparent
        const r = Math.round(255);
        const g = Math.round(217 - t * (217 - 106));
        const b = Math.round(132 - t * 132);
        const a = (1 - t) * (p.spark ? 0.95 : 0.75);
        const rad = p.r * (1 - t * 0.5);

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 4);
        grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mounted, reducedMotion, gone, isMobile]);

  if (!mounted || gone) return null;

  return (
    <div
      onPointerDown={beginSequence}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#05070B",
        opacity: fading ? 0 : 1,
        transition: `opacity ${T_FADE}ms ease`,
        overflow: "hidden",
        cursor: started ? "default" : "pointer",
      }}
      aria-hidden={fading}
    >
      {!reducedMotion && (
        <video
          ref={videoRef}
          src={heroVideo.url}
          autoPlay
          muted
          playsInline
          preload="auto"
          poster=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: isMobile ? "center" : "center 30%",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Bottom gradient for wordmark clarity */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "35%",
          background: "linear-gradient(180deg, rgba(5,7,11,0) 0%, rgba(5,7,11,0.85) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Ember particle canvas — above video, below wordmark */}
      {!reducedMotion && (
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            mixBlendMode: "screen",
          }}
        />
      )}

      <audio ref={audioRef} src={heroAudio.url} preload="auto" playsInline />

      {/* Enter button */}
      {!started && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            beginSequence();
          }}
          className="nxg-enter"
          aria-label={ar ? "دخول" : "Enter"}
        >
          <span className="nxg-enter-ring" />
          <span className="nxg-enter-label">{ar ? "دخول / Enter" : "دخول / Enter"}</span>
        </button>
      )}

      {/* Fiery NEXIOS AI wordmark — lower third */}
      <div className="nxg-word-wrap" aria-label={WORD}>
        <div className={`nxg-word${reducedMotion ? " nxg-word--static" : ""}`}>
          {letters.map((ch, i) => {
            const isSpace = ch === " ";
            // right-to-left ignition: last letter first
            const igniteIdx = letters.length - 1 - i;
            const delay = igniteIdx * 90;
            const active = reducedMotion || ignited;
            return (
              <span
                key={i}
                className={`nxg-letter${active ? " nxg-letter--on" : ""}`}
                style={{
                  width: isSpace ? "0.4em" : undefined,
                  animationDelay: `${delay}ms`,
                }}
              >
                {isSpace ? "\u00A0" : ch}
              </span>
            );
          })}
        </div>
      </div>

      {showSkip && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismiss(true);
          }}
          className="nxg-skip"
        >
          {ar ? "تخطي" : "Skip"}
        </button>
      )}

      <style>{`
        .nxg-enter {
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          display: inline-flex; align-items: center; justify-content: center;
          padding: 18px 34px; min-width: 200px; border-radius: 999px;
          border: 1px solid rgba(255,157,46,0.7);
          background: radial-gradient(circle at 30% 25%, #ffd984 0%, #ff9d2e 45%, #7a1e04 100%);
          color: #1a0a02; font-weight: 800; letter-spacing: 0.12em;
          font-size: 18px; cursor: pointer;
          box-shadow:
            0 0 0 6px rgba(255,120,20,0.12),
            0 0 40px rgba(255,120,20,0.55),
            0 0 90px rgba(255,60,0,0.35),
            inset 0 2px 8px rgba(255,240,200,0.7),
            inset 0 -8px 22px rgba(80,20,0,0.55);
          animation: nxgEnterFade 400ms ease-out both;
          z-index: 3;
        }
        .nxg-enter:focus-visible { outline: 2px solid #ffd984; outline-offset: 4px; }
        .nxg-enter-ring {
          position: absolute; inset: -14px; border-radius: 999px;
          border: 2px solid rgba(255,157,46,0.75);
          animation: nxgEnterPulse 1800ms ease-out infinite;
          pointer-events: none;
        }
        .nxg-enter-label { position: relative; z-index: 1; }
        @keyframes nxgEnterFade { from { opacity: 0; transform: translate(-50%, -46%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @keyframes nxgEnterPulse {
          0% { transform: scale(1); opacity: 0.9; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }

        .nxg-word-wrap {
          position: absolute; left: 0; right: 0; bottom: 12vh;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none; z-index: 2;
        }
        .nxg-word {
          display: inline-flex; align-items: baseline;
          font-weight: 900; letter-spacing: 0.08em; line-height: 1;
          font-size: clamp(2.4rem, 8vw, 5.2rem);
        }
        @media (max-width: 639px) {
          .nxg-word { font-size: clamp(2rem, 10vw, 3.6rem); }
          .nxg-word-wrap { bottom: 8vh; }
        }
        .nxg-letter {
          display: inline-block; opacity: 0;
          background: linear-gradient(0deg,#7a1e04 0%,#e2540a 30%,#ff9d2e 55%,#ffd984 80%,#fff3d1 100%);
          background-size: 100% 220%;
          background-position: 50% 100%;
          -webkit-background-clip: text; background-clip: text;
          color: transparent; -webkit-text-fill-color: transparent;
          text-shadow:
            0 0 18px rgba(255,120,20,0.85),
            0 0 46px rgba(255,60,0,0.5),
            0 0 90px rgba(255,140,30,0.3);
          will-change: opacity, background-position, text-shadow;
        }
        .nxg-letter--on {
          animation:
            nxgIgnite 700ms ease-out forwards,
            nxgEmber 3s ease-in-out infinite alternate,
            nxgFlicker 1.7s steps(6, end) infinite;
          animation-delay: var(--d, 0ms), 700ms, 700ms;
        }
        .nxg-letter--on { animation-delay: 0ms, 700ms, 700ms; }
        .nxg-word--static .nxg-letter {
          opacity: 1;
          animation: none;
        }
        @keyframes nxgIgnite {
          0%   { opacity: 0; filter: brightness(2.6) saturate(0.4); text-shadow: 0 0 40px rgba(255,255,255,0.95), 0 0 80px rgba(255,220,140,0.7); }
          40%  { opacity: 1; filter: brightness(1.8) saturate(0.8); }
          100% { opacity: 1; filter: brightness(1) saturate(1); text-shadow: 0 0 18px rgba(255,120,20,0.85), 0 0 46px rgba(255,60,0,0.5), 0 0 90px rgba(255,140,30,0.3); }
        }
        @keyframes nxgEmber {
          0%   { background-position: 50% 100%; }
          100% { background-position: 50% 0%; }
        }
        @keyframes nxgFlicker {
          0%   { text-shadow: 0 0 18px rgba(255,120,20,0.85), 0 0 46px rgba(255,60,0,0.5),  0 0 90px rgba(255,140,30,0.30); }
          17%  { text-shadow: 0 0 22px rgba(255,140,30,1.00), 0 0 55px rgba(255,80,10,0.60), 0 0 105px rgba(255,160,40,0.36); }
          34%  { text-shadow: 0 0 14px rgba(255,110,20,0.68), 0 0 38px rgba(255,55,0,0.42),  0 0 80px rgba(255,130,25,0.24); }
          51%  { text-shadow: 0 0 20px rgba(255,130,30,0.94), 0 0 50px rgba(255,70,5,0.56),  0 0 100px rgba(255,150,40,0.34); }
          68%  { text-shadow: 0 0 16px rgba(255,115,20,0.75), 0 0 42px rgba(255,60,0,0.46),  0 0 88px rgba(255,140,30,0.28); }
          85%  { text-shadow: 0 0 24px rgba(255,150,40,1.00), 0 0 58px rgba(255,85,10,0.62), 0 0 110px rgba(255,170,50,0.38); }
          100% { text-shadow: 0 0 18px rgba(255,120,20,0.85), 0 0 46px rgba(255,60,0,0.50),  0 0 90px rgba(255,140,30,0.30); }
        }

        .nxg-skip {
          position: absolute; bottom: 20px;
          ${ar ? "left" : "right"}: 20px;
          padding: 8px 14px; border-radius: 999px;
          background: rgba(15,20,28,0.6);
          border: 1px solid rgba(148,163,184,0.35);
          color: #e2e8f0; font-size: 12px; letter-spacing: 0.08em;
          cursor: pointer; z-index: 4;
        }
        .nxg-skip:hover { background: rgba(15,20,28,0.85); }

        @media (prefers-reduced-motion: reduce) {
          .nxg-enter-ring { animation: none; }
          .nxg-letter { opacity: 1 !important; animation: none !important; }
        }
      `}</style>
    </div>
  );
}

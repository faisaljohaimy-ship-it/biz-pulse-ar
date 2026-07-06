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

  // Start playback + sync loop + hard cap + Esc-to-skip.
  useEffect(() => {
    if (mounted !== "playing") return;
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    // Kick playback. Video is muted so autoplay is allowed. Audio may need
    // a user gesture on some browsers; if it fails silently, the visual
    // still plays.
    const kick = async () => {
      try {
        await video.play();
      } catch {
        /* browser refused muted video autoplay; user will see the poster */
      }
      try {
        await audio.play();
      } catch {
        /* fall back: unlock on first pointer/key event */
        const unlock = () => {
          audio.play().catch(() => {});
          window.removeEventListener("pointerdown", unlock);
          window.removeEventListener("keydown", unlock);
        };
        window.addEventListener("pointerdown", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
      }
    };
    void kick();

    // A/V drift correction (±80 ms).
    const syncTick = () => {
      if (!video.paused && !audio.paused) {
        const drift = Math.abs(video.currentTime - audio.currentTime);
        if (drift > 0.08) audio.currentTime = video.currentTime;
      }
      rafRef.current = window.requestAnimationFrame(syncTick);
    };
    rafRef.current = window.requestAnimationFrame(syncTick);

    // Hard cap.
    hardCapRef.current = window.setTimeout(finish, HARD_CAP_MS);

    const onEnded = () => finish();
    video.addEventListener("ended", onEnded);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (hardCapRef.current !== null) clearTimeout(hardCapRef.current);
      video.removeEventListener("ended", onEnded);
      window.removeEventListener("keydown", onKey);
      audio.pause();
      video.pause();
    };
    // finish is stable via setState functional pattern
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Ember particle canvas — additive orange sparks rising from the figure.
  useEffect(() => {
    if (mounted !== "playing") return;
    if (reducedMotion.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();
    const onResize = () => setSize();
    window.addEventListener("resize", onResize);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      hue: number;
    }
    const particles: Particle[] = [];
    let startedAt: number | null = null;
    let raf = 0;

    const spawn = () => {
      // Emitter: horizontal band around the wingman's torso.
      const cx = width * 0.5 + (Math.random() - 0.5) * width * 0.28;
      const cy = height * 0.62 + (Math.random() - 0.5) * height * 0.08;
      particles.push({
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -0.4 - Math.random() * 0.9,
        life: 0,
        maxLife: 900 + Math.random() * 900,
        size: 1 + Math.random() * 2.2,
        hue: 18 + Math.random() * 22,
      });
    };

    const tick = (t: number) => {
      if (startedAt === null) startedAt = t;
      const elapsed = t - startedAt;
      // Start emitting shortly before ignition, ramp with intensity.
      if (elapsed > IGNITION_MS - 2500) {
        const spawnCount = elapsed < IGNITION_MS ? 1 : 3;
        for (let i = 0; i < spawnCount; i++) spawn();
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(4,7,15,0.18)";
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "lighter";
      const dt = 16;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        p.vy += -0.008; // buoyancy
        p.vx += Math.sin((t + i) * 0.002) * 0.02; // gentle sway
        p.x += p.vx;
        p.y += p.vy;
        const lifeRatio = 1 - p.life / p.maxLife;
        const alpha = lifeRatio * 0.9;
        const r = p.size * (0.6 + lifeRatio * 0.8);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
        grad.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${alpha})`);
        grad.addColorStop(0.4, `hsla(${p.hue - 6}, 100%, 55%, ${alpha * 0.5})`);
        grad.addColorStop(1, "hsla(15, 100%, 40%, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [mounted]);

  if (mounted === null || mounted === "done") return null;

  const closing = mounted === "closing";

  return (
    <div
      role="dialog"
      aria-label="NEXIOS AI · Cinematic intro"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-black"
      style={{
        opacity: closing ? 0 : 1,
        transition: `opacity ${CROSSFADE_MS}ms ease-out`,
        pointerEvents: closing ? "none" : "auto",
      }}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          animation: reducedMotion.current
            ? undefined
            : "hero-zero-fadein 700ms 350ms both ease-out",
          opacity: reducedMotion.current ? 1 : 0,
        }}
        src={videoAsset.url}
        poster={posterAsset.url}
        muted
        playsInline
        autoPlay
        preload="auto"
      />
      <audio ref={audioRef} src={audioAsset.url} preload="auto" />

      {/* Ember particle layer — pointer-events none */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full mix-blend-screen"
      />

      {/* SVG turbulence filter for the flame stripe */}
      <svg aria-hidden width="0" height="0" className="absolute">
        <defs>
          <filter id="hero-zero-turbulence" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7">
              <animate
                attributeName="baseFrequency"
                dur="6s"
                values="0.9;1.1;0.9"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="6" />
          </filter>
        </defs>
      </svg>

      {/* Flame stripe rising from the figure into the wordmark */}
      {!reducedMotion.current && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 h-[26%] w-[42%] -translate-x-1/2"
          style={{
            bottom: "22%",
            filter: "url(#hero-zero-turbulence) blur(2px)",
            background:
              "linear-gradient(180deg, rgba(255,180,60,0) 0%, rgba(255,140,40,0.35) 35%, rgba(230,60,10,0.55) 70%, rgba(255,220,120,0.85) 100%)",
            mixBlendMode: "screen",
            opacity: 0,
            animation: "hero-zero-flame 900ms 8600ms forwards ease-out",
          }}
        />
      )}

      {/* NEXIOS AI wordmark — fire */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center"
        style={{
          bottom: "clamp(12%, 18%, 22%)",
        }}
      >
        <div
          className="font-[800] uppercase leading-none"
          style={{
            fontFamily: '"Space Grotesk", ui-sans-serif, system-ui',
            letterSpacing: "0.18em",
            fontSize: "clamp(2.25rem, 7vw, 5.5rem)",
            background:
              "linear-gradient(180deg, #FFF6C7 0%, #FFC24C 32%, #FF6A00 66%, #C0290A 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            textShadow: [
              "0 0 8px rgba(255,179,71,0.9)",
              "0 0 24px rgba(255,106,0,0.85)",
              "0 0 60px rgba(230,58,11,0.7)",
              "0 0 110px rgba(230,58,11,0.55)",
            ].join(","),
            opacity: 0,
            animation: reducedMotion.current
              ? "hero-zero-wordmark-quiet 400ms 200ms forwards ease-out"
              : "hero-zero-wordmark 1400ms 8800ms forwards cubic-bezier(0.22,1,0.36,1), hero-zero-flicker 4s 10200ms infinite ease-in-out",
            willChange: "opacity, transform, filter",
          }}
        >
          NEXIOS AI
        </div>
        <div
          className="mt-3 text-[10px] font-medium uppercase tracking-[0.4em] text-white/50"
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
            0 0 8px rgba(255,179,71,0.9),
            0 0 24px rgba(255,106,0,0.85),
            0 0 60px rgba(230,58,11,0.7),
            0 0 110px rgba(230,58,11,0.55); }
          50%     { text-shadow:
            0 0 10px rgba(255,190,90,1),
            0 0 30px rgba(255,120,20,0.95),
            0 0 72px rgba(230,58,11,0.85),
            0 0 130px rgba(230,58,11,0.6); }
        }
        @keyframes hero-zero-flame {
          from { opacity: 0; transform: translateX(-50%) scaleY(0.6); }
          to   { opacity: 0.85; transform: translateX(-50%) scaleY(1); }
        }
        @keyframes hero-zero-tagline {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

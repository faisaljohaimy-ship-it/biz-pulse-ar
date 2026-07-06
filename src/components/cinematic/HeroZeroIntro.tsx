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
    // Try to start audio + video together. Browsers require a user gesture
    // for unmuted audio; if blocked, we arm a one-shot unlock on the next
    // interaction so the narration still fires the moment the user moves.
    audio.currentTime = 0;
    audio.volume = 1;
    const kick = async () => {
      try {
        await video.play();
      } catch {
        /* muted autoplay refused — poster remains */
      }
      try {
        await audio.play();
      } catch {
        const unlock = () => {
          audio.play().catch(() => {});
          window.removeEventListener("pointerdown", unlock);
          window.removeEventListener("keydown", unlock);
          window.removeEventListener("touchstart", unlock);
        };
        window.addEventListener("pointerdown", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
        window.addEventListener("touchstart", unlock, { once: true });
      }
    };
    void kick();

    // Video follows audio — audio is never scrubbed, so narration stays clean.
    const syncTick = () => {
      if (!video.paused && !audio.paused) {
        const drift = video.currentTime - audio.currentTime;
        if (Math.abs(drift) > 0.3) video.currentTime = audio.currentTime;
      }
      rafRef.current = window.requestAnimationFrame(syncTick);
    };
    rafRef.current = window.requestAnimationFrame(syncTick);

    // Hard cap.
    hardCapRef.current = window.setTimeout(finish, HARD_CAP_MS);

    // Finish when EITHER the narration or the video ends — whichever runs
    // longest wins, so the audio never gets cut mid-sentence and never
    // lingers after the hero disappears.
    const onEnded = () => finish();
    video.addEventListener("ended", onEnded);
    audio.addEventListener("ended", onEnded);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (hardCapRef.current !== null) clearTimeout(hardCapRef.current);
      video.removeEventListener("ended", onEnded);
      audio.removeEventListener("ended", onEnded);
      window.removeEventListener("keydown", onKey);
      // Hard stop audio the moment the hero disappears — quick fade to avoid
      // a click, then pause + reset.
      try {
        const startVol = audio.volume;
        const steps = 8;
        let i = 0;
        const fade = window.setInterval(() => {
          i += 1;
          audio.volume = Math.max(0, startVol * (1 - i / steps));
          if (i >= steps) {
            window.clearInterval(fade);
            audio.pause();
            audio.currentTime = 0;
            audio.volume = startVol;
          }
        }, 25);
      } catch {
        audio.pause();
      }
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
        className="absolute inset-0 z-10 h-full w-full object-cover object-center mix-blend-screen md:object-contain"
        style={{
          animation: reducedMotion.current
            ? undefined
            : "hero-zero-fadein 1400ms 300ms both ease-out",
          opacity: reducedMotion.current ? 0.28 : 0,
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

      {/* Vision 2030 crest — appears with the winged figure, starts far
          (small + blurred) and dollies in until it locks in place above him.
          z-40 keeps it crisp above sparks, flame stripe and wordmark glow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[6%] z-40 -translate-x-1/2 text-center"
        style={{
          opacity: 0,
          animation: reducedMotion.current
            ? "hero-zero-vision-quiet 600ms 400ms forwards ease-out"
            : "hero-zero-vision 4200ms 2400ms forwards cubic-bezier(0.22,1,0.36,1)",
          willChange: "opacity, transform, filter",
        }}
      >
        {/* Soft dark halo scrim so sparks/flame never bleed into the type */}
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
          className="font-black leading-none"
          style={{
            fontFamily: '"Space Grotesk", "Tajawal", ui-sans-serif, system-ui',
            fontWeight: 900,
            letterSpacing: "0.08em",
            fontSize: "clamp(1.35rem, 3.6vw, 2.6rem)",
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
          className="mt-1 font-bold uppercase"
          style={{
            fontFamily: '"Space Grotesk", ui-sans-serif, system-ui',
            fontWeight: 800,
            letterSpacing: "0.32em",
            fontSize: "clamp(0.6rem, 1.15vw, 0.85rem)",
            color: "rgba(220,240,230,0.85)",
            textShadow: "0 0 12px rgba(0,180,120,0.55)",
          }}
        >
          Vision 2030 · Kingdom of Saudi Arabia
        </div>
      </div>

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
          className="pointer-events-none absolute left-1/2 z-20 h-[26%] w-[42%] -translate-x-1/2"
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
        className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 text-center"
        style={{
          bottom: "clamp(12%, 18%, 22%)",
        }}
      >
        <div
          className="font-black uppercase leading-none"
          style={{
            fontFamily: '"Space Grotesk", ui-sans-serif, system-ui',
            fontWeight: 900,
            letterSpacing: "0.14em",
            fontSize: "clamp(2.75rem, 8.5vw, 6.75rem)",
            WebkitTextStroke: "1px rgba(255,190,90,0.55)",
            background:
              "linear-gradient(180deg, #FFFBE6 0%, #FFD066 28%, #FF7A18 62%, #B31E05 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            textShadow: [
              "0 0 4px rgba(255,220,140,1)",
              "0 0 14px rgba(255,180,60,1)",
              "0 0 36px rgba(255,110,20,0.95)",
              "0 0 80px rgba(240,70,15,0.85)",
              "0 0 140px rgba(220,45,10,0.75)",
              "0 0 220px rgba(200,30,5,0.55)",
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

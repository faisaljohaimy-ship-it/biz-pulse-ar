/**
 * AriaCinematicIntro — Additive, self-contained cinematic opening overlay.
 * Plays once per session. Mounted only on the landing hero page.
 * Does NOT modify any existing component, route, state, or backend logic.
 */
import { useEffect, useRef, useState } from "react";
import ariaAvatar from "@/assets/aria-holo-executive.png";
import { useI18n } from "@/lib/i18n";
import { ariaVoice, useAriaVoice } from "@/lib/aria/voice-queue";

const SESSION_KEY = "nexios_intro_seen";

const GREETING_AR = "مرحباً. أنا آريا — مساعدك التنفيذي الرقمي. النظام جاهز.";
const GREETING_EN = "Hello. I am ARIA — your Digital Executive. The system is ready.";

type Phase = "materialize" | "greet" | "dissolve" | "done";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

export function AriaCinematicIntro() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const greeting = ar ? GREETING_AR : GREETING_EN;

  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return sessionStorage.getItem(SESSION_KEY) !== "1"; } catch { return true; }
  });
  const [phase, setPhase] = useState<Phase>("materialize");
  const [typed, setTyped] = useState(0);
  const [avatarIn, setAvatarIn] = useState(false);
  const [dissolving, setDissolving] = useState(false);
  const voice = useAriaVoice();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const spokeRef = useRef(false);

  // Speak greeting when the greet phase starts; the queue silently
  // records autoplay-blocked so the chip below can offer a tap.
  useEffect(() => {
    if (phase !== "greet" || spokeRef.current) return;
    if (!ariaVoice.isEnabled()) return;
    spokeRef.current = true;
    ariaVoice.enqueue(greeting);
  }, [phase, greeting]);

  // Ensure audio never survives the intro.
  useEffect(() => () => ariaVoice.clear(), []);

  const finish = () => {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
    setMounted(false);
  };

  const skip = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    finish();
  };

  // Particle field
  useEffect(() => {
    if (!mounted || reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.scale(dpr, dpr);

    const hc = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 4;
    const count = dpr > 1.5 || hc < 4 ? 80 : 200;
    const cx = w / 2;
    const cy = h / 2;
    const parts = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 220 + Math.random() * 360;
      return {
        a: angle,
        r: radius,
        tr: 40 + Math.random() * 90, // target radius after convergence
        s: 0.001 + Math.random() * 0.002, // rotation speed
        size: 0.6 + Math.random() * 1.6,
        hue: 190 + Math.random() * 30,
      };
    });

    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      const conv = Math.min(1, Math.max(0, (t - 1.2) / 1.4)); // 1.2s..2.6s convergence
      ctx.clearRect(0, 0, w, h);
      // central glow
      const glowR = 40 + Math.min(160, t * 80);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      g.addColorStop(0, "rgba(59,130,246,0.55)");
      g.addColorStop(0.4, "rgba(34,211,238,0.25)");
      g.addColorStop(1, "rgba(10,14,20,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      for (const p of parts) {
        p.a += p.s * 16;
        const r = p.r + (p.tr - p.r) * conv;
        const x = cx + Math.cos(p.a) * r;
        const y = cy + Math.sin(p.a) * r * 0.85;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 95%, 65%, ${0.35 + 0.55 * (1 - conv)})`;
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      if (phase !== "done" && !dissolving) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mounted, reduced, phase, dissolving]);

  // Sequence timeline
  useEffect(() => {
    if (!mounted) return;
    // focus skip
    setTimeout(() => skipRef.current?.focus(), 60);
    // announce greeting
    setTimeout(() => { if (liveRef.current) liveRef.current.textContent = greeting; }, 400);

    if (reduced) {
      setAvatarIn(true);
      setTyped(greeting.length);
      const t = window.setTimeout(finish, 1500);
      timersRef.current.push(t);
      return () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
    }

    const push = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      timersRef.current.push(id);
    };

    push(() => setAvatarIn(true), 1200);
    push(() => setPhase("greet"), 3000);
    // per-char streaming across ~1.4s starting at 3.0s
    const startTyping = 3000;
    const perChar = 1400 / Math.max(greeting.length, 1);
    for (let i = 1; i <= greeting.length; i++) {
      push(() => setTyped(i), startTyping + i * perChar);
    }
    push(() => { setPhase("dissolve"); setDissolving(true); }, 4500);
    push(() => { setPhase("done"); finish(); }, 7500);

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") skip(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, reduced]);

  if (!mounted) return null;

  const shownGreeting = greeting.slice(0, typed);

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      role="dialog"
      aria-label={ar ? "افتتاحية آريا" : "ARIA Intro"}
      className="fixed inset-0 z-[2147483000] overflow-hidden"
      style={{
        background: "#0A0E14",
        opacity: dissolving ? 0 : 1,
        transition: "opacity 900ms cubic-bezier(0.16,1,0.3,1)",
        pointerEvents: dissolving ? "none" : "auto",
        willChange: "opacity",
      }}
    >
      {/* Live region for SR announcement */}
      <div ref={liveRef} aria-live="polite" className="sr-only" />

      {/* Particle field */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        style={{ willChange: "transform, opacity" }}
      />

      {/* Radial dissolve mask */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(10,14,20,0) 0%, rgba(10,14,20,0) 30%, rgba(10,14,20,0.85) 70%)",
          opacity: dissolving ? 0 : 1,
          transition: "opacity 700ms ease-out",
        }}
      />

      {/* ARIA avatar */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative flex flex-col items-center"
          style={{
            transform: dissolving ? "scale(1.06)" : avatarIn ? "scale(1)" : "scale(0.6)",
            opacity: avatarIn ? 1 : 0,
            transition:
              "transform 1500ms cubic-bezier(0.16,1,0.3,1), opacity 1200ms ease-out",
            willChange: "transform, opacity",
          }}
        >
          <div
            className="relative"
            style={{
              width: "min(52vh, 380px)",
              aspectRatio: "1 / 1",
              filter: "drop-shadow(0 0 60px rgba(59,130,246,0.55)) drop-shadow(0 0 120px rgba(34,211,238,0.35))",
              animation: reduced ? undefined : "aria-breathe 4s ease-in-out infinite",
            }}
          >
            <img
              src={ariaAvatar}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-full w-full object-contain"
              style={{
                maskImage: "radial-gradient(circle at 50% 45%, #000 55%, transparent 78%)",
                WebkitMaskImage: "radial-gradient(circle at 50% 45%, #000 55%, transparent 78%)",
              }}
            />
            {/* blink layer */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[42%] h-[6%] w-[34%] -translate-x-1/2 rounded-[999px]"
              style={{
                background: "rgba(10,14,20,0.9)",
                animation: reduced ? undefined : "aria-blink 4.2s ease-in-out infinite",
                willChange: "transform, opacity",
                opacity: 0,
              }}
            />
            {/* speaking pulse */}
            {phase === "greet" && !reduced && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  boxShadow: "0 0 80px 10px rgba(59,130,246,0.35) inset",
                  animation: "aria-pulse 900ms ease-in-out infinite",
                }}
              />
            )}
          </div>

          {/* Greeting */}
          <div
            className="mt-6 max-w-[86vw] px-4 text-center"
            style={{ minHeight: 56 }}
          >
            <p
              className="mx-auto rounded-2xl border px-5 py-3 text-base sm:text-lg md:text-xl"
              style={{
                fontFamily: ar
                  ? "'IBM Plex Sans Arabic','Cairo',ui-sans-serif,system-ui"
                  : "'Space Grotesk','DM Sans',ui-sans-serif,system-ui",
                color: "rgba(232,246,255,0.96)",
                background: "rgba(10,14,20,0.55)",
                borderColor: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(14px) saturate(140%)",
                letterSpacing: ar ? 0 : "0.01em",
                lineHeight: 1.55,
                textShadow: "0 0 24px rgba(59,130,246,0.35)",
              }}
            >
              {shownGreeting}
              {phase === "greet" && typed < greeting.length && (
                <span aria-hidden="true" style={{ opacity: 0.7 }}>▍</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Skip button */}
      <button
        ref={skipRef}
        type="button"
        onClick={skip}
        className="fixed bottom-5 z-10 rounded-full border px-4 py-2 text-xs font-medium tracking-wide transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
        style={{
          [ar ? "left" : "right"]: 20,
          color: "rgba(232,246,255,0.85)",
          borderColor: "rgba(255,255,255,0.16)",
          background: "rgba(10,14,20,0.5)",
          backdropFilter: "blur(10px)",
        } as React.CSSProperties}
      >
        {ar ? "تخطي" : "Skip"}
      </button>

      {/* Autoplay-blocked fallback — one-tap chip to start ARIA's voice. */}
      {voice.enabled && voice.autoplayBlocked && phase !== "done" && (
        <button
          type="button"
          onClick={() => ariaVoice.resume()}
          className="fixed bottom-5 z-10 rounded-full border px-4 py-2 text-xs font-medium tracking-wide transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
          style={{
            [ar ? "right" : "left"]: 20,
            color: "rgba(232,246,255,0.9)",
            borderColor: "rgba(34,211,238,0.4)",
            background: "rgba(10,14,20,0.55)",
            backdropFilter: "blur(10px)",
          } as React.CSSProperties}
        >
          {ar ? "🔊 تشغيل صوت آريا" : "🔊 Play ARIA voice"}
        </button>
      )}

      <style>{`
        @keyframes aria-breathe {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes aria-blink {
          0%, 92%, 100% { opacity: 0; transform: scaleY(0.1); }
          94%, 97% { opacity: 1; transform: scaleY(1); }
        }
        @keyframes aria-pulse {
          0%,100% { box-shadow: 0 0 60px 6px rgba(59,130,246,0.28) inset; }
          50% { box-shadow: 0 0 100px 14px rgba(34,211,238,0.45) inset; }
        }
      `}</style>
    </div>
  );
}

export default AriaCinematicIntro;

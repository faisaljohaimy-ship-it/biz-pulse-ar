import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ChevronDown, Compass, Loader2, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * NexusRevealHero — v3.0 · Executive Cinematic Hero (10/10)
 *
 * Design direction: Apple Vision Pro × OpenAI × Arc Browser × Tesla reveal.
 * Deep midnight cyan luxury identity. ARIA is the undisputed centerpiece;
 * NEXIOS is a supporting wordmark. Bilingual AR/EN, RTL/LTR aware.
 *
 * Performance contract:
 *   - GPU-only animations (transform / opacity), no layout thrash
 *   - Mouse parallax throttled to rAF, disabled under coarse pointer & reduced motion
 *   - Zero external assets, zero heavy libraries, mobile-first sizing
 *   - Respects `prefers-reduced-motion` end-to-end
 */
export function NexusRevealHero({
  onEnterOps,
}: {
  onEnterOps?: () => void;
}) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [launching, setLaunching] = useState(false);

  // Mouse parallax — rAF-throttled, GPU-only, gated by pointer + reduced motion.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stage = stageRef.current;
    if (!stage) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;

    const setVars = (x: number, y: number) => {
      stage.style.setProperty("--nxh-mx", x.toFixed(3));
      stage.style.setProperty("--nxh-my", y.toFixed(3));
    };

    const tick = () => {
      // ease toward target — smooth, no jank
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.08;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.08;
      setVars(currentRef.current.x, currentRef.current.y);
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      // -1 .. 1 normalized
      targetRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      targetRef.current.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };
    const onLeave = () => {
      targetRef.current.x = 0;
      targetRef.current.y = 0;
    };

    stage.addEventListener("pointermove", onMove, { passive: true });
    stage.addEventListener("pointerleave", onLeave, { passive: true });
    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleLaunch = () => {
    if (launching) return;
    setLaunching(true);
    // Mark this click as a fresh user gesture so AriaDock on the next route
    // can legally start TTS / mic without autoplay-policy blocks.
    try { sessionStorage.setItem("nexus.audio-gesture", "1"); } catch { /* noop */ }
    window.setTimeout(() => { onEnterOps?.(); }, 700);
  };

  const scrollToAria = () => {
    if (typeof document === "undefined") return;
    const el = document.getElementById("aria-quick-ask");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const Arrow = ar ? ArrowLeft : ArrowRight;

  const t = {
    line1:      ar ? "الذكاء يقود." : "Intelligence, in command.",
    line2:      ar ? "نكسيوس ينفّذ." : "NEXIOS executes.",
    lede:       ar
      ? "منظومة تشغيل ذكية للمؤسسات · ARIA في القلب · إدارة الأمن الصناعي · المنطقة الغربية."
      : "Enterprise AI operating system · ARIA at the core · Industrial Security · Western Region.",
    ctaPrimary: ar ? "ابدأ التشغيل" : "Start Operation",
    ctaSecondary: ar ? "غرفة القيادة التنفيذية" : "Executive Bridge",
    ctaAria:    ar ? "اسأل ARIA" : "Ask ARIA",
    boot:       ar ? "تهيئة بيئة التشغيل…" : "Booting operating environment…",
    booting:    ar ? "جارٍ تشغيل النظام…" : "Launching platform…",
    trust: ar
      ? ["المؤسسات", "الحكومات", "الأمن الصناعي", "Fortune 500"]
      : ["Enterprises", "Governments", "Industrial Security", "Fortune 500"],
    status: ar ? "المنظومة متصلة · GPT-5 · ثنائية اللغة" : "System online · GPT-5 · Bilingual",
    ariaName:   ar ? "آريا" : "ARIA",
    ariaRole:   ar ? "الذكاء التنفيذي" : "Executive Intelligence",
    scroll:     ar ? "اسحب للأسفل" : "Scroll to explore",
  };

  // 24-bar waveform equalizer for the ARIA voice pulse — computed once,
  // deterministic so React doesn't re-shuffle keys on rerender.
  const bars = Array.from({ length: 24 }, (_, i) => {
    // Symmetric envelope, peaks toward center — reads as a voice signal.
    const t = i / 23;
    const envelope = Math.sin(Math.PI * t); // 0..1..0
    const jitter = 0.55 + 0.45 * Math.sin(i * 1.7);
    const h = 6 + envelope * 22 + jitter * 4; // px
    const delay = ((i * 73) % 1200) / 1000; // seconds
    const dur = 1.4 + ((i * 37) % 700) / 1000;
    return { h, delay, dur };
  });

  return (
    <section
      ref={stageRef}
      dir={ar ? "rtl" : "ltr"}
      data-scene="nexus-reveal"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#02060F] text-white [--nxh-mx:0] [--nxh-my:0]"
    >
      {/* ============================================================
          CINEMATIC BACKDROP — layered depth, GPU-only
      ============================================================ */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Base gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 8%, rgba(0,212,255,0.22) 0%, rgba(0,212,255,0.06) 30%, transparent 55%)," +
              "radial-gradient(ellipse 70% 55% at 50% 100%, rgba(58,232,255,0.16) 0%, rgba(6,26,46,0.55) 40%, transparent 70%)," +
              "linear-gradient(180deg, #02060F 0%, #061A2E 55%, #02060F 100%)",
          }}
        />

        {/* Aurora conic — slow, dreamlike, hidden under reduced motion */}
        <div
          className="absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.22] mix-blend-screen motion-reduce:hidden"
          style={{
            background:
              "conic-gradient(from 210deg at 50% 50%, transparent 0deg, rgba(0,212,255,0.35) 60deg, transparent 140deg, rgba(58,232,255,0.30) 220deg, transparent 300deg, rgba(0,212,255,0.25) 360deg)",
            filter: "blur(80px)",
            animation: "nxh-aurora 32s linear infinite",
            willChange: "transform",
          }}
        />

        {/* Parallax grid — reacts to cursor */}
        <div
          className="absolute inset-0 opacity-[0.16] motion-reduce:opacity-[0.10]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,212,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.10) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 45%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 45%, transparent 78%)",
            transform: "translate3d(calc(var(--nxh-mx) * -10px), calc(var(--nxh-my) * -10px), 0)",
            transition: "transform 40ms linear",
            willChange: "transform",
          }}
        />

        {/* Cinematic light sweep */}
        <div
          className="absolute -inset-x-40 top-1/3 h-[60vh] opacity-40 mix-blend-screen motion-reduce:hidden"
          style={{
            background:
              "linear-gradient(105deg, transparent 30%, rgba(58,232,255,0.22) 50%, transparent 70%)",
            animation: "nxh-sweep 14s ease-in-out infinite",
            filter: "blur(40px)",
            willChange: "transform",
          }}
        />

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.65)_100%)]" />
      </div>

      {/* ============================================================
          FOREGROUND
      ============================================================ */}
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-5 py-16 text-center sm:py-20">
        {/* Status pill */}
        <div
          className="inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/25 bg-white/[0.04] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-[#3AE8FF]/85 backdrop-blur-md"
          style={{ animation: "nxh-fade 900ms ease-out both" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-[#3AE8FF] motion-safe:animate-ping opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#3AE8FF]" />
          </span>
          {t.status}
        </div>

        {/* ==========================================================
            ARIA — Executive Presence (centerpiece, parallax core)
            Purely visual; conversational ARIA lives in GlobalAriaCopilot.
        ========================================================== */}
        <div
          aria-hidden
          className="relative mt-10 flex flex-col items-center"
          style={{
            animation: "nxh-fade 1400ms ease-out 120ms both",
            transform:
              "translate3d(calc(var(--nxh-mx) * 6px), calc(var(--nxh-my) * 6px), 0)",
            transition: "transform 60ms linear",
            willChange: "transform",
          }}
        >
          {/* Volumetric halo stack */}
          <div className="relative flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80">
            {/* Outer breathing bloom */}
            <div
              className="absolute inset-0 rounded-full bg-[#00D4FF]/12 blur-[90px] motion-safe:animate-[nxh-breath_6s_ease-in-out_infinite]"
            />
            {/* Wide horizontal glow */}
            <div className="absolute h-40 w-[120%] rotate-6 rounded-full bg-[#3AE8FF]/[0.07] blur-[54px] motion-reduce:hidden" />

            {/* Executive orbit rings (SVG for crisp scaling) */}
            <svg
              viewBox="0 0 200 200"
              className="absolute inset-0 h-full w-full motion-safe:animate-[nxh-orbit_28s_linear_infinite] motion-reduce:hidden"
              style={{ willChange: "transform" }}
            >
              <defs>
                <linearGradient id="nxh-ring-a" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3AE8FF" stopOpacity="0.55" />
                  <stop offset="50%" stopColor="#3AE8FF" stopOpacity="0" />
                  <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.45" />
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="92" fill="none" stroke="url(#nxh-ring-a)" strokeWidth="0.6" />
              <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(58,232,255,0.20)" strokeWidth="0.4" strokeDasharray="2 6" />
            </svg>
            <svg
              viewBox="0 0 200 200"
              className="absolute inset-0 h-full w-full motion-safe:animate-[nxh-orbit-rev_44s_linear_infinite] motion-reduce:hidden"
              style={{ willChange: "transform" }}
            >
              <circle cx="100" cy="100" r="64" fill="none" stroke="rgba(0,212,255,0.28)" strokeWidth="0.5" strokeDasharray="1 4" />
            </svg>

            {/* Breathing static rings for reduced motion + fallback depth */}
            <div className="absolute inset-6 rounded-full border border-[#3AE8FF]/22 motion-safe:animate-[nxh-ring_5s_ease-in-out_infinite]" />
            <div className="absolute inset-0 rounded-full border border-white/8" />

            {/* Glass executive core */}
            <div
              className="relative flex h-44 w-44 items-center justify-center rounded-full border border-white/25 bg-gradient-to-br from-white/[0.20] via-[#3AE8FF]/[0.09] to-transparent shadow-[0_0_70px_rgba(0,212,255,0.40),inset_0_0_44px_rgba(58,232,255,0.22)] backdrop-blur-xl sm:h-56 sm:w-56"
            >
              {/* Inner luminous chamber */}
              <div className="relative flex h-32 w-32 items-end justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_32%,rgba(58,232,255,0.38)_0%,rgba(6,26,46,0.88)_65%,#02060F_100%)] shadow-[inset_0_0_28px_rgba(255,255,255,0.16)] sm:h-40 sm:w-40">
                {/* Executive silhouette */}
                <svg
                  className="relative z-10 mb-3 h-14 w-14 text-[#E6F9FF]/80 drop-shadow-[0_0_16px_rgba(58,232,255,0.65)] sm:h-16 sm:w-16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 4a4 4 0 100 8 4 4 0 000-8zM4 18c0-2.2 3.6-4 8-4s8 1.8 8 4v2H4v-2z" />
                </svg>

                {/* Highlight speck (top) */}
                <div className="absolute top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_#fff]" />
              </div>
            </div>

            {/* Voice pulse — equalizer arc, elegant & non-noisy */}
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-end justify-center gap-[3px] motion-reduce:hidden sm:bottom-6">
              {bars.map((b, i) => (
                <span
                  key={i}
                  className="block w-[2px] rounded-full bg-gradient-to-t from-[#00D4FF]/0 via-[#3AE8FF]/80 to-[#DFF6FF]"
                  style={{
                    height: `${b.h}px`,
                    animation: `nxh-eq ${b.dur}s ease-in-out ${b.delay}s infinite`,
                    transformOrigin: "50% 100%",
                    willChange: "transform, opacity",
                  }}
                />
              ))}
            </div>
            {/* Reduced-motion fallback: single static waveform baseline */}
            <div className="pointer-events-none absolute inset-x-8 bottom-4 hidden h-px bg-gradient-to-r from-transparent via-[#3AE8FF]/60 to-transparent motion-reduce:block" />
          </div>

          {/* ARIA nameplate — dominant, executive-grade */}
          <div className="mt-7 flex flex-col items-center">
            <h2 className="bg-gradient-to-b from-white via-[#E6F9FF] to-[#3AE8FF] bg-clip-text text-4xl font-extralight uppercase tracking-[0.42em] text-transparent sm:text-5xl sm:tracking-[0.5em]">
              {t.ariaName}
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#3AE8FF]/70" />
              <p className="text-[10px] uppercase tracking-[0.42em] text-[#3AE8FF]/80 sm:text-[11px] sm:tracking-[0.52em]">
                {t.ariaRole}
              </p>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#3AE8FF]/70" />
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1
          className="mt-10 text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
          style={{ animation: "nxh-fade 900ms ease-out 400ms both" }}
        >
          <span className="block text-white/95">{t.line1}</span>
          <span className="mt-1 block bg-gradient-to-br from-[#DFF6FF] to-[#00D4FF] bg-clip-text text-transparent">
            {t.line2}
          </span>
        </h1>
        <p
          className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base"
          style={{ animation: "nxh-fade 900ms ease-out 600ms both" }}
        >
          {t.lede}
        </p>

        {/* CTAs */}
        <div
          className="mt-9 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
          style={{ animation: "nxh-fade 900ms ease-out 800ms both" }}
        >
          <button
            type="button"
            onClick={handleLaunch}
            disabled={launching}
            aria-busy={launching}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#00D4FF] to-[#3AE8FF] px-7 py-3.5 text-sm font-semibold text-[#02060F] shadow-[0_10px_50px_-12px_rgba(0,212,255,0.85)] transition-transform duration-300 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3AE8FF] disabled:cursor-wait disabled:opacity-95"
          >
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent transition-transform duration-700 ${launching ? "translate-x-full" : "group-hover:translate-x-full"}`}
            />
            {launching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t.booting}</span>
              </>
            ) : (
              <>
                <span>{t.ctaPrimary}</span>
                <Arrow className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
              </>
            )}
          </button>

          <Link
            to="/exec"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-[#3AE8FF]/50 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3AE8FF]"
          >
            <Compass className="h-4 w-4 text-[#3AE8FF]" />
            <span>{t.ctaSecondary}</span>
          </Link>

          <button
            type="button"
            onClick={scrollToAria}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#3AE8FF]/35 bg-[#3AE8FF]/[0.06] px-6 py-3.5 text-sm font-semibold text-[#DFF6FF] transition hover:bg-[#3AE8FF]/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3AE8FF]"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{t.ctaAria}</span>
          </button>
        </div>

        {/* Trust bar */}
        <div
          className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[9px] uppercase tracking-[0.28em] text-white/40 sm:mt-12 sm:gap-x-6 sm:text-[10px] sm:tracking-[0.35em]"
          style={{ animation: "nxh-fade 900ms ease-out 1000ms both" }}
        >
          {t.trust.map((label, i, arr) => (
            <span key={label} className="inline-flex items-center gap-3">
              <span>{label}</span>
              {i < arr.length - 1 ? <span aria-hidden className="text-[#3AE8FF]/40">·</span> : null}
            </span>
          ))}
        </div>

        {/* Supporting NEXIOS signature — subordinate, below ARIA */}
        <div
          className="mt-12 flex flex-col items-center gap-2"
          style={{ animation: "nxh-fade 900ms ease-out 1150ms both" }}
        >
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#3AE8FF]/40 to-transparent" />
          <div
            className="bg-gradient-to-b from-white/95 via-[#DFF6FF]/90 to-[#3AE8FF]/80 bg-clip-text text-2xl font-semibold tracking-[0.32em] text-transparent sm:text-3xl sm:tracking-[0.42em]"
            style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}
          >
            NEXIOS
          </div>
          <div className="text-[9px] uppercase tracking-[0.5em] text-white/45 sm:text-[10px] sm:tracking-[0.6em]">
            AI · OS
          </div>
        </div>
      </div>

      {/* Scroll affordance */}
      <button
        type="button"
        onClick={scrollToAria}
        aria-label={t.scroll}
        className="group absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-[10px] uppercase tracking-[0.36em] text-white/45 transition hover:text-[#3AE8FF] sm:flex"
      >
        <span>{t.scroll}</span>
        <ChevronDown className="h-3.5 w-3.5 motion-safe:animate-[nxh-bounce_2.4s_ease-in-out_infinite]" />
      </button>

      {/* LAUNCH OVERLAY */}
      <div
        aria-hidden={!launching}
        className={`pointer-events-none fixed inset-0 z-[80] flex items-center justify-center transition-opacity duration-500 ${launching ? "opacity-100" : "opacity-0"}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.35)_0%,rgba(2,6,15,0.9)_55%,#02060F_85%)]" />
        <div className="absolute inset-0 backdrop-blur-md" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full border border-[#3AE8FF]/40" style={{ animation: "nxh-launch-ring 1.2s ease-out infinite" }} />
            <div className="absolute inset-2 rounded-full border border-[#3AE8FF]/30" style={{ animation: "nxh-launch-ring 1.2s ease-out 0.25s infinite" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#3AE8FF]" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold tracking-[0.4em] text-[#DFF6FF]">NEXIOS · BOOT</div>
            <div className="mt-1 text-xs text-white/70">{t.boot}</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes nxh-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes nxh-sweep {
          0%,100% { transform: translateX(-10%); }
          50%     { transform: translateX(10%); }
        }
        @keyframes nxh-aurora {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes nxh-launch-ring {
          0%   { opacity: 0.9; transform: scale(0.6); }
          100% { opacity: 0;   transform: scale(1.8); }
        }
        @keyframes nxh-breath {
          0%,100% { opacity: 0.55; transform: scale(1); }
          50%     { opacity: 0.9;  transform: scale(1.05); }
        }
        @keyframes nxh-ring {
          0%,100% { opacity: 0.35; transform: scale(1); }
          50%     { opacity: 0.75; transform: scale(1.035); }
        }
        @keyframes nxh-orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes nxh-orbit-rev {
          from { transform: rotate(360deg); }
          to   { transform: rotate(0deg); }
        }
        @keyframes nxh-eq {
          0%,100% { transform: scaleY(0.35); opacity: 0.55; }
          50%     { transform: scaleY(1);    opacity: 1; }
        }
        @keyframes nxh-bounce {
          0%,100% { transform: translateY(0); opacity: 0.5; }
          50%     { transform: translateY(4px); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-scene="nexus-reveal"] * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>
    </section>
  );
}

export default NexusRevealHero;

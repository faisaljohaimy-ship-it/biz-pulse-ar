import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ChevronDown, Compass, Loader2, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * NexusRevealHero — v4.0 · Cinematic Rebuild
 *
 * Reference bar: Apple Vision Pro reveal · OpenAI o-series launch · Arc Browser
 * · Linear · Vercel · Tesla event stage.
 *
 * Architecture:
 *   1. Canvas particle field — Neural Streams (GPU-friendly, rAF-throttled,
 *      DPR-clamped, pauses when off-screen, respects reduced motion).
 *   2. Volumetric light rays — SVG filter + soft blur, motion-safe only.
 *   3. ARIA energy core — layered conic + radial SVG rings, no boxes, no
 *      generic circles. Reads as living intelligence, not UI chrome.
 *   4. Voice pulse ribbon — deterministic waveform driven by requestAnimationFrame.
 *   5. Cinematic copy stack — headline, lede, CTAs, trust, subordinate NEXIOS.
 *
 * Performance contract:
 *   - Only transform/opacity/filter animate; zero layout-affecting keyframes.
 *   - Canvas caps at devicePixelRatio ≤ 1.5 and pauses via IntersectionObserver.
 *   - Parallax uses CSS vars + rAF ease; disabled on coarse pointer + reduced motion.
 *   - All decorative layers `aria-hidden`; single accessible content stack.
 *   - Full reduced-motion kill-switch on the scene root.
 */
export function NexusRevealHero({
  onEnterOps,
}: {
  onEnterOps?: () => void;
}) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [launching, setLaunching] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulseRef = useRef<SVGPathElement | null>(null);

  /* ------------------------------------------------------------------
     NEURAL PARTICLE FIELD — canvas, rAF, IO-paused, reduced-motion safe
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    let width = 0;
    let height = 0;
    let running = true;
    let raf = 0;

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; hue: number };
    let particles: P[] = [];

    const seed = () => {
      const area = width * height;
      // ~1 particle per 12k CSS px² → mobile ≈ 60, desktop ≈ 220
      const count = Math.max(40, Math.min(220, Math.floor(area / 12000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 0.6 + Math.random() * 1.6,
        a: 0.25 + Math.random() * 0.55,
        hue: 185 + Math.random() * 20, // cyan band
      }));
    };

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * DPR);
      canvas.height = Math.floor(height * DPR);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      seed();
    };

    // Mouse attractor — subtle turbulence toward cursor
    const mouse = { x: -9999, y: -9999, active: false };
    const onMove = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onLeave = () => { mouse.active = false; };

    const tick = () => {
      if (!running) return;
      // Soft trail — additive dark wash for motion blur without ghosting
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(2,6,15,0.28)";
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "lighter";

      const cx = width * 0.5;
      const cy = height * 0.42; // ARIA core sits slightly above center

      for (const p of particles) {
        // gentle attraction to core + slight cursor pull
        const dxC = cx - p.x;
        const dyC = cy - p.y;
        const distC = Math.hypot(dxC, dyC) || 1;
        p.vx += (dxC / distC) * 0.006;
        p.vy += (dyC / distC) * 0.006;

        if (mouse.active) {
          const dxM = mouse.x - p.x;
          const dyM = mouse.y - p.y;
          const distM = Math.hypot(dxM, dyM) || 1;
          if (distM < 220) {
            p.vx += (dxM / distM) * 0.02;
            p.vy += (dyM / distM) * 0.02;
          }
        }

        // damping
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;

        // wrap
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // glow dot
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        g.addColorStop(0, `hsla(${p.hue},100%,72%,${p.a})`);
        g.addColorStop(1, "hsla(190,100%,60%,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = window.requestAnimationFrame(tick);
    };

    // Pause when hero is off-screen — saves battery, prevents leaks
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          raf = window.requestAnimationFrame(tick);
        } else if (!entry.isIntersecting && running) {
          running = false;
          window.cancelAnimationFrame(raf);
        }
      },
      { threshold: 0.05 }
    );
    io.observe(stage);

    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    stage.addEventListener("pointermove", onMove, { passive: true });
    stage.addEventListener("pointerleave", onLeave, { passive: true });
    raf = window.requestAnimationFrame(tick);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      particles = [];
    };
  }, []);

  /* ------------------------------------------------------------------
     VOICE PULSE RIBBON — deterministic SVG waveform, rAF, reduced-motion safe
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = pulseRef.current;
    if (!path) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let raf = 0;
    let running = true;
    const W = 320;
    const H = 40;
    const SAMPLES = 64;
    const start = performance.now();

    const tick = () => {
      if (!running) return;
      const t = (performance.now() - start) / 1000;
      let d = `M 0 ${H / 2}`;
      for (let i = 0; i <= SAMPLES; i++) {
        const x = (i / SAMPLES) * W;
        // multi-harmonic sine, envelope-tapered at edges → reads as voice
        const env = Math.sin((i / SAMPLES) * Math.PI);
        const y =
          H / 2 +
          env *
            (Math.sin(i * 0.55 + t * 2.2) * 10 +
              Math.sin(i * 0.22 - t * 1.4) * 6 +
              Math.sin(i * 1.1 + t * 3.1) * 3);
        d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
      }
      path.setAttribute("d", d);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
    };
  }, []);

  /* ------------------------------------------------------------------
     PARALLAX — rAF-eased CSS vars, gated by pointer + reduced motion
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stage = stageRef.current;
    if (!stage) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;

    let raf = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const tick = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      stage.style.setProperty("--nxh-mx", current.x.toFixed(3));
      stage.style.setProperty("--nxh-my", current.y.toFixed(3));
      raf = window.requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    const onLeave = () => { target.x = 0; target.y = 0; };

    stage.addEventListener("pointermove", onMove, { passive: true });
    stage.addEventListener("pointerleave", onLeave, { passive: true });
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const handleLaunch = () => {
    if (launching) return;
    setLaunching(true);
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
    line1: ar ? "الذكاء يقود." : "Intelligence, in command.",
    line2: ar ? "نكسيوس ينفّذ." : "NEXIOS executes.",
    lede:  ar
      ? "منظومة تشغيل ذكية للمؤسسات · ARIA في القلب · إدارة الأمن الصناعي · المنطقة الغربية."
      : "Enterprise AI operating system · ARIA at the core · Industrial Security · Western Region.",
    ctaPrimary:   ar ? "ابدأ التشغيل" : "Start Operation",
    ctaSecondary: ar ? "غرفة القيادة التنفيذية" : "Executive Bridge",
    ctaAria:      ar ? "اسأل ARIA" : "Ask ARIA",
    boot:         ar ? "تهيئة بيئة التشغيل…" : "Booting operating environment…",
    booting:      ar ? "جارٍ تشغيل النظام…" : "Launching platform…",
    trust: ar
      ? ["المؤسسات", "الحكومات", "الأمن الصناعي", "Fortune 500"]
      : ["Enterprises", "Governments", "Industrial Security", "Fortune 500"],
    ariaName: ar ? "آريا" : "ARIA",
    ariaRole: ar ? "الذكاء التنفيذي" : "Executive Intelligence",
    scroll:   ar ? "اسحب للأسفل" : "Scroll to explore",
  };

  return (
    <section
      ref={stageRef}
      dir={ar ? "rtl" : "ltr"}
      data-scene="nexus-reveal"
      aria-label={ar ? "المشهد التنفيذي — آريا" : "Executive reveal — ARIA"}
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#02060F] text-white [--nxh-mx:0] [--nxh-my:0]"
    >
      {/* ============================================================
          L0 · Base gradient + deep vignette
      ============================================================ */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 55% at 50% 6%, rgba(0,212,255,0.22) 0%, rgba(0,212,255,0.06) 30%, transparent 55%)," +
              "radial-gradient(ellipse 65% 55% at 50% 100%, rgba(58,232,255,0.14) 0%, rgba(6,26,46,0.55) 40%, transparent 70%)," +
              "linear-gradient(180deg, #010409 0%, #061A2E 55%, #010409 100%)",
          }}
        />
      </div>

      {/* ============================================================
          L1 · Neural particle field (canvas)
      ============================================================ */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-90 motion-reduce:hidden"
      />

      {/* ============================================================
          L2 · Aurora conic — dreamlike ambient light
      ============================================================ */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.22] mix-blend-screen motion-reduce:hidden"
        style={{
          background:
            "conic-gradient(from 210deg at 50% 50%, transparent 0deg, rgba(0,212,255,0.32) 60deg, transparent 140deg, rgba(58,232,255,0.28) 220deg, transparent 300deg, rgba(0,212,255,0.22) 360deg)",
          filter: "blur(90px)",
          animation: "nxh-aurora 36s linear infinite",
          willChange: "transform",
        }}
      />

      {/* ============================================================
          L3 · Volumetric light rays — SVG, gpu-friendly filter blur
      ============================================================ */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-60 mix-blend-screen motion-reduce:hidden"
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="nxh-ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3AE8FF" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#00D4FF" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g style={{ filter: "blur(28px)", transformOrigin: "600px 0px", animation: "nxh-rays 22s ease-in-out infinite" }}>
          <polygon points="560,-40 640,-40 900,900 300,900" fill="url(#nxh-ray)" opacity="0.7" />
          <polygon points="450,-40 500,-40 680,900 240,900" fill="url(#nxh-ray)" opacity="0.4" />
          <polygon points="720,-40 780,-40 980,900 620,900" fill="url(#nxh-ray)" opacity="0.35" />
        </g>
      </svg>

      {/* ============================================================
          L4 · Parallax grid — depth cue, reacts to cursor
      ============================================================ */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14] motion-reduce:opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.10) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 78%)",
          transform: "translate3d(calc(var(--nxh-mx) * -12px), calc(var(--nxh-my) * -12px), 0)",
          transition: "transform 60ms linear",
          willChange: "transform",
        }}
      />

      {/* Final atmospheric vignette (over particles) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.72)_100%)]" />

      {/* ============================================================
          FOREGROUND — cinematic content stack
      ============================================================ */}
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-5 py-16 text-center sm:py-20">

        {/* ============================================================
            ARIA ENERGY CORE — no boxes, no cards, no generic circles
            Pure layered light: SVG conic rings + waveform ribbon + wordmark
        ============================================================ */}
        <div
          aria-hidden
          className="relative flex flex-col items-center"
          style={{
            animation: "nxh-fade 1400ms ease-out 120ms both",
            transform: "translate3d(calc(var(--nxh-mx) * 8px), calc(var(--nxh-my) * 8px), 0)",
            transition: "transform 60ms linear",
            willChange: "transform",
          }}
        >
          {/* Energy sigil */}
          <div className="relative flex h-[320px] w-[320px] items-center justify-center sm:h-[420px] sm:w-[420px]">
            {/* Deep bloom */}
            <div className="absolute inset-0 rounded-full bg-[#00D4FF]/12 blur-[100px] motion-safe:animate-[nxh-breath_7s_ease-in-out_infinite]" />
            {/* Horizontal glow bar */}
            <div className="absolute h-40 w-[130%] rounded-full bg-[#3AE8FF]/[0.08] blur-[60px] motion-reduce:hidden" />

            {/* Living intelligence rings */}
            <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <linearGradient id="nxh-arcA" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3AE8FF" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#3AE8FF" stopOpacity="0" />
                  <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="nxh-arcB" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DFF6FF" stopOpacity="0.8" />
                  <stop offset="60%" stopColor="#00D4FF" stopOpacity="0" />
                </linearGradient>
                <radialGradient id="nxh-nucleus" cx="50%" cy="45%" r="55%">
                  <stop offset="0%" stopColor="#E6F9FF" stopOpacity="1" />
                  <stop offset="35%" stopColor="#3AE8FF" stopOpacity="0.75" />
                  <stop offset="75%" stopColor="#00304A" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#02060F" stopOpacity="0" />
                </radialGradient>
                <filter id="nxh-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Outer orbit — rotating gradient arc */}
              <g style={{ transformOrigin: "200px 200px", animation: "nxh-orbit 32s linear infinite" }} className="motion-reduce:[animation:none]">
                <circle cx="200" cy="200" r="188" fill="none" stroke="url(#nxh-arcA)" strokeWidth="1" />
                <circle cx="200" cy="200" r="188" fill="none" stroke="#3AE8FF" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 220" strokeLinecap="round" filter="url(#nxh-glow)" />
              </g>

              {/* Mid orbit — counter-rotating dashed */}
              <g style={{ transformOrigin: "200px 200px", animation: "nxh-orbit-rev 48s linear infinite" }} className="motion-reduce:[animation:none]">
                <circle cx="200" cy="200" r="158" fill="none" stroke="rgba(58,232,255,0.35)" strokeWidth="0.6" strokeDasharray="1 5" />
                <circle cx="200" cy="200" r="158" fill="none" stroke="url(#nxh-arcB)" strokeWidth="1" strokeDasharray="4 320" strokeLinecap="round" filter="url(#nxh-glow)" />
              </g>

              {/* Inner ring — slow */}
              <g style={{ transformOrigin: "200px 200px", animation: "nxh-orbit 68s linear infinite" }} className="motion-reduce:[animation:none]">
                <circle cx="200" cy="200" r="128" fill="none" stroke="rgba(0,212,255,0.22)" strokeWidth="0.5" strokeDasharray="1 3" />
              </g>

              {/* Radial energy spokes — breathing */}
              <g style={{ transformOrigin: "200px 200px", animation: "nxh-breath 6s ease-in-out infinite" }} opacity="0.55" className="motion-reduce:[animation:none]">
                {Array.from({ length: 24 }, (_, i) => {
                  const angle = (i / 24) * Math.PI * 2;
                  const x1 = 200 + Math.cos(angle) * 100;
                  const y1 = 200 + Math.sin(angle) * 100;
                  const x2 = 200 + Math.cos(angle) * 118;
                  const y2 = 200 + Math.sin(angle) * 118;
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3AE8FF" strokeOpacity="0.4" strokeWidth="0.8" strokeLinecap="round" />;
                })}
              </g>

              {/* Nucleus — the AI core */}
              <circle cx="200" cy="200" r="86" fill="url(#nxh-nucleus)" filter="url(#nxh-glow)" />
              {/* Highlight speck */}
              <circle cx="182" cy="178" r="6" fill="#ffffff" opacity="0.85" />
              <circle cx="182" cy="178" r="14" fill="#ffffff" opacity="0.15" />

              {/* Scan line sweeping across nucleus */}
              <g style={{ transformOrigin: "200px 200px", animation: "nxh-scan 5s linear infinite" }} className="motion-reduce:hidden">
                <line x1="120" y1="200" x2="280" y2="200" stroke="#DFF6FF" strokeOpacity="0.55" strokeWidth="0.6" />
              </g>
            </svg>

            {/* Voice pulse ribbon — sits below the nucleus */}
            <svg
              viewBox="0 0 320 40"
              className="absolute bottom-[22%] h-[28px] w-[62%] opacity-90 motion-reduce:hidden"
              aria-hidden
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="nxh-pulse" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"  stopColor="#3AE8FF" stopOpacity="0" />
                  <stop offset="20%" stopColor="#3AE8FF" stopOpacity="1" />
                  <stop offset="80%" stopColor="#DFF6FF" stopOpacity="1" />
                  <stop offset="100%" stopColor="#3AE8FF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                ref={pulseRef}
                d="M 0 20 L 320 20"
                fill="none"
                stroke="url(#nxh-pulse)"
                strokeWidth="1.4"
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 6px rgba(58,232,255,0.6))" }}
              />
            </svg>
            {/* Reduced-motion baseline */}
            <div className="pointer-events-none absolute bottom-[22%] hidden h-px w-[62%] bg-gradient-to-r from-transparent via-[#3AE8FF]/70 to-transparent motion-reduce:block" />
          </div>

          {/* ARIA nameplate */}
          <div className="-mt-2 flex flex-col items-center sm:-mt-4">
            <h2 className="bg-gradient-to-b from-white via-[#E6F9FF] to-[#3AE8FF] bg-clip-text text-4xl font-extralight uppercase tracking-[0.42em] text-transparent sm:text-6xl sm:tracking-[0.5em]">
              {t.ariaName}
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#3AE8FF]/70" />
              <p className="text-[10px] uppercase tracking-[0.42em] text-[#3AE8FF]/85 sm:text-[11px] sm:tracking-[0.52em]">
                {t.ariaRole}
              </p>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#3AE8FF]/70" />
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1
          className="mt-12 text-3xl font-semibold leading-[1.08] tracking-tight sm:mt-14 sm:text-5xl lg:text-6xl"
          style={{ animation: "nxh-fade 900ms ease-out 400ms both" }}
        >
          <span className="block text-white/95">{t.line1}</span>
          <span className="mt-1 block bg-gradient-to-br from-[#DFF6FF] to-[#00D4FF] bg-clip-text text-transparent">
            {t.line2}
          </span>
        </h1>
        <p
          className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base"
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
            className="group relative inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#00D4FF] to-[#3AE8FF] px-7 py-3.5 text-sm font-semibold text-[#02060F] shadow-[0_10px_50px_-12px_rgba(0,212,255,0.85)] transition-transform duration-300 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3AE8FF] disabled:cursor-wait disabled:opacity-95"
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
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-[#3AE8FF]/50 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3AE8FF]"
          >
            <Compass className="h-4 w-4 text-[#3AE8FF]" />
            <span>{t.ctaSecondary}</span>
          </Link>

          <button
            type="button"
            onClick={scrollToAria}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#3AE8FF]/35 bg-[#3AE8FF]/[0.06] px-6 py-3.5 text-sm font-semibold text-[#DFF6FF] transition hover:bg-[#3AE8FF]/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3AE8FF]"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{t.ctaAria}</span>
          </button>
        </div>

        {/* Trust bar */}
        <div
          className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[9px] uppercase tracking-[0.28em] text-white/45 sm:mt-12 sm:gap-x-6 sm:text-[10px] sm:tracking-[0.35em]"
          style={{ animation: "nxh-fade 900ms ease-out 1000ms both" }}
        >
          {t.trust.map((label, i, arr) => (
            <span key={label} className="inline-flex items-center gap-3">
              <span>{label}</span>
              {i < arr.length - 1 ? <span aria-hidden className="text-[#3AE8FF]/40">·</span> : null}
            </span>
          ))}
        </div>

        {/* Supporting NEXIOS signature */}
        <div
          className="mt-12 flex flex-col items-center gap-2"
          style={{ animation: "nxh-fade 900ms ease-out 1150ms both" }}
        >
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#3AE8FF]/45 to-transparent" />
          <div
            className="bg-gradient-to-b from-white/95 via-[#DFF6FF]/90 to-[#3AE8FF]/80 bg-clip-text text-2xl font-semibold tracking-[0.32em] text-transparent sm:text-3xl sm:tracking-[0.42em]"
            style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}
          >
            NEXIOS
          </div>
          <div className="text-[9px] uppercase tracking-[0.5em] text-white/50 sm:text-[10px] sm:tracking-[0.6em]">
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
        @keyframes nxh-aurora {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes nxh-rays {
          0%,100% { transform: rotate(-4deg); opacity: 0.55; }
          50%     { transform: rotate(4deg);  opacity: 0.85; }
        }
        @keyframes nxh-breath {
          0%,100% { opacity: 0.6;  transform: scale(1); }
          50%     { opacity: 0.95; transform: scale(1.04); }
        }
        @keyframes nxh-orbit     { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
        @keyframes nxh-orbit-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes nxh-scan {
          0%   { transform: translateY(-80px); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(80px);  opacity: 0; }
        }
        @keyframes nxh-launch-ring {
          0%   { opacity: 0.9; transform: scale(0.6); }
          100% { opacity: 0;   transform: scale(1.8); }
        }
        @keyframes nxh-bounce {
          0%,100% { transform: translateY(0);  opacity: 0.5; }
          50%     { transform: translateY(4px); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-scene="nexus-reveal"] * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
        }
      `}</style>
    </section>
  );
}

export default NexusRevealHero;

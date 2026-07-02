/**
 * AriaWelcomeCurtain — cinematic ARIA Executive Opening (first 60s).
 *
 * Flow (locale-aware, single language):
 *   0s   dark cinematic void, particles + energy lines fade in
 *   1s   ARIA core forms from light (breathing, expanding rings)
 *   2s   greeting streams in as subtitle + voice
 *   6s   20-second executive briefing streams
 *   26s  final prompt: "Executive briefing or live demo?"
 *   60s  auto-dismiss (or Skip / Play Demo click)
 *
 * Emits `nexios:play-demo` on the Play Demo click so the landing page can
 * open the existing ExecutiveCinema without a prop wire.
 *
 * Pure presentation — no Supabase, no protected calls.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Sparkles, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const SESSION_KEY = "nexus.welcome-curtain-shown";
const TOTAL_SECONDS = 60;

interface Briefing {
  readonly greeting: string;
  readonly lines: readonly string[];
  readonly prompt: string;
  readonly briefingLabel: string;
  readonly demoLabel: string;
  readonly skipLabel: string;
  readonly tagline: string;
  readonly title: string;
}

const AR: Briefing = {
  greeting: "أهلاً بكم. أنا آريا، عقلكم التنفيذي على منصة نيكسوس.",
  lines: [
    "أراقب العمليات في جدة، مكة، والمنطقة الغربية على مدار الساعة.",
    "الحوادث المفتوحة، الدوريات، التصاريح، والزوّار — جميعها في مكان واحد.",
    "أرصد المخاطر قبل حدوثها، وأرفع لكم القرارات المدعومة بالأدلة فقط.",
    "لا فوضى واتساب. لا بريد ضائع. تنسيق ذكي بين الفرق.",
  ],
  prompt: "هل تفضّلون الموجز التنفيذي، أم عرضاً حياً للمنصة؟",
  briefingLabel: "الموجز التنفيذي",
  demoLabel: "عرض تنفيذي",
  skipLabel: "تخطي",
  tagline: "نيكسوس · منصة التميز التنفيذي",
  title: "أهلاً بكم في منصة إنجاز الأعمال التنفيذية",
};

const EN: Briefing = {
  greeting: "Welcome. I am ARIA, your executive mind on the NEXIOS platform.",
  lines: [
    "I monitor operations across Jeddah, Makkah, and the Western Region around the clock.",
    "Open incidents, patrols, permits, and visitors — unified on one surface.",
    "I surface risks before they escalate, and elevate only evidence-backed decisions.",
    "No WhatsApp chaos. No missed emails. Intelligent coordination across teams.",
  ],
  prompt: "Would you like the executive briefing, or a live demo?",
  briefingLabel: "Executive Briefing",
  demoLabel: "Watch Executive Demo",
  skipLabel: "Skip",
  tagline: "NEXIOS · Executive Delivery Platform",
  title: "Welcome to the Executive Delivery Platform",
};

export function AriaWelcomeCurtain() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const script = ar ? AR : EN;

  const [show, setShow] = useState(false);
  const [fade, setFade] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Deterministic reveal timings for the streamed briefing.
  const reveals = useMemo(() => {
    // greeting @ 2s, lines every 5s starting at 6s, prompt @ 26s
    const t: { at: number; text: string; kind: "greet" | "line" | "prompt" }[] = [];
    t.push({ at: 2, text: script.greeting, kind: "greet" });
    script.lines.forEach((ln, i) => t.push({ at: 6 + i * 5, text: ln, kind: "line" }));
    t.push({ at: 26, text: script.prompt, kind: "prompt" });
    return t;
  }, [script]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { if (sessionStorage.getItem(SESSION_KEY)) return; } catch { /* noop */ }
    setShow(true);
    speakScript(script, ar);

    const start = performance.now();
    const tick = window.setInterval(() => {
      const s = Math.min(TOTAL_SECONDS, Math.round((performance.now() - start) / 1000));
      setElapsed(s);
    }, 250);

    const fadeT = window.setTimeout(() => setFade(true), (TOTAL_SECONDS - 1) * 1000);
    const offT = window.setTimeout(() => {
      setShow(false);
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* noop */ }
    }, TOTAL_SECONDS * 1000);

    const onGesture = () => { speakScript(script, ar, true); window.removeEventListener("pointerdown", onGesture); };
    window.addEventListener("pointerdown", onGesture, { once: true });

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(fadeT);
      window.clearTimeout(offT);
      window.removeEventListener("pointerdown", onGesture);
      try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    };
  }, [script, ar]);

  // Particle field on canvas — soft blue drifting motes + connecting lines.
  useEffect(() => {
    if (!show) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = 60;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25 * dpr,
      vy: (Math.random() - 0.5) * 0.25 * dpr,
      r: (Math.random() * 1.5 + 0.5) * dpr,
    }));

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // energy lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d2 = dx * dx + dy * dy;
          const max = 130 * dpr;
          if (d2 < max * max) {
            const a = 1 - Math.sqrt(d2) / max;
            ctx.strokeStyle = `rgba(58,232,255,${a * 0.15})`;
            ctx.lineWidth = dpr * 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      // motes
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        grad.addColorStop(0, "rgba(58,232,255,0.9)");
        grad.addColorStop(1, "rgba(58,232,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [show]);

  const dismiss = () => {
    setFade(true);
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    window.setTimeout(() => {
      setShow(false);
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* noop */ }
    }, 600);
  };

  const playDemo = () => {
    try { window.dispatchEvent(new CustomEvent("nexios:play-demo")); } catch { /* noop */ }
    dismiss();
  };

  if (!show) return null;

  const revealed = reveals.filter((r) => elapsed >= r.at);
  const remaining = Math.max(0, TOTAL_SECONDS - elapsed);
  const showCTAs = elapsed >= 26;

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      role="dialog"
      aria-label={ar ? "ترحيب آريا" : "ARIA welcome"}
      className={[
        "fixed inset-0 z-[120] flex items-center justify-center",
        "bg-[radial-gradient(ellipse_at_center,rgba(6,26,46,0.94)_0%,rgba(2,8,18,0.98)_55%,#02060f_100%)]",
        "backdrop-blur-3xl transition-opacity duration-700",
        fade ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      <style>{`
        @keyframes awc-core { 0%,100% { transform: scale(1); filter: drop-shadow(0 0 32px rgba(58,232,255,0.7)); } 50% { transform: scale(1.05); filter: drop-shadow(0 0 64px rgba(58,232,255,0.95)); } }
        @keyframes awc-ring { 0% { transform: translate(-50%,-50%) scale(0.6); opacity: 0; } 30% { opacity: .7; } 100% { transform: translate(-50%,-50%) scale(2.6); opacity: 0; } }
        @keyframes awc-rise { 0% { opacity: 0; transform: translateY(14px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes awc-form { 0% { opacity: 0; transform: scale(0.4); filter: blur(20px); } 100% { opacity: 1; transform: scale(1); filter: blur(0); } }
        @keyframes awc-letters { 0% { letter-spacing: 0.05em; opacity: 0; } 100% { letter-spacing: 0.32em; opacity: 1; } }
        @keyframes awc-eye { 0%,92%,100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
      `}</style>

      {/* Particle + energy lines layer */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
      />

      {/* Volumetric beams */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[140vh] w-[2px] -translate-x-1/2 -translate-y-1/2 rotate-12 bg-gradient-to-b from-transparent via-[#3AE8FF]/25 to-transparent blur-[2px]" />
        <div className="absolute left-1/2 top-1/2 h-[140vh] w-[2px] -translate-x-1/2 -translate-y-1/2 -rotate-12 bg-gradient-to-b from-transparent via-[#00D4FF]/20 to-transparent blur-[2px]" />
      </div>

      {/* Expanding rings */}
      {[0, 0.9, 1.8, 2.7].map((d) => (
        <span
          key={d}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 rounded-full border border-[#3AE8FF]/40"
          style={{ animation: `awc-ring 4.2s ease-out ${d}s infinite` }}
        />
      ))}

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center px-6 text-center">
        {/* ARIA core — forms from light */}
        <div
          aria-hidden
          className="relative grid h-36 w-36 place-items-center rounded-full border border-[#3AE8FF]/70 bg-gradient-to-br from-[#00D4FF]/45 via-[#0a2a44] to-[#061A2E] sm:h-44 sm:w-44"
          style={{ animation: "awc-form 1400ms ease-out both, awc-core 3.6s ease-in-out 1400ms infinite" }}
        >
          <span
            aria-hidden
            className="absolute inset-2 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(58,232,255,0) 0deg, rgba(58,232,255,0.7) 60deg, rgba(58,232,255,0) 120deg, rgba(58,232,255,0) 360deg)",
              maskImage: "radial-gradient(circle, transparent 38%, black 42%, black 78%, transparent 82%)",
              WebkitMaskImage:
                "radial-gradient(circle, transparent 38%, black 42%, black 78%, transparent 82%)",
              animation: "aria-orb-spin 5.5s linear infinite",
            }}
          />
          {/* Blinking "eye" glyph — pupil hint */}
          <Sparkles
            className="relative h-11 w-11 text-[#3AE8FF] drop-shadow-[0_0_14px_rgba(58,232,255,0.95)]"
            style={{ animation: "awc-eye 5s ease-in-out infinite", transformOrigin: "center" }}
          />
        </div>

        <div
          className="mt-7 text-[10px] uppercase text-[#3AE8FF]/85 sm:text-[11px]"
          style={{ animation: "awc-letters 1.2s ease-out 400ms both" }}
        >
          {script.tagline}
        </div>

        <h1
          className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-4xl"
          style={{ animation: "awc-rise 900ms ease-out 700ms backwards" }}
        >
          {script.title}
        </h1>

        {/* Streaming briefing subtitles */}
        <div className="mt-6 flex min-h-[9rem] w-full flex-col items-center gap-2 text-sm leading-relaxed text-white/85 sm:text-base">
          {revealed.map((r, i) => (
            <p
              key={i}
              className={[
                "max-w-xl",
                r.kind === "prompt" ? "text-[#3AE8FF] font-semibold" : "",
                r.kind === "greet" ? "text-white" : "text-white/75",
              ].join(" ")}
              style={{ animation: "awc-rise 700ms ease-out both" }}
            >
              {r.text}
            </p>
          ))}
        </div>

        {/* Final CTA row */}
        {showCTAs && (
          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
            style={{ animation: "awc-rise 700ms ease-out both" }}
          >
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.24em] text-white/90 transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              <FileText className="h-4 w-4" />
              {script.briefingLabel}
            </button>
            <button
              type="button"
              onClick={playDemo}
              className="inline-flex items-center gap-2 rounded-full border border-[#3AE8FF] bg-gradient-to-r from-[#00D4FF] to-[#3AE8FF] px-6 py-2.5 text-xs font-bold uppercase tracking-[0.24em] text-[#02121f] shadow-[0_0_36px_rgba(58,232,255,0.65)] transition hover:-translate-y-0.5"
            >
              <Play className="h-4 w-4" />
              {script.demoLabel}
            </button>
          </div>
        )}

        {/* Skip + timer */}
        <div className="mt-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-white/40">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full border border-[#3AE8FF]/40 bg-[#3AE8FF]/5 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white/80 transition hover:border-[#3AE8FF] hover:bg-[#3AE8FF]/15"
          >
            {script.skipLabel}
          </button>
          <span className="font-mono text-white/35">{String(remaining).padStart(2, "0")}s</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Locale-aware voice greeting via Web Speech API. Silent on autoplay block.
 * Speaks only in the selected language — no forced bilingual playback.
 */
let __ariaWelcomeSpoken = false;
function speakScript(s: Briefing, ar: boolean, force = false) {
  if (typeof window === "undefined") return;
  if (__ariaWelcomeSpoken && !force) return;
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") return;
  __ariaWelcomeSpoken = true;

  const lang = ar ? "ar-SA" : "en-US";
  const phrases: string[] = [s.greeting, ...s.lines, s.prompt];

  const run = () => {
    try { synth.cancel(); } catch { /* noop */ }
    const voices = synth.getVoices();
    const pick = (l: string) =>
      voices.find((v) => v.lang?.toLowerCase().startsWith(l.toLowerCase())) ?? null;
    const voice = pick(lang) ?? pick(lang.split("-")[0]);
    // Schedule with rough spacing matching subtitle reveal cadence.
    const delays = [2000, 6000, 11000, 16000, 21000, 26000];
    phrases.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.95;
      u.pitch = 1.0;
      u.volume = 1.0;
      if (voice) u.voice = voice;
      window.setTimeout(() => { try { synth.speak(u); } catch { /* noop */ } }, delays[i] ?? (26000 + i * 3500));
    });
  };

  if (synth.getVoices().length === 0) {
    const onVoices = () => { synth.removeEventListener("voiceschanged", onVoices); run(); };
    synth.addEventListener("voiceschanged", onVoices);
    window.setTimeout(run, 600);
  } else {
    run();
  }
}

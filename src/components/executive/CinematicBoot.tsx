import { useEffect, useRef, useState } from "react";

const STAGES = [
  { t: 0,      label_ar: "تهيئة النواة",              label_en: "Initializing core" },
  { t: 5_000,  label_ar: "تجميع الجزيئات العصبية",     label_en: "Assembling neural particles" },
  { t: 12_000, label_ar: "تفعيل ARIA · GPT-5",         label_en: "Materializing ARIA · GPT-5" },
  { t: 22_000, label_ar: "ترحيب آريا التنفيذي",        label_en: "ARIA executive greeting" },
  { t: 34_000, label_ar: "ربط مركز القيادة",            label_en: "Linking Command Center" },
  { t: 46_000, label_ar: "بث المؤشرات التنفيذية",       label_en: "Streaming executive KPIs" },
  { t: 56_000, label_ar: "جاهز للدخول",                 label_en: "Ready for entry" },
] as const;

const TOTAL_MS = 60_000;
const SESSION_KEY = "nexios.boot-seen";

export function CinematicBoot({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return sessionStorage.getItem(SESSION_KEY) !== "1"; } catch { return true; }
  });
  const [elapsed, setElapsed] = useState(0);
  const spokeRef = useRef(false);

  useEffect(() => {
    if (!visible) { onComplete(); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const e = now - start;
      setElapsed(e);
      // ARIA executive greeting at scene-2 start (~1.2s after mount, once audio context likely unlocked by curtain tap)
      if (!spokeRef.current && e >= 1200) {
        spokeRef.current = true;
        speakAriaGreeting();
      }
      if (e >= TOTAL_MS) finish();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape" || ev.key === "Enter") finish(); };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function finish() {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* noop */ }
    setVisible(false);
    onComplete();
  }

  if (!visible) return null;

  const pct = Math.min(100, (elapsed / TOTAL_MS) * 100);
  const currentStage = [...STAGES].reverse().find((s) => elapsed >= s.t) ?? STAGES[0];

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="NEXIOS startup sequence"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020A14] text-white"
      style={{ animation: "nx-boot-fade-out 600ms ease 59400ms forwards" }}
    >
      {/* Ambient aurora */}
      <div className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: "radial-gradient(60% 50% at 50% 50%, rgba(0,212,255,0.25), transparent 70%), radial-gradient(40% 40% at 30% 70%, rgba(58,232,255,0.15), transparent 70%)",
        }}
      />
      {/* Particle ring */}
      <svg className="absolute h-[520px] w-[520px] max-h-[80vw] max-w-[80vw]" viewBox="0 0 200 200" aria-hidden>
        <defs>
          <radialGradient id="nx-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3AE8FF" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#00D4FF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="58" fill="url(#nx-core)" style={{ animation: "nx-boot-pulse 2.2s ease-in-out infinite" }} />
        {Array.from({ length: 36 }).map((_, i) => {
          const a = (i / 36) * Math.PI * 2;
          const r = 78 + (i % 3) * 4;
          const x = 100 + Math.cos(a) * r;
          const y = 100 + Math.sin(a) * r;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={1.2 + (i % 4) * 0.3}
              fill="#3AE8FF"
              opacity={0.4 + (i % 5) * 0.1}
              style={{ animation: `nx-boot-mote 3.8s ease-in-out ${(i * 80) % 2000}ms infinite` }}
            />
          );
        })}
        <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(0,212,255,0.35)" strokeWidth="0.4" strokeDasharray="2 6" style={{ transformOrigin: "100px 100px", animation: "nx-boot-spin 22s linear infinite" }} />
      </svg>

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <div className="text-[10px] uppercase tracking-[0.45em] text-[#3AE8FF]/80">NEXIOS</div>
        <div className="text-3xl font-semibold tracking-tight sm:text-5xl">
          <span className="bg-gradient-to-r from-white via-[#3AE8FF] to-white bg-clip-text text-transparent">NEXIOS AI OS</span>
        </div>
        <div className="text-xs text-white/60 sm:text-sm">
          {currentStage.label_ar} <span className="text-white/30">•</span> <span className="font-mono text-white/40">{currentStage.label_en}</span>
        </div>

        <div className="mt-4 h-[3px] w-72 max-w-[80vw] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#00D4FF] via-[#3AE8FF] to-[#00D4FF] shadow-[0_0_20px_rgba(0,212,255,0.7)]"
            style={{ width: `${pct}%`, transition: "width 120ms linear" }}
          />
        </div>
        <div className="font-mono text-[10px] tracking-widest text-white/40">{Math.round(pct)}%</div>

        <button
          type="button"
          onClick={finish}
          className="mt-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-white/70 transition hover:border-[#3AE8FF]/60 hover:text-white"
        >
          تخطي · Skip
        </button>
      </div>

      <style>{`
        @keyframes nx-boot-pulse { 0%,100% { transform-origin: 100px 100px; transform: scale(1); opacity: .85; } 50% { transform: scale(1.06); opacity: 1; } }
        @keyframes nx-boot-mote  { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
        @keyframes nx-boot-spin  { to { transform: rotate(360deg); } }
        @keyframes nx-boot-fade-out { to { opacity: 0; visibility: hidden; } }
        @media (prefers-reduced-motion: reduce) {
          [style*="nx-boot-pulse"], [style*="nx-boot-mote"], [style*="nx-boot-spin"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

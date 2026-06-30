/**
 * AriaWelcomeCurtain — full-screen pre-hero greeting overlay.
 *
 * Plays once per session. ARIA's voice is handled by the global AriaDock
 * (which auto-greets on first gesture); this curtain provides the visual
 * stage for that opening moment, then dissolves to reveal the hero with a
 * miniaturized ARIA badge already in place.
 *
 * Pure presentation — no Supabase, no protected calls. Safe on landing.
 */
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const SESSION_KEY = "nexus.welcome-curtain-shown";

export function AriaWelcomeCurtain() {
  const [show, setShow] = useState(false);
  const [fade, setFade] = useState(false);

  const [remaining, setRemaining] = useState(25);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch { /* noop */ }
    setShow(true);
    // Attempt voice greeting immediately; browser autoplay may defer until first gesture.
    speakWelcome();
    // 25s curtain. Begin fade-out at 24.4s, fully dismiss at 25s.
    const fadeT = window.setTimeout(() => setFade(true), 24_400);
    const offT = window.setTimeout(() => {
      setShow(false);
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* noop */ }
    }, 25_000);
    const tickT = window.setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    // First user gesture also triggers the greeting (covers autoplay-blocked browsers).
    const onGesture = () => { speakWelcome(); window.removeEventListener("pointerdown", onGesture); };
    window.addEventListener("pointerdown", onGesture, { once: true });
    return () => {
      window.clearTimeout(fadeT); window.clearTimeout(offT); window.clearInterval(tickT);
      window.removeEventListener("pointerdown", onGesture);
      try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    };
  }, []);

  const dismiss = () => {
    setFade(true);
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    window.setTimeout(() => {
      setShow(false);
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* noop */ }
    }, 600);
  };

  if (!show) return null;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-label="ترحيب آريا"
      onClick={dismiss}
      className={[
        "fixed inset-0 z-[120] flex items-center justify-center cursor-pointer",
        "bg-[radial-gradient(ellipse_at_center,rgba(6,26,46,0.92)_0%,rgba(2,8,18,0.98)_55%,#020812_100%)]",
        "backdrop-blur-3xl transition-opacity duration-700",
        fade ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      <style>{`
        @keyframes awc-core { 0%,100% { transform: scale(1); filter: drop-shadow(0 0 28px rgba(58,232,255,0.65)); } 50% { transform: scale(1.06); filter: drop-shadow(0 0 56px rgba(58,232,255,0.95)); } }
        @keyframes awc-ring { 0% { transform: scale(0.6); opacity: 0; } 30% { opacity: .7; } 100% { transform: scale(2.4); opacity: 0; } }
        @keyframes awc-rise { 0% { opacity: 0; transform: translateY(14px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes awc-letters { 0% { letter-spacing: 0.05em; opacity: 0; } 100% { letter-spacing: 0.32em; opacity: 1; } }
      `}</style>

      {/* Concentric expanding rings */}
      {[0, 0.7, 1.4, 2.1].map((d) => (
        <span
          key={d}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#3AE8FF]/40"
          style={{ animation: `awc-ring 3.8s ease-out ${d}s infinite` }}
        />
      ))}

      <div className="relative flex flex-col items-center text-center px-6">
        {/* ARIA core */}
        <div
          aria-hidden
          className="relative grid h-32 w-32 place-items-center rounded-full border border-[#3AE8FF]/70 bg-gradient-to-br from-[#00D4FF]/45 via-[#0a2a44] to-[#061A2E] sm:h-40 sm:w-40"
          style={{ animation: "awc-core 3.6s ease-in-out infinite" }}
        >
          <span
            aria-hidden
            className="absolute inset-2 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(58,232,255,0) 0deg, rgba(58,232,255,0.6) 60deg, rgba(58,232,255,0) 120deg, rgba(58,232,255,0) 360deg)",
              maskImage: "radial-gradient(circle, transparent 38%, black 42%, black 78%, transparent 82%)",
              WebkitMaskImage:
                "radial-gradient(circle, transparent 38%, black 42%, black 78%, transparent 82%)",
              animation: "aria-orb-spin 5.5s linear infinite",
            }}
          />
          <Sparkles className="relative h-10 w-10 text-[#3AE8FF] drop-shadow-[0_0_12px_rgba(58,232,255,0.95)]" />
        </div>

        <div
          className="mt-7 text-[10px] uppercase text-[#3AE8FF]/85 sm:text-[11px]"
          style={{ animation: "awc-letters 1.2s ease-out forwards" }}
        >
          NEXIOS · Executive Delivery Platform
        </div>

        <h1
          className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-4xl"
          style={{ animation: "awc-rise 900ms ease-out 200ms backwards" }}
        >
          أهلاً بك في منصة إنجاز الأعمال التنفيذية
        </h1>

        <p
          className="mt-4 max-w-md text-sm leading-relaxed text-white/75 sm:text-base"
          style={{ animation: "awc-rise 900ms ease-out 500ms backwards" }}
        >
          أنا <span className="font-semibold text-[#3AE8FF]">آريا</span> — عقلك التنفيذي. بماذا يمكنني مساعدتك اليوم؟
        </p>

        <div
          className="mt-8 flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-white/40"
          style={{ animation: "awc-rise 900ms ease-out 900ms backwards" }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            className="rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white/90 transition hover:border-[#3AE8FF] hover:bg-[#3AE8FF]/20"
          >
            تخطي · Skip
          </button>
          <span className="font-mono text-white/35">{String(remaining).padStart(2, "0")}s</span>
        </div>
      </div>
    </div>
  );
}

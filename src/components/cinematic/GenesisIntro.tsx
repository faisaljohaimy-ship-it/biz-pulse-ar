/**
 * GenesisIntro — 7-second pre-system cinematic.
 * Pure code/CSS/SVG. No audio, no video, no external assets.
 *
 * Phases:
 *   0.0 – 2.5s  «الشرارة»    spark → pulsing energy core
 *   2.5 – 4.5s  «التكوّن»    40 particles converge + orbit rings draw
 *   4.5 – 6.0s  «الولادة»    core flash → NEXIOS AI wordmark reveals
 *   6.0 – 7.0s  «الانفتاح»   scale-up + fade → homepage
 *
 * Contracts:
 *   • Once per session (sessionStorage "nexios-genesis-seen")
 *   • Skip button always visible
 *   • 3s load-guard: if window hasn't loaded, still begins after 3s
 *   • 10s hard cap: force-hides after 10s regardless
 *   • prefers-reduced-motion → skips instantly
 *   • transform/opacity animations only (60fps target, no layout thrash)
 */
import { useEffect, useMemo, useRef, useState } from "react";

const SESSION_KEY = "nexios-genesis-seen";
const TOTAL_MS = 7000;
const HARD_CAP_MS = 10000;
const LOAD_GUARD_MS = 3000;

type Phase = "spark" | "form" | "birth" | "open" | "done";

function shouldSkip(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.sessionStorage.getItem(SESSION_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function GenesisIntro() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("spark");
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // Only decide once on mount (client-only).
  useEffect(() => {
    if (shouldSkip()) return;
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setMounted(true);
    setVisible(true);

    const begin = () => {
      timers.current.push(setTimeout(() => setPhase("form"), 2500));
      timers.current.push(setTimeout(() => setPhase("birth"), 4500));
      timers.current.push(setTimeout(() => setPhase("open"), 6000));
      timers.current.push(setTimeout(() => setVisible(false), TOTAL_MS));
      timers.current.push(setTimeout(() => setMounted(false), TOTAL_MS + 400));
    };

    // Load-guard: begin on window.load OR after 3s, whichever first.
    let started = false;
    const start = () => {
      if (!started) {
        started = true;
        begin();
      }
    };
    if (document.readyState === "complete") start();
    else {
      window.addEventListener("load", start, { once: true });
      timers.current.push(setTimeout(start, LOAD_GUARD_MS));
    }

    // Hard cap.
    timers.current.push(
      setTimeout(() => {
        setVisible(false);
        setMounted(false);
      }, HARD_CAP_MS),
    );

    return () => {
      window.removeEventListener("load", start);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  const skip = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisible(false);
    setTimeout(() => setMounted(false), 200);
  };

  // 40 particles — memoized so positions/durations are stable across renders.
  const particles = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => {
        const angle = (i / 40) * Math.PI * 2;
        const distVw = 45 + Math.random() * 25; // start off-center
        const dx = Math.cos(angle) * distVw;
        const dy = Math.sin(angle) * distVw;
        const size = 2 + Math.random() * 3;
        const delay = Math.random() * 400;
        return { dx, dy, size, delay, hue: i % 3 === 0 ? "#F5D28A" : "#3AE8FF" };
      }),
    [],
  );

  if (!mounted) return null;

  const isSpark = phase === "spark";
  const isForm = phase === "form" || phase === "birth" || phase === "open";
  const isBirth = phase === "birth" || phase === "open";
  const isOpen = phase === "open";

  return (
    <div
      aria-hidden={!visible}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "#04070F",
        opacity: visible ? 1 : 0,
        transform: isOpen ? "scale(1.15)" : "scale(1)",
        transition: "opacity 900ms ease-out, transform 900ms ease-out",
        pointerEvents: visible ? "auto" : "none",
        overflow: "hidden",
        willChange: "opacity, transform",
      }}
    >
      {/* Skip */}
      <button
        onClick={skip}
        style={{
          position: "absolute",
          top: 20,
          insetInlineEnd: 20,
          padding: "6px 14px",
          fontSize: 12,
          letterSpacing: "0.12em",
          color: "rgba(255,255,255,0.8)",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 999,
          cursor: "pointer",
          backdropFilter: "blur(6px)",
          zIndex: 5,
        }}
      >
        تخطي ⏭ Skip
      </button>

      {/* Energy core */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            width: isSpark ? 6 : 220,
            height: isSpark ? 6 : 220,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, #A6FFCB 0%, #34D399 25%, rgba(58,232,255,0.5) 55%, rgba(4,7,15,0) 75%)",
            boxShadow: isBirth
              ? "0 0 220px 40px rgba(255,255,255,0.85), 0 0 120px 30px rgba(58,232,255,0.6)"
              : "0 0 80px 10px rgba(52,211,153,0.55), 0 0 40px 6px rgba(58,232,255,0.35)",
            transform: `scale(${isSpark ? 1 : isBirth ? 1.15 : 1}) ${isSpark ? "" : "translateZ(0)"}`,
            transition:
              "width 1400ms cubic-bezier(.2,.8,.2,1), height 1400ms cubic-bezier(.2,.8,.2,1), box-shadow 500ms ease-out, transform 400ms ease-out",
            animation: isSpark ? undefined : "genesis-core-pulse 2.6s ease-in-out infinite",
            willChange: "transform, box-shadow",
          }}
        />

        {/* Orbit rings */}
        <svg
          viewBox="0 0 400 400"
          style={{
            position: "absolute",
            width: 460,
            height: 460,
            opacity: isForm ? 1 : 0,
            transition: "opacity 700ms ease-out",
            transform: isOpen ? "rotate(60deg)" : "rotate(0deg)",
            transitionProperty: "opacity, transform",
            transitionDuration: "700ms, 1400ms",
          }}
        >
          <circle
            cx="200"
            cy="200"
            r="150"
            fill="none"
            stroke="#3AE8FF"
            strokeWidth="1"
            strokeOpacity="0.55"
            strokeDasharray="942"
            strokeDashoffset={isForm ? 0 : 942}
            style={{ transition: "stroke-dashoffset 1600ms ease-out" }}
          />
          <circle
            cx="200"
            cy="200"
            r="185"
            fill="none"
            stroke="#3AE8FF"
            strokeWidth="0.75"
            strokeOpacity="0.35"
            strokeDasharray="1163"
            strokeDashoffset={isForm ? 0 : 1163}
            style={{ transition: "stroke-dashoffset 1800ms ease-out 150ms" }}
          />
          <circle
            cx="200"
            cy="200"
            r="120"
            fill="none"
            stroke="#F5D28A"
            strokeWidth="0.5"
            strokeOpacity="0.4"
            strokeDasharray="754"
            strokeDashoffset={isForm ? 0 : 754}
            style={{ transition: "stroke-dashoffset 1500ms ease-out 300ms" }}
          />
        </svg>

        {/* Particles (converge on form) */}
        {particles.map((p, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.hue,
              boxShadow: `0 0 8px ${p.hue}`,
              opacity: isForm ? 0.9 : 0,
              transform: isForm
                ? "translate(0,0) scale(1)"
                : `translate(${p.dx}vw, ${p.dy}vh) scale(0.6)`,
              transition: `transform 1700ms cubic-bezier(.2,.8,.2,1) ${p.delay}ms, opacity 500ms ease-out ${p.delay}ms`,
              willChange: "transform, opacity",
            }}
          />
        ))}
      </div>

      {/* Wordmark — birth phase */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          pointerEvents: "none",
          opacity: isBirth ? 1 : 0,
          transition: "opacity 500ms ease-out",
        }}
      >
        <div style={{ height: 260 }} />
        <Wordmark text="NEXIOS AI" active={isBirth} />
        <div
          dir="rtl"
          style={{
            fontSize: 14,
            letterSpacing: "0.14em",
            color: "rgba(58,232,255,0.85)",
            fontFamily: "'Cairo','IBM Plex Sans Arabic',sans-serif",
            opacity: isBirth ? 1 : 0,
            transform: isBirth ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 700ms ease-out 600ms, transform 700ms ease-out 600ms",
          }}
        >
          نِظَامُ التَّشْغِيلِ الذَّكِيُّ لِلْأَمْنِ الصِّنَاعِيّ
        </div>
        <div
          style={{
            width: 120,
            height: 1,
            background: "linear-gradient(90deg, transparent, #F5D28A, transparent)",
            opacity: isBirth ? 0.9 : 0,
            transition: "opacity 700ms ease-out 900ms",
          }}
        />
        <div
          dir="rtl"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            color: "rgba(245,210,138,0.9)",
            fontFamily: "'Cairo',sans-serif",
            opacity: isBirth ? 1 : 0,
            transform: isBirth ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 700ms ease-out 1100ms, transform 700ms ease-out 1100ms",
          }}
        >
          رُؤْيَةُ المَمْلَكَة ٢٠٣٠
        </div>
      </div>

      <style>{`
        @keyframes genesis-core-pulse {
          0%, 100% { filter: brightness(1); }
          50%      { filter: brightness(1.25); }
        }
        @keyframes genesis-char-rise {
          from { opacity: 0; transform: translateY(14px); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0);   }
        }
      `}</style>
    </div>
  );
}

function Wordmark({ text, active }: { text: string; active: boolean }) {
  return (
    <div
      dir="ltr"
      style={{
        unicodeBidi: "isolate",
        direction: "ltr",
        fontSize: 56,
        fontWeight: 800,
        letterSpacing: "0.18em",
        color: "#FFFFFF",
        fontFamily: "'Space Grotesk','DM Sans',sans-serif",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        gap: 2,
      }}
    >
      {[...text].map((ch, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            opacity: active ? 1 : 0,
            animation: active
              ? `genesis-char-rise 520ms cubic-bezier(.2,.8,.2,1) ${i * 60}ms both`
              : undefined,
            textShadow: "0 0 24px rgba(58,232,255,0.55)",
          }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </div>
  );
}

export default GenesisIntro;

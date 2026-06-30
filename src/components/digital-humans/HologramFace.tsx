/**
 * HologramFace — ARIA's living holographic portrait.
 *
 * "Balanced" cinematic preset: pure CSS/SVG, GPU-accelerated transforms,
 * 60fps on mobile. Provides:
 *   • Breathing (idle float + scale)
 *   • Eye blink (procedural)
 *   • Eye tracking (follows pointer within hero)
 *   • Multi-layer aura (state-driven color)
 *   • Particle halo (12 orbiting motes)
 *   • Speaking lip-band reacts to TTS amplitude
 *   • Thinking neural shimmer
 *   • State color map: idle/listening/thinking/speaking/warning(error)/success(completed)
 */
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import ariaHologram from "@/assets/aria-hologram.png.asset.json";
import type { DigitalHumanState } from "@/lib/digital-humans/registry";

interface Props {
  state: DigitalHumanState;
  amp?: number;
  size?: number;
  className?: string;
  ar?: boolean;
}

type Palette = { core: string; glow: string; ring: string };

const PALETTES: Record<string, Palette> = {
  idle:      { core: "#00D4FF", glow: "rgba(0,212,255,0.55)",  ring: "rgba(58,232,255,0.35)" },
  listening: { core: "#3AE8FF", glow: "rgba(58,232,255,0.7)",  ring: "rgba(58,232,255,0.55)" },
  thinking:  { core: "#7C5CFF", glow: "rgba(124,92,255,0.7)",  ring: "rgba(124,92,255,0.5)"  },
  speaking:  { core: "#00E5FF", glow: "rgba(0,229,255,0.85)",  ring: "rgba(0,229,255,0.6)"   },
  warning:   { core: "#F5A524", glow: "rgba(245,165,36,0.75)", ring: "rgba(245,165,36,0.55)" },
  critical:  { core: "#FF4D6D", glow: "rgba(255,77,109,0.8)",  ring: "rgba(255,77,109,0.6)"  },
  success:   { core: "#10E0A0", glow: "rgba(16,224,160,0.75)", ring: "rgba(16,224,160,0.55)" },
};

function paletteFor(state: DigitalHumanState): Palette {
  switch (state) {
    case "listening": return PALETTES.listening;
    case "thinking":
    case "analyzing":
    case "searching":
    case "reading":   return PALETTES.thinking;
    case "speaking":  return PALETTES.speaking;
    case "completed": return PALETTES.success;
    case "error":     return PALETTES.critical;
    default:          return PALETTES.idle;
  }
}

export function HologramFace({ state, amp = 0, size = 72, className, ar }: Props) {
  const speaking = state === "speaking";
  const thinking = state === "thinking" || state === "analyzing" || state === "searching" || state === "reading";
  const listening = state === "listening";
  const intensity = Math.min(1, Math.max(0, amp));
  const pal = paletteFor(state);

  // Eye tracking — track pointer within hosting hero area
  const rootRef = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  useEffect(() => {
    let raf = 0;
    let tx = 0, ty = 0;
    const onMove = (e: PointerEvent) => {
      const el = rootRef.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / Math.max(window.innerWidth / 2, 1);
      const dy = (e.clientY - cy) / Math.max(window.innerHeight / 2, 1);
      tx = Math.max(-1, Math.min(1, dx));
      ty = Math.max(-1, Math.min(1, dy));
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      raf = 0;
      setLook((p) => ({ x: p.x + (tx - p.x) * 0.18, y: p.y + (ty - p.y) * 0.18 }));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // Blink — procedural, every 3.5-6s, ~140ms close
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>; let t2: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const wait = 3500 + Math.random() * 2500;
      t1 = setTimeout(() => {
        setBlink(true);
        t2 = setTimeout(() => { setBlink(false); schedule(); }, 140);
      }, wait);
    };
    schedule();
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const baseGlow = listening ? 22 : speaking ? 24 + intensity * 32 : thinking ? 20 : 14;
  const scale = speaking ? 1 + intensity * 0.03 : 1;
  // micro head offset from look-vector — extremely subtle
  const headTx = look.x * 4;
  const headTy = look.y * 3;

  return (
    <div
      ref={rootRef}
      className={cn("relative shrink-0", className)}
      style={{
        width: size,
        height: size,
        // breathing float — GPU-only transform via CSS var animation
        animation: "aria-breathe 5.5s ease-in-out infinite",
      } as React.CSSProperties}
      aria-label={ar ? "آريا — مساعدة تنفيذية" : "ARIA — Executive AI"}
      role="img"
    >
      {/* outer aura — pulse */}
      <div
        aria-hidden
        className="absolute -inset-[18%] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${pal.glow} 0%, transparent 62%)`,
          filter: `blur(${size * 0.06}px)`,
          opacity: speaking ? 0.55 + intensity * 0.35 : thinking ? 0.55 : listening ? 0.55 : 0.4,
          animation: "aria-aura 4.2s ease-in-out infinite",
        }}
      />

      {/* orbiting ring */}
      <div
        aria-hidden
        className="absolute -inset-[8%] rounded-full pointer-events-none"
        style={{
          border: `1px solid ${pal.ring}`,
          boxShadow: `0 0 ${baseGlow}px ${pal.glow} inset, 0 0 ${baseGlow}px ${pal.glow}`,
          animation: "aria-spin 22s linear infinite",
          maskImage: "conic-gradient(from 0deg, black 0deg, black 220deg, transparent 360deg)",
          WebkitMaskImage: "conic-gradient(from 0deg, black 0deg, black 220deg, transparent 360deg)",
        }}
      />
      {/* counter ring */}
      <div
        aria-hidden
        className="absolute -inset-[14%] rounded-full pointer-events-none"
        style={{
          border: `1px dashed ${pal.ring}`,
          opacity: 0.55,
          animation: "aria-spin-rev 36s linear infinite",
        }}
      />

      {/* particle halo — 12 motes */}
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ animation: "aria-spin 18s linear infinite" }}>
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const r = size * (0.58 + (i % 3) * 0.04);
          const px = 50 + Math.cos(a) * (r / size) * 100;
          const py = 50 + Math.sin(a) * (r / size) * 100;
          const s = 2 + (i % 3);
          return (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${px}%`,
                top: `${py}%`,
                width: s,
                height: s,
                background: pal.core,
                boxShadow: `0 0 ${6 + s}px ${pal.glow}`,
                opacity: 0.7,
                transform: "translate(-50%, -50%)",
                animation: `aria-mote ${3 + (i % 5)}s ease-in-out ${i * 0.13}s infinite`,
              }}
            />
          );
        })}
      </div>

      {/* portrait (clipped circle) */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          transform: `translate3d(${headTx}px, ${headTy}px, 0) scale(${scale})`,
          transition: "transform 220ms cubic-bezier(.22,.61,.36,1)",
          boxShadow: `inset 0 0 ${size * 0.18}px ${pal.glow}`,
        }}
      >
        <img
          src={ariaHologram.url}
          alt={ar ? "آريا" : "ARIA"}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover object-top"
          style={{
            filter: thinking
              ? "brightness(0.98) saturate(1.05) hue-rotate(-6deg)"
              : speaking
                ? `brightness(${1 + intensity * 0.18}) saturate(${1.1 + intensity * 0.25})`
                : "brightness(0.97)",
          }}
        />

        {/* blink overlay — covers the eye band briefly */}
        <div
          aria-hidden
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: `${size * 0.36}px`,
            height: blink ? `${size * 0.08}px` : 0,
            background: "linear-gradient(180deg, rgba(6,26,46,0) 0%, rgba(6,26,46,0.95) 50%, rgba(6,26,46,0) 100%)",
            transition: "height 90ms ease-out",
          }}
        />

        {/* thinking neural shimmer */}
        {thinking && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none mix-blend-screen"
            style={{
              background:
                "repeating-linear-gradient(115deg, transparent 0 8px, rgba(124,92,255,0.18) 8px 9px)",
              animation: "aria-shimmer 2.4s linear infinite",
              opacity: 0.55,
            }}
          />
        )}

        {/* speaking lip-band */}
        {speaking && (
          <div
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
            style={{
              bottom: `${size * 0.18}px`,
              width: `${size * (0.26 + intensity * 0.26)}px`,
              height: `${Math.max(2, size * 0.05 * (0.6 + intensity))}px`,
              background: `linear-gradient(90deg, transparent, ${pal.core}, transparent)`,
              boxShadow: `0 0 ${10 + intensity * 16}px ${pal.glow}`,
              opacity: 0.6 + intensity * 0.4,
              transition: "all 80ms linear",
            }}
          />
        )}

        {/* listening indicator — soft glass ripple at bottom */}
        {listening && (
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: `${size * 0.22}px`,
              background: `radial-gradient(ellipse at 50% 100%, ${pal.glow} 0%, transparent 65%)`,
              animation: "aria-aura 2.4s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* scoped keyframes */}
      <style>{`
        @keyframes aria-breathe { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
        @keyframes aria-aura    { 0%,100% { opacity: .45 } 50% { opacity: .85 } }
        @keyframes aria-spin    { to { transform: rotate(360deg) } }
        @keyframes aria-spin-rev{ to { transform: rotate(-360deg) } }
        @keyframes aria-mote    { 0%,100% { transform: translate(-50%,-50%) scale(1); opacity:.55 } 50% { transform: translate(-50%,-50%) scale(1.6); opacity:1 } }
        @keyframes aria-shimmer { 0% { background-position: 0 0 } 100% { background-position: 80px 0 } }
        @media (prefers-reduced-motion: reduce) {
          :where([role="img"][aria-label*="ARIA"], [role="img"][aria-label*="آريا"]) *,
          :where([role="img"][aria-label*="ARIA"], [role="img"][aria-label*="آريا"]) {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

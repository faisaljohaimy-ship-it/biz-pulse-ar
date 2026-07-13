/**
 * AriaPanel — the console's ARIA executive-assistant column. A living
 * holographic orb (orbiting rings + core), an animated voice waveform, a
 * cycling voice-state label (idle → listening → thinking → speaking) and a
 * mic CTA that jumps to the full ARIA engine. Pure CSS/SVG, reduced-motion
 * safe.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Mic, Sparkles } from "lucide-react";

/** Deterministic waveform bar heights (SSR-stable base heights). */
const BARS = Array.from({ length: 23 }, (_, i) => 28 + Math.abs(Math.sin(i * 0.9)) * 72);

const STATES = [
  { ar: "جاهزة للمساعدة", en: "Ready to assist" },
  { ar: "تستمع…", en: "Listening…" },
  { ar: "تُفكّر…", en: "Thinking…" },
  { ar: "تتحدّث…", en: "Speaking…" },
] as const;

export function AriaPanel({ ar, accent }: { ar: boolean; accent: string }) {
  // Gentle client-only state cycle so ARIA feels alive without any audio.
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setPhase((p) => (p + 1) % STATES.length), 2600);
    return () => window.clearInterval(id);
  }, []);
  const active = phase !== 0;
  const status = STATES[phase];

  return (
    <div className="nx-cmd-surface flex flex-col items-center gap-3 rounded-2xl p-4 text-center">
      <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: accent }}>
        <Sparkles className="nx-icon-soft h-3.5 w-3.5" aria-hidden />
        ARIA
      </div>

      {/* living holographic orb */}
      <div className="relative grid h-28 w-28 place-items-center">
        {/* orbiting dashed rings */}
        <span
          className="nx-orb-ring absolute inset-0 rounded-full border border-dashed"
          style={{ borderColor: `${accent}55` }}
          aria-hidden
        />
        <span
          className="nx-orb-ring-rev absolute inset-2 rounded-full border border-dashed"
          style={{ borderColor: `${accent}33` }}
          aria-hidden
        />
        {/* breathing core */}
        <span
          className="animate-aria-breathe absolute inset-5 rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${accent}66, ${accent}12 60%, transparent 72%)`,
            border: `1px solid ${accent}66`,
          }}
          aria-hidden
        />
        <Sparkles className="relative h-9 w-9" style={{ color: accent }} aria-hidden />
      </div>

      {/* status with live dot */}
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/80">
        <span
          className="h-1.5 w-1.5 rounded-full motion-safe:animate-pulse"
          style={{ background: accent }}
          aria-hidden
        />
        <span aria-live="polite">{ar ? status.ar : status.en}</span>
      </div>

      {/* animated waveform */}
      <div className="flex h-9 items-center justify-center gap-[3px]" aria-hidden>
        {BARS.map((h, i) => (
          <span
            key={i}
            className="nx-wave-bar w-[2px] rounded-full"
            style={{
              height: `${h}%`,
              background: accent,
              opacity: active ? 0.5 + (h / 100) * 0.5 : 0.28 + (h / 100) * 0.35,
              animationDelay: `${(i % 7) * 0.11}s`,
              animationDuration: active ? "0.9s" : "1.6s",
            }}
          />
        ))}
      </div>

      {/* mic CTA */}
      <Link
        to="/aria"
        aria-label={ar ? "تحدّث إلى آريا" : "Talk to ARIA"}
        className="group mt-1 grid h-14 w-14 place-items-center rounded-full border transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2"
        style={{
          borderColor: `${accent}66`,
          background: `${accent}18`,
          boxShadow: `0 0 24px -6px ${accent}`,
        }}
      >
        <Mic
          className="h-6 w-6 transition-transform group-hover:scale-110"
          style={{ color: accent }}
          aria-hidden
        />
      </Link>
      <div className="text-[10px] text-white/50">{ar ? "اضغط للتحدث" : "Press to talk"}</div>
    </div>
  );
}

export default AriaPanel;

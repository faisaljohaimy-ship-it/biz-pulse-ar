/**
 * AriaPanel — the console's right column: the ARIA executive assistant.
 * Stage 1 ships a compact living orb, status, a waveform and a mic CTA that
 * jumps to the full ARIA engine. Stage 4 upgrades this to the full
 * holographic panel with live voice state.
 */
import { Link } from "@tanstack/react-router";
import { Mic, Sparkles } from "lucide-react";

/** Deterministic waveform bar heights (SSR-stable). */
const BARS = Array.from({ length: 21 }, (_, i) => 30 + Math.abs(Math.sin(i * 0.9)) * 70);

export function AriaPanel({ ar, accent }: { ar: boolean; accent: string }) {
  return (
    <div className="nx-cmd-surface flex flex-col items-center gap-3 rounded-2xl p-4 text-center">
      <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: accent }}>
        <Sparkles className="nx-icon-soft h-3.5 w-3.5" aria-hidden />
        ARIA
      </div>

      {/* living orb */}
      <div className="relative grid h-24 w-24 place-items-center">
        <span
          className="animate-aria-breathe absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${accent}55, ${accent}10 60%, transparent 72%)`,
            border: `1px solid ${accent}55`,
          }}
          aria-hidden
        />
        <span
          className="absolute inset-3 rounded-full border"
          style={{ borderColor: `${accent}40` }}
          aria-hidden
        />
        <Sparkles className="relative h-8 w-8" style={{ color: accent }} aria-hidden />
      </div>

      <div className="text-[11px] font-semibold text-white/80">
        {ar ? "جاهزة للمساعدة" : "Ready to assist"}
      </div>

      {/* waveform */}
      <div className="flex h-8 items-center justify-center gap-[3px]" aria-hidden>
        {BARS.map((h, i) => (
          <span
            key={i}
            className="w-[2px] rounded-full"
            style={{
              height: `${h}%`,
              background: accent,
              opacity: 0.35 + (h / 100) * 0.5,
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
        <Mic className="h-6 w-6" style={{ color: accent }} aria-hidden />
      </Link>
      <div className="text-[10px] text-white/50">{ar ? "اضغط للتحدث" : "Press to talk"}</div>
    </div>
  );
}

export default AriaPanel;

/**
 * AriaConsole — the command center's ARIA assistant: a holographic avatar
 * frame, the singleton runtime status + waveform, the capability checklist,
 * and a CTA to the one official ARIA surface. It never simulates a second
 * listening/speaking state.
 */
import { Link } from "@tanstack/react-router";
import { Check, Mic, User } from "lucide-react";
import { CC_ARIA_CAPS } from "../commandCenterData";
import { useAria } from "@/lib/aria-core/hooks/useAria";

const BARS = Array.from({ length: 26 }, (_, i) => 26 + Math.abs(Math.sin(i * 0.9)) * 74);
const STATES = {
  idle: { ar: "جاهزة للمساعدة", en: "Ready to assist" },
  listening: { ar: "تستمع…", en: "Listening…" },
  processing: { ar: "تُفكّر…", en: "Thinking…" },
  speaking: { ar: "تتحدّث…", en: "Speaking…" },
  unavailable: { ar: "الصوت غير متاح", en: "Voice unavailable" },
} as const;

export function AriaConsole({ ar, accent }: { ar: boolean; accent: string }) {
  const { voice } = useAria();
  const active = voice === "listening" || voice === "processing" || voice === "speaking";
  const status = STATES[voice];

  return (
    <section
      className="nx-cmd-surface nx-living-border flex flex-col gap-3 rounded-2xl p-3"
      style={{ ["--acc" as string]: accent }}
      aria-label="ARIA"
    >
      <div className="flex items-start gap-3">
        {/* holographic avatar frame */}
        <div
          className="relative grid h-24 w-20 shrink-0 place-items-end overflow-hidden rounded-xl border"
          style={{
            borderColor: `${accent}55`,
            background: `linear-gradient(180deg, ${accent}22, transparent)`,
          }}
        >
          <span
            className="nx-orb-ring absolute -top-6 right-1/2 h-16 w-16 translate-x-1/2 rounded-full border border-dashed"
            style={{ borderColor: `${accent}44` }}
            aria-hidden
          />
          <User className="relative mb-1 h-16 w-16" style={{ color: `${accent}cc` }} aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-lg font-black tracking-wide" style={{ color: accent }}>
            ARIA
          </div>
          <div className="text-[10px] text-white/55">
            {ar ? "مساعدك الذكي التنفيذي" : "Your executive AI assistant"}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-white/80">
            <span
              className="h-1.5 w-1.5 rounded-full motion-safe:animate-pulse"
              style={{ background: accent }}
              aria-hidden
            />
            <span aria-live="polite">{ar ? status.ar : status.en}</span>
          </div>
          {/* waveform */}
          <div className="mt-1 flex h-6 items-center gap-[2px]" aria-hidden>
            {BARS.map((h, i) => (
              <span
                key={i}
                className="nx-wave-bar w-[2px] rounded-full"
                style={{
                  height: `${h}%`,
                  background: accent,
                  opacity: active ? 0.5 + (h / 100) * 0.5 : 0.3,
                  animationDelay: `${(i % 7) * 0.1}s`,
                  animationDuration: active ? "0.9s" : "1.6s",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* capability checklist */}
      <ul className="grid gap-1.5">
        {CC_ARIA_CAPS.map((c) => (
          <li
            key={c.en}
            className="flex items-center justify-between rounded-lg border border-white/8 bg-black/20 px-2 py-1 text-[10px] text-white/75"
          >
            <span>{ar ? c.ar : c.en}</span>
            <Check className="h-3 w-3" style={{ color: accent }} aria-hidden />
          </li>
        ))}
      </ul>

      {/* mic CTA */}
      <Link
        to="/aria"
        aria-label={ar ? "تحدّث إلى آريا" : "Talk to ARIA"}
        className="group mx-auto grid h-12 w-12 place-items-center rounded-full border transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2"
        style={{
          borderColor: `${accent}66`,
          background: `${accent}18`,
          boxShadow: `0 0 22px -6px ${accent}`,
        }}
      >
        <Mic
          className="h-5 w-5 transition-transform group-hover:scale-110"
          style={{ color: accent }}
          aria-hidden
        />
      </Link>
      <div className="text-center text-[9px] text-white/50">
        {ar ? "اضغط للتحدث" : "Press to talk"}
      </div>
    </section>
  );
}

export default AriaConsole;

/**
 * Tiny corner chip that shows the LIVE voice engine speaking. Only
 * mounts when VOICE_DEBUG=true (VITE_VOICE_DEBUG or localStorage
 * aria-voice-debug=1). Colors:
 *   EL  emerald — ElevenLabs (Layan gVzwmdZ…)
 *   BR  amber   — browser SpeechSynthesis fallback
 *   GRT cyan    — static greeting file
 * Amber PULSE means the last ElevenLabs call FAILED (with status/reason
 * in the tooltip). Ends the guessing about which engine is on.
 */
import { useEffect, useState } from "react";
import { AriaVoiceDebug, type VoiceEvent } from "@/lib/aria/voice-debug";
import { cn } from "@/lib/utils";

const LABELS: Record<VoiceEvent["source"], string> = {
  gemini: "GEM",
  elevenlabs: "EL",
  browser: "BR",
  greeting: "GRT",
};

export function AriaVoiceDebugBadge() {
  const [enabled] = useState(() => AriaVoiceDebug.isDebugOn());
  const [evt, setEvt] = useState<VoiceEvent | null>(null);
  useEffect(() => {
    if (!enabled) return;
    return AriaVoiceDebug.subscribe(setEvt);
  }, [enabled]);
  if (!enabled || !evt) return null;
  const color =
    evt.source === "elevenlabs"
      ? "bg-emerald-500/25 text-emerald-100 ring-emerald-400/60"
      : evt.source === "browser"
        ? "bg-amber-500/25 text-amber-100 ring-amber-400/60"
        : "bg-cyan-500/25 text-cyan-100 ring-cyan-400/60";
  return (
    <div
      className={cn(
        "pointer-events-none absolute end-2 top-2 z-30 select-none rounded-full px-2 py-0.5",
        "text-[10px] font-bold tracking-wider backdrop-blur-md ring-1",
        color,
        evt.failed && "animate-pulse",
      )}
      title={`${evt.source} · ${evt.reason}${evt.status ? ` · ${evt.status}` : ""}`}
      aria-hidden
    >
      {LABELS[evt.source]}
    </div>
  );
}

export default AriaVoiceDebugBadge;

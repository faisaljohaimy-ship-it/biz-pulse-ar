import { useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  startHomeGreeting,
  stopHomeGreeting,
  useHomeGreetingState,
} from "@/lib/home-greeting-store";

/**
 * Homepage ARIA greeting button.
 * Nothing plays on page entry — the backdrop stays frozen. On press, ARIA
 * greets: her voice and the backdrop motion start together (the voice is
 * the video's own audio track). Both stop the moment she finishes
 * speaking. Pressing again while she speaks stops her immediately.
 */
export function AriaResumeVoiceButton() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const speaking = useHomeGreetingState() === "speaking";

  const handleClick = useCallback(() => {
    if (speaking) stopHomeGreeting();
    else startHomeGreeting();
  }, [speaking]);

  const label = speaking ? (ar ? "إيقاف آريا" : "Stop ARIA") : ar ? "ترحيب آريا" : "ARIA greeting";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={speaking}
      aria-label={label}
      data-aria-no-intro
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#00D4FF]/35 bg-[#00D4FF]/[0.05] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85 transition hover:border-[#3AE8FF]/60 hover:bg-[#3AE8FF]/10"
    >
      {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </button>
  );
}

export default AriaResumeVoiceButton;

import { useCallback, useRef, useState } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAriaStore } from "@/lib/aria-core/state/aria-store";

/**
 * Homepage "Resume ARIA voice" button.
 * On click: enables voice in the ARIA store and plays a short bilingual
 * greeting via the public TTS endpoint (no auth required).
 * A second click stops playback and mutes again.
 */
export function AriaResumeVoiceButton() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const voiceEnabled = useAriaStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useAriaStore((s) => s.setVoiceEnabled);
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {
        /* noop */
      }
    }
    audioRef.current = null;
  }, []);

  const handleClick = useCallback(async () => {
    if (voiceEnabled) {
      stop();
      setVoiceEnabled(false);
      return;
    }
    setVoiceEnabled(true);
    setBusy(true);
    try {
      const text = ar
        ? "مرحباً، أنا آريا. صوتي عاد للعمل الآن."
        : "Hi, I'm ARIA. My voice is back online.";
      const r = await fetch("/api/public/aria-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* noop */
        }
        audioRef.current = null;
      };
      await audio.play().catch(() => undefined);
    } catch (e) {
      console.error("[AriaResumeVoiceButton]", e);
    } finally {
      setBusy(false);
    }
  }, [ar, voiceEnabled, setVoiceEnabled, stop]);

  const label = voiceEnabled
    ? ar
      ? "كتم صوت آريا"
      : "Mute ARIA"
    : ar
      ? "استئناف كلام آريا"
      : "Resume ARIA voice";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={voiceEnabled}
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/35 bg-[#00D4FF]/[0.05] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85 transition hover:border-[#3AE8FF]/60 hover:bg-[#3AE8FF]/10 disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : voiceEnabled ? (
        <VolumeX className="h-3.5 w-3.5" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
      <span>{label}</span>
    </button>
  );
}

export default AriaResumeVoiceButton;

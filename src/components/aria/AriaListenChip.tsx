/**
 * AriaListenChip — bilingual on-demand ARIA voice trigger for the homepage.
 *
 * Mobile-safe by construction:
 *   • The <audio> is created and .play() is called SYNCHRONOUSLY inside the
 *     click handler (no await before play). iOS Safari and Android Chrome
 *     require that so the browser sees the user-activation and allows sound.
 *   • Uses the pre-generated static /aria-greeting-voice.mp3 (same asset
 *     the ARIA panel greeting uses) so there is no network round-trip
 *     between the tap and playback start.
 *   • Routes through AriaAudioBus so it cannot overlap chat TTS.
 */
import { useEffect, useRef, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { AriaAudioBus } from "@/lib/aria/audio-bus";

interface Props {
  ar: boolean;
}

export function AriaListenChip({ ar }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) {
        try {
          a.pause();
        } catch {
          /* ignore */
        }
      }
      AriaAudioBus.release("panel-greeting");
    };
  }, []);

  const stop = () => {
    const a = audioRef.current;
    if (a) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    audioRef.current = null;
    AriaAudioBus.notifyStopped("panel-greeting");
    AriaAudioBus.release("panel-greeting");
    setPlaying(false);
  };

  const onClick = () => {
    if (playing) {
      stop();
      return;
    }
    // MUST stay synchronous: unlock bus + create Audio + call play() before
    // any await. iOS/Android tie the sound permission to this exact tick.
    AriaAudioBus.unlock();
    const granted = AriaAudioBus.acquire("panel-greeting", () => stop());
    if (!granted) return;

    const audio = new Audio("/aria-greeting-voice.mp3");
    audio.preload = "auto";
    audio.playsInline = true;
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    setPlaying(true);

    audio.onplaying = () => AriaAudioBus.notifyPlaying("panel-greeting", audio);
    audio.onended = () => {
      AriaAudioBus.notifyStopped("panel-greeting");
      AriaAudioBus.release("panel-greeting");
      audioRef.current = null;
      setPlaying(false);
    };
    audio.onerror = () => {
      console.warn("[aria-listen-chip] audio error");
      AriaAudioBus.release("panel-greeting");
      audioRef.current = null;
      setPlaying(false);
    };

    // Fire-and-forget: browsers accept .play() called synchronously here.
    audio.play().catch((err) => {
      console.warn("[aria-listen-chip] play blocked", err);
      AriaAudioBus.release("panel-greeting");
      audioRef.current = null;
      setPlaying(false);
    });
  };

  const label = playing
    ? ar
      ? "إيقاف الصوت"
      : "Stop voice"
    : ar
      ? "استمع لتعريف ARIA"
      : "Listen to ARIA";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={playing}
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/45 bg-[#00D4FF]/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 transition hover:border-[#3AE8FF]/70 hover:bg-[#3AE8FF]/15 active:scale-[0.98]"
    >
      {playing ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </button>
  );
}

export default AriaListenChip;

import { useCallback, useEffect, useRef, useState } from "react";
import { FinnAudioBus } from "@/lib/finn/audio-bus";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { VoiceTimeline } from "@/lib/finn/voice-timeline";

const MUTE_KEY = "aria-voice-muted";

/**
 * useFinnSpeech — routes FINN voice through the global FinnAudioBus
 * (zero overlap guarantee) on the "chat-tts" channel.
 *
 * authenticated → ElevenLabs via /api/finn/tts (MP3 blob).
 * anonymous / failure → SILENCE. There is no fallback voice of any kind:
 * FINN speaks with her one canonical voice or not at all.
 */
export function useFinnSpeech() {
  const [muted, setMutedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const setMuted = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setMutedState((prev) => {
      const next = typeof v === "function" ? (v as (p: boolean) => boolean)(prev) : v;
      try {
        window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      try {
        a.pause();
      } catch {
        /* ignore */
      }
      const src = a.src;
      try {
        a.src = "";
      } catch {
        /* ignore */
      }
      if (src && src.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(src);
        } catch {
          /* ignore */
        }
      }
      audioRef.current = null;
    }
    FinnAudioBus.release("chat-tts");
    setSpeaking(false);
  }, []);

  useEffect(() => {
    if (muted) stop();
  }, [muted, stop]);

  const playBlob = useCallback(async (blob: Blob, t0: number) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    const finish = () => {
      if (audioRef.current === audio) audioRef.current = null;
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
      FinnAudioBus.notifyStopped("chat-tts");
      FinnAudioBus.release("chat-tts");
      setSpeaking(false);
    };
    audio.onended = finish;
    audio.onpause = () => {
      FinnAudioBus.notifyStopped("chat-tts");
    };
    audio.onerror = () => {
      console.warn("[aria-voice] audio playback error");
      finish();
    };
    audio.onplaying = () => {
      console.log(`[aria-voice] t=${Math.round(performance.now() - t0)}ms (elevenlabs)`);
      FinnAudioBus.notifyPlaying("chat-tts", audio);
    };

    await audio.play();
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const clean = (text ?? "").toString().trim();
      VoiceTimeline.push("VOICE", "useFinnSpeech.speak", {
        chars: clean.length,
        muted: mutedRef.current,
        stack: new Error().stack?.split("\n").slice(2, 5).join(" | "),
      });
      if (!clean || mutedRef.current) return;
      FinnAudioBus.unlock();

      const granted = FinnAudioBus.acquire("chat-tts", stop);
      if (!granted) {
        VoiceTimeline.push("VOICE", "acquire not granted");
        return;
      }

      setSpeaking(true);
      const t0 = performance.now();

      VoiceTimeline.push("TTS_REQ", "useFinnSpeech → /api/finn/tts", { chars: clean.length });
      try {
        const res = await authenticatedFetch("/api/finn/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: clean }),
        });
        VoiceTimeline.push("TTS_RES", `useFinnSpeech ${res.status}`, {
          status: res.status,
          ct: res.headers.get("content-type"),
        });
        if (!res.ok) throw new Error(`tts_status_${res.status}`);
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("audio/")) throw new Error("tts_not_audio");
        const blob = await res.blob();
        if (mutedRef.current) {
          FinnAudioBus.release("chat-tts");
          setSpeaking(false);
          return;
        }
        await playBlob(blob, t0);
      } catch (err) {
        // Silence over any substitute voice — per the FINN voice policy.
        VoiceTimeline.push("FALLBACK", "chat-tts silent (no elevenlabs)", {
          err: (err as Error).message,
        });
        console.warn(
          "[aria-voice] elevenlabs unavailable — reply stays silent:",
          (err as Error).message,
        );
        FinnAudioBus.release("chat-tts");
        setSpeaking(false);
      }
    },
    [stop, playBlob],
  );

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
      FinnAudioBus.release("chat-tts");
    };
  }, []);

  return { speak, stop, muted, setMuted, speaking };
}

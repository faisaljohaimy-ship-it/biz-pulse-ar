import { useCallback, useEffect, useRef, useState } from "react";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { VoiceTimeline } from "@/lib/aria/voice-timeline";

const MUTE_KEY = "aria-voice-muted";

/**
 * useAriaSpeech — routes ARIA voice through the global AriaAudioBus
 * (zero overlap guarantee) on the "chat-tts" channel.
 *
 * authenticated → ElevenLabs via /api/aria/tts (MP3 blob).
 * anonymous / failure → SILENCE. There is no fallback voice of any kind:
 * ARIA speaks with her one canonical voice or not at all.
 */
export function useAriaSpeech() {
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
    AriaAudioBus.release("chat-tts");
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
      AriaAudioBus.notifyStopped("chat-tts");
      AriaAudioBus.release("chat-tts");
      setSpeaking(false);
    };
    audio.onended = finish;
    audio.onpause = () => {
      AriaAudioBus.notifyStopped("chat-tts");
    };
    audio.onerror = () => {
      console.warn("[aria-voice] audio playback error");
      finish();
    };
    audio.onplaying = () => {
      console.log(`[aria-voice] t=${Math.round(performance.now() - t0)}ms (elevenlabs)`);
      AriaAudioBus.notifyPlaying("chat-tts", audio);
    };

    await audio.play();
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const clean = (text ?? "").toString().trim();
      VoiceTimeline.push("VOICE", "useAriaSpeech.speak", {
        chars: clean.length,
        muted: mutedRef.current,
        stack: new Error().stack?.split("\n").slice(2, 5).join(" | "),
      });
      if (!clean || mutedRef.current) return;
      AriaAudioBus.unlock();

      const granted = AriaAudioBus.acquire("chat-tts", stop);
      if (!granted) {
        VoiceTimeline.push("VOICE", "acquire not granted");
        return;
      }

      setSpeaking(true);
      const t0 = performance.now();

      VoiceTimeline.push("TTS_REQ", "useAriaSpeech → /api/aria/tts", { chars: clean.length });
      try {
        const res = await authenticatedFetch("/api/aria/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: clean }),
        });
        VoiceTimeline.push("TTS_RES", `useAriaSpeech ${res.status}`, {
          status: res.status,
          ct: res.headers.get("content-type"),
        });
        if (!res.ok) throw new Error(`tts_status_${res.status}`);
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("audio/")) throw new Error("tts_not_audio");
        const blob = await res.blob();
        if (mutedRef.current) {
          AriaAudioBus.release("chat-tts");
          setSpeaking(false);
          return;
        }
        await playBlob(blob, t0);
      } catch (err) {
        // Silence over any substitute voice — per the ARIA voice policy.
        VoiceTimeline.push("FALLBACK", "chat-tts silent (no elevenlabs)", {
          err: (err as Error).message,
        });
        console.warn(
          "[aria-voice] elevenlabs unavailable — reply stays silent:",
          (err as Error).message,
        );
        AriaAudioBus.release("chat-tts");
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
      AriaAudioBus.release("chat-tts");
    };
  }, []);

  return { speak, stop, muted, setMuted, speaking };
}

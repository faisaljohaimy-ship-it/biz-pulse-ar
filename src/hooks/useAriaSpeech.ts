import { useCallback, useEffect, useRef, useState } from "react";

const MUTE_KEY = "aria-voice-muted";

/**
 * useAriaSpeech — plays every assistant reply aloud.
 *
 * Primary: streams MP3 from /api/aria/tts (ElevenLabs, Arabic-capable).
 * Fallback: browser `speechSynthesis` (ar-SA) so voice NEVER breaks the chat.
 *
 * Barge-in: any new `speak()` cancels the current utterance. Callers MUST
 * invoke `stop()` on panel close and on component unmount.
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
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
    setSpeaking(false);
  }, []);

  // Auto-mute the moment the user flips the toggle mid-speech.
  useEffect(() => {
    if (muted) stop();
  }, [muted, stop]);

  const speakFallback = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSpeaking(false);
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ar-SA";
      u.rate = 0.95;
      const voices = window.speechSynthesis.getVoices();
      const arVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("ar"));
      if (arVoice) u.voice = arVoice;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    } catch {
      setSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const clean = (text ?? "").toString().trim();
      if (!clean || mutedRef.current) return;
      stop(); // barge-in
      setSpeaking(true);
      try {
        const res = await fetch("/api/aria/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: clean.slice(0, 600) }),
        });
        if (!res.ok) throw new Error(`tts_${res.status}`);
        const blob = await res.blob();
        if (mutedRef.current) return; // toggled off while fetching
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
          setSpeaking(false);
        };
        audio.onended = finish;
        audio.onerror = finish;
        await audio.play();
      } catch {
        // Graceful fallback: browser TTS keeps voice working even without ElevenLabs.
        speakFallback(clean);
      }
    },
    [stop, speakFallback],
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
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return { speak, stop, muted, setMuted, speaking };
}

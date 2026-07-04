import { useCallback, useEffect, useRef, useState } from "react";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { authenticatedFetch } from "@/lib/auth-fetch";


const MUTE_KEY = "aria-voice-muted";
const TTS_TIMEOUT_MS = 10_000;

type Source = "chat-tts" | "panel-greeting";

/**
 * useAriaSpeech — every assistant reply spoken aloud, through the
 * ARIA global audio arbiter (zero overlap guarantee).
 *
 * Primary: /api/aria/tts (ElevenLabs, Arabic-capable).
 * Fallback: browser `speechSynthesis` (ar-SA).
 * Both paths acquire/release the same bus channel.
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
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const setMuted = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setMutedState((prev) => {
      const next = typeof v === "function" ? (v as (p: boolean) => boolean)(prev) : v;
      try { window.localStorage.setItem(MUTE_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const hardStop = useCallback((source: Source) => {
    const a = audioRef.current;
    if (a) {
      try { a.pause(); } catch { /* ignore */ }
      const src = a.src;
      try { a.src = ""; } catch { /* ignore */ }
      if (src && src.startsWith("blob:")) {
        try { URL.revokeObjectURL(src); } catch { /* ignore */ }
      }
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }
    AriaAudioBus.release(source);
    setSpeaking(false);
  }, []);

  const stop = useCallback(() => {
    hardStop("chat-tts");
    hardStop("panel-greeting");
  }, [hardStop]);

  useEffect(() => { if (muted) stop(); }, [muted, stop]);

  const speakFallback = useCallback((text: string, source: Source) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      AriaAudioBus.release(source);
      setSpeaking(false);
      return;
    }
    const t0 = performance.now();
    const trySpeak = () => {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "ar-SA";
        u.rate = 1.15;
        const voices = window.speechSynthesis.getVoices();
        const arVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("ar"));
        if (arVoice) u.voice = arVoice;
        const cleanup = () => {
          AriaAudioBus.release(source);
          setSpeaking(false);
        };
        u.onend = cleanup;
        u.onerror = () => { console.warn("[aria-voice] browser speech error"); cleanup(); };
        setSpeaking(true);
        u.onstart = () => { console.log(`[aria-voice] t=${Math.round(performance.now() - t0)}ms (fallback)`); };
        window.speechSynthesis.speak(u);
      } catch (err) {
        console.warn("[aria-voice] browser speech threw", err);
        AriaAudioBus.release(source);
        setSpeaking(false);
      }
    };
    // iOS voices race: retry once on voiceschanged if list is empty
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      const onChanged = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", onChanged);
        trySpeak();
      };
      window.speechSynthesis.addEventListener("voiceschanged", onChanged, { once: true });
      // Also try immediately as a race guard
      setTimeout(trySpeak, 250);
    } else {
      trySpeak();
    }
  }, []);

  const speak = useCallback(
    async (text: string, source: Source = "chat-tts") => {
      const clean = (text ?? "").toString().trim();
      if (!clean || mutedRef.current) return;
      AriaAudioBus.unlock();

      // Acquire channel — bus stops whatever's playing (incl. an in-flight
      // greeting). chat-tts (priority 3) interrupts panel-greeting (2).
      const granted = AriaAudioBus.acquire(source, () => hardStop(source));
      if (!granted) return;

      if (source === "chat-tts") {
        // eslint-disable-next-line no-console
        console.log(`[aria-voice] speaking reply, ${clean.length} chars`);
      }

      setSpeaking(true);

      const t0 = performance.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

      try {
        const res = await authenticatedFetch("/api/aria/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: clean.slice(0, 600) }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        // 403 = anonymous (Option A): silently fall back to browser voice.
        if (res.status === 403) { speakFallback(clean, source); return; }
        if (!res.ok) throw new Error(`tts_${res.status}`);

        const blob = await res.blob();
        if (mutedRef.current) { AriaAudioBus.release(source); setSpeaking(false); return; }
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        const finish = () => {
          if (audioRef.current === audio) audioRef.current = null;
          try { URL.revokeObjectURL(url); } catch { /* ignore */ }
          AriaAudioBus.release(source);
          setSpeaking(false);
        };
        audio.onended = finish;
        audio.onerror = () => { console.warn("[aria-voice] audio playback error"); finish(); };
        audio.onplaying = () => { console.log(`[aria-voice] t=${Math.round(performance.now() - t0)}ms (elevenlabs)`); };
        await audio.play();
      } catch (err) {
        clearTimeout(timeout);
        console.warn("[aria-voice] elevenlabs failed, falling back:", err);
        if (mutedRef.current) { AriaAudioBus.release(source); setSpeaking(false); return; }
        speakFallback(clean, source);
      }
    },
    [hardStop, speakFallback],
  );

  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) { try { a.pause(); } catch { /* ignore */ } }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
      }
      AriaAudioBus.release("chat-tts");
      AriaAudioBus.release("panel-greeting");
    };
  }, []);

  return { speak, stop, muted, setMuted, speaking };
}

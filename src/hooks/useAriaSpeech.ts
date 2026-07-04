import { useCallback, useEffect, useRef, useState } from "react";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { ariaState } from "@/lib/aria/aria-state";


const MUTE_KEY = "aria-voice-muted";


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

      // Zero-budget policy:
      //  - chat replies (chat-tts): browser voice for everyone. No live TTS.
      //  - panel-greeting: try static /aria-greeting-voice.mp3 (pre-generated,
      //    ElevenLabs quality, no per-visitor cost); if missing → browser.
      if (source === "chat-tts") {
        speakFallback(clean, source);
        return;
      }

      try {
        const head = await fetch("/aria-greeting-voice.mp3", { method: "HEAD" });
        if (!head.ok) throw new Error("no_static_greeting");
        if (mutedRef.current) { AriaAudioBus.release(source); setSpeaking(false); return; }
        const audio = new Audio("/aria-greeting-voice.mp3");
        audioRef.current = audio;
        const finish = () => {
          if (audioRef.current === audio) audioRef.current = null;
          AriaAudioBus.release(source);
          setSpeaking(false);
        };
        audio.onended = finish;
        audio.onerror = () => { console.warn("[aria-voice] static greeting playback error"); finish(); };
        audio.onplaying = () => { console.log(`[aria-voice] t=${Math.round(performance.now() - t0)}ms (static)`); };
        await audio.play();
      } catch {
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

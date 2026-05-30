import { useCallback, useEffect, useRef, useState } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";

/**
 * useAriaVoice — production voice I/O for the ARIA copilot.
 *  - speech-to-text via ElevenLabs realtime Scribe (Arabic + English auto-detect)
 *  - push-to-talk or hands-free
 *  - text-to-speech via /api/tts (ElevenLabs multilingual v2)
 *  - barge-in / interruption: starting STT stops any active TTS playback
 */

type Opts = {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
};

const ARABIC_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // multilingual male, deep
const ENGLISH_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Bella, multilingual

function isArabic(t: string) {
  return /[\u0600-\u06FF]/.test(t);
}

export function useAriaVoice({ onPartial, onFinal }: Opts = {}) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [partial, setPartial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastFinalRef = useRef("");

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (d: { text: string }) => {
      setPartial(d.text);
      onPartial?.(d.text);
    },
    onCommittedTranscript: (d: { text: string }) => {
      const txt = d.text.trim();
      if (!txt || txt === lastFinalRef.current) return;
      lastFinalRef.current = txt;
      setPartial("");
      onFinal?.(txt);
    },
  });

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      stopSpeaking(); // barge-in
      const res = await fetch("/api/voice-token", { method: "POST" });
      if (!res.ok) throw new Error(`token ${res.status}`);
      const { token, kind } = (await res.json()) as { token: string; kind: string };
      if (kind !== "scribe") throw new Error("expected scribe token");
      await scribe.connect({
        token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      } as Parameters<typeof scribe.connect>[0]);
      setListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "mic failed");
      setListening(false);
    }
  }, [scribe, stopSpeaking]);

  const stopListening = useCallback(async () => {
    try {
      await scribe.disconnect();
    } catch {
      /* noop */
    }
    setListening(false);
    setPartial("");
  }, [scribe]);

  const speak = useCallback(async (text: string) => {
    const clean = text.replace(/```[\s\S]*?```/g, "").replace(/[*_#`>]/g, "").trim();
    if (!clean) return;
    stopSpeaking();
    try {
      setSpeaking(true);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: clean.slice(0, 1800),
          voiceId: isArabic(clean) ? ARABIC_VOICE_ID : ENGLISH_VOICE_ID,
          stability: 0.55,
          similarityBoost: 0.85,
          style: 0.35,
        }),
      });
      if (!res.ok) throw new Error(`tts ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (e) {
      setError(e instanceof Error ? e.message : "tts failed");
      setSpeaking(false);
    }
  }, [stopSpeaking]);

  useEffect(() => () => {
    stopSpeaking();
    scribe.disconnect().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    listening,
    speaking,
    partial,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleListening: () => (listening ? stopListening() : startListening()),
  };
}

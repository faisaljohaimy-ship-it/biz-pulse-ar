/**
 * useSpeechRecognition — thin React hook over Web Speech API
 * (webkitSpeechRecognition / SpeechRecognition). Additive: caller
 * chooses when to start/stop. Silently reports unsupported on
 * browsers without the API (Firefox, iOS webviews).
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionCtor = new () => Recognition;

interface SpeechRecognitionAlt {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlt;
  isFinal: boolean;
  length: number;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechRecognitionOptions {
  lang: string; // "ar-SA" | "en-US"
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
}

export interface SpeechRecognitionHandle {
  supported: boolean;
  listening: boolean;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition(
  opts: UseSpeechRecognitionOptions,
): SpeechRecognitionHandle {
  const [supported] = useState(() => getCtor() !== null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(
    () => () => {
      try { recRef.current?.abort(); } catch { /* ignore */ }
      recRef.current = null;
    },
    [],
  );

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    try { recRef.current?.abort(); } catch { /* ignore */ }
    const r = new Ctor();
    r.lang = optsRef.current.lang;
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = res[0].transcript;
        if (res.isFinal) final += txt;
        else interim += txt;
      }
      if (interim) optsRef.current.onInterim?.(interim);
      if (final) optsRef.current.onFinal?.(final.trim());
    };
    r.onerror = () => setListening(false);
    r.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    recRef.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
      recRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  return { supported, listening, start, stop };
}

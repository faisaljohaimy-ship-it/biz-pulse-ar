/**
 * AriaTalkFab — site-wide floating "Talk to ARIA" button.
 *
 * Behaviour:
 *   TAP 1  → unlock audio, stop any ongoing speech (barge-in),
 *            open SpeechRecognition (ar-SA, interim). Button pulses
 *            emerald with "تستمع…".
 *   TAP 2  → stop listening, auto-send the final transcript through
 *   or 2.5s silence   the singleton chat pipeline; the panel opens
 *                     so the reply is visible.
 *   Reply  → spoken via useAriaSpeech; ariaState → "speaking"; the
 *            global backdrop video reacts (see AriaReactiveFigure).
 *
 * No SpeechRecognition support → opens the panel and focuses the
 * composer instead. Tooltip explains. Never a dead button.
 *
 * A11y: aria-label «تحدث مع آريا», visible focus ring, respects mute
 * toggle (via useAriaStore.voiceEnabled — the speaking pipeline
 * already honours it).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { useAriaChat } from "@/lib/aria-core/provider";
import { useAriaStore } from "@/lib/aria-core/store";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { ariaState } from "@/lib/aria/aria-state";
import { cn } from "@/lib/utils";

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<
          ArrayLike<{ transcript: string; isFinal?: boolean }> & {
            isFinal?: boolean;
          }
        >;
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSRCtor(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SR;
    webkitSpeechRecognition?: new () => SR;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function primeIOSAudio(): void {
  if (typeof window === "undefined") return;
  try {
    AriaAudioBus.unlock();
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance("");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    const AC: typeof AudioContext | undefined =
      (window as unknown as { AudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AC) {
      const g = window as unknown as { __ariaUnlockCtx?: AudioContext };
      if (!g.__ariaUnlockCtx) g.__ariaUnlockCtx = new AC();
      if (g.__ariaUnlockCtx.state === "suspended") void g.__ariaUnlockCtx.resume();
    }
  } catch {
    /* ignore */
  }
}

export function AriaTalkFab() {
  const { chat, composerRef } = useAriaChat();
  const setMode = useAriaStore((s) => s.setMode);
  const mode = useAriaStore((s) => s.mode);

  const sttSupported = useMemo(() => getSRCtor() !== null, []);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR | null>(null);
  const finalRef = useRef<string>("");
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopListening = useCallback(() => {
    const r = recRef.current;
    if (r) {
      try {
        r.stop();
      } catch {
        /* ignore */
      }
    }
    if (silenceRef.current) {
      clearTimeout(silenceRef.current);
      silenceRef.current = null;
    }
    setListening(false);
  }, []);

  const send = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      if (mode === "collapsed") setMode("docked");
      void chat.sendMessage({ text: t });
    },
    [chat, mode, setMode],
  );

  const startListening = useCallback(() => {
    primeIOSAudio();
    // Barge-in: silence anything currently playing before we open the mic.
    AriaAudioBus.stopAll();
    const Ctor = getSRCtor();
    if (!Ctor) {
      // Fallback: open the panel + focus composer so the user can type.
      setMode("docked");
      requestAnimationFrame(() => composerRef.current?.focus());
      return;
    }
    ariaState.set("listening");
    try {
      const r = new Ctor();
      r.lang = "ar-SA";
      r.interimResults = true;
      r.continuous = false;
      finalRef.current = "";
      const armSilence = () => {
        if (silenceRef.current) clearTimeout(silenceRef.current);
        silenceRef.current = setTimeout(() => {
          try {
            r.stop();
          } catch {
            /* ignore */
          }
        }, 2500);
      };
      r.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i] as ArrayLike<{ transcript: string }> & {
            isFinal?: boolean;
          };
          const t = res[0]?.transcript ?? "";
          if (res.isFinal) finalRef.current += t;
          else interim += t;
        }
        armSilence();
      };
      r.onerror = () => {
        stopListening();
      };
      r.onend = () => {
        if (silenceRef.current) {
          clearTimeout(silenceRef.current);
          silenceRef.current = null;
        }
        setListening(false);
        recRef.current = null;
        const finalText = finalRef.current.trim();
        if (finalText) send(finalText);
        else if (ariaState.get() === "listening") ariaState.set("idle");
      };
      recRef.current = r;
      setListening(true);
      r.start();
      armSilence();
    } catch {
      setListening(false);
      ariaState.set("idle");
    }
  }, [composerRef, send, setMode, stopListening]);

  const onClick = useCallback(() => {
    if (listening) {
      stopListening();
      return;
    }
    startListening();
  }, [listening, startListening, stopListening]);

  useEffect(() => () => stopListening(), [stopListening]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="تحدث مع آريا"
      aria-pressed={listening}
      title={
        sttSupported ? "تحدث مع آريا" : "الإدخال الصوتي غير مدعوم في هذا المتصفح"
      }
      className={cn(
        "fixed end-5 z-50 grid h-16 w-16 place-items-center rounded-full",
        "border border-emerald-400/60 bg-[#04070F]/85 text-emerald-200",
        "shadow-[0_10px_40px_-10px_rgba(16,185,129,0.6)] backdrop-blur-xl",
        "transition-transform hover:scale-105 focus:outline-none",
        "focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-background",
        listening &&
          "animate-pulse bg-emerald-500/25 text-emerald-100 ring-2 ring-emerald-300/80",
      )}
      style={{
        bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* ARIA face thumbnail + mic overlay */}
      <span className="relative grid h-full w-full place-items-center rounded-full overflow-hidden">
        <img
          src="/aria-backdrop.webp"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full select-none opacity-70"
          style={{ objectFit: "cover", objectPosition: "center top" }}
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(4,7,15,0.15), rgba(4,7,15,0.75))",
          }}
        />
        <Mic className="relative h-6 w-6 drop-shadow" aria-hidden />
      </span>
      <span className="sr-only">
        {listening ? "تستمع…" : "تحدث مع آريا"}
      </span>
    </button>
  );
}

export default AriaTalkFab;

// Executive Demo — Speech Director
// -----------------------------------------------------------------------------
// Phase 4.2 · Executive Cinematic Experience
//
// Synchronises ARIA's spoken narration with the current Demo Timeline step.
// Reuses the existing public TTS endpoint (`/api/public/aria-tts`) — no new
// server code, no new auth surface. Falls back to a silent "speaking"
// animation when TTS is unavailable so the presenter never looks frozen.
//
// Contract:
//   const { state, amp } = useSpeechDirector();
//   → `state` is a DigitalHumanState suitable for HologramFace.
//   → `amp` is a 0..1 mouth amplitude driven by real audio, or a synthetic
//     pseudo-envelope in fallback mode.

import * as React from "react";
import { useDemoMode } from "./demo-controller";
import type { DigitalHumanState } from "@/lib/digital-humans/registry";
import { useI18n } from "@/lib/i18n";
import { soundDirector } from "./sound-director";

const WELCOME_EN =
  "Welcome, Executive Team. Today I will guide you through a complete operational day using our live Executive Intelligence Platform.";
const WELCOME_AR =
  "أهلًا بكم في الفريق التنفيذي. سأصطحبكم اليوم عبر يوم تشغيلي كامل باستخدام منصة الذكاء التنفيذي الحية.";

interface SpeechState {
  state: DigitalHumanState;
  amp: number;
  currentText: string;
}

export function useSpeechDirector(): SpeechState {
  const demo = useDemoMode();
  const { locale } = useI18n();
  const ar = locale === "ar";

  const [state, setState] = React.useState<DigitalHumanState>("idle");
  const [amp, setAmp] = React.useState(0);
  const [currentText, setCurrentText] = React.useState("");

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const sourceRef = React.useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const spokenIdsRef = React.useRef<Set<string>>(new Set());
  const welcomedRef = React.useRef(false);

  const stopAll = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch { /* noop */ }
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setAmp(0);
  }, []);

  // Synthetic envelope for fallback (no TTS): fake breathing amplitude.
  const runFallbackEnvelope = React.useCallback((durationMs: number) => {
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      // Soft pseudo-voice envelope: sum of two sines clipped to positive.
      const v = Math.max(0, 0.35 + 0.35 * Math.sin(t * 6.2) + 0.2 * Math.sin(t * 11.1 + 1));
      setAmp(Math.min(1, v));
      if (performance.now() - start < durationMs) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setAmp(0);
        setState("idle");
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const speak = React.useCallback(async (text: string) => {
    stopAll();
    if (!text) return;
    setCurrentText(text);
    setState("thinking");

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let audioUrl: string | null = null;
    try {
      const r = await fetch("/api/public/aria-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error(`tts ${r.status}`);
      const blob = await r.blob();
      audioUrl = URL.createObjectURL(blob);
    } catch {
      // TTS unavailable → still animate the presenter.
      setState("speaking");
      const estMs = Math.min(14000, Math.max(3500, text.length * 55));
      runFallbackEnvelope(estMs);
      return;
    }

    const el = new Audio(audioUrl);
    el.crossOrigin = "anonymous";
    audioRef.current = el;

    // Analyser for mouth amplitude.
    try {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AC();
      }
      const ac = audioCtxRef.current!;
      if (ac.state === "suspended") await ac.resume().catch(() => {});
      const src = ac.createMediaElementSource(el);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      analyser.connect(ac.destination);
      sourceRef.current = src;
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const avg = sum / buf.length / 255;
        setAmp(Math.min(1, avg * 1.7));
        if (!el.paused && !el.ended) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* graceful — no analyser, still play */
    }

    setState("speaking");
    el.onended = () => {
      setState("idle");
      setAmp(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    el.onerror = () => {
      setState("idle");
      setAmp(0);
    };
    try {
      await el.play();
    } catch {
      // Autoplay blocked → fallback envelope so the presenter still animates.
      setState("speaking");
      runFallbackEnvelope(Math.min(12000, Math.max(3500, text.length * 55)));
    }
  }, [runFallbackEnvelope, stopAll]);

  // Kick off welcome + step narrations.
  React.useEffect(() => {
    if (!demo.isActive) {
      stopAll();
      welcomedRef.current = false;
      spokenIdsRef.current.clear();
      setState("idle");
      setCurrentText("");
      return;
    }

    // Play welcome once per demo session.
    if (!welcomedRef.current) {
      welcomedRef.current = true;
      soundDirector.ambient();
      speak(ar ? WELCOME_AR : WELCOME_EN);
      return;
    }

    if (!demo.step) return;
    const key = `${demo.step.id}:${ar ? "ar" : "en"}`;
    if (spokenIdsRef.current.has(key)) return;
    spokenIdsRef.current.add(key);
    soundDirector.stepAdvance();
    speak(ar ? demo.step.ariaNarration_ar : demo.step.ariaNarration_en);
  }, [demo.isActive, demo.step, ar, speak, stopAll]);

  React.useEffect(() => () => stopAll(), [stopAll]);

  return { state, amp, currentText };
}

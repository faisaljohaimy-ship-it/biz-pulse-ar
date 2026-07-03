// Nexios Guided Tour — controller / state machine.
import * as React from "react";
import { useRouter } from "@tanstack/react-router";
import { TOUR_STEPS } from "./tour.script";
import type { TourLang, TourState, TourStep } from "./tour.types";
import { audioBus } from "./audio-bus";

interface TourCtx {
  state: TourState;
  stepIndex: number;
  step: TourStep | null;
  steps: TourStep[];
  lang: TourLang;
  muted: boolean;
  start: (lang: TourLang) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  exit: () => void;
  setLang: (l: TourLang) => void;
  toggleMute: () => void;
}

const Ctx = React.createContext<TourCtx | null>(null);

export function useTour(): TourCtx {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useTour must be used inside <TourProvider>");
  return c;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = React.useState<TourState>("idle");
  const [stepIndex, setStepIndex] = React.useState(0);
  const [lang, setLangState] = React.useState<TourLang>("ar");
  const [muted, setMuted] = React.useState(false);

  const runToken = React.useRef(0);
  const pausedRef = React.useRef(false);
  const dwellTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellResolver = React.useRef<(() => void) | null>(null);
  const langRef = React.useRef<TourLang>("ar");
  const indexRef = React.useRef(0);
  const forceAdvance = React.useRef(false);

  React.useEffect(() => { langRef.current = lang; }, [lang]);
  React.useEffect(() => { indexRef.current = stepIndex; }, [stepIndex]);

  const clearDwell = () => {
    if (dwellTimer.current) { clearTimeout(dwellTimer.current); dwellTimer.current = null; }
    const r = dwellResolver.current;
    dwellResolver.current = null;
    if (r) r();
  };

  const dwell = (ms: number) => new Promise<void>((resolve) => {
    dwellResolver.current = resolve;
    dwellTimer.current = setTimeout(() => {
      dwellResolver.current = null;
      resolve();
    }, ms);
  });

  const runLoop = React.useCallback(async (myToken: number, fromIndex: number) => {
    for (let i = fromIndex; i < TOUR_STEPS.length; i++) {
      if (myToken !== runToken.current) return;
      // Pause gate
      while (pausedRef.current && myToken === runToken.current) {
        await new Promise((r) => setTimeout(r, 150));
      }
      if (myToken !== runToken.current) return;

      setStepIndex(i);
      indexRef.current = i;
      const step = TOUR_STEPS[i];

      setState("navigating");
      try { await router.navigate({ to: step.route as never }); } catch { /* noop */ }
      await new Promise((r) => setTimeout(r, 420));
      if (myToken !== runToken.current) return;

      setState("speaking");
      const text = langRef.current === "ar" ? step.narrationAr : step.narrationEn;
      await audioBus.speak(text, langRef.current);
      if (myToken !== runToken.current) return;

      setState("playing");
      forceAdvance.current = false;
      await dwell(step.dwellMs);
      if (myToken !== runToken.current) return;
    }
    if (myToken === runToken.current) {
      setState("ended");
    }
  }, [router]);

  const start = React.useCallback((l: TourLang) => {
    if (state !== "idle" && state !== "ended") return;
    setLangState(l);
    langRef.current = l;
    pausedRef.current = false;
    setStepIndex(0);
    indexRef.current = 0;
    setState("playing");
    const t = ++runToken.current;
    void runLoop(t, 0);
  }, [state, runLoop]);

  const pause = React.useCallback(() => {
    pausedRef.current = true;
    audioBus.stop();
    clearDwell();
    setState("paused");
  }, []);

  const resume = React.useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    setState("playing");
    const t = ++runToken.current;
    // Re-run current step so narration + dwell play from the top.
    void runLoop(t, indexRef.current);
  }, [runLoop]);

  const next = React.useCallback(() => {
    audioBus.stop();
    clearDwell();
    const target = Math.min(indexRef.current + 1, TOUR_STEPS.length - 1);
    if (target === indexRef.current && indexRef.current === TOUR_STEPS.length - 1) {
      setState("ended");
      runToken.current++;
      return;
    }
    pausedRef.current = false;
    const t = ++runToken.current;
    void runLoop(t, target);
  }, [runLoop]);

  const prev = React.useCallback(() => {
    audioBus.stop();
    clearDwell();
    const target = Math.max(0, indexRef.current - 1);
    pausedRef.current = false;
    const t = ++runToken.current;
    void runLoop(t, target);
  }, [runLoop]);

  const exit = React.useCallback(() => {
    runToken.current++;
    audioBus.stop();
    clearDwell();
    pausedRef.current = false;
    setState("idle");
    setStepIndex(0);
    // Restore ARIA greeting mute preference by dispatching release.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nexios:audio-release"));
    }
  }, []);

  const setLang = React.useCallback((l: TourLang) => {
    setLangState(l);
    langRef.current = l;
  }, []);

  const toggleMute = React.useCallback(() => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    audioBus.setMuted(nextMuted);
  }, [muted]);

  React.useEffect(() => () => {
    runToken.current++;
    audioBus.stop();
    clearDwell();
  }, []);

  const value: TourCtx = {
    state,
    stepIndex,
    step: TOUR_STEPS[stepIndex] ?? null,
    steps: TOUR_STEPS,
    lang,
    muted,
    start, pause, resume, next, prev, exit, setLang, toggleMute,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

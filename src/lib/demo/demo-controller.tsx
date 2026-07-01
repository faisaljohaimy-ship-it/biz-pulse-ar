// Executive Demo — Controller (React context)
// -----------------------------------------------------------------------------
// Phase 4.1 · Executive Demo Mode Foundation
//
// A single global state machine that drives the Executive Demo. It does NOT
// duplicate simulation state, does NOT re-fetch data, does NOT own KPIs.
// It only owns:
//   - Demo Mode lock (on/off)
//   - Current timeline cursor (0..N-1)
//   - Playback status (idle | playing | paused | ended)
//   - Broadcasts (React context + a window CustomEvent) so any page can react.
//
// Data lives in Supabase (already inserted by `runExecutiveScenario`).
// Anything the demo shows is read via existing hooks and server functions.
//
// Public API:
//   <DemoModeProvider><App /></DemoModeProvider>
//   const demo = useDemoMode();
//   demo.start() / pause() / resume() / replay() / next() / prev() / exit()
//   demo.status, demo.stepIndex, demo.step, demo.isActive, demo.locked
//
// Cross-component listeners (Phase 4.2 will use these for camera targets):
//   window.addEventListener("nexios:demo-step", (e) => e.detail as DemoStep)
//   window.addEventListener("nexios:demo-status", (e) => e.detail as DemoStatus)

import * as React from "react";
import {
  EXECUTIVE_DAY_TIMELINE,
  EXECUTIVE_DAY_STEP_COUNT,
  type DemoStep,
} from "./timeline";

export type DemoStatus = "idle" | "playing" | "paused" | "ended";

export interface DemoModeContextValue {
  /** True while any demo session is in progress OR paused. */
  isActive: boolean;
  /** True while the platform is locked into demo mode (same as isActive). */
  locked: boolean;
  status: DemoStatus;
  stepIndex: number;
  step: DemoStep | null;
  totalSteps: number;
  /** Milliseconds each step stays on screen when auto-advancing. */
  stepDurationMs: number;
  setStepDurationMs: (ms: number) => void;

  start: () => void;
  pause: () => void;
  resume: () => void;
  replay: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  exit: () => void;
}

const noop = () => {};

const DEFAULT: DemoModeContextValue = {
  isActive: false,
  locked: false,
  status: "idle",
  stepIndex: -1,
  step: null,
  totalSteps: EXECUTIVE_DAY_STEP_COUNT,
  stepDurationMs: 6500,
  setStepDurationMs: noop,
  start: noop,
  pause: noop,
  resume: noop,
  replay: noop,
  next: noop,
  prev: noop,
  goTo: noop,
  exit: noop,
};

const Ctx = React.createContext<DemoModeContextValue>(DEFAULT);

const STORAGE_KEY = "nexios.demo.session.v1";

interface PersistedSession {
  status: DemoStatus;
  stepIndex: number;
}

function readPersisted(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed || typeof parsed.stepIndex !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(s: PersistedSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (s === null) window.sessionStorage.removeItem(STORAGE_KEY);
    else window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota / private mode */
  }
}

function emit<T>(name: string, detail: T) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<DemoStatus>("idle");
  const [stepIndex, setStepIndex] = React.useState<number>(-1);
  const [stepDurationMs, setStepDurationMs] = React.useState<number>(6500);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rehydrate paused session on reload (client only).
  React.useEffect(() => {
    const p = readPersisted();
    if (p && p.stepIndex >= 0 && p.stepIndex < EXECUTIVE_DAY_STEP_COUNT) {
      // Always resume as paused — never auto-play on reload.
      setStatus("paused");
      setStepIndex(p.stepIndex);
    }
  }, []);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const isActive = status === "playing" || status === "paused";
  const step = stepIndex >= 0 ? EXECUTIVE_DAY_TIMELINE[stepIndex] ?? null : null;

  // Broadcast step + status changes.
  React.useEffect(() => {
    emit("nexios:demo-status", status);
  }, [status]);

  React.useEffect(() => {
    if (step) emit("nexios:demo-step", step);
  }, [step]);

  // Lock body scroll indicator + persist.
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.demoMode = isActive ? "on" : "off";
    }
    writePersisted(isActive ? { status, stepIndex } : null);
    return () => {
      if (typeof document !== "undefined") delete document.documentElement.dataset.demoMode;
    };
  }, [isActive, status, stepIndex]);

  // Auto-advance when playing.
  React.useEffect(() => {
    clearTimer();
    if (status !== "playing") return;
    if (stepIndex < 0 || stepIndex >= EXECUTIVE_DAY_STEP_COUNT) return;
    timerRef.current = setTimeout(() => {
      setStepIndex((i) => {
        if (i + 1 >= EXECUTIVE_DAY_STEP_COUNT) {
          setStatus("ended");
          return i;
        }
        return i + 1;
      });
    }, stepDurationMs);
    return clearTimer;
  }, [status, stepIndex, stepDurationMs, clearTimer]);

  const start = React.useCallback(() => {
    clearTimer();
    setStepIndex(0);
    setStatus("playing");
  }, [clearTimer]);

  const pause = React.useCallback(() => {
    clearTimer();
    setStatus((s) => (s === "playing" ? "paused" : s));
  }, [clearTimer]);

  const resume = React.useCallback(() => {
    setStatus((s) => (s === "paused" || s === "ended" ? "playing" : s));
    setStepIndex((i) => (i < 0 ? 0 : i));
  }, []);

  const replay = React.useCallback(() => {
    clearTimer();
    setStepIndex(0);
    setStatus("playing");
  }, [clearTimer]);

  const next = React.useCallback(() => {
    clearTimer();
    setStepIndex((i) => {
      const n = Math.min(i + 1, EXECUTIVE_DAY_STEP_COUNT - 1);
      if (n === EXECUTIVE_DAY_STEP_COUNT - 1) setStatus((s) => (s === "playing" ? "playing" : "paused"));
      return n;
    });
  }, [clearTimer]);

  const prev = React.useCallback(() => {
    clearTimer();
    setStepIndex((i) => Math.max(0, i - 1));
    setStatus((s) => (s === "ended" ? "paused" : s));
  }, [clearTimer]);

  const goTo = React.useCallback((index: number) => {
    clearTimer();
    if (index < 0 || index >= EXECUTIVE_DAY_STEP_COUNT) return;
    setStepIndex(index);
  }, [clearTimer]);

  const exit = React.useCallback(() => {
    clearTimer();
    setStatus("idle");
    setStepIndex(-1);
    writePersisted(null);
  }, [clearTimer]);

  const value: DemoModeContextValue = {
    isActive,
    locked: isActive,
    status,
    stepIndex,
    step,
    totalSteps: EXECUTIVE_DAY_STEP_COUNT,
    stepDurationMs,
    setStepDurationMs,
    start,
    pause,
    resume,
    replay,
    next,
    prev,
    goTo,
    exit,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemoMode(): DemoModeContextValue {
  return React.useContext(Ctx);
}

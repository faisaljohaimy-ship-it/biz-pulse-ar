/**
 * Digital Human Engine — reusable state machine, speech queue, and
 * interrupt handler for any Digital Human in the registry. Pure client
 * runtime (no server I/O). One hook per character.
 *
 * The engine is intentionally voice-agnostic: a renderer subscribes to
 * the state, and an optional TTS layer can read `currentTurn` to speak.
 * Interrupts and queue ordering are deterministic.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { DigitalHumanSpec, DigitalHumanState } from "./registry";

export interface SpokenTurn {
  id: string;
  text_ar: string;
  text_en: string;
  /** Optional pre-speech state (e.g. "analyzing") before "speaking". */
  preState?: DigitalHumanState;
  /** Optional ms duration; default derived from text length. */
  durationMs?: number;
  /** Optional follow-on state after speaking; default "completed". */
  postState?: DigitalHumanState;
  /** Optional payload echoed in onTurnEnd for callers that need context. */
  meta?: Record<string, unknown>;
}

export interface DigitalHumanRuntime {
  spec: DigitalHumanSpec;
  state: DigitalHumanState;
  /** 0-1, derived from baseline + live confidence pushes. */
  confidence: number;
  /** Currently spoken turn or null when idle/queued. */
  currentTurn: SpokenTurn | null;
  /** Pending turns (oldest first). */
  queueSize: number;
  /** Push one turn at the tail of the queue. */
  enqueue: (turn: SpokenTurn) => void;
  /** Push many turns atomically (presentation choreography). */
  enqueueAll: (turns: SpokenTurn[]) => void;
  /** Hard interrupt: drop queue, return to idle. */
  interrupt: () => void;
  /** Set state directly (e.g. "listening" on user mic open). */
  setState: (s: DigitalHumanState) => void;
  /** Push a confidence reading 0-1 (smoothed). */
  pushConfidence: (c: number) => void;
}

function estimateDurationMs(text: string): number {
  // ~13 chars per second is comfortable bilingual reading rate.
  const base = Math.max(1800, Math.min(7500, Math.round((text.length / 13) * 1000)));
  return base;
}

export function useDigitalHuman(
  spec: DigitalHumanSpec,
  opts?: { onTurnEnd?: (turn: SpokenTurn) => void },
): DigitalHumanRuntime {
  const [state, setStateRaw] = useState<DigitalHumanState>("idle");
  const [confidence, setConfidence] = useState<number>(spec.baselineConfidence);
  const [currentTurn, setCurrentTurn] = useState<SpokenTurn | null>(null);
  const queueRef = useRef<SpokenTurn[]>([]);
  const [queueSize, setQueueSize] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTurnEndRef = useRef(opts?.onTurnEnd);
  onTurnEndRef.current = opts?.onTurnEnd;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const finishTurn = useCallback(() => {
    setCurrentTurn(prev => {
      if (prev) onTurnEndRef.current?.(prev);
      return null;
    });
    setStateRaw("completed");
    // schedule next turn or settle to idle
    timerRef.current = setTimeout(() => {
      const next = queueRef.current.shift() ?? null;
      setQueueSize(queueRef.current.length);
      if (next) playTurn(next);
      else setStateRaw("idle");
    }, 350);
  }, []);

  const playTurn = useCallback((turn: SpokenTurn) => {
    clearTimer();
    const dur = turn.durationMs ?? estimateDurationMs(turn.text_en || turn.text_ar);
    setCurrentTurn(turn);
    if (turn.preState) {
      setStateRaw(turn.preState);
      timerRef.current = setTimeout(() => {
        setStateRaw("speaking");
        timerRef.current = setTimeout(() => finishTurn(), dur);
      }, 600);
    } else {
      setStateRaw("speaking");
      timerRef.current = setTimeout(() => finishTurn(), dur);
    }
  }, [finishTurn]);

  const enqueue = useCallback((turn: SpokenTurn) => {
    if (!currentTurn && queueRef.current.length === 0) {
      playTurn(turn);
    } else {
      queueRef.current.push(turn);
      setQueueSize(queueRef.current.length);
    }
  }, [currentTurn, playTurn]);

  const enqueueAll = useCallback((turns: SpokenTurn[]) => {
    if (turns.length === 0) return;
    if (!currentTurn) {
      const [first, ...rest] = turns;
      queueRef.current.push(...rest);
      setQueueSize(queueRef.current.length);
      playTurn(first);
    } else {
      queueRef.current.push(...turns);
      setQueueSize(queueRef.current.length);
    }
  }, [currentTurn, playTurn]);

  const interrupt = useCallback(() => {
    clearTimer();
    queueRef.current = [];
    setQueueSize(0);
    setCurrentTurn(null);
    setStateRaw("idle");
  }, []);

  const setState = useCallback((s: DigitalHumanState) => {
    setStateRaw(s);
  }, []);

  const pushConfidence = useCallback((c: number) => {
    const clamped = Math.max(0, Math.min(1, c));
    setConfidence(prev => prev * 0.6 + clamped * 0.4);
  }, []);

  useEffect(() => clearTimer, []);

  return {
    spec,
    state,
    confidence,
    currentTurn,
    queueSize,
    enqueue,
    enqueueAll,
    interrupt,
    setState,
    pushConfidence,
  };
}

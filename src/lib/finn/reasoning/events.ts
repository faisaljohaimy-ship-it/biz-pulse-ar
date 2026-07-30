/**
 * Phase 8.6 — Reasoning lifecycle event bus. In-process, best-effort.
 */
import type { ReasoningEvent, ReasoningEventName } from "./types";

type Listener = (evt: ReasoningEvent) => void;
const listeners = new Set<Listener>();

export function subscribeReasoning(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitReasoningEvent(
  name: ReasoningEventName,
  contextId: string,
  detail?: Record<string, unknown>,
): void {
  const evt: ReasoningEvent = {
    name,
    context_id: contextId,
    ts: new Date().toISOString(),
    detail,
  };
  for (const l of listeners) {
    try {
      l(evt);
    } catch {
      /* best-effort */
    }
  }
}

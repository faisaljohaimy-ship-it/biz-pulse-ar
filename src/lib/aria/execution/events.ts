/**
 * Phase 8.5 — Execution lifecycle event bus. In-process, best-effort,
 * consumers may subscribe for telemetry. The Director itself uses this
 * bus to publish decisions and progress updates.
 */
import type { ExecutionEvent, ExecutionEventName } from "./types";

type Listener = (evt: ExecutionEvent) => void;
const listeners = new Set<Listener>();

export function subscribeExecution(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitExecutionEvent(
  name: ExecutionEventName,
  sessionId: string,
  missionId: string,
  detail?: Record<string, unknown>,
): void {
  const evt: ExecutionEvent = {
    name,
    session_id: sessionId,
    mission_id: missionId,
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

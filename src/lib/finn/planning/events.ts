/**
 * Planning lifecycle events. In-process, best-effort.
 */
import type { PlanningEvent, PlanningEventName } from "./types";

type Listener = (evt: PlanningEvent) => void;
const listeners = new Set<Listener>();

export function subscribePlanning(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitPlanning(
  name: PlanningEventName,
  mission_id: string,
  detail?: Record<string, unknown>,
): void {
  const evt: PlanningEvent = {
    name,
    mission_id,
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

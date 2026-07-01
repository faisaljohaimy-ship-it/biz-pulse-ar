/**
 * Event bus for Task Bus lifecycle. In-process, best-effort.
 */
import type { BusEvent, BusEventName } from "./types";

type Listener = (evt: BusEvent) => void;
const listeners = new Set<Listener>();

export function subscribeBus(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitBusEvent(
  name: BusEventName,
  missionId: string,
  taskId?: string,
  detail?: Record<string, unknown>,
): void {
  const evt: BusEvent = { name, missionId, taskId, ts: new Date().toISOString(), detail };
  for (const l of listeners) {
    try {
      l(evt);
    } catch {
      /* best-effort */
    }
  }
}

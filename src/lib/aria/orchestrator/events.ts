/**
 * Orchestration event bus. In-process, best-effort. Subscribers are
 * additive — no UI subscribers are wired in Phase 8.1.
 */
import type { OrchestrationEvent, OrchestrationEventName } from "./types";

type Listener = (evt: OrchestrationEvent) => void;

const listeners = new Set<Listener>();

export function subscribeOrchestration(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitOrchestrationEvent(
  name: OrchestrationEventName,
  mission_id: string,
  detail?: Record<string, unknown>,
  agent_id?: string,
): void {
  const evt: OrchestrationEvent = {
    name,
    mission_id,
    agent_id: agent_id as OrchestrationEvent["agent_id"],
    ts: new Date().toISOString(),
    detail,
  };
  for (const l of listeners) {
    try {
      l(evt);
    } catch {
      // Listeners are best-effort; never break the mission on a bad subscriber.
    }
  }
}

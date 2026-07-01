/**
 * Phase 9.2 — Telemetry ring buffer and subscribers.
 */

import type { RuntimeSeverity, RuntimeTelemetryEvent } from "./types";

type Listener = (evt: RuntimeTelemetryEvent) => void;

const buffer: RuntimeTelemetryEvent[] = [];
const listeners = new Set<Listener>();
const MAX = 4000;

export function emitTelemetry(
  source: string,
  level: RuntimeSeverity,
  message: string,
  agentId: string | null = null,
  data: Record<string, unknown> = {},
): RuntimeTelemetryEvent {
  const evt: RuntimeTelemetryEvent = {
    ts: new Date().toISOString(),
    level,
    source,
    agent_id: agentId,
    message,
    data,
  };
  buffer.push(evt);
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
  for (const l of listeners) {
    try {
      l(evt);
    } catch {
      /* subscriber failures never disrupt runtime */
    }
  }
  return evt;
}

export function subscribeTelemetry(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function tailTelemetry(limit = 100, agentId?: string): RuntimeTelemetryEvent[] {
  const src = agentId ? buffer.filter((e) => e.agent_id === agentId) : buffer;
  return src.slice(-limit);
}

export function clearTelemetry(): void {
  buffer.length = 0;
}

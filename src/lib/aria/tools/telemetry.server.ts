/**
 * Phase 9.3 — Execution telemetry stream.
 */

import type { ToolTelemetryEvent } from "./types";

type Listener = (evt: ToolTelemetryEvent) => void;

const buffer: ToolTelemetryEvent[] = [];
const listeners = new Set<Listener>();
const MAX = 4000;

export function emitTelemetry(
  executionId: string,
  toolId: string,
  stage: ToolTelemetryEvent["stage"],
  message: string,
  data: Record<string, unknown> = {},
): ToolTelemetryEvent {
  const evt: ToolTelemetryEvent = {
    ts: new Date().toISOString(),
    execution_id: executionId,
    tool_id: toolId,
    stage,
    message,
    data,
  };
  buffer.push(evt);
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
  for (const l of listeners) {
    try {
      l(evt);
    } catch {
      /* never break execution on subscriber failure */
    }
  }
  return evt;
}

export function subscribeTelemetry(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function tailTelemetry(executionId?: string, limit = 100): ToolTelemetryEvent[] {
  const src = executionId ? buffer.filter((e) => e.execution_id === executionId) : buffer;
  return src.slice(-limit);
}

export function clearTelemetry(): void {
  buffer.length = 0;
}

/**
 * Structured telemetry for Long-Term Memory.
 *
 * Append-only. Deterministic ids.
 */

import type { Severity, TelemetryEvent } from "./types";

const EVENTS: TelemetryEvent[] = [];

function telId(kind: string, ts: string, seq: number): string {
  let h = 5381;
  const seed = `ltm-tel|${kind}|${ts}|${seq}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `ltm_tel_${(h >>> 0).toString(16)}`;
}

export function emitTelemetry(
  kind: string,
  severity: Severity,
  detail: string,
): TelemetryEvent {
  const ts = new Date().toISOString();
  const event: TelemetryEvent = Object.freeze({
    id: telId(kind, ts, EVENTS.length),
    ts,
    kind,
    severity,
    detail,
  });
  EVENTS.push(event);
  return event;
}

export function listTelemetry(): readonly TelemetryEvent[] {
  return EVENTS.slice();
}

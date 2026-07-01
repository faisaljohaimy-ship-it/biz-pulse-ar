/**
 * Phase 9.0 — Structured logging with trace correlation.
 *
 * In-process ring buffer. No new persistent tables. Consumers stream via
 * subscribe(). Never used to replace existing loggers — additive only.
 */

import { randomUUID } from "crypto";
import type { Severity, StructuredLogEntry, TraceIds } from "./types";
import { LogEntrySchema } from "./contracts";

const RING_MAX = 2000;
const RING: StructuredLogEntry[] = [];
const SUBSCRIBERS = new Set<(e: StructuredLogEntry) => void>();

export function newTraceId(): string {
  return randomUUID();
}

export function makeTrace(partial?: Partial<TraceIds>): TraceIds {
  return {
    trace_id: partial?.trace_id ?? newTraceId(),
    request_id: partial?.request_id ?? null,
    session_id: partial?.session_id ?? null,
    mission_id: partial?.mission_id ?? null,
    agent_id: partial?.agent_id ?? null,
    task_id: partial?.task_id ?? null,
  };
}

export function log(
  level: Severity,
  source: string,
  message: string,
  extras?: Partial<StructuredLogEntry>,
): StructuredLogEntry {
  const entry: StructuredLogEntry = {
    ts: new Date().toISOString(),
    level,
    source,
    message,
    trace_id: extras?.trace_id ?? newTraceId(),
    request_id: extras?.request_id ?? null,
    session_id: extras?.session_id ?? null,
    mission_id: extras?.mission_id ?? null,
    agent_id: extras?.agent_id ?? null,
    task_id: extras?.task_id ?? null,
    data: extras?.data,
    error_class: extras?.error_class,
  };
  const parsed = LogEntrySchema.safeParse(entry);
  const record = parsed.success ? parsed.data : entry;
  RING.push(record);
  if (RING.length > RING_MAX) RING.splice(0, RING.length - RING_MAX);
  for (const s of SUBSCRIBERS) {
    try {
      s(record);
    } catch {
      /* subscriber failure never breaks logging */
    }
  }
  return record;
}

export const logger = {
  info: (source: string, message: string, extras?: Partial<StructuredLogEntry>) =>
    log("info", source, message, extras),
  notice: (source: string, message: string, extras?: Partial<StructuredLogEntry>) =>
    log("notice", source, message, extras),
  warn: (source: string, message: string, extras?: Partial<StructuredLogEntry>) =>
    log("warn", source, message, extras),
  error: (source: string, message: string, extras?: Partial<StructuredLogEntry>) =>
    log("error", source, message, extras),
  critical: (source: string, message: string, extras?: Partial<StructuredLogEntry>) =>
    log("critical", source, message, extras),
};

export function subscribeLogs(cb: (e: StructuredLogEntry) => void): () => void {
  SUBSCRIBERS.add(cb);
  return () => SUBSCRIBERS.delete(cb);
}

export function tailLogs(limit = 200, minLevel: Severity = "info"): StructuredLogEntry[] {
  const order: Severity[] = ["info", "notice", "warn", "error", "critical"];
  const minIx = order.indexOf(minLevel);
  return RING.filter((e) => order.indexOf(e.level) >= minIx).slice(-limit);
}

export function countLogs(): number {
  return RING.length;
}

export function countErrorsSince(since: Date): number {
  const iso = since.toISOString();
  let n = 0;
  for (const e of RING) {
    if ((e.level === "error" || e.level === "critical") && e.ts >= iso) n++;
  }
  return n;
}

export function clearLogs(): void {
  RING.length = 0;
}

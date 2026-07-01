/**
 * Phase 9.0 — Observability facade.
 *
 * Provides a single call site for creating correlated trace envelopes,
 * classifying errors, and reading recent activity. Wraps logging and
 * audit modules; never replaces them.
 */

import { logger, makeTrace, tailLogs, newTraceId } from "./logging.server";
import { listAudits } from "./audit.server";
import type { StructuredLogEntry, TraceIds } from "./types";

export type ErrorClass =
  | "validation"
  | "auth"
  | "rate_limit"
  | "not_found"
  | "conflict"
  | "timeout"
  | "network"
  | "database"
  | "unknown";

export function classifyError(err: unknown): ErrorClass {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  if (!msg) return "unknown";
  if (msg.includes("validation") || msg.includes("zod") || msg.includes("invalid")) return "validation";
  if (msg.includes("unauthor") || msg.includes("forbidden") || msg.includes("401") || msg.includes("403")) return "auth";
  if (msg.includes("rate") && msg.includes("limit")) return "rate_limit";
  if (msg.includes("not found") || msg.includes("404")) return "not_found";
  if (msg.includes("conflict") || msg.includes("409")) return "conflict";
  if (msg.includes("timeout") || msg.includes("timed out")) return "timeout";
  if (msg.includes("network") || msg.includes("fetch failed") || msg.includes("econn")) return "network";
  if (msg.includes("supabase") || msg.includes("postgres") || msg.includes("relation")) return "database";
  return "unknown";
}

export function beginTrace(partial?: Partial<TraceIds>): TraceIds {
  return makeTrace(partial);
}

export async function traced<T>(
  source: string,
  op: string,
  fn: (trace: TraceIds) => Promise<T> | T,
  partial?: Partial<TraceIds>,
): Promise<T> {
  const trace = makeTrace(partial);
  const started = Date.now();
  logger.info(source, `${op}.start`, { ...trace });
  try {
    const out = await fn(trace);
    logger.info(source, `${op}.ok`, { ...trace, data: { duration_ms: Date.now() - started } });
    return out;
  } catch (err) {
    logger.error(source, `${op}.fail`, {
      ...trace,
      error_class: classifyError(err),
      data: {
        duration_ms: Date.now() - started,
        message: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}

export function recentActivity(limit = 100): {
  logs: StructuredLogEntry[];
  audits: ReturnType<typeof listAudits>;
} {
  return { logs: tailLogs(limit), audits: listAudits(limit) };
}

export { newTraceId };

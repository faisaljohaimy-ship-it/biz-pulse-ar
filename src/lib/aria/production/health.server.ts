/**
 * Phase 9.0 — Production health summary.
 *
 * Rolls up Phase 8.9 OS health, runtime error rate, and (when reachable)
 * database ping into a single production-facing readout. This does NOT
 * replace `src/lib/aria/os/health.server.ts` — it wraps it.
 */

import type { GateStatus, HealthSummary } from "./types";
import { countErrorsSince } from "./logging.server";

async function osHealthLevel(): Promise<GateStatus> {
  try {
    const { evaluateOSHealth } = await import("../os/health.server");
    const h = evaluateOSHealth();
    if (h.level === "healthy") return "pass";
    if (h.level === "degraded") return "warn";
    return "fail";
  } catch {
    return "unknown";
  }
}

async function databaseHealth(): Promise<GateStatus> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .limit(1);
    return error ? "fail" : "pass";
  } catch {
    return "unknown";
  }
}

function runtimeHealth(): { status: GateStatus; note?: string } {
  const oneHourAgo = new Date(Date.now() - 3_600_000);
  const errs = countErrorsSince(oneHourAgo);
  if (errs === 0) return { status: "pass" };
  if (errs < 10) return { status: "warn", note: `${errs} errors in last hour` };
  return { status: "fail", note: `${errs} errors in last hour` };
}

export async function evaluateHealth(): Promise<HealthSummary> {
  const [os, db] = await Promise.all([osHealthLevel(), databaseHealth()]);
  const runtime = runtimeHealth();
  const notes: string[] = [];
  if (runtime.note) notes.push(`runtime: ${runtime.note}`);
  if (db === "fail") notes.push("database: ping failed");
  if (os !== "pass") notes.push(`os: ${os}`);

  const worst: GateStatus =
    [os, db, runtime.status].includes("fail") ? "fail"
      : [os, db, runtime.status].includes("warn") ? "warn"
        : [os, db, runtime.status].every((s) => s === "pass") ? "pass" : "unknown";

  const level: HealthSummary["level"] =
    worst === "pass" ? "healthy" : worst === "warn" ? "degraded" : worst === "fail" ? "unhealthy" : "unknown";

  return {
    taken_at: new Date().toISOString(),
    level,
    os,
    runtime: runtime.status,
    database: db,
    notes,
  };
}

/**
 * Phase 9.0 — Resilience posture.
 *
 * Reports whether retry, timeout, fallback, and graceful failure policies
 * are declared for the runtime. Registrations are made by subsystems at
 * boot time; unregistered areas surface as "unknown" — never faked pass.
 */

import type { GateStatus, ResilienceReport } from "./types";

interface PolicyFlags {
  graceful_failure?: boolean;
  retry?: boolean;
  timeout?: boolean;
  fallback?: boolean;
}

const REGISTRATIONS = new Map<string, PolicyFlags>();
let DEGRADED = false;

export function registerResiliencePolicy(subsystem: string, flags: PolicyFlags): void {
  REGISTRATIONS.set(subsystem, { ...REGISTRATIONS.get(subsystem), ...flags });
}

export function markDegraded(on: boolean): void {
  DEGRADED = !!on;
}

function rollup(pick: (f: PolicyFlags) => boolean | undefined): GateStatus {
  if (REGISTRATIONS.size === 0) return "unknown";
  let any = false;
  let all = true;
  for (const f of REGISTRATIONS.values()) {
    const v = pick(f);
    if (v === undefined) { all = false; continue; }
    if (v) any = true; else all = false;
  }
  if (all) return "pass";
  if (any) return "warn";
  return "fail";
}

export function evaluateResilience(): ResilienceReport {
  const notes: string[] = [];
  if (REGISTRATIONS.size === 0) {
    notes.push("No subsystem has registered a resilience policy yet.");
  }
  if (DEGRADED) notes.push("Runtime currently in degraded mode.");
  return {
    taken_at: new Date().toISOString(),
    graceful_failure: rollup((f) => f.graceful_failure),
    retry_policy: rollup((f) => f.retry),
    timeout_policy: rollup((f) => f.timeout),
    fallback_policy: rollup((f) => f.fallback),
    degraded_mode: DEGRADED,
    notes,
  };
}

export function listResiliencePolicies(): Array<{ subsystem: string; flags: PolicyFlags }> {
  return [...REGISTRATIONS.entries()].map(([subsystem, flags]) => ({ subsystem, flags }));
}

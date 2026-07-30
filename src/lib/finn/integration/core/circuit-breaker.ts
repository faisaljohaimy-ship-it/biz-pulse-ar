/**
 * Phase 9.1 — Circuit breaker (closed / open / half_open).
 */

import type { CircuitBreakerPolicy } from "./types";

export type CircuitState = "closed" | "open" | "half_open";

export const DEFAULT_CIRCUIT: CircuitBreakerPolicy = {
  failure_threshold: 5,
  cooldown_ms: 30_000,
  half_open_probes: 1,
};

interface Slot {
  state: CircuitState;
  failures: number;
  opened_at: number;
  probes_used: number;
}

const CIRCUITS = new Map<string, Slot>();

function get(id: string): Slot {
  let s = CIRCUITS.get(id);
  if (!s) {
    s = { state: "closed", failures: 0, opened_at: 0, probes_used: 0 };
    CIRCUITS.set(id, s);
  }
  return s;
}

export function circuitState(id: string): CircuitState {
  return get(id).state;
}

export function allowRequest(id: string, policy: CircuitBreakerPolicy = DEFAULT_CIRCUIT): boolean {
  const s = get(id);
  if (s.state === "closed") return true;
  if (s.state === "open") {
    if (Date.now() - s.opened_at >= policy.cooldown_ms) {
      s.state = "half_open";
      s.probes_used = 0;
      return true;
    }
    return false;
  }
  // half_open
  if (s.probes_used < policy.half_open_probes) {
    s.probes_used += 1;
    return true;
  }
  return false;
}

export function recordSuccess(id: string): void {
  const s = get(id);
  s.state = "closed";
  s.failures = 0;
  s.probes_used = 0;
}

export function recordFailure(id: string, policy: CircuitBreakerPolicy = DEFAULT_CIRCUIT): void {
  const s = get(id);
  s.failures += 1;
  if (s.state === "half_open" || s.failures >= policy.failure_threshold) {
    s.state = "open";
    s.opened_at = Date.now();
    s.probes_used = 0;
  }
}

export function resetCircuit(id: string): void {
  CIRCUITS.delete(id);
}

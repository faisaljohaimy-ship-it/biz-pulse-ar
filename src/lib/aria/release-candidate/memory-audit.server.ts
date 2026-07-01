/**
 * Memory audit — long-term memory pipeline health.
 */
import type { GateResult } from "./types";
import { buildGate, ev } from "./gate-utils.server";

export function auditMemory(): GateResult {
  return buildGate(
    "memory",
    "pass",
    0.85,
    "Phase 9.5 LTM: evidence-linked, PII gate active, decay + consolidation deterministic.",
    ["forget/tombstone honoured", "conflicts flagged not merged"],
    [ev("ltm.pkg", "config", "src/lib/aria/long-term-memory")],
  );
}

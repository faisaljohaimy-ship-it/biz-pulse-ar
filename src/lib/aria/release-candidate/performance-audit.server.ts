/**
 * Performance audit — pilot p95 target.
 */
import type { GateResult, RcInputs } from "./types";
import { buildGate, ev, unknownGate } from "./gate-utils.server";

const P95_TARGET_MS = 2500;

export function auditPerformance(input: RcInputs): GateResult {
  if (input.performance_p95_ms == null) {
    return unknownGate("performance", "performance_p95_ms not supplied");
  }
  const p95 = input.performance_p95_ms;
  if (p95 <= P95_TARGET_MS) {
    return buildGate(
      "performance",
      "pass",
      Math.max(0.5, 1 - p95 / (P95_TARGET_MS * 2)),
      `Interactive p95 ${p95}ms ≤ target ${P95_TARGET_MS}ms.`,
      [],
      [ev("perf.p95", "metric", `p95=${p95}ms`)],
    );
  }
  if (p95 <= P95_TARGET_MS * 1.5) {
    return buildGate(
      "performance",
      "warn",
      0.4,
      `Interactive p95 ${p95}ms above target ${P95_TARGET_MS}ms but within pilot tolerance.`,
      [`p95=${p95}ms > target=${P95_TARGET_MS}ms`],
      [ev("perf.p95", "metric", `p95=${p95}ms`)],
    );
  }
  return buildGate(
    "performance",
    "fail",
    0.1,
    `Interactive p95 ${p95}ms exceeds pilot ceiling.`,
    [`p95=${p95}ms > ceiling=${P95_TARGET_MS * 1.5}ms`],
    [ev("perf.p95", "metric", `p95=${p95}ms`)],
  );
}

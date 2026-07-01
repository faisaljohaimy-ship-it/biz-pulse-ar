// Runtime health rollup.
import type { HealthState, RuntimeHealth } from "./types";
import { RuntimeHealthZ } from "./contracts";

export function validateRuntime(h: RuntimeHealth): RuntimeHealth {
  return RuntimeHealthZ.parse(h);
}

export function summarizeRuntime(nodes: ReadonlyArray<RuntimeHealth>): {
  total: number;
  down: number;
  degraded: number;
  unknown: number;
  overall: HealthState;
} {
  let down = 0;
  let degraded = 0;
  let unknown = 0;
  for (const n of nodes) {
    if (n.state === "down") down += 1;
    else if (n.state === "degraded") degraded += 1;
    else if (n.state === "unknown") unknown += 1;
  }
  let overall: HealthState = "healthy";
  if (nodes.length === 0) overall = "unknown";
  else if (down > 0) overall = "down";
  else if (degraded > 0) overall = "degraded";
  else if (unknown > 0 && unknown === nodes.length) overall = "unknown";
  return { total: nodes.length, down, degraded, unknown, overall };
}

// Tool readiness supervision.
import type { HealthState, ToolReadiness } from "./types";
import { ToolReadinessZ } from "./contracts";

export function validateTool(t: ToolReadiness): ToolReadiness {
  return ToolReadinessZ.parse(t);
}

export function summarizeTools(tools: ReadonlyArray<ToolReadiness>): {
  total: number;
  down: number;
  degraded: number;
  overall: HealthState;
} {
  let down = 0;
  let degraded = 0;
  for (const t of tools) {
    if (t.state === "down") down += 1;
    else if (t.state === "degraded") degraded += 1;
  }
  let overall: HealthState = "healthy";
  if (tools.length === 0) overall = "unknown";
  else if (down > 0) overall = "down";
  else if (degraded > 0) overall = "degraded";
  return { total: tools.length, down, degraded, overall };
}

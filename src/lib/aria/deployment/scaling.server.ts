// Horizontal scaling planner. Deterministic.
import type { ScalingPlan } from "./types";
import { ScalingSignalsZ } from "./contracts";

export function planScaling(input: {
  currentNodes: number;
  targetUtilization: number;
  observedUtilization: number;
  minNodes: number;
  maxNodes: number;
  evidence?: ReadonlyArray<{ source: string; ref: string; at: string }>;
}): ScalingPlan {
  const parsed = ScalingSignalsZ.parse({
    currentNodes: input.currentNodes,
    targetUtilization: input.targetUtilization,
    observedUtilization: input.observedUtilization,
    minNodes: input.minNodes,
    maxNodes: input.maxNodes,
    evidence: input.evidence ?? [],
  });

  if (parsed.minNodes > parsed.maxNodes) {
    return {
      desiredNodes: parsed.currentNodes,
      currentNodes: parsed.currentNodes,
      action: "unknown",
      reason: "invalid_bounds",
      evidence: parsed.evidence,
    };
  }

  if (parsed.targetUtilization === 0) {
    return {
      desiredNodes: parsed.currentNodes,
      currentNodes: parsed.currentNodes,
      action: "unknown",
      reason: "target_utilization_zero",
      evidence: parsed.evidence,
    };
  }

  const raw = Math.ceil(
    (parsed.currentNodes * parsed.observedUtilization) / parsed.targetUtilization,
  );
  const desired = Math.max(parsed.minNodes, Math.min(parsed.maxNodes, raw || parsed.minNodes));

  let action: ScalingPlan["action"] = "hold";
  if (desired > parsed.currentNodes) action = "scale_out";
  else if (desired < parsed.currentNodes) action = "scale_in";

  return {
    desiredNodes: desired,
    currentNodes: parsed.currentNodes,
    action,
    reason: `observed=${parsed.observedUtilization} target=${parsed.targetUtilization}`,
    evidence: parsed.evidence,
  };
}

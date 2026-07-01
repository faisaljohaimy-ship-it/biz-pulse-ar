/**
 * Pilot readiness — score gates → PilotReadinessScore.
 */
import type { GateId, GateResult, PilotReadinessScore } from "./types";
import { RC1_CHECKLIST } from "./rc-checklist.server";

const WEIGHTS: Record<"critical" | "high" | "medium" | "low", number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0.5,
};

export function scorePilotReadiness(
  gates: readonly GateResult[],
): PilotReadinessScore {
  const byId = new Map(gates.map((g) => [g.id, g] as const));
  const by_gate = {} as Record<GateId, number>;
  let weighted = 0;
  let total = 0;
  const gaps: string[] = [];

  for (const item of RC1_CHECKLIST) {
    const g = byId.get(item.id);
    const weight = WEIGHTS[item.criticality];
    const score = g ? g.score : 0;
    by_gate[item.id] = Number((score * 100).toFixed(1));
    weighted += score * weight;
    total += weight;
    if (!g) gaps.push(`${item.id}:missing`);
    else if (g.status === "fail") gaps.push(`${item.id}:fail`);
    else if (g.status === "unknown") gaps.push(`${item.id}:unknown`);
    else if (g.status === "warn") gaps.push(`${item.id}:warn`);
  }

  const overall = total > 0 ? Number(((weighted / total) * 100).toFixed(1)) : 0;
  return { overall, by_gate, gaps };
}

/**
 * Estimator — predicts duration, cost, tokens, retries, failure
 * probability, and confidence for the full plan. Uses per-agent
 * marketplace telemetry when available; falls back to conservative
 * defaults declared in agent manifests.
 */
import type { CapabilityBinding, Estimation, ExecutionGraph, MissionConstraint } from "./types";
import { healthOf } from "../marketplace/health.server";
import { getActive } from "../marketplace/version.server";
import { listAgents } from "../orchestrator/registry";

const DEFAULT_LATENCY_MS = 800;
const DEFAULT_COST_UNITS = 1;
const DEFAULT_TOKENS = 500;

function costTierUnits(tier: "free" | "low" | "medium" | "high"): number {
  return { free: 0, low: 1, medium: 3, high: 8 }[tier];
}

export function estimatePlan(
  graph: ExecutionGraph,
  bindings: CapabilityBinding[],
  _constraints: MissionConstraint[],
): Estimation {
  let cost = 0;
  let tokens = 0;
  let retries = 0;
  let failureAcc = 0;
  let considered = 0;
  const latencyByNode = new Map<string, number>();

  for (const b of bindings) {
    considered++;
    const agentId = b.resolved_agent ?? "";
    const pkg = agentId ? getActive(agentId) : null;
    const orchestratorAgent = listAgents().find((a) => a.contract.id === agentId);
    const health = agentId ? healthOf(agentId) : null;

    const latency =
      health?.latency_ms_avg && health.latency_ms_avg > 0
        ? health.latency_ms_avg
        : (orchestratorAgent?.contract.estimated_latency_ms ??
          pkg?.manifest.timeout ??
          DEFAULT_LATENCY_MS);
    latencyByNode.set(b.node_id, latency);

    const tierUnits = pkg ? costTierUnits(pkg.manifest.cost) : DEFAULT_COST_UNITS;
    cost += tierUnits;
    tokens += DEFAULT_TOKENS;

    const successRate = health?.success_rate ?? 1;
    const failProb = Math.max(0, 1 - successRate);
    failureAcc += failProb;
    if (failProb > 0.2) retries += 1;
  }

  // Critical-path bounded wall-clock: sum latencies along critical_path.
  const wall = graph.critical_path.reduce(
    (sum, id) => sum + (latencyByNode.get(id) ?? DEFAULT_LATENCY_MS),
    0,
  );
  const failure_probability = considered ? Math.min(0.99, failureAcc / considered) : 0;

  const unresolved = bindings.filter((b) => b.match_kind === "unresolved").length;
  const bindingConfidence = considered ? Math.max(0, 1 - unresolved / considered) : 1;
  const confidence = Math.max(0.05, Math.min(1, (1 - failure_probability) * bindingConfidence));

  return {
    duration_ms: Math.max(wall, DEFAULT_LATENCY_MS),
    cost_units: cost,
    tokens,
    retries_expected: retries,
    failure_probability,
    confidence,
    reasoning:
      "Duration = sum of critical-path latencies (marketplace telemetry preferred, agent contract fallback). Confidence = (1 − avg failure probability) × (1 − unresolved-binding ratio).",
  };
}

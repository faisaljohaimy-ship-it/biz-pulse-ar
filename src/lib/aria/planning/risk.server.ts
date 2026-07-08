/**
 * Risk analyzer — evidence-backed. Every risk carries evidence and a
 * reasoning statement. No fabricated risks.
 */
import type {
  CapabilityBinding,
  Estimation,
  ExecutionGraph,
  MissionConstraint,
  RiskFactor,
} from "./types";
import { detectCycle } from "./dependency.server";
import { healthOf } from "../marketplace/health.server";
import { listPermissions } from "../marketplace/permission.server";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function analyzeRisks(
  graph: ExecutionGraph,
  bindings: CapabilityBinding[],
  estimation: Estimation,
  constraints: MissionConstraint[],
): RiskFactor[] {
  const risks: RiskFactor[] = [];

  // Cycles.
  const cycle = detectCycle(graph);
  if (cycle) {
    risks.push({
      id: uid("risk"),
      kind: "deadlock_risk",
      severity: "critical",
      evidence: [`cycle: ${cycle.join(" -> ")}`],
      reasoning: "DAG cycle detected during risk analysis; execution would deadlock.",
    });
  }

  // Missing capabilities.
  for (const b of bindings) {
    if (b.match_kind === "unresolved") {
      risks.push({
        id: uid("risk"),
        kind: "missing_capability",
        severity: "high",
        node_id: b.node_id,
        evidence: [`capability=${b.capability}`],
        reasoning:
          "No marketplace agent advertises this capability; recovery plan must supply an alternative.",
      });
    }
  }

  // Single point of failure — nodes on the critical path with no fallback.
  const onCritical = new Set(graph.critical_path);
  const critBindings = bindings.filter((b) => onCritical.has(b.node_id));
  const spofSeen = new Set<string>();
  for (const b of critBindings) {
    if (!b.resolved_agent) continue;
    if (spofSeen.has(b.resolved_agent)) {
      risks.push({
        id: uid("risk"),
        kind: "single_point_failure",
        severity: "high",
        node_id: b.node_id,
        evidence: [`critical_path_reuses_agent=${b.resolved_agent}`],
        reasoning:
          "Same agent handles multiple critical-path nodes; a single fault stalls the mission.",
      });
    } else {
      spofSeen.add(b.resolved_agent);
    }
  }

  // Agent health / timeout.
  for (const b of bindings) {
    if (!b.resolved_agent) continue;
    const h = healthOf(b.resolved_agent);
    if (h.executions > 3 && h.success_rate < 0.75) {
      risks.push({
        id: uid("risk"),
        kind: "dependency_risk",
        severity: "medium",
        node_id: b.node_id,
        evidence: [
          `agent=${b.resolved_agent}`,
          `success_rate=${h.success_rate.toFixed(2)}`,
          `executions=${h.executions}`,
        ],
        reasoning: "Recent marketplace telemetry shows degraded reliability for this agent.",
      });
    }
    if (h.timeouts > 0 && h.executions > 0 && h.timeouts / h.executions > 0.1) {
      risks.push({
        id: uid("risk"),
        kind: "timeout_risk",
        severity: "medium",
        node_id: b.node_id,
        evidence: [`timeout_ratio=${(h.timeouts / h.executions).toFixed(2)}`],
        reasoning: "Timeout ratio above 10% in recent executions.",
      });
    }
  }

  // Permission risk — resolved agent missing a permission implied by a policy constraint.
  const complianceCons = constraints.filter((c) => c.kind === "compliance");
  if (complianceCons.length) {
    for (const b of bindings) {
      if (!b.resolved_agent) continue;
      const perms = listPermissions(b.resolved_agent);
      if (!perms.includes("reports")) {
        risks.push({
          id: uid("risk"),
          kind: "permission_risk",
          severity: "low",
          node_id: b.node_id,
          evidence: [
            `agent=${b.resolved_agent}`,
            `constraints=compliance`,
            `declared_permissions=${perms.join(",") || "none"}`,
          ],
          reasoning:
            "Compliance constraint present but agent lacks 'reports' permission; audit trail may be incomplete.",
        });
      }
    }
  }

  // Budget risk based on estimation.
  const budget = constraints.find((c) => c.kind === "budget");
  if (budget && Number.isFinite(Number(budget.value))) {
    const cap = Number(budget.value);
    if (estimation.cost_units > cap * 0.9) {
      risks.push({
        id: uid("risk"),
        kind: "budget_risk",
        severity: estimation.cost_units > cap ? "high" : "medium",
        evidence: [`estimated=${estimation.cost_units}`, `cap=${cap}`],
        reasoning: "Estimated cost within 10% of budget cap; likely to exceed under retries.",
      });
    }
  }

  return risks;
}

export function scoreRisk(risks: RiskFactor[]): number {
  const weight = { low: 0.1, medium: 0.3, high: 0.6, critical: 1 };
  if (!risks.length) return 0;
  const sum = risks.reduce((s, r) => s + weight[r.severity], 0);
  return Math.min(1, sum / Math.max(3, risks.length));
}

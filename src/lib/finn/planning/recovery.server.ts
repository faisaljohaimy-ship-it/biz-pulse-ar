/**
 * Recovery planner — produces alternative bindings, retry directives,
 * and rollback steps. Never mutates the primary plan; the Orchestrator
 * decides whether to activate a recovery option at execution time.
 */
import type {
  CapabilityBinding,
  MissionTree,
  RecoveryOption,
  RiskFactor,
  RollbackStep,
} from "./types";
import { findMatches } from "../marketplace/capability-index.server";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function planRecovery(
  tree: MissionTree,
  bindings: CapabilityBinding[],
  risks: RiskFactor[],
): { options: RecoveryOption[]; rollback: RollbackStep[] } {
  const options: RecoveryOption[] = [];

  for (const b of bindings) {
    if (b.match_kind === "unresolved") {
      const node = tree.nodes[b.node_id];
      const alt = findMatches(node?.description ?? b.capability, 3).find(
        (m) => m.capability.key !== b.capability,
      );
      options.push({
        id: uid("rec"),
        target_node_id: b.node_id,
        strategy: alt ? "fallback_capability" : "human_takeover",
        alternative_capability: alt?.capability.key,
        reasoning: alt
          ? `Semantic marketplace lookup surfaced "${alt.capability.key}" as fallback.`
          : "No fallback capability available; escalate to a human operator.",
      });
    }
  }

  for (const r of risks) {
    if (r.kind === "timeout_risk" && r.node_id) {
      options.push({
        id: uid("rec"),
        target_node_id: r.node_id,
        strategy: "retry",
        reasoning: "Retry once with fresh AbortSignal to absorb transient timeouts.",
      });
    }
    if (r.kind === "single_point_failure" && r.node_id) {
      options.push({
        id: uid("rec"),
        target_node_id: r.node_id,
        strategy: "alternative_path",
        reasoning: "Route the node through an alternative agent binding on next attempt.",
      });
    }
    if (r.kind === "dependency_risk" && r.node_id) {
      options.push({
        id: uid("rec"),
        target_node_id: r.node_id,
        strategy: "graceful_degradation",
        reasoning:
          "Continue mission with degraded output rather than blocking on a flaky dependency.",
      });
    }
    if (r.kind === "deadlock_risk") {
      options.push({
        id: uid("rec"),
        target_node_id: tree.root_id,
        strategy: "rollback",
        reasoning: "Cycle detected; roll the plan back to a clean state.",
      });
    }
  }

  const rollback: RollbackStep[] = tree.atomic_ids.map((id) => ({
    node_id: id,
    action: "compensate",
    reasoning: "Emit a compensating action for this atomic unit if downstream verification fails.",
  }));

  return { options, rollback };
}

/**
 * Verifier — asserts plan integrity. Combines cycle detection, routing
 * completeness, objective coverage, and reflection issues into a single
 * VerificationReport.
 */
import type {
  CapabilityBinding,
  ExecutionGraph,
  MissionObjective,
  MissionTree,
  VerificationIssue,
  VerificationReport,
} from "./types";
import { detectCycle } from "./dependency.server";
import { reflect } from "./reflection.server";

export function verifyPlan(
  objectives: MissionObjective[],
  tree: MissionTree,
  graph: ExecutionGraph,
  bindings: CapabilityBinding[],
): VerificationReport {
  const issues: VerificationIssue[] = [];

  const cycle = detectCycle(graph);
  if (cycle) {
    issues.push({
      code: "VERIFY_CYCLE",
      message: `cycle in execution graph: ${cycle.join(" -> ")}`,
      fatal: true,
    });
  }

  const atomicSet = new Set(tree.atomic_ids);
  for (const id of graph.nodes) {
    if (!atomicSet.has(id)) {
      issues.push({
        code: "VERIFY_UNKNOWN_NODE",
        message: `graph node ${id} not in tree`,
        fatal: true,
      });
    }
  }

  // Every atomic node must be routable OR have an unresolved binding
  // (which recovery must address; verification reports it as non-fatal).
  const boundIds = new Set(bindings.map((b) => b.node_id));
  for (const id of tree.atomic_ids) {
    if (!boundIds.has(id)) {
      issues.push({
        code: "VERIFY_UNBOUND",
        message: `atomic node ${id} lacks a capability binding`,
        node_id: id,
        fatal: true,
      });
    }
  }
  for (const b of bindings) {
    if (b.match_kind === "unresolved") {
      issues.push({
        code: "VERIFY_UNRESOLVED_BINDING",
        message: `capability ${b.capability} unresolved for node ${b.node_id}`,
        node_id: b.node_id,
        fatal: false,
      });
    }
  }

  issues.push(...reflect(objectives, tree, graph, bindings));

  const covered = new Set<string>();
  const missing: string[] = [];
  const objectiveNodesByTitle = new Map<string, string>();
  for (const n of Object.values(tree.nodes)) {
    if (n.kind === "objective") objectiveNodesByTitle.set(n.title, n.id);
  }
  for (const o of objectives) {
    if (objectiveNodesByTitle.has(o.title)) covered.add(o.id);
    else missing.push(o.id);
  }

  const fatal = issues.some((i) => i.fatal);
  return {
    ok: !fatal,
    issues,
    covered_objective_ids: Array.from(covered),
    missing_objective_ids: missing,
  };
}

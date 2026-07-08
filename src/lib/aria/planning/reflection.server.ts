/**
 * Planner self-review — flags missing objectives, impossible dependencies,
 * redundant tasks, and planning gaps. Non-fatal by default; verification
 * decides which issues block emission of the plan.
 */
import type {
  CapabilityBinding,
  ExecutionGraph,
  MissionObjective,
  MissionTree,
  VerificationIssue,
} from "./types";

export function reflect(
  objectives: MissionObjective[],
  tree: MissionTree,
  graph: ExecutionGraph,
  bindings: CapabilityBinding[],
): VerificationIssue[] {
  const issues: VerificationIssue[] = [];

  // Missing objectives.
  const objectiveTitles = new Set(objectives.map((o) => o.title));
  const objectiveNodes = Object.values(tree.nodes).filter((n) => n.kind === "objective");
  for (const o of objectives) {
    if (!objectiveNodes.some((n) => n.title === o.title)) {
      issues.push({
        code: "REFLECTION_OBJECTIVE_ORPHAN",
        message: `objective "${o.title}" not represented in mission tree`,
        fatal: true,
      });
    }
  }
  for (const n of objectiveNodes) {
    if (!objectiveTitles.has(n.title)) {
      issues.push({
        code: "REFLECTION_OBJECTIVE_UNKNOWN",
        message: `tree contains objective node with no matching MissionObjective (${n.title})`,
        node_id: n.id,
        fatal: false,
      });
    }
  }

  // Impossible dependencies — edges referencing removed atomic nodes.
  const atomicSet = new Set(tree.atomic_ids);
  for (const e of graph.edges) {
    if (!atomicSet.has(e.from) || !atomicSet.has(e.to)) {
      issues.push({
        code: "REFLECTION_INVALID_EDGE",
        message: `edge references missing atomic node (${e.from} → ${e.to})`,
        fatal: true,
      });
    }
  }

  // Duplicate / redundant atomic descriptions.
  const seen = new Map<string, string>();
  for (const id of tree.atomic_ids) {
    const n = tree.nodes[id];
    const key = `${n.capability ?? ""}::${n.description.trim().toLowerCase()}`;
    if (seen.has(key)) {
      issues.push({
        code: "REFLECTION_DUPLICATE_ATOMIC",
        message: `atomic node duplicates ${seen.get(key)}`,
        node_id: id,
        fatal: false,
      });
    } else {
      seen.set(key, id);
    }
  }

  // Planning gaps — atomic nodes without any binding.
  const boundNodeIds = new Set(bindings.map((b) => b.node_id));
  for (const id of tree.atomic_ids) {
    if (!boundNodeIds.has(id)) {
      issues.push({
        code: "REFLECTION_UNBOUND_ATOMIC",
        message: `atomic node ${id} has no capability binding`,
        node_id: id,
        fatal: true,
      });
    }
  }

  return issues;
}

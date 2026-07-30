/**
 * Routing — for each atomic node, ask the Marketplace capability index
 * for the best-matching capability. Returns bindings only; never loads,
 * dispatches, or executes an agent. Concrete agent selection stays with
 * the Orchestrator + Marketplace at execution time.
 */
import type { CapabilityBinding, MissionTree } from "./types";
import { findExact, findMatches } from "../marketplace/capability-index.server";

export function resolveBindings(tree: MissionTree): CapabilityBinding[] {
  const bindings: CapabilityBinding[] = [];
  for (const nodeId of tree.atomic_ids) {
    const node = tree.nodes[nodeId];
    if (!node.capability) continue;
    const exact = findExact(node.capability);
    if (exact) {
      bindings.push({
        node_id: nodeId,
        capability: exact.capability.key,
        resolved_agent: exact.agentId,
        score: exact.score,
        match_kind: exact.matchKind,
        reasoning: `Exact marketplace match for capability "${node.capability}".`,
      });
      continue;
    }
    const [top] = findMatches(node.capability, 1);
    if (top) {
      bindings.push({
        node_id: nodeId,
        capability: top.capability.key,
        resolved_agent: top.agentId,
        score: top.score,
        match_kind: top.matchKind,
        reasoning: `Best available marketplace match (${top.matchKind}, score=${top.score.toFixed(2)}).`,
      });
      continue;
    }
    bindings.push({
      node_id: nodeId,
      capability: node.capability,
      resolved_agent: null,
      score: 0,
      match_kind: "unresolved",
      reasoning:
        "No marketplace capability matches this atomic node; recovery planning must supply an alternative.",
    });
  }
  return bindings;
}

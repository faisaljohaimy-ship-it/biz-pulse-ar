/**
 * Router — intent → agent selection + dependency resolution.
 * Pure and deterministic. No LLM calls. No hardcoded switch on intents:
 * agents advertise their supported intents in their contract.
 */
import { listAgents, hasAgent } from "./registry";
import type { AgentId, MissionPlan, MissionPlanNode } from "./types";
import type { AriaIntent } from "../executive-reasoning.server";
import { classifyIntent } from "../executive-reasoning.server";

const CHIEF: AgentId = "executive_brain";

function selectAgents(intent: AriaIntent, forced?: AgentId[]): AgentId[] {
  if (forced && forced.length) {
    return Array.from(new Set<AgentId>([CHIEF, ...forced.filter(hasAgent)]));
  }
  const matches = listAgents()
    .filter((a) => a.contract.intents.includes(intent))
    .map((a) => a.contract.id);
  // Chief always participates — it produces the final natural response.
  return Array.from(new Set<AgentId>([CHIEF, ...matches]));
}

/** Kahn's algorithm — returns topological layers (parallel groups). */
function toLayers(nodes: MissionPlanNode[]): AgentId[][] {
  const idSet = new Set(nodes.map((n) => n.agent_id));
  const indeg = new Map<AgentId, number>();
  const deps = new Map<AgentId, AgentId[]>();
  for (const n of nodes) {
    const filtered = n.depends_on.filter((d) => idSet.has(d));
    deps.set(n.agent_id, filtered);
    indeg.set(n.agent_id, filtered.length);
  }
  const layers: AgentId[][] = [];
  const remaining = new Set(nodes.map((n) => n.agent_id));
  while (remaining.size) {
    const layer: AgentId[] = [];
    for (const id of remaining) {
      if ((indeg.get(id) ?? 0) === 0) layer.push(id);
    }
    if (!layer.length) {
      // Cycle — break by flushing remaining as a final serial layer.
      layers.push(Array.from(remaining));
      break;
    }
    layers.push(layer);
    for (const id of layer) {
      remaining.delete(id);
      for (const other of remaining) {
        if ((deps.get(other) ?? []).includes(id)) {
          indeg.set(other, (indeg.get(other) ?? 1) - 1);
        }
      }
    }
  }
  return layers;
}

export function planMission(missionId: string, question: string, forced?: AgentId[]): MissionPlan {
  const intent = classifyIntent(question);
  const selected = selectAgents(intent, forced);
  const nodes: MissionPlanNode[] = selected.map((id) => {
    const agent = listAgents().find((a) => a.contract.id === id)!;
    return {
      agent_id: id,
      policy: agent.contract.execution_policy,
      depends_on: agent.contract.dependencies.filter((d) => selected.includes(d)),
      reason: `intent=${intent} · matched=${agent.contract.intents.includes(intent)}`,
    };
  });
  return {
    mission_id: missionId,
    intent,
    nodes,
    layers: toLayers(nodes),
  };
}

/**
 * Router — intent → agent selection + dependency resolution.
 * Pure and deterministic. No LLM calls. No hardcoded switch on intents:
 * agents advertise their supported intents in their contract.
 */
import { listAgents, hasAgent } from "./registry";
// Register the canonical agents before the router validates/selects them.
import "./agents";
import { SADEED_COUNCIL_OF_TEN, assertCouncilOfTen } from "./council";
import type { AgentId, MissionPlan, MissionPlanNode } from "./types";
import type { SadeedIntent } from "../executive-reasoning.server";
import { classifyIntent } from "../executive-reasoning.server";
import { getFnnContract } from "./fnn";

const CHIEF: AgentId = "executive_brain";

function selectAgents(intent: SadeedIntent, forced?: AgentId[]): AgentId[] {
  if (forced && forced.length) {
    return Array.from(new Set<AgentId>([CHIEF, ...forced.filter(hasAgent)]));
  }

  // SADEED is the Chief and every normal mission is reviewed by the complete
  // Council of Ten. Intent matching remains diagnostic metadata only; it must
  // never silently remove a council specialist from the mission.
  assertCouncilOfTen();
  // FNN is a free, deterministic companion to the Council. It prepares
  // bounded automation hand-offs without invoking a model or external side
  // effect, so every normal mission receives the same automation coverage.
  return [CHIEF, ...SADEED_COUNCIL_OF_TEN, getFnnContract().id];
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
      reason: `intent=${intent} · council=${SADEED_COUNCIL_OF_TEN.includes(id)} · matched=${agent.contract.intents.includes(intent)}`,
    };
  });
  return {
    mission_id: missionId,
    intent,
    nodes,
    layers: toLayers(nodes),
  };
}

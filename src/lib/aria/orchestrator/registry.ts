/**
 * Agent Registry. Agents self-register at module load time via
 * `registerAgent`. No switch statements, no hardcoded routing —
 * future agents only need to call `registerAgent(...)`.
 */
import type { ExecutiveAgent } from "./agent.interface";
import type { AgentId, AgentContract } from "./types";

const registry = new Map<AgentId, ExecutiveAgent>();

export function registerAgent(agent: ExecutiveAgent): void {
  registry.set(agent.contract.id, agent);
}

export function getAgent(id: AgentId): ExecutiveAgent | undefined {
  return registry.get(id);
}

export function listAgents(): ExecutiveAgent[] {
  return Array.from(registry.values());
}

export function listAgentContracts(): AgentContract[] {
  return listAgents().map((a) => a.contract);
}

export function hasAgent(id: AgentId): boolean {
  return registry.has(id);
}

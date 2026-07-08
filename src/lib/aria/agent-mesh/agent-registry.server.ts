// Agent registry — agents live on nodes and expose capabilities.
import type { AgentDescriptor, AgentStatus } from "./types";
import { AgentDescriptorInputZ } from "./contracts";

export interface AgentRegistry {
  readonly agents: ReadonlyArray<AgentDescriptor>;
}

export function createAgentRegistry(): AgentRegistry {
  return { agents: [] };
}

export function registerAgent(reg: AgentRegistry, descriptor: AgentDescriptor): AgentRegistry {
  const parsed = AgentDescriptorInputZ.parse(descriptor);
  const idx = reg.agents.findIndex((a) => a.agentId === parsed.agentId);
  const agents =
    idx >= 0 ? reg.agents.map((a, i) => (i === idx ? parsed : a)) : [...reg.agents, parsed];
  return { agents };
}

export function deregisterAgent(reg: AgentRegistry, agentId: string): AgentRegistry {
  return { agents: reg.agents.filter((a) => a.agentId !== agentId) };
}

export function setAgentStatus(
  reg: AgentRegistry,
  agentId: string,
  status: AgentStatus,
): AgentRegistry {
  return {
    agents: reg.agents.map((a) => (a.agentId === agentId ? { ...a, status } : a)),
  };
}

export function agentsForNode(reg: AgentRegistry, nodeId: string): ReadonlyArray<AgentDescriptor> {
  return reg.agents.filter((a) => a.nodeId === nodeId);
}

export function availableAgents(reg: AgentRegistry): ReadonlyArray<AgentDescriptor> {
  return reg.agents.filter((a) => a.status === "available");
}

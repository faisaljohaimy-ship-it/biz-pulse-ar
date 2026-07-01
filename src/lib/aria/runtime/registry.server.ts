/**
 * Phase 9.2 — Agent registry (in-memory, server-only).
 * The registry stores runtime records. It never invents agents or
 * capabilities; callers must supply a validated spec.
 */

import { AgentRuntimeSpecSchema } from "./contracts";
import type {
  AgentRuntimeRecord,
  AgentRuntimeSpec,
  BudgetUsage,
  AgentHealth,
} from "./types";

const registry = new Map<string, AgentRuntimeRecord>();

function emptyUsage(): BudgetUsage {
  return {
    tokens_used: 0,
    ms_used: 0,
    memory_mb_peak: 0,
    retries_used: 0,
    children_spawned: 0,
  };
}

function unknownHealth(): AgentHealth {
  return {
    level: "unknown",
    confidence: -1,
    last_heartbeat_at: null,
    failures: 0,
    timeouts: 0,
    notes: [],
  };
}

export function registerAgent(spec: AgentRuntimeSpec): AgentRuntimeRecord {
  const parsed = AgentRuntimeSpecSchema.parse(spec) as AgentRuntimeSpec;
  const id = parsed.identity.agent_id;
  if (registry.has(id)) {
    throw new Error(`runtime: duplicate agent id ${id}`);
  }
  const now = new Date().toISOString();
  const record: AgentRuntimeRecord = {
    spec: parsed,
    state: "Registered",
    usage: emptyUsage(),
    health: unknownHealth(),
    created_at: now,
    updated_at: now,
    scheduled_at: null,
    started_at: null,
    finished_at: null,
    last_error: null,
  };
  registry.set(id, record);
  return record;
}

export function getAgent(agentId: string): AgentRuntimeRecord | null {
  return registry.get(agentId) ?? null;
}

export function requireAgent(agentId: string): AgentRuntimeRecord {
  const rec = registry.get(agentId);
  if (!rec) throw new Error(`runtime: agent not found ${agentId}`);
  return rec;
}

export function updateAgent(
  agentId: string,
  patch: Partial<AgentRuntimeRecord>,
): AgentRuntimeRecord {
  const rec = requireAgent(agentId);
  const next: AgentRuntimeRecord = {
    ...rec,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  registry.set(agentId, next);
  return next;
}

export function listAgents(): AgentRuntimeRecord[] {
  return Array.from(registry.values());
}

export function deregisterAgent(agentId: string): boolean {
  return registry.delete(agentId);
}

export function registrySize(): number {
  return registry.size;
}

export function clearRegistry(): void {
  registry.clear();
}

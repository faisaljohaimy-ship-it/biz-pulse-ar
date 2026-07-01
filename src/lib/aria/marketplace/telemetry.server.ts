/**
 * Marketplace-internal telemetry. Not exposed to UI. Feeds health.
 */
import type { AgentId } from "../orchestrator/types";
import type { CapabilityKey, MarketplaceMetrics } from "./types";

interface AgentCounters {
  executions: number;
  failures: number;
  timeouts: number;
  retries: number;
  latency_sum_ms: number;
  latency_samples: number;
  last_seen: string | null;
  last_error?: string;
}

const counters = new Map<AgentId, AgentCounters>();
const capUsage = new Map<CapabilityKey, number>();
let installedAgents = 0;
let activeAgents = 0;

function ensure(id: AgentId): AgentCounters {
  const cur = counters.get(id);
  if (cur) return cur;
  const fresh: AgentCounters = {
    executions: 0,
    failures: 0,
    timeouts: 0,
    retries: 0,
    latency_sum_ms: 0,
    latency_samples: 0,
    last_seen: null,
  };
  counters.set(id, fresh);
  return fresh;
}

export function noteInstall(delta: number): void {
  installedAgents = Math.max(0, installedAgents + delta);
}

export function noteActive(delta: number): void {
  activeAgents = Math.max(0, activeAgents + delta);
}

export function noteExecution(
  id: AgentId,
  outcome: {
    ok: boolean;
    duration_ms: number;
    timedOut?: boolean;
    retried?: boolean;
    error?: string;
  },
): void {
  const c = ensure(id);
  c.executions += 1;
  c.latency_sum_ms += outcome.duration_ms;
  c.latency_samples += 1;
  c.last_seen = new Date().toISOString();
  if (!outcome.ok) c.failures += 1;
  if (outcome.timedOut) c.timeouts += 1;
  if (outcome.retried) c.retries += 1;
  if (outcome.error) c.last_error = outcome.error;
}

export function noteCapabilityUse(key: CapabilityKey): void {
  capUsage.set(key, (capUsage.get(key) ?? 0) + 1);
}

export function agentCounters(id: AgentId): AgentCounters | null {
  return counters.get(id) ?? null;
}

export function snapshotMetrics(): MarketplaceMetrics {
  let total_exec = 0,
    total_fail = 0,
    total_retry = 0,
    total_latency = 0,
    total_samples = 0;
  for (const c of counters.values()) {
    total_exec += c.executions;
    total_fail += c.failures;
    total_retry += c.retries;
    total_latency += c.latency_sum_ms;
    total_samples += c.latency_samples;
  }
  return {
    installed_agents: installedAgents,
    active_agents: activeAgents,
    execution_count: total_exec,
    failures: total_fail,
    retries: total_retry,
    average_latency_ms: total_samples ? total_latency / total_samples : 0,
    capability_usage: Object.fromEntries(capUsage),
  };
}

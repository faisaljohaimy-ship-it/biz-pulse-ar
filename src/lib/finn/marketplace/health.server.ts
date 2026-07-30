/**
 * Health tracker. Unavailable agents remain installed but are skipped
 * by the router until they recover.
 */
import type { AgentId } from "../orchestrator/types";
import type { AgentHealth, MarketplaceHealth } from "./types";
import { agentCounters, snapshotMetrics } from "./telemetry.server";

const availability = new Map<AgentId, boolean>();
const disabled = new Set<AgentId>();
const installed = new Set<AgentId>();
const baseConfidence = new Map<AgentId, number>();

export function noteInstalledAgent(id: AgentId, confidence: number): void {
  installed.add(id);
  availability.set(id, true);
  baseConfidence.set(id, confidence);
}

export function noteUninstalledAgent(id: AgentId): void {
  installed.delete(id);
  availability.delete(id);
  disabled.delete(id);
  baseConfidence.delete(id);
}

export function markAvailable(id: AgentId, ok: boolean): void {
  availability.set(id, ok);
}

export function disableAgent(id: AgentId): void {
  disabled.add(id);
}
export function enableAgent(id: AgentId): void {
  disabled.delete(id);
}

export function isSkippable(id: AgentId): boolean {
  return disabled.has(id) || availability.get(id) === false;
}

export function healthOf(id: AgentId): AgentHealth {
  const c = agentCounters(id);
  const executions = c?.executions ?? 0;
  const failures = c?.failures ?? 0;
  const succ = executions === 0 ? 1 : Math.max(0, (executions - failures) / executions);
  return {
    agentId: id,
    available: !isSkippable(id),
    executions,
    failures,
    timeouts: c?.timeouts ?? 0,
    retries: c?.retries ?? 0,
    latency_ms_avg: c && c.latency_samples ? c.latency_sum_ms / c.latency_samples : 0,
    confidence: baseConfidence.get(id) ?? 0.75,
    success_rate: succ,
    last_seen: c?.last_seen ?? null,
    last_error: c?.last_error,
  };
}

export function marketplaceHealth(): MarketplaceHealth {
  const agents = Array.from(installed).map((id) => healthOf(id));
  const active = agents.filter((a) => a.available).length;
  const degraded = agents.filter((a) => a.success_rate < 0.75 && a.executions > 3).length;
  return {
    installed: installed.size,
    active,
    disabled: disabled.size,
    degraded,
    agents,
  };
}

export function marketplaceMetrics() {
  return snapshotMetrics();
}

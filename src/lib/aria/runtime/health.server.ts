/**
 * Phase 9.2 — Runtime health aggregation for the multi-agent layer.
 * Complements (does not replace) Production and OS health.
 */

import { listAgents, updateAgent, requireAgent } from "./registry.server";
import { listWorkers } from "./worker.server";
import { getBindings } from "./bindings.server";
import type { AgentHealth, RuntimeHealthReport } from "./types";

export function heartbeat(agentId: string, patch: Partial<AgentHealth> = {}): AgentHealth {
  const rec = requireAgent(agentId);
  const next: AgentHealth = {
    level: patch.level ?? rec.health.level,
    confidence: patch.confidence ?? rec.health.confidence,
    last_heartbeat_at: new Date().toISOString(),
    failures: (patch.failures ?? rec.health.failures),
    timeouts: (patch.timeouts ?? rec.health.timeouts),
    notes: patch.notes ?? rec.health.notes,
  };
  updateAgent(agentId, { health: next });
  return next;
}

export function reportHealth(): RuntimeHealthReport {
  const agents = listAgents();
  const workers = listWorkers();
  const bindings = getBindings();
  return {
    taken_at: new Date().toISOString(),
    agents_total: agents.length,
    agents_running: agents.filter((a) => a.state === "Running").length,
    agents_failed: agents.filter((a) => a.state === "Failed").length,
    agents_degraded: agents.filter(
      (a) => a.health.level === "degraded" || a.health.level === "unhealthy",
    ).length,
    workers_online: workers.filter((w) => w.status !== "terminated").length,
    bindings,
    ok:
      agents.every((a) => a.state !== "Failed") &&
      workers.every((w) => w.status !== "terminated" || w.agent_id === null),
  };
}

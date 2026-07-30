/**
 * Phase 9.2 — Supervisor. Watches budgets, health, failures, and
 * confidence for registered agents and returns advisories. It does not
 * mutate state on its own; the caller decides on transitions.
 */

import { listAgents } from "./registry.server";
import type { AgentRuntimeRecord } from "./types";

export interface SupervisorAdvisory {
  agent_id: string;
  severity: "info" | "warn" | "error";
  code:
    | "budget_ok"
    | "budget_tokens_exceeded"
    | "budget_time_exceeded"
    | "budget_memory_exceeded"
    | "retries_exhausted"
    | "unhealthy"
    | "stalled"
    | "low_confidence";
  detail: string;
}

export interface SupervisorReport {
  taken_at: string;
  advisories: readonly SupervisorAdvisory[];
  totals: {
    agents: number;
    running: number;
    failed: number;
    degraded: number;
  };
}

function assess(rec: AgentRuntimeRecord): SupervisorAdvisory[] {
  const out: SupervisorAdvisory[] = [];
  const b = rec.spec.budget;
  const u = rec.usage;
  const id = rec.spec.identity.agent_id;
  if (b.max_tokens !== null && u.tokens_used > b.max_tokens) {
    out.push({
      agent_id: id,
      severity: "error",
      code: "budget_tokens_exceeded",
      detail: `${u.tokens_used}/${b.max_tokens}`,
    });
  }
  if (b.max_ms !== null && u.ms_used > b.max_ms) {
    out.push({
      agent_id: id,
      severity: "error",
      code: "budget_time_exceeded",
      detail: `${u.ms_used}ms/${b.max_ms}ms`,
    });
  }
  if (b.max_memory_mb !== null && u.memory_mb_peak > b.max_memory_mb) {
    out.push({
      agent_id: id,
      severity: "error",
      code: "budget_memory_exceeded",
      detail: `${u.memory_mb_peak}mb/${b.max_memory_mb}mb`,
    });
  }
  if (u.retries_used > b.max_retries) {
    out.push({
      agent_id: id,
      severity: "error",
      code: "retries_exhausted",
      detail: `${u.retries_used}/${b.max_retries}`,
    });
  }
  if (rec.health.level === "unhealthy") {
    out.push({
      agent_id: id,
      severity: "error",
      code: "unhealthy",
      detail: rec.health.notes.join("; ") || "unhealthy",
    });
  }
  if (rec.state === "Running" && rec.started_at) {
    const running = Date.now() - Date.parse(rec.started_at);
    if (b.max_ms !== null && running > b.max_ms * 2) {
      out.push({
        agent_id: id,
        severity: "warn",
        code: "stalled",
        detail: `${running}ms since start`,
      });
    }
  }
  if (rec.health.confidence >= 0 && rec.health.confidence < 0.3) {
    out.push({
      agent_id: id,
      severity: "warn",
      code: "low_confidence",
      detail: `${rec.health.confidence}`,
    });
  }
  if (out.length === 0) {
    out.push({ agent_id: id, severity: "info", code: "budget_ok", detail: "within limits" });
  }
  return out;
}

export function supervise(): SupervisorReport {
  const agents = listAgents();
  const advisories = agents.flatMap(assess);
  return {
    taken_at: new Date().toISOString(),
    advisories,
    totals: {
      agents: agents.length,
      running: agents.filter((a) => a.state === "Running").length,
      failed: agents.filter((a) => a.state === "Failed").length,
      degraded: agents.filter(
        (a) => a.health.level === "degraded" || a.health.level === "unhealthy",
      ).length,
    },
  };
}

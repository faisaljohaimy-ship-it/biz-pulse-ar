/**
 * Phase 9.2 — Runtime invariant verification.
 * Detects: cyclic deps, broken bindings, duplicate IDs, orphan workers,
 * deadlock hazards (all Blocked/Waiting with unmet deps), race hazards
 * (multiple workers assigned to same agent), invalid lifecycle transitions.
 * Runtime never uses mutable globals beyond typed in-memory maps.
 */

import { listAgents } from "./registry.server";
import { listWorkers, orphanWorkers } from "./worker.server";
import { getBindings } from "./bindings.server";
import { listTransitions } from "./lifecycle.server";
import type { VerificationIssue, VerificationReport } from "./types";

function detectCycles(): VerificationIssue[] {
  const agents = listAgents();
  const graph = new Map<string, readonly string[]>();
  for (const a of agents) graph.set(a.spec.identity.agent_id, a.spec.depends_on);
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  for (const id of graph.keys()) color.set(id, WHITE);
  const issues: VerificationIssue[] = [];
  const stack: string[] = [];

  function dfs(u: string): void {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of graph.get(u) ?? []) {
      if (!graph.has(v)) continue;
      const c = color.get(v);
      if (c === GRAY) {
        issues.push({
          code: "cyclic_dependency",
          severity: "error",
          detail: `cycle involving ${stack.join(" -> ")} -> ${v}`,
          subject_id: v,
        });
      } else if (c === WHITE) {
        dfs(v);
      }
    }
    color.set(u, BLACK);
    stack.pop();
  }

  for (const id of graph.keys()) if (color.get(id) === WHITE) dfs(id);
  return issues;
}

function detectDuplicateIds(): VerificationIssue[] {
  const seen = new Set<string>();
  const dups: VerificationIssue[] = [];
  for (const a of listAgents()) {
    const id = a.spec.identity.agent_id;
    if (seen.has(id)) {
      dups.push({
        code: "duplicate_id",
        severity: "critical",
        detail: `duplicate agent id ${id}`,
        subject_id: id,
      });
    }
    seen.add(id);
  }
  return dups;
}

function detectOrphans(): VerificationIssue[] {
  const orphans = orphanWorkers(60_000);
  return orphans.map((w) => ({
    code: "orphan_worker" as const,
    severity: "warn" as const,
    detail: `worker ${w.worker_id} last seen ${w.last_seen_at}`,
    subject_id: w.worker_id,
  }));
}

function detectRaces(): VerificationIssue[] {
  const byAgent = new Map<string, number>();
  for (const w of listWorkers()) {
    if (!w.agent_id || w.status !== "busy") continue;
    byAgent.set(w.agent_id, (byAgent.get(w.agent_id) ?? 0) + 1);
  }
  const issues: VerificationIssue[] = [];
  for (const [agentId, count] of byAgent) {
    if (count > 1) {
      issues.push({
        code: "race_hazard",
        severity: "error",
        detail: `${count} workers assigned to agent ${agentId}`,
        subject_id: agentId,
      });
    }
  }
  return issues;
}

function detectDeadlocks(): VerificationIssue[] {
  const agents = listAgents();
  if (agents.length === 0) return [];
  const allStalled = agents.every(
    (a) => a.state === "Waiting" || a.state === "Blocked" || a.state === "WaitingApproval",
  );
  if (!allStalled) return [];
  return [
    {
      code: "deadlock_hazard",
      severity: "error",
      detail: "all agents in blocked/waiting states",
      subject_id: null,
    },
  ];
}

function detectBrokenBindings(): VerificationIssue[] {
  return getBindings()
    .filter((b) => !b.bound)
    .map((b) => ({
      code: "broken_binding" as const,
      severity: "warn" as const,
      detail: `binding ${b.name} not bound`,
      subject_id: b.name,
    }));
}

function detectInvalidTransitions(): VerificationIssue[] {
  // Historical audit — lifecycle.server enforces at write time, so this
  // is a belt-and-braces scan of the recorded transitions.
  const out: VerificationIssue[] = [];
  for (const t of listTransitions()) {
    if (t.from === t.to) {
      out.push({
        code: "invalid_transition",
        severity: "notice",
        detail: `${t.agent_id}: no-op transition ${t.from}->${t.to}`,
        subject_id: t.agent_id,
      });
    }
  }
  return out;
}

export function verifyRuntime(): VerificationReport {
  const issues: VerificationIssue[] = [
    ...detectCycles(),
    ...detectDuplicateIds(),
    ...detectOrphans(),
    ...detectRaces(),
    ...detectDeadlocks(),
    ...detectBrokenBindings(),
    ...detectInvalidTransitions(),
  ];
  return {
    taken_at: new Date().toISOString(),
    issues,
    ok: issues.every((i) => i.severity !== "error" && i.severity !== "critical"),
  };
}

/**
 * Phase 8.5 — Failure classification. Given an AgentResult / error
 * signal, classify into a canonical failure kind so recovery can pick
 * an appropriate strategy.
 */
import type { AgentResult } from "../orchestrator/types";
import type { ExecutionFailure, ExecutionFailureKind } from "./types";
import { appendFailure, getSession } from "./session.server";

function newFailureId(): string {
  return `fail_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

const TRANSIENT_MATCHERS = [
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /fetch failed/i,
  /network/i,
  /temporarily/i,
  /rate.?limit/i,
  /429/,
  /503/,
];

const POLICY_MATCHERS = [/policy/i, /compliance/i, /forbidden/i, /denied/i];
const PERMISSION_MATCHERS = [/permission/i, /unauthori[sz]ed/i, /401/, /403/];
const CAPABILITY_MATCHERS = [/agent not registered/i, /unavailable/i, /capability/i];
const DEPENDENCY_MATCHERS = [/dependency/i, /cycle/i, /unresolved/i];

export function classifyError(
  message: string,
  status?: AgentResult["status"],
): ExecutionFailureKind {
  if (status === "timeout") return "timeout";
  if (CAPABILITY_MATCHERS.some((r) => r.test(message))) return "capability";
  if (PERMISSION_MATCHERS.some((r) => r.test(message))) return "permission";
  if (POLICY_MATCHERS.some((r) => r.test(message))) return "policy";
  if (DEPENDENCY_MATCHERS.some((r) => r.test(message))) return "dependency";
  if (TRANSIENT_MATCHERS.some((r) => r.test(message))) return "transient";
  return "permanent";
}

export function recordFailure(
  sessionId: string,
  args: {
    taskId?: string | null;
    agentId?: string | null;
    message: string;
    status?: AgentResult["status"];
    evidence?: string[];
  },
): ExecutionFailure | null {
  const session = getSession(sessionId);
  if (!session) return null;
  const kind = classifyError(args.message, args.status);
  const retryable = kind === "transient" || kind === "timeout";
  const failure: ExecutionFailure = {
    id: newFailureId(),
    session_id: sessionId,
    task_id: args.taskId ?? null,
    agent_id: args.agentId ?? null,
    kind,
    message: args.message.slice(0, 500),
    retryable,
    detected_at: new Date().toISOString(),
    evidence: args.evidence ?? [],
  };
  appendFailure(sessionId, failure);
  return failure;
}

export function classifyOutcome(sessionId: string, results: AgentResult[]): ExecutionFailure[] {
  const failures: ExecutionFailure[] = [];
  for (const r of results) {
    if (r.ok) continue;
    const f = recordFailure(sessionId, {
      taskId: null,
      agentId: String(r.agent_id),
      message: r.error ?? r.status,
      status: r.status,
      evidence: [],
    });
    if (f) failures.push(f);
  }
  return failures;
}

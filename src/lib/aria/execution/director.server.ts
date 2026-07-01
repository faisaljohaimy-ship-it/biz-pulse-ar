/**
 * Phase 8.5 — Autonomous Execution Director (server-only).
 *
 * Sits between the Planning Engine → Task Bus → Orchestrator →
 * Marketplace → Agents pipeline and coordinates the runtime lifecycle
 * of a mission. The Director:
 *   • creates and owns the ExecutionSession
 *   • installs monitors on Task Bus events
 *   • takes automatic checkpoints per stage
 *   • runs the Orchestrator (never executes agents directly)
 *   • classifies failures, decides retry/rollback/escalate/abort,
 *     records recoveries, evaluates runtime policies, requests
 *     human-in-the-loop approvals
 *
 * It never modifies the Orchestrator, Task Bus, Marketplace, Planner,
 * Executive Brain, or Memory. All interactions go through the public
 * surfaces those modules already expose.
 */
import type {
  ExecutionResult,
  ExecutionSession,
} from "./types";
import type { MissionRequest } from "../orchestrator/types";
import { runAgentMission } from "../orchestrator";
import {
  appendDecision,
  createSession,
  disposeSession,
  getController,
  getSession,
  isPaused,
  requestPause,
  requestResume,
  armPauseGate,
  setOutcome,
  setState,
  waitIfPaused,
} from "./session.server";
import { attachMonitor } from "./monitor.server";
import { createCheckpoint } from "./checkpoint.server";
import { computeProgress } from "./progress.server";
import { classifyOutcome, recordFailure } from "./failure.server";
import { planRecovery } from "./recovery.server";
import { decideNext } from "./decision.server";
import { assessHealth } from "./health.server";
import { refreshMetrics } from "./metrics.server";
import { performRollback } from "./rollback.server";
import { emitExecutionEvent } from "./events";
import { pendingApprovals, requestApproval } from "./approval.server";

function newDecisionId(): string {
  return `dec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function newMissionId(): string {
  return `mis_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface ExecuteMissionOptions {
  apiKey?: string;
}

/** Execute a mission end-to-end and return the session snapshot. */
export async function executeMission(
  request: MissionRequest,
  opts: ExecuteMissionOptions = {},
): Promise<ExecutionResult> {
  const missionId = request.missionId ?? newMissionId();
  const session = createSession({ ...request, missionId }, missionId);
  armPauseGate(session.session_id);
  const controller = getController(session.session_id);
  if (!controller) throw new Error("session controller missing");

  const externalSignal = request.signal;
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }

  setState(session.session_id, "running", "mission started");
  emitExecutionEvent("MissionStarted", session.session_id, missionId, {
    question: request.question.slice(0, 200),
  });
  createCheckpoint(session.session_id, "start", "initial checkpoint before dispatch");

  const detachMonitor = attachMonitor(session.session_id, missionId);

  try {
    // Pause is a cooperative gate — respected before dispatch.
    await waitIfPaused(session.session_id, controller.signal);
    if (isPaused(session.session_id)) {
      setState(session.session_id, "paused", "paused before dispatch");
      emitExecutionEvent("MissionPaused", session.session_id, missionId, { at: "pre-dispatch" });
      return finalize(session);
    }

    const outcome = await runAgentMission(
      { ...request, missionId, signal: controller.signal },
      { apiKey: opts.apiKey },
    );
    setOutcome(session.session_id, outcome);
    session.intent = outcome.plan.intent;

    createCheckpoint(session.session_id, "orchestrator_returned", "orchestrator completed dispatch", {
      completedAgentIds: outcome.results.filter((r) => r.ok).map((r) => String(r.agent_id)),
    });

    computeProgress(session.session_id, missionId);

    // Classify failures and drive one decision cycle per failure.
    const failures = classifyOutcome(session.session_id, outcome.results);
    for (const f of failures) {
      const decision = decideNext({ sessionId: session.session_id, failure: f });
      if (decision.kind === "retry") {
        // Retry is a hint for the caller — we already ran once via the
        // Task Bus which has its own retry loop; escalate to recovery
        // if the failure survived that.
        planRecovery(session.session_id, f);
      } else if (decision.kind === "rollback") {
        planRecovery(session.session_id, f);
        performRollback(session.session_id, null, decision.reason);
      } else if (decision.kind === "escalate") {
        planRecovery(session.session_id, f);
        requestApproval(session.session_id, `escalation: ${f.message}`, f.task_id ?? undefined);
      } else if (decision.kind === "abort") {
        planRecovery(session.session_id, f);
        controller.abort();
      }
    }

    if (outcome.cancelled) {
      setState(session.session_id, "cancelled", "mission cancelled by controller");
      emitExecutionEvent("ExecutionCancelled", session.session_id, missionId);
    } else if (failures.length && session.progress.failed >= session.progress.total && session.progress.total > 0) {
      setState(session.session_id, "failed", "all tasks failed");
      emitExecutionEvent("MissionFailed", session.session_id, missionId, {
        failures: failures.length,
      });
    } else if (pendingApprovals(session.session_id).length) {
      setState(session.session_id, "awaiting_approval", "pending approvals block completion");
    } else {
      setState(session.session_id, "completed", "mission completed");
      emitExecutionEvent("MissionCompleted", session.session_id, missionId, {
        duration_ms: outcome.duration_ms,
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    recordFailure(session.session_id, {
      taskId: null,
      agentId: null,
      message,
      status: "failed",
    });
    setState(session.session_id, "failed", `unhandled: ${message}`);
    emitExecutionEvent("MissionFailed", session.session_id, missionId, { error: message });
  } finally {
    detachMonitor();
    if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);
    assessHealth(session.session_id);
    refreshMetrics(session.session_id);
    disposeSession(session.session_id);
  }

  return finalize(session);
}

/** Cooperatively pause an active session. */
export function pauseMission(sessionId: string, reason: string): ExecutionSession | null {
  const s = getSession(sessionId);
  if (!s) return null;
  if (s.state !== "running") return s;
  requestPause(sessionId);
  setState(sessionId, "paused", reason);
  appendDecision(sessionId, {
    id: newDecisionId(),
    session_id: sessionId,
    kind: "pause",
    reason,
    ts: new Date().toISOString(),
  });
  emitExecutionEvent("MissionPaused", sessionId, s.mission_id, { reason });
  return s;
}

/** Resume a paused session; if terminal, this is a no-op returning the session. */
export function resumeMission(sessionId: string): ExecutionSession | null {
  const s = getSession(sessionId);
  if (!s) return null;
  if (s.state !== "paused" && s.state !== "awaiting_approval") return s;
  requestResume(sessionId);
  setState(sessionId, "running", "resume requested");
  s.resumed_at = new Date().toISOString();
  appendDecision(sessionId, {
    id: newDecisionId(),
    session_id: sessionId,
    kind: "continue",
    reason: "resume requested",
    ts: new Date().toISOString(),
  });
  emitExecutionEvent("MissionResumed", sessionId, s.mission_id);
  return s;
}

/** Cancel a session — aborts the underlying controller if still active. */
export function cancelMission(sessionId: string, reason: string): ExecutionSession | null {
  const s = getSession(sessionId);
  if (!s) return null;
  const controller = getController(sessionId);
  controller?.abort();
  requestResume(sessionId); // wake any pause gate so cleanup can run
  setState(sessionId, "cancelled", reason);
  appendDecision(sessionId, {
    id: newDecisionId(),
    session_id: sessionId,
    kind: "abort",
    reason,
    ts: new Date().toISOString(),
  });
  emitExecutionEvent("ExecutionCancelled", sessionId, s.mission_id, { reason });
  return s;
}

/**
 * Retry a session by executing a fresh mission that inherits the same
 * request. The original session remains for post-mortem; a new session
 * id is returned in the ExecutionResult.
 */
export async function retryMission(
  sessionId: string,
  scope: "failed_only" | "since_last_checkpoint" | "all",
  opts: ExecuteMissionOptions = {},
): Promise<ExecutionResult | null> {
  const s = getSession(sessionId);
  if (!s) return null;
  appendDecision(sessionId, {
    id: newDecisionId(),
    session_id: sessionId,
    kind: "retry",
    reason: `retry scope=${scope}`,
    ts: new Date().toISOString(),
  });
  return executeMission(s.request, opts);
}

/** Roll a session back to a checkpoint (metadata rollback). */
export function rollbackMission(
  sessionId: string,
  toCheckpointId: string | null,
  reason: string,
): ExecutionSession | null {
  const s = getSession(sessionId);
  if (!s) return null;
  performRollback(sessionId, toCheckpointId, reason);
  return s;
}

function finalize(session: ExecutionSession): ExecutionResult {
  computeProgress(session.session_id, session.mission_id);
  assessHealth(session.session_id);
  refreshMetrics(session.session_id);
  const duration = session.finished_at
    ? new Date(session.finished_at).getTime() - new Date(session.created_at).getTime()
    : Date.now() - new Date(session.created_at).getTime();
  return {
    session_id: session.session_id,
    mission_id: session.mission_id,
    state: session.state,
    health: session.health,
    outcome: session.outcome,
    progress: session.progress,
    metrics: session.metrics,
    checkpoints: session.checkpoints.slice(),
    failures: session.failures.slice(),
    recoveries: session.recoveries.slice(),
    decisions: session.decisions.slice(),
    approvals: session.approvals.slice(),
    duration_ms: Math.max(0, duration),
  };
}

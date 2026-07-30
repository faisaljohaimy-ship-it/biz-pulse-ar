/**
 * Phase 8.5 — Execution Session store. Server-only, in-memory.
 *
 * Owns the lifecycle of every active execution session. Never mutates
 * Memory, Brain, Planner, Task Bus or Marketplace internals.
 */
import type {
  ExecutionApproval,
  ExecutionCheckpoint,
  ExecutionDecision,
  ExecutionFailure,
  ExecutionHealth,
  ExecutionRecovery,
  ExecutionSession,
  ExecutionState,
} from "./types";
import type { MissionOutcome, MissionRequest } from "../orchestrator/types";
import { emitExecutionEvent } from "./events";

const sessions = new Map<string, ExecutionSession>();
const controllers = new Map<string, AbortController>();
const pauseGates = new Map<string, { paused: boolean; resume: () => void }>();

function newSessionId(): string {
  return `exs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyProgress(): ExecutionSession["progress"] {
  return {
    completed: 0,
    running: 0,
    blocked: 0,
    failed: 0,
    cancelled: 0,
    skipped: 0,
    remaining: 0,
    total: 0,
    critical_path: [],
    eta_ms: null,
    percent: 0,
  };
}

function emptyMetrics(sessionId: string): ExecutionSession["metrics"] {
  return {
    session_id: sessionId,
    duration_ms: 0,
    task_throughput: 0,
    retry_count: 0,
    rollback_count: 0,
    recovery_count: 0,
    success_rate: 0,
    critical_path_delay_ms: 0,
  };
}

export function createSession(request: MissionRequest, missionId: string): ExecutionSession {
  const sessionId = newSessionId();
  const now = new Date().toISOString();
  const session: ExecutionSession = {
    session_id: sessionId,
    mission_id: missionId,
    intent: "question",
    state: "created",
    health: "healthy",
    request,
    created_at: now,
    started_at: null,
    finished_at: null,
    paused_at: null,
    resumed_at: null,
    cancelled_at: null,
    checkpoints: [],
    decisions: [],
    failures: [],
    recoveries: [],
    approvals: [],
    progress: emptyProgress(),
    metrics: emptyMetrics(sessionId),
    outcome: null,
    reasons: [],
  };
  sessions.set(sessionId, session);
  controllers.set(sessionId, new AbortController());
  return session;
}

export function getSession(sessionId: string): ExecutionSession | null {
  return sessions.get(sessionId) ?? null;
}

export function listSessions(): ExecutionSession[] {
  return Array.from(sessions.values());
}

export function getController(sessionId: string): AbortController | null {
  return controllers.get(sessionId) ?? null;
}

export function setState(sessionId: string, state: ExecutionState, reason?: string): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.state = state;
  if (reason) s.reasons.push(`[${state}] ${reason}`);
  if (state === "running" && !s.started_at) s.started_at = new Date().toISOString();
  if (state === "paused") s.paused_at = new Date().toISOString();
  if (state === "cancelled") s.cancelled_at = new Date().toISOString();
  if (state === "completed" || state === "failed" || state === "cancelled") {
    s.finished_at = new Date().toISOString();
  }
}

export function setHealth(sessionId: string, health: ExecutionHealth, reason: string): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  if (s.health === health) return;
  s.health = health;
  emitExecutionEvent("HealthChanged", sessionId, s.mission_id, { health, reason });
}

export function appendCheckpoint(sessionId: string, cp: ExecutionCheckpoint): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.checkpoints.push(cp);
  emitExecutionEvent("CheckpointTaken", sessionId, s.mission_id, {
    checkpoint_id: cp.id,
    stage: cp.stage,
  });
}

export function appendDecision(sessionId: string, d: ExecutionDecision): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.decisions.push(d);
}

export function appendFailure(sessionId: string, f: ExecutionFailure): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.failures.push(f);
}

export function appendRecovery(sessionId: string, r: ExecutionRecovery): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.recoveries.push(r);
  s.metrics.recovery_count += 1;
}

export function appendApproval(sessionId: string, a: ExecutionApproval): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.approvals.push(a);
}

export function setOutcome(sessionId: string, outcome: MissionOutcome): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.outcome = outcome;
}

// --- Pause gate ---------------------------------------------------------

export function armPauseGate(sessionId: string): void {
  pauseGates.set(sessionId, { paused: false, resume: () => undefined });
}

export function requestPause(sessionId: string): void {
  const g = pauseGates.get(sessionId);
  if (!g) return;
  g.paused = true;
}

export function requestResume(sessionId: string): void {
  const g = pauseGates.get(sessionId);
  if (!g) return;
  g.paused = false;
  g.resume();
}

export function isPaused(sessionId: string): boolean {
  return pauseGates.get(sessionId)?.paused === true;
}

/** Awaited by the runtime loop between task drains; resolves when resumed. */
export function waitIfPaused(sessionId: string, signal: AbortSignal): Promise<void> {
  const g = pauseGates.get(sessionId);
  if (!g || !g.paused) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const onAbort = () => resolve();
    g.resume = () => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    };
    if (signal.aborted) return resolve();
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function disposeSession(sessionId: string): void {
  controllers.delete(sessionId);
  pauseGates.delete(sessionId);
  // Keep session record for post-mortem introspection.
}

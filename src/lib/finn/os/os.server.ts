/**
 * Phase 8.9 — Executive Operating System kernel.
 *
 * Owns the session lifecycle (start / continue / finish / restore) and
 * delegates every heavy operation to the underlying subsystems through
 * `coordination.server`. The kernel itself holds only OS-level state:
 * sessions, their workspace binding, open missions and recent signals.
 */

import {
  ContinueSessionInputSchema,
  FinishSessionInputSchema,
  RestoreSessionInputSchema,
  StartSessionInputSchema,
  type ContinueSessionInput,
  type FinishSessionInput,
  type RestoreSessionInput,
  type StartSessionInput,
} from "./contracts";
import { loadWorkspace, getWorkspace } from "./workspace.server";
import { appendTurn, composeBrainRequest, openConversation } from "./conversation.server";
import { coordinateMission } from "./coordination.server";
import { emitOSEvent } from "./events";
import { evaluateOSHealth } from "./health.server";
import {
  noteSessionEnded,
  noteSessionStarted,
  noteWorkspaceLoaded,
  snapshotMetrics,
} from "./metrics.server";
import { listArtifacts } from "./artifact.server";
import type {
  ExecutiveMissionResult,
  ExecutiveSession,
  ExecutiveSessionId,
  ExecutiveSignal,
  ExecutiveSnapshot,
  ExecutiveState,
} from "./types";

const SESSIONS = new Map<ExecutiveSessionId, ExecutiveSession>();
const MAX_SIGNALS = 32;

function uid(): string {
  return `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function replaceSession(next: ExecutiveSession): ExecutiveSession {
  SESSIONS.set(next.id, next);
  return next;
}

function withState(session: ExecutiveSession, state: ExecutiveState): ExecutiveSession {
  return replaceSession({
    ...session,
    state,
    last_active_at: nowIso(),
  });
}

function pushSignal(session: ExecutiveSession, signal: ExecutiveSignal): ExecutiveSession {
  const signals = [...session.recent_signals, signal].slice(-MAX_SIGNALS);
  return replaceSession({ ...session, recent_signals: signals });
}

// ---------------------------------------------------------------------------
// Kernel public API
// ---------------------------------------------------------------------------

export function startSession(input: StartSessionInput): ExecutiveSession {
  const parsed = StartSessionInputSchema.parse(input);
  const workspace = loadWorkspace({
    owner: parsed.owner,
    org_id: parsed.org_id ?? null,
    workspace_id: parsed.workspace_id,
    title: parsed.title,
    departments: parsed.departments,
    projects: parsed.projects,
    focus_site: parsed.focus_site,
  });
  noteWorkspaceLoaded();

  const conversation = openConversation(uid());
  // openConversation used the arg as the session id; rebind properly.
  const session_id = conversation.session_id;

  const now = nowIso();
  const session: ExecutiveSession = {
    id: session_id,
    workspace_id: workspace.id,
    owner: parsed.owner,
    org_id: parsed.org_id ?? null,
    conversation_id: conversation.id,
    state: "idle",
    started_at: now,
    last_active_at: now,
    closed_at: null,
    open_missions: [],
    recent_signals: [],
  };
  SESSIONS.set(session_id, session);

  noteSessionStarted();
  emitOSEvent("ExecutiveSessionStarted", {
    session_id,
    workspace_id: workspace.id,
    detail: { owner: parsed.owner, org_id: parsed.org_id ?? null },
  });

  return session;
}

export async function continueSession(input: ContinueSessionInput): Promise<{
  session: ExecutiveSession;
  result: ExecutiveMissionResult;
}> {
  const parsed = ContinueSessionInputSchema.parse(input);
  const current = SESSIONS.get(parsed.session_id);
  if (!current) throw new Error(`Executive session not found: ${parsed.session_id}`);
  if (current.closed_at) throw new Error(`Executive session already closed: ${parsed.session_id}`);

  let session = withState(current, "thinking");

  appendTurn(session.id, session.workspace_id, {
    role: "user",
    text: parsed.question,
  });

  const brainRequest = composeBrainRequest({
    session_id: session.id,
    question: parsed.question,
    lang: parsed.lang,
  });

  session = withState(session, "planning");

  const result = await coordinateMission({
    session_id: session.id,
    workspace_id: session.workspace_id,
    objective_id: parsed.objective_id ?? null,
    request: brainRequest,
    lang: parsed.lang,
    api_key: parsed.api_key,
  });

  const assistantText =
    result.answer?.text_en ??
    result.answer?.text_ar ??
    (result.mission.state === "failed"
      ? "Executive brain unavailable — see internal logs."
      : "Mission completed.");

  appendTurn(
    session.id,
    session.workspace_id,
    { role: "assistant", text: assistantText },
    result.mission.answer_artifact_id ?? undefined,
  );

  session = replaceSession({
    ...session,
    state: result.mission.state === "failed" ? "reflecting" : "idle",
    last_active_at: nowIso(),
    open_missions:
      result.mission.state === "completed"
        ? session.open_missions.filter((id) => id !== result.mission.id)
        : [...session.open_missions, result.mission.id],
  });

  if (result.mission.state === "failed" && result.mission.error) {
    session = pushSignal(session, {
      kind: "alert",
      title: "Mission failed",
      detail: result.mission.error,
      priority: "high",
      source: "executive-os",
      ts: nowIso(),
    });
  } else if (result.answer?.decision?.requires_human_approval) {
    session = pushSignal(session, {
      kind: "decision",
      title: "Decision requires human approval",
      detail: result.answer.decision.rationale_en,
      priority: "high",
      source: "executive-brain",
      ts: nowIso(),
    });
  }

  return { session, result };
}

export function finishSession(input: FinishSessionInput): ExecutiveSession {
  const parsed = FinishSessionInputSchema.parse(input);
  const current = SESSIONS.get(parsed.session_id);
  if (!current) throw new Error(`Executive session not found: ${parsed.session_id}`);
  if (current.closed_at) return current;
  const closed: ExecutiveSession = {
    ...current,
    state: "closed",
    closed_at: nowIso(),
    last_active_at: nowIso(),
  };
  SESSIONS.set(closed.id, closed);
  noteSessionEnded();
  emitOSEvent("ExecutiveSessionEnded", {
    session_id: closed.id,
    workspace_id: closed.workspace_id,
    detail: { reason: parsed.reason ?? "user_requested" },
  });
  return closed;
}

export function restoreSession(input: RestoreSessionInput): ExecutiveSession | null {
  const parsed = RestoreSessionInputSchema.parse(input);
  const cur = SESSIONS.get(parsed.session_id);
  if (!cur) return null;
  if (!getWorkspace(cur.workspace_id)) return null;
  const refreshed: ExecutiveSession = {
    ...cur,
    state: cur.closed_at ? "closed" : "idle",
    last_active_at: nowIso(),
  };
  SESSIONS.set(refreshed.id, refreshed);
  emitOSEvent("WorkspaceLoaded", {
    session_id: refreshed.id,
    workspace_id: refreshed.workspace_id,
    detail: { via: "restore" },
  });
  return refreshed;
}

// ---------------------------------------------------------------------------
// Read-only helpers
// ---------------------------------------------------------------------------

export function getSession(session_id: ExecutiveSessionId): ExecutiveSession | null {
  return SESSIONS.get(session_id) ?? null;
}

export function listSessions(owner?: string): ReadonlyArray<ExecutiveSession> {
  const all = Array.from(SESSIONS.values());
  return owner ? all.filter((s) => s.owner === owner) : all;
}

export function snapshotSession(session_id: ExecutiveSessionId): ExecutiveSnapshot | null {
  const s = SESSIONS.get(session_id);
  if (!s) return null;
  return {
    session_id: s.id,
    workspace_id: s.workspace_id,
    state: s.state,
    health: evaluateOSHealth(),
    metrics: snapshotMetrics(s.workspace_id),
    open_missions: s.open_missions,
    recent_artifacts: listArtifacts({ session_id: s.id, limit: 10 }).map((a) => a.id),
    recent_signals: s.recent_signals,
    taken_at: nowIso(),
  };
}

/**
 * Phase 8.9 — Executive timeline (history / replay).
 *
 * The timeline is an append-only log of OS-level events per session. It
 * is derived from the OS event bus, not from subsystem event streams —
 * the Task Bus, Planning, Execution and Orchestrator events remain owned
 * by their originating phases.
 */

import { subscribeOS } from "./events";
import type {
  ExecutiveSessionId,
  ExecutiveTimeline,
  ExecutiveTimelineEvent,
  ExecutiveTimelineEventKind,
  ExecutiveWorkspaceId,
} from "./types";

const TIMELINES = new Map<ExecutiveSessionId, ExecutiveTimelineEvent[]>();
let SEQ = 0;
const MAX_EVENTS = 500;

function nextSeq(): number {
  SEQ += 1;
  return SEQ;
}

const KIND_MAP: Record<string, ExecutiveTimelineEventKind> = {
  ExecutiveSessionStarted: "session_started",
  ExecutiveSessionEnded: "session_ended",
  WorkspaceLoaded: "workspace_loaded",
  WorkspaceSaved: "workspace_saved",
  MissionStarted: "mission_started",
  MissionCompleted: "mission_completed",
  MissionFailed: "mission_failed",
  MissionArchived: "mission_archived",
  ObjectiveUpdated: "objective_updated",
  ObjectiveCreated: "objective_updated",
  ArtifactCreated: "artifact_created",
  ArtifactUpdated: "artifact_updated",
  OSHealthChanged: "health_changed",
};

subscribeOS((event) => {
  const mapped = KIND_MAP[event.name];
  if (!mapped) return;
  const session_id = event.session_id;
  const workspace_id = event.workspace_id;
  if (!session_id || !workspace_id) return;
  append({
    seq: nextSeq(),
    kind: mapped,
    session_id,
    workspace_id,
    mission_id: event.mission_id,
    detail: event.detail,
    ts: event.ts,
  });
});

function append(event: ExecutiveTimelineEvent): void {
  const list = TIMELINES.get(event.session_id) ?? [];
  list.push(event);
  if (list.length > MAX_EVENTS) list.splice(0, list.length - MAX_EVENTS);
  TIMELINES.set(event.session_id, list);
}

/** Explicit turn recorder — called by conversation.server. */
export function recordConversationTurn(
  session_id: ExecutiveSessionId,
  workspace_id: ExecutiveWorkspaceId,
  detail: Readonly<Record<string, unknown>>,
): void {
  append({
    seq: nextSeq(),
    kind: "conversation_turn",
    session_id,
    workspace_id,
    detail,
    ts: new Date().toISOString(),
  });
}

export function getTimeline(
  session_id: ExecutiveSessionId,
): ExecutiveTimeline {
  const events = TIMELINES.get(session_id) ?? [];
  return { session_id, events };
}

export function replayTimeline(
  session_id: ExecutiveSessionId,
  fromSeq?: number,
): ReadonlyArray<ExecutiveTimelineEvent> {
  const events = TIMELINES.get(session_id) ?? [];
  return fromSeq === undefined
    ? events
    : events.filter((e) => e.seq > fromSeq);
}

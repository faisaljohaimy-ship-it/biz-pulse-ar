/**
 * Phase 8.9 — OS-level event bus (in-memory, additive).
 *
 * Consumers subscribe via `subscribeOS(listener)`. Producers inside the OS
 * emit via `emitOSEvent(...)`. No subsystem event is duplicated here — the
 * OS only publishes lifecycle events for OS-owned artifacts.
 */

import type {
  ExecutiveArtifactId,
  ExecutiveMissionId,
  ExecutiveObjectiveId,
  ExecutiveSessionId,
  ExecutiveWorkspaceId,
  ExecutiveHealthLevel,
} from "./types";

export type ExecutiveOSEventName =
  | "ExecutiveSessionStarted"
  | "ExecutiveSessionEnded"
  | "WorkspaceLoaded"
  | "WorkspaceSaved"
  | "MissionStarted"
  | "MissionCompleted"
  | "MissionFailed"
  | "MissionArchived"
  | "ObjectiveCreated"
  | "ObjectiveUpdated"
  | "ArtifactCreated"
  | "ArtifactUpdated"
  | "OSHealthChanged";

export interface ExecutiveOSEvent {
  readonly name: ExecutiveOSEventName;
  readonly session_id?: ExecutiveSessionId;
  readonly workspace_id?: ExecutiveWorkspaceId;
  readonly mission_id?: ExecutiveMissionId;
  readonly artifact_id?: ExecutiveArtifactId;
  readonly objective_id?: ExecutiveObjectiveId;
  readonly health?: ExecutiveHealthLevel;
  readonly detail?: Readonly<Record<string, unknown>>;
  readonly ts: string;
}

type Listener = (event: ExecutiveOSEvent) => void;
const LISTENERS = new Set<Listener>();

export function subscribeOS(listener: Listener): () => void {
  LISTENERS.add(listener);
  return () => LISTENERS.delete(listener);
}

export function emitOSEvent(
  name: ExecutiveOSEventName,
  payload: Omit<ExecutiveOSEvent, "name" | "ts"> = {},
): ExecutiveOSEvent {
  const event: ExecutiveOSEvent = {
    name,
    ts: new Date().toISOString(),
    ...payload,
  };
  for (const listener of LISTENERS) {
    try {
      listener(event);
    } catch {
      // Listener failures never break emission.
    }
  }
  return event;
}

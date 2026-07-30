/**
 * Phase 8.9 — Unified executive artifact repository.
 *
 * A single append-only store for OS-visible artifacts (plans, reports,
 * answers, reasoning traces, results, files, notes). Payloads are opaque
 * to the OS — subsystem types (`ExecutionPlan`, `CognitiveSession`,
 * `ExecutiveBrainAnswer`, ...) are stored as-is on the `payload` field.
 */

import { emitOSEvent } from "./events";
import type {
  ExecutiveArtifact,
  ExecutiveArtifactId,
  ExecutiveArtifactKind,
  ExecutiveMissionId,
  ExecutiveSessionId,
  ExecutiveWorkspaceId,
} from "./types";

const ARTIFACTS = new Map<ExecutiveArtifactId, ExecutiveArtifact>();

function uid(kind: string): string {
  return `art_${kind}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface StoreArtifactArgs {
  workspace_id: ExecutiveWorkspaceId;
  session_id?: ExecutiveSessionId | null;
  mission_id?: ExecutiveMissionId | null;
  kind: ExecutiveArtifactKind;
  label: string;
  summary?: string;
  payload: unknown;
}

export function storeArtifact(args: StoreArtifactArgs): ExecutiveArtifact {
  const now = new Date().toISOString();
  const artifact: ExecutiveArtifact = {
    id: uid(args.kind),
    workspace_id: args.workspace_id,
    session_id: args.session_id ?? null,
    mission_id: args.mission_id ?? null,
    kind: args.kind,
    label: args.label,
    summary: args.summary,
    payload: args.payload,
    created_at: now,
    updated_at: now,
  };
  ARTIFACTS.set(artifact.id, artifact);
  emitOSEvent("ArtifactCreated", {
    workspace_id: artifact.workspace_id,
    session_id: artifact.session_id ?? undefined,
    mission_id: artifact.mission_id ?? undefined,
    artifact_id: artifact.id,
    detail: { kind: artifact.kind, label: artifact.label },
  });
  return artifact;
}

export function updateArtifact(
  id: ExecutiveArtifactId,
  patch: Partial<Pick<ExecutiveArtifact, "label" | "summary" | "payload">>,
): ExecutiveArtifact | null {
  const cur = ARTIFACTS.get(id);
  if (!cur) return null;
  const next: ExecutiveArtifact = {
    ...cur,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  ARTIFACTS.set(id, next);
  emitOSEvent("ArtifactUpdated", {
    workspace_id: next.workspace_id,
    session_id: next.session_id ?? undefined,
    mission_id: next.mission_id ?? undefined,
    artifact_id: next.id,
    detail: { kind: next.kind },
  });
  return next;
}

export function getArtifact(id: ExecutiveArtifactId): ExecutiveArtifact | null {
  return ARTIFACTS.get(id) ?? null;
}

export function listArtifacts(query: {
  workspace_id?: ExecutiveWorkspaceId;
  session_id?: ExecutiveSessionId;
  mission_id?: ExecutiveMissionId;
  kind?: ExecutiveArtifactKind;
  limit?: number;
}): ReadonlyArray<ExecutiveArtifact> {
  const rows = Array.from(ARTIFACTS.values()).filter(
    (a) =>
      (query.workspace_id ? a.workspace_id === query.workspace_id : true) &&
      (query.session_id ? a.session_id === query.session_id : true) &&
      (query.mission_id ? a.mission_id === query.mission_id : true) &&
      (query.kind ? a.kind === query.kind : true),
  );
  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return query.limit ? rows.slice(0, query.limit) : rows;
}

export function artifactCount(): number {
  return ARTIFACTS.size;
}

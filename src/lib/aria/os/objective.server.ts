/**
 * Phase 8.9 — Executive objective management (in-memory).
 *
 * Objectives are OS-owned goals with horizon and status. They are NOT
 * missions. A mission may reference an objective it advances, but
 * missions come and go while objectives persist across sessions.
 */

import { emitOSEvent } from "./events";
import type {
  ExecutiveObjective,
  ExecutiveObjectiveId,
  ExecutiveWorkspaceId,
  ObjectiveHorizon,
  ObjectiveStatus,
  Priority,
} from "./types";

const OBJECTIVES = new Map<ExecutiveObjectiveId, ExecutiveObjective>();

function uid(): string {
  return `obj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface CreateObjectiveArgs {
  workspace_id: ExecutiveWorkspaceId;
  title: string;
  description: string;
  horizon: ObjectiveHorizon;
  priority: Priority;
  owner?: string;
  due_at?: string;
}

export function createObjective(args: CreateObjectiveArgs): ExecutiveObjective {
  const now = new Date().toISOString();
  const obj: ExecutiveObjective = {
    id: uid(),
    workspace_id: args.workspace_id,
    title: args.title,
    description: args.description,
    horizon: args.horizon,
    priority: args.priority,
    owner: args.owner,
    due_at: args.due_at,
    status: "active",
    progress: 0,
    created_at: now,
    updated_at: now,
  };
  OBJECTIVES.set(obj.id, obj);
  emitOSEvent("ObjectiveCreated", {
    workspace_id: obj.workspace_id,
    objective_id: obj.id,
    detail: { horizon: obj.horizon, priority: obj.priority },
  });
  return obj;
}

export interface UpdateObjectiveArgs {
  objective_id: ExecutiveObjectiveId;
  status?: ObjectiveStatus;
  progress?: number;
  priority?: Priority;
  due_at?: string | null;
}

export function updateObjective(args: UpdateObjectiveArgs): ExecutiveObjective | null {
  const cur = OBJECTIVES.get(args.objective_id);
  if (!cur) return null;
  const next: ExecutiveObjective = {
    ...cur,
    status: args.status ?? cur.status,
    progress: args.progress ?? cur.progress,
    priority: args.priority ?? cur.priority,
    due_at: args.due_at === null ? undefined : (args.due_at ?? cur.due_at),
    updated_at: new Date().toISOString(),
  };
  OBJECTIVES.set(next.id, next);
  emitOSEvent("ObjectiveUpdated", {
    workspace_id: next.workspace_id,
    objective_id: next.id,
    detail: { status: next.status, progress: next.progress },
  });
  return next;
}

export function getObjective(id: ExecutiveObjectiveId): ExecutiveObjective | null {
  return OBJECTIVES.get(id) ?? null;
}

export function listObjectives(
  workspace_id: ExecutiveWorkspaceId,
): ReadonlyArray<ExecutiveObjective> {
  return Array.from(OBJECTIVES.values()).filter((o) => o.workspace_id === workspace_id);
}

export function countActive(workspace_id?: ExecutiveWorkspaceId): number {
  return Array.from(OBJECTIVES.values()).filter(
    (o) =>
      (workspace_id ? o.workspace_id === workspace_id : true) &&
      (o.status === "active" || o.status === "at_risk"),
  ).length;
}

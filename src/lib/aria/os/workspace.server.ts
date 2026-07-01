/**
 * Phase 8.9 — Persistent executive workspace store (in-memory).
 *
 * Holds per-executive scope: departments, projects, focus site. Sessions
 * bind to a workspace so mission context, artifacts and objectives share
 * a stable envelope across visits.
 */

import { emitOSEvent } from "./events";
import type { ExecutiveWorkspace, ExecutiveWorkspaceId } from "./types";

const WORKSPACES = new Map<ExecutiveWorkspaceId, ExecutiveWorkspace>();

function uid(): string {
  return `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface LoadWorkspaceInput {
  owner: string;
  org_id?: string | null;
  workspace_id?: string;
  title?: string;
  departments?: ReadonlyArray<string>;
  projects?: ReadonlyArray<string>;
  focus_site?: string;
}

export function loadWorkspace(input: LoadWorkspaceInput): ExecutiveWorkspace {
  const now = new Date().toISOString();
  const id = input.workspace_id ?? uid();
  const existing = WORKSPACES.get(id);
  const workspace: ExecutiveWorkspace = existing
    ? {
        ...existing,
        title: input.title ?? existing.title,
        departments: input.departments ?? existing.departments,
        projects: input.projects ?? existing.projects,
        focus_site: input.focus_site ?? existing.focus_site,
        updated_at: now,
      }
    : {
        id,
        owner: input.owner,
        org_id: input.org_id ?? null,
        title: input.title ?? "Executive Workspace",
        departments: input.departments ?? [],
        projects: input.projects ?? [],
        focus_site: input.focus_site,
        created_at: now,
        updated_at: now,
      };
  WORKSPACES.set(id, workspace);
  emitOSEvent("WorkspaceLoaded", { workspace_id: id });
  return workspace;
}

export function getWorkspace(
  id: ExecutiveWorkspaceId,
): ExecutiveWorkspace | null {
  return WORKSPACES.get(id) ?? null;
}

export function saveWorkspace(
  id: ExecutiveWorkspaceId,
  patch: Partial<Omit<ExecutiveWorkspace, "id" | "created_at" | "owner">>,
): ExecutiveWorkspace | null {
  const cur = WORKSPACES.get(id);
  if (!cur) return null;
  const next: ExecutiveWorkspace = {
    ...cur,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  WORKSPACES.set(id, next);
  emitOSEvent("WorkspaceSaved", { workspace_id: id });
  return next;
}

export function listWorkspaces(owner?: string): ReadonlyArray<ExecutiveWorkspace> {
  const all = Array.from(WORKSPACES.values());
  return owner ? all.filter((w) => w.owner === owner) : all;
}

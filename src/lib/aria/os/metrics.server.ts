/**
 * Phase 8.9 — Global enterprise metrics for the OS.
 *
 * Counts are OS-owned lifecycle counters (sessions, missions, artifacts,
 * objectives). Subsystem metrics remain owned by their originating phase.
 */

import { artifactCount } from "./artifact.server";
import { countActive as countActiveObjectives } from "./objective.server";
import type { ExecutiveMetrics, ExecutiveWorkspaceId } from "./types";

interface Counters {
  sessions_started: number;
  sessions_active: number;
  missions_completed: number;
  missions_failed: number;
  workspaces_loaded: number;
}

const COUNTERS: Counters = {
  sessions_started: 0,
  sessions_active: 0,
  missions_completed: 0,
  missions_failed: 0,
  workspaces_loaded: 0,
};

export function noteSessionStarted(): void {
  COUNTERS.sessions_started += 1;
  COUNTERS.sessions_active += 1;
}

export function noteSessionEnded(): void {
  COUNTERS.sessions_active = Math.max(0, COUNTERS.sessions_active - 1);
}

export function noteWorkspaceLoaded(): void {
  COUNTERS.workspaces_loaded += 1;
}

export function noteMissionCompleted(): void {
  COUNTERS.missions_completed += 1;
}

export function noteMissionFailed(): void {
  COUNTERS.missions_failed += 1;
}

export function snapshotMetrics(
  workspace_id?: ExecutiveWorkspaceId,
): ExecutiveMetrics {
  return {
    sessions_started: COUNTERS.sessions_started,
    sessions_active: COUNTERS.sessions_active,
    missions_completed: COUNTERS.missions_completed,
    missions_failed: COUNTERS.missions_failed,
    artifacts_stored: artifactCount(),
    objectives_active: countActiveObjectives(workspace_id),
    workspaces_loaded: COUNTERS.workspaces_loaded,
    last_updated: new Date().toISOString(),
  };
}

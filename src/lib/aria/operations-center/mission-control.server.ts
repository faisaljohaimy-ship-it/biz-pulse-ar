// Mission supervision — deterministic health derivation from progress + phase.
import type { HealthState, MissionStatus } from "./types";
import { MissionStatusZ } from "./contracts";

export function validateMission(m: MissionStatus): MissionStatus {
  return MissionStatusZ.parse(m);
}

export function summarizeMissions(missions: ReadonlyArray<MissionStatus>): {
  total: number;
  executing: number;
  paused: number;
  failed: number;
  completed: number;
  overall: HealthState;
} {
  let executing = 0;
  let paused = 0;
  let failed = 0;
  let completed = 0;
  for (const m of missions) {
    if (m.phase === "executing") executing += 1;
    else if (m.phase === "paused") paused += 1;
    else if (m.phase === "failed") failed += 1;
    else if (m.phase === "completed") completed += 1;
  }
  let overall: HealthState = "healthy";
  if (missions.length === 0) overall = "unknown";
  else if (failed > 0) overall = "down";
  else if (paused > 0) overall = "degraded";
  return { total: missions.length, executing, paused, failed, completed, overall };
}

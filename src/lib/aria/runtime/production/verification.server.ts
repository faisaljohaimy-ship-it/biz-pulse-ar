/**
 * Phase 10.1 — Runtime verification.
 * Ensures no gate passes without evidence.
 */
import type { HealthReport, RuntimeState } from "./types";

export interface VerificationResult {
  readonly verified: boolean;
  readonly notes: ReadonlyArray<string>;
}

export function verifyRuntime(
  state: RuntimeState,
  health: HealthReport,
): VerificationResult {
  const notes: string[] = [];

  if (
    (state.phase === "accepting_jobs" || state.phase === "draining") &&
    state.workers.length === 0
  ) {
    notes.push("Runtime accepting jobs but no workers registered.");
  }

  if (health.status === "healthy" && health.evidence.length === 0) {
    notes.push("Health reports healthy without evidence.");
  }

  if (state.phase === "crashed") {
    notes.push("Runtime is crashed; recovery required.");
  }

  for (const r of state.running) {
    if (!r.worker_id) {
      notes.push(`Running job ${r.job.id} has no worker assignment.`);
    }
  }

  return { verified: notes.length === 0, notes };
}

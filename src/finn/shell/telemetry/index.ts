/**
 * NEXIOS FINN Shell — telemetry.
 *
 * Builds `shell_runs` rows for every selection/execution. Persistence goes
 * through the boundary guard (shell table only) and is always simulation-marked
 * until real production data flows. Row construction is pure and testable.
 */
import { assertShellWrite, type DbOp } from "../shell";
import type { RequiredRole, ShellRun } from "../types";

/** Stable, dependency-free task hash (djb2) — groups runs of the same task. */
export function hashTask(task: string): string {
  let h = 5381;
  for (let i = 0; i < task.length; i++) h = ((h << 5) + h + task.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

export interface RunInput {
  readonly capabilityId: string | null;
  readonly task: string;
  readonly selectedRank: number | null;
  readonly latencyMs: number | null;
  readonly outcome: ShellRun["outcome"];
  readonly userRole: RequiredRole | null;
  readonly region: string | null;
}

/** Construct a telemetry row (always is_simulation=true in the shell layer). */
export function buildRun(input: RunInput): ShellRun {
  return {
    capabilityId: input.capabilityId,
    taskHash: hashTask(input.task),
    selectedRank: input.selectedRank,
    latencyMs: input.latencyMs,
    outcome: input.outcome,
    userRole: input.userRole,
    region: input.region,
    isSimulation: true,
  };
}

/** Minimal shape of a Supabase-like client the shell may use (write path). */
export interface ShellWriter {
  from(table: string): { insert(rows: unknown): Promise<{ error: { message: string } | null }> };
}

/**
 * Persist a run to `shell_runs` — guarded so it can never touch a core table.
 * No-op-safe: returns the row it would write when no writer is supplied.
 */
export async function recordRun(run: ShellRun, writer?: ShellWriter): Promise<ShellRun> {
  const table = "shell_runs";
  assertShellWrite(table, "insert" satisfies DbOp);
  if (writer) {
    const { error } = await writer.from(table).insert(run);
    if (error) throw new Error(`shell telemetry insert failed: ${error.message}`);
  }
  return run;
}

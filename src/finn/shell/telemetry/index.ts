/**
 * SADEED FINN Shell — telemetry.
 *
 * Builds `shell_runs` rows for every selection/execution. Persistence goes
 * through the single runtime write gateway (allowlist + session-derived org_id)
 * and is always simulation-marked until real production data flows. Row
 * construction is pure and testable; this module performs NO direct DB write.
 */
import { runtimeWrite, type ShellSession, type ShellWriter } from "../gateway";
import type { RequiredRole, ShellRun } from "../types";

export type { ShellSession, ShellWriter } from "../gateway";

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

/**
 * Persist a run to `shell_runs` through the runtime write gateway — the org_id
 * is injected from the session, never from the row. No-op-safe: with no writer
 * it returns the row unchanged (the gateway derives org_id only when writing).
 */
export async function recordRun(
  run: ShellRun,
  ctx: { session?: ShellSession; writer?: ShellWriter } = {},
): Promise<ShellRun> {
  await runtimeWrite("shell_runs", "insert", run as unknown as Record<string, unknown>, ctx);
  return run;
}

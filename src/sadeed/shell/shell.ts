/**
 * SADEED Shell — boundary guard.
 *
 * The shell READS from the core and writes ONLY to its own `shell_*` tables.
 * Writing to a core table from the shell is forbidden by construction: any such
 * attempt throws. This is the runtime expression of `coreWriteFromShell:
 * forbidden` — the core is never mutated by the advisory layer.
 */
import { SHELL_CONFIG } from "./config";

export class CoreWriteForbiddenError extends Error {
  constructor(table: string, op: string) {
    super(`Shell may not ${op} core table "${table}" — coreWriteFromShell is forbidden.`);
    this.name = "CoreWriteForbiddenError";
  }
}

/** The shell owns exactly these tables; everything else is core. */
export const SHELL_TABLES: ReadonlySet<string> = new Set([
  "shell_capabilities",
  "shell_runs",
  "shell_params",
  "shell_proposals",
  "eval_results",
]);

export type DbOp = "insert" | "update" | "delete" | "upsert";

/** True if a table belongs to the shell (writable), false if it is core. */
export function isShellTable(table: string): boolean {
  return SHELL_TABLES.has(table);
}

/**
 * Assert a write targets a shell table. Throws CoreWriteForbiddenError for any
 * core table. Call this before every shell-originated mutation.
 */
export function assertShellWrite(table: string, op: DbOp): void {
  if (SHELL_CONFIG.safety.coreWriteFromShell !== "forbidden") return;
  if (!isShellTable(table)) throw new CoreWriteForbiddenError(table, op);
}

/**
 * Guard a tool call. Tools are disabled until an implemented+tested connector
 * exists; while disabled the shell is advisory-only and refuses to "call".
 */
export function assertToolCallable(toolId: string, implemented: ReadonlySet<string>): void {
  if (!SHELL_CONFIG.safety.toolCallsEnabled) {
    throw new Error(
      `Tool "${toolId}" not callable — shell is advisory-only (toolCallsEnabled=false).`,
    );
  }
  if (!implemented.has(toolId)) {
    throw new Error(
      `Tool "${toolId}" has no implemented connector — a descriptor is not a connector.`,
    );
  }
}

/**
 * SADEED FINN Shell — the single mandatory runtime write gateway.
 *
 * EVERY shell-originated write (insert/update/upsert/delete/rpc) MUST pass
 * through here. Enforcement is an ALLOWLIST with default-deny:
 *
 *   • Only the four runtime tables may be written at runtime.
 *   • `shell_capabilities` is a PROTECTED governance table — migration/admin
 *     only, never a runtime write. It is denied even though the boundary guard
 *     considers it "shell-owned".
 *   • Any table not in the allowlist (present or future) is rejected by default.
 *   • The table is chosen from a fixed literal set — a free table name from user
 *     input can never reach a write.
 *   • `org_id` is derived from the authenticated session; it is refused if it
 *     appears in the payload.
 *   • `shell_params` values are checked against the trusted bounds in
 *     SHELL_CONFIG (the same source the migration seeds from).
 *
 * This gateway is NOT a substitute for RLS — it is an application-layer
 * defence-in-depth in front of the database's own policies. It never uses a
 * service_role/secret key; it acts through an injected, session-scoped writer.
 */
import { SHELL_CONFIG, type BoundedParam } from "./config";
import { assertShellWrite } from "./shell";

/** The ONLY tables the shell may write at runtime. `shell_capabilities` is absent by design. */
export const SHELL_RUNTIME_WRITE_ALLOWLIST: ReadonlySet<string> = new Set([
  "shell_runs",
  "shell_params",
  "shell_proposals",
  "eval_results",
]);

/** Governance tables that are shell-owned but NEVER runtime-writable. */
export const SHELL_PROTECTED_TABLES: ReadonlySet<string> = new Set(["shell_capabilities"]);

export type WriteOp = "insert" | "update" | "upsert" | "delete" | "rpc";

export class WriteGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WriteGatewayError";
  }
}

/**
 * Authenticated session context. `orgId` is resolved from the caller's session
 * server-side — it is the ONLY source of tenancy for a write.
 */
export interface ShellSession {
  readonly orgId: string;
  readonly userId: string | null;
}

/** Minimal shape of a Supabase-like client the gateway writes through. */
export interface ShellWriter {
  from(table: string): { insert(rows: unknown): Promise<{ error: { message: string } | null }> };
}

/** Keys that must be session-derived and never accepted from a payload. */
const SESSION_DERIVED_KEYS = ["org_id", "orgId", "organization_id", "org"] as const;

/** Tables whose rows carry tenancy and therefore need a session-derived org_id. */
const ORG_SCOPED_TABLES: ReadonlySet<string> = new Set(["shell_runs"]);

/** Trusted bounds source: the typed shell config (mirrors the shell_params seed). */
const PARAM_BOUNDS: Readonly<Record<string, BoundedParam>> = {
  "selection.topK": SHELL_CONFIG.selection.topK,
  "selection.confidenceThreshold": SHELL_CONFIG.selection.confidenceThreshold,
  "response.maxTokens": SHELL_CONFIG.response.maxTokens,
};

/**
 * Assert a runtime write targets an allowlisted table. Throws for the protected
 * governance table and for anything not explicitly allowed (default-deny).
 * Every op — insert/update/upsert/delete/rpc — is gated here.
 */
export function assertRuntimeWrite(table: string, op: WriteOp): void {
  if (SHELL_PROTECTED_TABLES.has(table)) {
    throw new WriteGatewayError(
      `"${table}" is a protected governance table — migration/admin only, never a runtime ${op}.`,
    );
  }
  if (!SHELL_RUNTIME_WRITE_ALLOWLIST.has(table)) {
    throw new WriteGatewayError(
      `Table "${table}" is not in the runtime write allowlist — default-deny (op=${op}).`,
    );
  }
  // Defence in depth: also satisfy the core-write boundary guard (never core).
  if (op === "insert" || op === "update" || op === "upsert" || op === "delete") {
    assertShellWrite(table, op);
  }
}

/** Refuse any payload that tries to smuggle tenancy in — org_id is session-only. */
export function assertNoPayloadOrg(row: Readonly<Record<string, unknown>>): void {
  for (const k of SESSION_DERIVED_KEYS) {
    if (k in row) {
      throw new WriteGatewayError(
        `"${k}" must be derived from the session, never accepted from the payload.`,
      );
    }
  }
}

/** Validate a shell_params value against the trusted bounds. */
export function assertParamWithinBounds(key: string, value: number): void {
  const b = PARAM_BOUNDS[key];
  if (!b) {
    throw new WriteGatewayError(
      `No trusted bounds source for shell_params key "${key}" — refusing to write.`,
    );
  }
  if (!Number.isFinite(value) || value < b.min || value > b.max) {
    throw new WriteGatewayError(
      `shell_params "${key}"=${value} is outside its trusted bounds [${b.min}, ${b.max}].`,
    );
  }
}

/**
 * The single runtime-write primitive. Applies the allowlist, refuses payload
 * tenancy, validates param bounds, injects the session org_id for org-scoped
 * tables, then (only if a writer is supplied) performs the insert. With no
 * writer it is a safe no-op that returns the row it WOULD have written.
 */
export async function runtimeWrite(
  table: string,
  op: WriteOp,
  row: Readonly<Record<string, unknown>>,
  ctx: { session?: ShellSession; writer?: ShellWriter } = {},
): Promise<Record<string, unknown>> {
  assertRuntimeWrite(table, op);
  assertNoPayloadOrg(row);

  if (table === "shell_params") {
    assertParamWithinBounds(String(row.key ?? ""), Number(row.value_num));
  }

  // With no writer this is a validate-only no-op: the row is returned unchanged
  // (org_id is injected only when a write actually happens, from the session).
  if (!ctx.writer) return { ...row };

  if (op !== "insert") {
    // Only the insert path has a wired executor today; other ops are still gated
    // above (assertRuntimeWrite) but have no runtime call site yet.
    throw new WriteGatewayError(`runtime ${op} has no wired executor — insert only.`);
  }

  let finalRow: Record<string, unknown> = { ...row };
  if (ORG_SCOPED_TABLES.has(table)) {
    if (!ctx.session) {
      throw new WriteGatewayError(
        `"${table}" is org-scoped — an authenticated session is required to derive org_id.`,
      );
    }
    finalRow = { ...finalRow, org_id: ctx.session.orgId };
  }

  const { error } = await ctx.writer.from(table).insert(finalRow);
  if (error) throw new WriteGatewayError(`${table} ${op} failed: ${error.message}`);
  return finalRow;
}

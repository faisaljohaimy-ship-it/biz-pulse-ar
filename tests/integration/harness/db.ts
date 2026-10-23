/**
 * Direct Postgres access (postgres.js, already a devDependency) for
 * assertions and for the pure-SQL RLS checks. Superuser `postgres` over TCP
 * with trust auth — the cluster is private to the run.
 *
 * `asRole()` runs a callback inside one transaction with
 * `request.jwt.claims` set and `set local role <role>` applied: the same
 * convention the preflight scripts use, and the same GUC PostgREST sets.
 */
import postgres, { type Sql, type TransactionSql } from "postgres";
import { requireEnv } from "./env";

let shared: Sql | null = null;

export function db(): Sql {
  if (!shared) {
    shared = postgres(requireEnv("INTEGRATION_PG_URL"), {
      max: 3,
      idle_timeout: 5,
      onnotice: () => undefined,
    });
  }
  return shared;
}

export async function closeDb(): Promise<void> {
  if (shared) {
    await shared.end({ timeout: 5 });
    shared = null;
  }
}

export type JwtClaims = {
  sub?: string;
  role: "anon" | "authenticated" | "service_role";
  email?: string;
  app_metadata?: Record<string, unknown>;
};

/** Error shape postgres.js throws — `code` is the SQLSTATE. */
export type PgError = Error & { code?: string };

export async function asRole<T>(
  claims: JwtClaims,
  fn: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  return db().begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
    await tx.unsafe(`set local role ${claims.role}`);
    return fn(tx);
  }) as Promise<T>;
}

/** Runs `fn` and returns the SQLSTATE it failed with (or null when it succeeded). */
export async function sqlstateOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    return (err as PgError).code ?? "unknown";
  }
}

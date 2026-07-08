/**
 * Phase 9.0 — Security baseline evaluation.
 *
 * Reads process environment for required secret presence, and returns
 * gate statuses. Does NOT expose secret values. Does NOT modify config.
 * Route review flags are marked "unknown" when not verified — never faked.
 */

import type { GateStatus, SecurityBaseline } from "./types";

const REQUIRED_SECRETS = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LOVABLE_API_KEY",
] as const;

const OPTIONAL_SECRETS = [
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "ELEVENLABS_API_KEY",
] as const;

function envPresent(name: string): boolean {
  try {
    const v = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
      .process?.env?.[name];
    return typeof v === "string" && v.length > 0;
  } catch {
    return false;
  }
}

export function evaluateSecurityBaseline(): SecurityBaseline {
  const missing: string[] = REQUIRED_SECRETS.filter((s) => !envPresent(s));
  const notes: string[] = [];

  const secretsStatus: GateStatus = missing.length === 0 ? "pass" : "fail";
  if (missing.length > 0) notes.push(`Missing required secrets: ${missing.join(", ")}`);

  const optionalMissing = OPTIONAL_SECRETS.filter((s) => !envPresent(s));
  if (optionalMissing.length > 0) {
    notes.push(`Optional integrations unconfigured: ${optionalMissing.join(", ")}`);
  }

  // RBAC readiness — verified indirectly. Actual role check is DB-only.
  // We flag as "unknown" from this in-process view; readiness aggregator
  // uses DB-facing readiness.functions.ts for the authoritative value.
  const rbacReady: GateStatus = "unknown";
  const permissionChecks: GateStatus = "unknown";
  const publicRoutesReviewed: GateStatus = "unknown";
  const adminRoutesProtected: GateStatus = "unknown";

  // Unsafe config heuristics: if NODE_ENV is missing or set to development in
  // a production deploy, warn. If DEBUG is set, warn.
  let unsafe: GateStatus = "pass";
  try {
    const env =
      (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
        ?.env ?? {};
    if (env.DEBUG) {
      unsafe = "warn";
      notes.push("DEBUG is set — verify not enabled in production.");
    }
    if (env.NODE_ENV && env.NODE_ENV !== "production" && env.NODE_ENV !== "test") {
      unsafe = unsafe === "warn" ? "warn" : "warn";
      notes.push(`NODE_ENV=${env.NODE_ENV}`);
    }
  } catch {
    unsafe = "unknown";
  }

  return {
    taken_at: new Date().toISOString(),
    rbac_ready: rbacReady,
    permission_checks: permissionChecks,
    secrets_present: secretsStatus,
    unsafe_config: unsafe,
    public_routes_reviewed: publicRoutesReviewed,
    admin_routes_protected: adminRoutesProtected,
    missing_secrets: missing,
    notes,
  };
}

export function requiredSecretsList(): readonly string[] {
  return REQUIRED_SECRETS;
}

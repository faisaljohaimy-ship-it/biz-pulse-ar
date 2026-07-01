/**
 * Privacy gate.
 *
 * Enforces sensitivity ceiling on capture and retrieval. Never allows
 * secret-sensitivity content unless explicitly opted-in via the
 * PRIVACY_ALLOW_SECRET environment guard (opt-in must be provided by
 * the operator; the module never assumes consent).
 *
 * Also flags obvious secret-shaped substrings for redaction.
 */

import type { PrivacyDecision, Sensitivity } from "./types";

const SENSITIVITY_ORDER: Record<Sensitivity, number> = {
  public: 0,
  internal: 1,
  restricted: 2,
  secret: 3,
};

const SECRET_PATTERNS: readonly RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bsk-[A-Za-z0-9]{20,}\b/,
  /\bpassword\s*[:=]\s*\S+/i,
];

function allowSecret(): boolean {
  const flag = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.PRIVACY_ALLOW_SECRET;
  return flag === "true" || flag === "1";
}

export function evaluatePrivacy(
  sensitivity: Sensitivity,
  body: string,
): PrivacyDecision {
  if (sensitivity === "secret" && !allowSecret()) {
    return Object.freeze({
      allowed: false,
      reason: "secret sensitivity requires explicit PRIVACY_ALLOW_SECRET opt-in",
      redactions: Object.freeze([]) as readonly string[],
    });
  }
  const redactions: string[] = [];
  for (const pattern of SECRET_PATTERNS) {
    const match = body.match(pattern);
    if (match) redactions.push(match[0]);
  }
  if (redactions.length > 0) {
    return Object.freeze({
      allowed: false,
      reason: "body contains secret-shaped literals",
      redactions: Object.freeze(redactions) as readonly string[],
    });
  }
  return Object.freeze({
    allowed: true,
    reason: "ok",
    redactions: Object.freeze([]) as readonly string[],
  });
}

export function ceilingAllows(
  candidate: Sensitivity,
  ceiling: Sensitivity,
): boolean {
  return SENSITIVITY_ORDER[candidate] <= SENSITIVITY_ORDER[ceiling];
}

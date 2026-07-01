/**
 * Phase 9.1 — Health monitor.
 *
 * Real credential presence probe. When required credentials are missing,
 * status is "unknown" (never faked pass).
 */

import type { ConnectorDescriptor, HealthResult } from "./types";
import { getCredentialVault } from "./credential-vault";
import { recordHealth } from "./telemetry";

export function probeCredentialHealth(desc: ConnectorDescriptor): HealthResult {
  const vault = getCredentialVault();
  const requiredSecrets = desc.credentials
    .filter((c) => c.required && c.kind === "secret")
    .map((c) => c.name);
  const requiredConfig = desc.credentials
    .filter((c) => c.required && c.kind === "config")
    .map((c) => c.name);
  const required = [...requiredSecrets, ...requiredConfig];
  const missing = vault.missing(required);

  const result: HealthResult = missing.length === 0
    ? {
      status: required.length === 0 ? "healthy" : "unknown",
      reason: required.length === 0
        ? "no credentials required"
        : "credentials present; upstream reachability not verified in-process",
      checked_at: new Date().toISOString(),
      latency_ms: null,
    }
    : {
      status: "unknown",
      reason: "missing required credentials",
      missing_credentials: missing,
      checked_at: new Date().toISOString(),
      latency_ms: null,
    };
  recordHealth(desc.id, result);
  return result;
}

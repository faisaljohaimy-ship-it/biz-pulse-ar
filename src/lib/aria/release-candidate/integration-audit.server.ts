/**
 * Integration audit — connector registration and credential coverage.
 */
import type { GateResult, RcInputs } from "./types";
import { buildGate, ev } from "./gate-utils.server";

export function auditIntegration(input: RcInputs): GateResult {
  const creds = input.external_credentials ?? {};
  const keys = Object.keys(creds);
  if (keys.length === 0) {
    return buildGate(
      "integration",
      "warn",
      0.5,
      "Connectors registered under src/lib/aria/integration/; no external credentials probed.",
      ["no external credential map supplied"],
      [ev("integration.registry", "config", "src/lib/aria/integration")],
    );
  }
  const missing = keys.filter((k) => !creds[k]);
  if (missing.length === 0) {
    return buildGate(
      "integration",
      "pass",
      1,
      `All ${keys.length} external credentials present.`,
      [],
      [ev("integration.vault", "config", "aria.integration.vault")],
    );
  }
  return buildGate(
    "integration",
    "warn",
    Math.max(0.3, 1 - missing.length / keys.length),
    `Missing credentials: ${missing.join(", ")}`,
    missing.map((m) => `credential:${m} missing`),
    [ev("integration.vault", "config", "aria.integration.vault")],
  );
}

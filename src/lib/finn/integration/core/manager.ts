/**
 * Phase 9.1 — Connector Manager.
 *
 * Runtime orchestrator that composes retry + circuit breaker + rate
 * limiter + timeout + telemetry around any connector call. Callers
 * pass a real operation closure; the manager provides the safety fabric.
 */

import type { ConnectorDescriptor, HealthResult } from "./types";
import { getConnector } from "./registry";
import { allowRequest, recordFailure, recordSuccess } from "./circuit-breaker";
import { acquire as acquireRateSlot } from "./rate-limiter";
import { withRetry } from "./retry";
import { withTimeout } from "./timeout";
import { classifyIntegrationError, recordCall, recordRetry } from "./telemetry";
import { probeCredentialHealth } from "./health";
import { auditConnector } from "./audit";
import { evaluateAuth } from "./auth";

export interface ManagerCallOptions {
  operation: string;
  actor?: string | null;
  org_id?: string | null;
  trace_id?: string;
  retryable?: (err: unknown) => boolean;
}

export class ConnectorNotConfigured extends Error {
  constructor(id: string, missing: string[]) {
    super(`Connector ${id} not configured. Missing: ${missing.join(", ") || "(none listed)"}`);
    this.name = "ConnectorNotConfigured";
  }
}

export class ConnectorNotFound extends Error {
  constructor(id: string) {
    super(`Connector not found: ${id}`);
    this.name = "ConnectorNotFound";
  }
}

export class CircuitOpen extends Error {
  constructor(id: string) {
    super(`Circuit open for connector ${id}`);
    this.name = "CircuitOpen";
  }
}

function assertConfigured(desc: ConnectorDescriptor): void {
  const auth = evaluateAuth(desc.id);
  if (auth && !auth.ready) throw new ConnectorNotConfigured(desc.id, auth.missing);
}

export async function runConnectorCall<T>(
  connectorId: string,
  opts: ManagerCallOptions,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const desc = getConnector(connectorId);
  if (!desc) throw new ConnectorNotFound(connectorId);
  assertConfigured(desc);

  if (!allowRequest(desc.id, desc.circuit_breaker)) {
    auditConnector({
      connector_id: desc.id,
      action: opts.operation,
      outcome: "denied",
      detail: "circuit_open",
      actor: opts.actor,
      org_id: opts.org_id,
      trace_id: opts.trace_id,
    });
    throw new CircuitOpen(desc.id);
  }
  await acquireRateSlot(desc.id, desc.rate_limit);

  const started = Date.now();
  try {
    const out = await withRetry(
      async () => withTimeout(opts.operation, desc.timeout.request_ms, fn),
      desc.retry,
      opts.retryable,
      () => recordRetry(desc.id),
    );
    const latency = Date.now() - started;
    recordCall(desc.id, latency, true);
    recordSuccess(desc.id);
    auditConnector({
      connector_id: desc.id,
      action: opts.operation,
      outcome: "ok",
      actor: opts.actor,
      org_id: opts.org_id,
      trace_id: opts.trace_id,
      detail: `${latency}ms`,
    });
    return out;
  } catch (err) {
    const latency = Date.now() - started;
    const cls = classifyIntegrationError(err);
    recordCall(desc.id, latency, false, cls);
    recordFailure(desc.id, desc.circuit_breaker);
    auditConnector({
      connector_id: desc.id,
      action: opts.operation,
      outcome: "error",
      actor: opts.actor,
      org_id: opts.org_id,
      trace_id: opts.trace_id,
      detail: cls,
    });
    throw err;
  }
}

export function connectorHealth(connectorId: string): HealthResult | null {
  const desc = getConnector(connectorId);
  if (!desc) return null;
  return probeCredentialHealth(desc);
}

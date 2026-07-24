/**
 * Connectors — Adapter Framework · Connector Runtime · Integration Hub.
 *
 * Every connector supports the FULL contract: registration, health check,
 * capability discovery, authentication, authorization, rate limits, retry,
 * timeout, circuit breaker, telemetry and audit. The AdapterFramework refuses
 * unsafe adapters (missing contract methods). Connectors NEVER leak: the
 * runtime exposes descriptors only, and invocation is the single path —
 * tenancy-asserted, authorized, rate-limited, authenticated, circuit-guarded,
 * timed out, retried, audited. Failures become results, never exceptions.
 */
import { PlatformError, type TenantContext } from "./types";
import type { RetryStrategy } from "../orchestration/types";
import type { CircuitBreaker, RetryManager, TimeoutManager } from "../orchestration/execution";
import type { AuditLayer } from "../orchestration/policy";
import type { TenantManager } from "./tenancy";

export interface RawAdapter {
  readonly id: string;
  readonly capabilities: readonly string[];
  authenticate(): boolean | Promise<boolean>;
  healthCheck():
    | { status: "healthy" | "degraded" | "unhealthy"; detail?: string }
    | Promise<{ status: "healthy" | "degraded" | "unhealthy"; detail?: string }>;
  invoke(
    operation: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ): unknown | Promise<unknown>;
}

/** Branded: only the AdapterFramework can mint a Connector. */
export type Connector = RawAdapter & { readonly __safeAdapter: true };

export class AdapterFramework {
  /** Validate + wrap a raw adapter; incomplete/unsafe adapters are refused. */
  createConnector(raw: RawAdapter): Connector {
    if (!raw.id || typeof raw.id !== "string") {
      throw new PlatformError("adapters", "adapter is missing an id — refused");
    }
    if (!Array.isArray(raw.capabilities) || raw.capabilities.length === 0) {
      throw new PlatformError("adapters", `adapter "${raw.id}" declares no capabilities — refused`);
    }
    for (const method of ["authenticate", "healthCheck", "invoke"] as const) {
      if (typeof raw[method] !== "function") {
        throw new PlatformError("adapters", `adapter "${raw.id}" is missing ${method}() — refused`);
      }
    }
    return {
      id: raw.id,
      capabilities: [...raw.capabilities],
      authenticate: () => raw.authenticate(),
      healthCheck: () => raw.healthCheck(),
      invoke: (operation, args, signal) => raw.invoke(operation, args, signal),
      __safeAdapter: true as const,
    };
  }
}

export interface ConnectorPolicy {
  readonly allowedOperations: readonly string[];
  /** undefined → any registered tenant (still tenancy-asserted). */
  readonly allowedTenants?: readonly string[];
  readonly rateLimitPerWindow: number;
  readonly timeoutMs: number;
  readonly retry: RetryStrategy;
}

export interface ConnectorDescriptor {
  readonly id: string;
  readonly capabilities: readonly string[];
  readonly enabled: boolean;
}

export interface ConnectorTelemetry {
  readonly invocations: number;
  readonly failures: number;
  readonly refusals: number;
}

export type ConnectorResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: string };

interface ConnectorEntry {
  readonly connector: Connector;
  readonly policy: ConnectorPolicy;
  enabled: boolean;
  windowCount: number;
  telemetry: { invocations: number; failures: number; refusals: number };
}

export interface ConnectorRuntimeDeps {
  readonly tenants: TenantManager;
  readonly timeouts: TimeoutManager;
  readonly retries: RetryManager;
  readonly breaker: CircuitBreaker;
  readonly audit: AuditLayer;
}

export class ConnectorRuntime {
  private readonly entries = new Map<string, ConnectorEntry>();

  constructor(private readonly deps: ConnectorRuntimeDeps) {}

  register(connector: Connector, policy: ConnectorPolicy): void {
    if (this.entries.has(connector.id)) {
      throw new PlatformError("connectors", `duplicate connector "${connector.id}"`);
    }
    if (policy.rateLimitPerWindow < 1 || policy.timeoutMs < 1) {
      throw new PlatformError(
        "connectors",
        `connector "${connector.id}" has invalid policy bounds`,
      );
    }
    this.entries.set(connector.id, {
      connector,
      policy,
      enabled: true,
      windowCount: 0,
      telemetry: { invocations: 0, failures: 0, refusals: 0 },
    });
  }

  /** Capability discovery — descriptors ONLY; the connector never leaks. */
  describe(id: string): ConnectorDescriptor | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    return {
      id: entry.connector.id,
      capabilities: entry.connector.capabilities,
      enabled: entry.enabled,
    };
  }

  list(): readonly ConnectorDescriptor[] {
    return [...this.entries.keys()].map((id) => this.describe(id)!);
  }

  setEnabled(id: string, enabled: boolean): void {
    const entry = this.entries.get(id);
    if (!entry) throw new PlatformError("connectors", `unknown connector "${id}"`);
    entry.enabled = enabled;
  }

  /** Explicit, deterministic rate-window reset — no hidden timers. */
  resetRateWindows(): void {
    for (const entry of this.entries.values()) entry.windowCount = 0;
  }

  async health(
    id: string,
  ): Promise<{ status: "healthy" | "degraded" | "unhealthy"; detail?: string }> {
    const entry = this.entries.get(id);
    if (!entry) return { status: "unhealthy", detail: `unknown connector "${id}"` };
    try {
      return await entry.connector.healthCheck();
    } catch (error) {
      return {
        status: "unhealthy",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async healthAll(): Promise<
    readonly { id: string; status: "healthy" | "degraded" | "unhealthy" }[]
  > {
    const out: { id: string; status: "healthy" | "degraded" | "unhealthy" }[] = [];
    for (const id of this.entries.keys()) out.push({ id, status: (await this.health(id)).status });
    return out;
  }

  telemetry(id: string): ConnectorTelemetry | undefined {
    const entry = this.entries.get(id);
    return entry ? { ...entry.telemetry } : undefined;
  }

  /** THE single invocation path. Never throws — refusals/failures are results. */
  async invoke(
    ctx: TenantContext,
    connectorId: string,
    operation: string,
    args: Record<string, unknown>,
  ): Promise<ConnectorResult> {
    const entry = this.entries.get(connectorId);
    if (!entry) {
      this.deps.audit.record(connectorId, "connector", `REFUSED: unknown connector`);
      return { ok: false, error: `unknown connector "${connectorId}"` };
    }
    const refuse = (reason: string): ConnectorResult => {
      entry.telemetry.refusals++;
      this.deps.audit.record(connectorId, "connector", `REFUSED: ${reason}`);
      return { ok: false, error: reason };
    };

    if (!entry.enabled) return refuse("connector disabled");
    try {
      this.deps.tenants.assertContext(ctx); // tenant isolation
    } catch (error) {
      return refuse(error instanceof Error ? error.message : String(error));
    }
    if (entry.policy.allowedTenants && !entry.policy.allowedTenants.includes(ctx.tenantId)) {
      return refuse(`tenant "${ctx.tenantId}" not authorized for connector "${connectorId}"`);
    }
    if (!entry.policy.allowedOperations.includes(operation)) {
      return refuse(`operation "${operation}" not authorized`);
    }
    if (entry.windowCount >= entry.policy.rateLimitPerWindow) {
      return refuse("rate limit exceeded");
    }
    entry.windowCount++;

    const authed = await entry.connector.authenticate(); // every invoke, fail closed
    if (authed !== true) return refuse("authentication failed");
    if (!this.deps.breaker.canPass(connectorId)) return refuse("circuit open");

    const attempt = await this.deps.retries.run(entry.policy.retry, async () => {
      const raced = await this.deps.timeouts.withTimeout(entry.policy.timeoutMs, async (signal) => {
        return entry.connector.invoke(operation, args, signal);
      });
      if (raced.timedOut) {
        throw new PlatformError("connector", `timeout after ${entry.policy.timeoutMs}ms`);
      }
      return raced.value;
    });

    entry.telemetry.invocations++;
    if (attempt.ok) {
      this.deps.breaker.recordSuccess(connectorId);
      this.deps.audit.record(
        connectorId,
        "connector",
        `${operation} ok (attempts=${attempt.attempts})`,
      );
      return { ok: true, value: attempt.value };
    }
    entry.telemetry.failures++;
    this.deps.breaker.recordFailure(connectorId);
    this.deps.audit.record(connectorId, "connector", `${operation} FAILED: ${attempt.error}`);
    return { ok: false, error: attempt.error };
  }
}

/** capability → connector binding; the hub is the only integration surface. */
export class IntegrationHub {
  private readonly bindings = new Map<string, string>();

  constructor(private readonly runtime: ConnectorRuntime) {}

  bind(capability: string, connectorId: string): void {
    const descriptor = this.runtime.describe(connectorId);
    if (!descriptor) {
      throw new PlatformError("hub", `cannot bind to unknown connector "${connectorId}"`);
    }
    if (!descriptor.capabilities.includes(capability)) {
      throw new PlatformError(
        "hub",
        `connector "${connectorId}" does not declare capability "${capability}"`,
      );
    }
    const existing = this.bindings.get(capability);
    if (existing && existing !== connectorId) {
      throw new PlatformError("hub", `capability "${capability}" already bound to "${existing}"`);
    }
    this.bindings.set(capability, connectorId);
  }

  connectorFor(capability: string): string | undefined {
    return this.bindings.get(capability);
  }

  async invokeCapability(
    ctx: TenantContext,
    capability: string,
    operation: string,
    args: Record<string, unknown>,
  ): Promise<ConnectorResult> {
    const connectorId = this.bindings.get(capability);
    if (!connectorId) {
      return { ok: false, error: `capability "${capability}" is not integrated` };
    }
    return this.runtime.invoke(ctx, connectorId, operation, args);
  }

  async health(): Promise<{
    integrations: number;
    connectors: readonly { id: string; status: "healthy" | "degraded" | "unhealthy" }[];
  }> {
    return { integrations: this.bindings.size, connectors: await this.runtime.healthAll() };
  }
}

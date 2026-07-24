/**
 * Policy Runtime · Configuration Runtime · Runtime Health Engine.
 *
 * OS policies gate lifecycle operations fail-closed (deny wins). The
 * configuration runtime is validated and REVISIONED — every write produces a
 * frozen revision, enabling exact configuration recovery. The health engine
 * aggregates global runtime health, module health, dependency health,
 * performance, memory and storage into one readiness verdict.
 */
import { OsError, type OsState, type ResourceProbe, type ResourceStatus } from "./types";
import type { ShellHealthReport } from "../health";
import type { OsModuleRegistry } from "./registries";
import type { DependencyManager } from "./modules";
import type { PerformanceRuntime } from "./telemetry";

// ── Policy Runtime ──────────────────────────────────────────────────────────

export interface OsPolicy {
  readonly id: string;
  evaluate(action: string): { allowed: boolean; reason: string };
}

export class PolicyRuntime {
  private readonly policies = new Map<string, OsPolicy>();

  register(policy: OsPolicy): void {
    if (this.policies.has(policy.id)) {
      throw new OsError("policy", `duplicate policy "${policy.id}"`);
    }
    this.policies.set(policy.id, policy);
  }

  /** Deny wins — every registered policy must allow the action. */
  evaluate(action: string): { allowed: boolean; reasons: readonly string[] } {
    const reasons: string[] = [];
    for (const policy of this.policies.values()) {
      const verdict = policy.evaluate(action);
      if (!verdict.allowed) reasons.push(`${policy.id}: ${verdict.reason}`);
    }
    return { allowed: reasons.length === 0, reasons };
  }

  count(): number {
    return this.policies.size;
  }
}

// ── Configuration Runtime (revisioned) ──────────────────────────────────────

export type ConfigValidator = (value: unknown) => true | string;

export class ConfigurationRuntime {
  private store = new Map<string, unknown>();
  private readonly validators = new Map<string, ConfigValidator>();
  private readonly revisions = new Map<number, Readonly<Record<string, unknown>>>();
  private revisionCounter = 0;

  registerValidator(key: string, validator: ConfigValidator): void {
    if (this.validators.has(key)) {
      throw new OsError("config", `duplicate validator for "${key}"`);
    }
    this.validators.set(key, validator);
  }

  /** Validated write; every successful write produces a frozen revision. */
  set(key: string, value: unknown): number {
    const validator = this.validators.get(key);
    if (validator) {
      const verdict = validator(value);
      if (verdict !== true) throw new OsError("config", `"${key}" rejected: ${verdict}`);
    }
    this.store.set(key, value);
    return this.snapshotRevision();
  }

  get(key: string): unknown {
    return this.store.get(key);
  }

  current(): Readonly<Record<string, unknown>> {
    return Object.freeze(Object.fromEntries(this.store));
  }

  revision(): number {
    return this.revisionCounter;
  }

  private snapshotRevision(): number {
    this.revisionCounter++;
    this.revisions.set(this.revisionCounter, Object.freeze(Object.fromEntries(this.store)));
    return this.revisionCounter;
  }

  /** Configuration recovery: restore an exact prior revision. */
  restore(revision: number): number {
    const snapshot = this.revisions.get(revision);
    if (!snapshot) throw new OsError("config", `unknown revision ${revision}`);
    this.store = new Map(Object.entries(snapshot));
    return this.snapshotRevision();
  }

  /** Boot-stage validation: every stored value re-passes its validator. */
  validateAll(): { ok: boolean; problems: readonly string[] } {
    const problems: string[] = [];
    for (const [key, validator] of this.validators) {
      if (!this.store.has(key)) continue;
      const verdict = validator(this.store.get(key));
      if (verdict !== true) problems.push(`"${key}": ${verdict}`);
    }
    return { ok: problems.length === 0, problems };
  }
}

// ── Runtime Health Engine ───────────────────────────────────────────────────

function resourceStatus(usedMb: number, limitMb: number): ResourceStatus {
  const pct = limitMb <= 0 ? 100 : (usedMb / limitMb) * 100;
  return pct >= 95 ? "unhealthy" : pct >= 80 ? "degraded" : "healthy";
}

export interface OsHealthReport {
  readonly runtimeStatus: OsState;
  readonly global: ResourceStatus;
  readonly modules: readonly { id: string; status: string }[];
  readonly dependencies: { satisfied: boolean; problems: readonly string[] };
  readonly performance: { status: ResourceStatus; bootMs: number | null };
  readonly memory: { status: ResourceStatus; usedMb: number; limitMb: number };
  readonly storage: { status: ResourceStatus; usedMb: number; limitMb: number };
  readonly ready: boolean;
}

export class RuntimeHealthEngine {
  constructor(
    private readonly deps: {
      registry: OsModuleRegistry;
      dependencies: DependencyManager;
      performance: PerformanceRuntime;
      memoryProbe: ResourceProbe;
      storageProbe: ResourceProbe;
    },
  ) {}

  report(state: OsState, kernelReport: ShellHealthReport | null): OsHealthReport {
    const kernelById = new Map(
      (kernelReport?.modules ?? []).map((m) => [m.moduleId, m.status as string]),
    );
    const modules = this.deps.registry.list().map((record) => ({
      id: record.module.id,
      status:
        record.state === "loaded" ? (kernelById.get(record.module.id) ?? "healthy") : record.state,
    }));
    const dependencies = this.deps.dependencies.audit();
    const memory = this.deps.memoryProbe();
    const storage = this.deps.storageProbe();
    const bootStats = this.deps.performance.stats("os.boot");
    const memoryStatus = resourceStatus(memory.usedMb, memory.limitMb);
    const storageStatus = resourceStatus(storage.usedMb, storage.limitMb);
    const performanceStatus: ResourceStatus = "healthy"; // measured, never gates readiness

    const anyUnhealthy =
      state === "failed" ||
      memoryStatus === "unhealthy" ||
      storageStatus === "unhealthy" ||
      !dependencies.satisfied ||
      modules.some((m) => m.status === "unhealthy" || m.status === "failed") ||
      kernelReport?.overall === "unhealthy";
    const anyDegraded =
      state === "degraded" ||
      memoryStatus === "degraded" ||
      storageStatus === "degraded" ||
      modules.some((m) => m.status === "degraded");

    const global: ResourceStatus = anyUnhealthy
      ? "unhealthy"
      : anyDegraded
        ? "degraded"
        : "healthy";
    return {
      runtimeStatus: state,
      global,
      modules,
      dependencies,
      performance: { status: performanceStatus, bootMs: bootStats?.avgMs ?? null },
      memory: { status: memoryStatus, ...memory },
      storage: { status: storageStatus, ...storage },
      ready: (state === "ready" || state === "booting") && global !== "unhealthy",
    };
  }
}

/**
 * Section 01 — Agent registry (governed store).
 *
 * Records enter as `registered` regardless of the draft's claimed state.
 * The public transition API refuses the operational states (running /
 * paused) — those are reachable ONLY through the OperationalGate, a
 * capability object created together with the registry (static factory →
 * private method access) and handed exclusively to the execution
 * coordinator by the runtime facade. No public back door exists.
 */
import { AgentRuntimeError, type AgentLifecycleState } from "./types";
import type { HealthStatus } from "../population/types";
import type { HealthModel } from "../population/health";
import type { AgentRecord } from "./records";
import { AgentLifecycleMachine, OPERATIONAL_STATES } from "./lifecycle";

/** The coordinator's exclusive capability: entering running/paused. */
export interface OperationalGate {
  apply(id: string, to: "running" | "paused"): AgentRecord;
}

export class AgentRuntimeRegistry {
  private readonly records = new Map<string, AgentRecord>();
  private readonly machine = new AgentLifecycleMachine();

  private constructor(private readonly health: HealthModel) {}

  /** The only way to build a registry — the gate never leaves the facade. */
  static create(health: HealthModel): {
    registry: AgentRuntimeRegistry;
    operationalGate: OperationalGate;
  } {
    const registry = new AgentRuntimeRegistry(health);
    const operationalGate: OperationalGate = {
      apply: (id, to) => registry.applyTransition(id, to),
    };
    return { registry, operationalGate };
  }

  /** Registration is the admission pipeline's privilege (runtime facade). */
  register(record: AgentRecord): AgentRecord {
    if (this.records.has(record.id)) {
      throw new AgentRuntimeError("registry", `duplicate agent id "${record.id}"`);
    }
    const stored = { ...record, lifecycle: "registered" as AgentLifecycleState };
    this.records.set(record.id, stored);
    return stored;
  }

  get(id: string): AgentRecord | undefined {
    return this.records.get(id);
  }

  has(id: string): boolean {
    return this.records.has(id);
  }

  list(): readonly AgentRecord[] {
    return [...this.records.values()];
  }

  count(): number {
    return this.records.size;
  }

  byLifecycle(state: AgentLifecycleState): readonly AgentRecord[] {
    return this.list().filter((r) => r.lifecycle === state);
  }

  byCategory(category: string): readonly AgentRecord[] {
    return this.list().filter((r) => r.category === category);
  }

  byCapability(capabilityId: string): readonly AgentRecord[] {
    return this.list().filter((r) => r.capabilities.includes(capabilityId));
  }

  supportingMode(mode: AgentRecord["supportedModes"][number]): readonly AgentRecord[] {
    return this.list().filter((r) => r.supportedModes.includes(mode));
  }

  /** Governance transitions — every state EXCEPT running/paused. */
  transition(id: string, to: AgentLifecycleState): AgentRecord {
    if (OPERATIONAL_STATES.includes(to)) {
      throw new AgentRuntimeError(
        "registry",
        `"${id}" cannot be set ${to} via transition() — operational states belong to the execution coordinator's protocol`,
      );
    }
    return this.applyTransition(id, to);
  }

  private applyTransition(id: string, to: AgentLifecycleState): AgentRecord {
    const record = this.records.get(id);
    if (!record) throw new AgentRuntimeError("registry", `unknown agent "${id}"`);
    this.machine.assertTransition(id, record.lifecycle, to);
    const next = { ...record, lifecycle: to };
    this.records.set(id, next);
    return next;
  }

  reportHealth(id: string, status: HealthStatus, note?: string): AgentRecord {
    const record = this.records.get(id);
    if (!record) throw new AgentRuntimeError("registry", `unknown agent "${id}"`);
    this.health.report(id, status, note);
    const next = { ...record, health: status };
    this.records.set(id, next);
    return next;
  }
}

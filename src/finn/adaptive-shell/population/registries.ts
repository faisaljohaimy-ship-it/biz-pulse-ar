/**
 * Sections 01 & 02 — the population registries.
 *
 * Store validated records, own their lifecycle/health mutations, and emit
 * the Section-12 events. Nothing activates itself: activation is a
 * three-step human-gated protocol (requested → approved → completed) and
 * every activation rule the record declares is checked before completion.
 */
import {
  PopulationError,
  type ActivationRule,
  type HealthStatus,
  type LifecycleState,
} from "./types";
import type { CapabilityRecord, SkillRecord } from "./records";
import { LifecycleMachine } from "./lifecycle";
import type { HealthModel } from "./health";
import type { DependencyEngine } from "./dependencies";
import type { PopulationEventBus } from "./events";
import type { PermissionModel } from "./permissions";

interface RegistryDeps {
  readonly events: PopulationEventBus;
  readonly health: HealthModel;
  readonly dependencies: DependencyEngine;
  readonly permissions: PermissionModel;
}

abstract class PopulationStore<T extends { id: string; lifecycle: LifecycleState }> {
  protected readonly records = new Map<string, T>();
  protected readonly lifecycle = new LifecycleMachine();
  private readonly pendingActivations = new Set<string>();
  private readonly approvedActivations = new Set<string>();

  constructor(
    protected readonly area: string,
    protected readonly deps: RegistryDeps,
  ) {}

  protected abstract activationRulesOf(record: T): readonly ActivationRule[];
  protected abstract registeredEvent(record: T): void;

  /** Records enter as `registered` regardless of the draft's claimed state. */
  protected store(record: T): T {
    if (this.records.has(record.id)) {
      throw new PopulationError(this.area, `duplicate id "${record.id}"`);
    }
    const stored = { ...record, lifecycle: "registered" as LifecycleState };
    this.records.set(record.id, stored);
    this.registeredEvent(stored);
    return stored;
  }

  get(id: string): T | undefined {
    return this.records.get(id);
  }

  has(id: string): boolean {
    return this.records.has(id);
  }

  list(): readonly T[] {
    return [...this.records.values()];
  }

  count(): number {
    return this.records.size;
  }

  byLifecycle(state: LifecycleState): readonly T[] {
    return this.list().filter((r) => r.lifecycle === state);
  }

  /**
   * Governance transitions — every state EXCEPT `active`. Reaching `active`
   * is exclusively the human-gated protocol's privilege (requestActivation →
   * approveActivation → completeActivation, or resume() from suspended);
   * there is no back door.
   */
  transition(id: string, to: LifecycleState): T {
    if (to === "active") {
      throw new PopulationError(
        this.area,
        `"${id}" cannot be set active via transition() — use the activation protocol ` +
          `(requestActivation → approveActivation → completeActivation) or resume() from suspended`,
      );
    }
    return this.applyTransition(id, to);
  }

  /** Internal state write — reachable for `active` only via the protocol methods. */
  private applyTransition(id: string, to: LifecycleState): T {
    const record = this.records.get(id);
    if (!record) throw new PopulationError(this.area, `unknown id "${id}"`);
    this.lifecycle.assertTransition(id, record.lifecycle, to);
    const next = { ...record, lifecycle: to };
    this.records.set(id, next);
    return next;
  }

  reportHealth(id: string, status: HealthStatus, note?: string): T {
    const record = this.records.get(id);
    if (!record) throw new PopulationError(this.area, `unknown id "${id}"`);
    this.deps.health.report(id, status, note);
    const next = { ...record, health: status };
    this.records.set(id, next);
    return next;
  }

  /* ── Activation protocol (Section 12 events; human gate preserved) ────── */

  requestActivation(id: string): void {
    const record = this.records.get(id);
    if (!record) throw new PopulationError(this.area, `unknown id "${id}"`);
    if (record.lifecycle !== "approved") {
      throw new PopulationError(
        this.area,
        `"${id}" must be lifecycle "approved" to request activation (is "${record.lifecycle}")`,
      );
    }
    this.pendingActivations.add(id);
    this.deps.events.emit("activation-requested", id, { lifecycle: record.lifecycle });
  }

  approveActivation(id: string, approver: string): void {
    if (!this.pendingActivations.has(id)) {
      throw new PopulationError(this.area, `no pending activation request for "${id}"`);
    }
    this.deps.permissions.assertAllowed(approver, id, "approval");
    this.pendingActivations.delete(id);
    this.approvedActivations.add(id);
    this.deps.events.emit("activation-approved", id, { approver });
  }

  completeActivation(id: string): T {
    if (!this.approvedActivations.has(id)) {
      throw new PopulationError(this.area, `activation for "${id}" was never approved`);
    }
    const record = this.records.get(id)!;
    for (const rule of this.activationRulesOf(record)) {
      this.assertActivationRule(record, rule);
    }
    this.approvedActivations.delete(id);
    const next = this.applyTransition(id, "active");
    this.deps.events.emit("activation-completed", id, {});
    return next;
  }

  /**
   * Governed resume from `suspended` — the only other road to `active`.
   * Demands an approver holding "approval", re-checks every activation
   * rule, and journals the completion event with the resume marker.
   */
  resume(id: string, approver: string): T {
    const record = this.records.get(id);
    if (!record) throw new PopulationError(this.area, `unknown id "${id}"`);
    if (record.lifecycle !== "suspended") {
      throw new PopulationError(
        this.area,
        `"${id}" can only resume from "suspended" (is "${record.lifecycle}")`,
      );
    }
    this.deps.permissions.assertAllowed(approver, id, "approval");
    for (const rule of this.activationRulesOf(record)) {
      this.assertActivationRule(record, rule);
    }
    const next = this.applyTransition(id, "active");
    this.deps.events.emit("activation-completed", id, { resumed: true, approver });
    return next;
  }

  private assertActivationRule(record: T, rule: ActivationRule): void {
    switch (rule) {
      case "dependencies-active": {
        const stale = this.deps.dependencies
          .dependenciesOf(record.id)
          .filter((d) => d.necessity === "required")
          .filter((d) => this.records.get(d.target)?.lifecycle !== "active");
        if (stale.length > 0) {
          throw new PopulationError(
            this.area,
            `"${record.id}" activation rule dependencies-active failed: ${stale
              .map((d) => d.target)
              .join(", ")} not active`,
          );
        }
        return;
      }
      case "health-not-critical": {
        const status = this.deps.health.statusOf(record.id);
        if (status === "critical" || status === "offline") {
          throw new PopulationError(
            this.area,
            `"${record.id}" activation rule health-not-critical failed (health: ${status})`,
          );
        }
        return;
      }
      case "permissions-granted":
      case "manual-approval":
        /* both are satisfied structurally by the request→approve protocol:
           approveActivation demands an approver holding "approval". */
        return;
    }
  }
}

export class PopulationCapabilityRegistry extends PopulationStore<CapabilityRecord> {
  constructor(deps: RegistryDeps) {
    super("capability-registry", deps);
  }

  protected activationRulesOf(record: CapabilityRecord): readonly ActivationRule[] {
    return record.activationRules;
  }

  protected registeredEvent(record: CapabilityRecord): void {
    this.deps.events.emit("capability-added", record.id, { version: record.version });
  }

  register(record: CapabilityRecord): CapabilityRecord {
    return this.store(record);
  }

  /** Removal is legal only from terminal or suspended states — never mid-flight. */
  remove(id: string): void {
    const record = this.records.get(id);
    if (!record) throw new PopulationError(this.area, `unknown id "${id}"`);
    if (!["archived", "suspended", "registered"].includes(record.lifecycle)) {
      throw new PopulationError(
        this.area,
        `"${id}" cannot be removed while lifecycle is "${record.lifecycle}"`,
      );
    }
    const dependents = this.deps.dependencies.dependentsOf(id);
    if (dependents.length > 0) {
      throw new PopulationError(
        this.area,
        `"${id}" still has dependents: ${dependents.join(", ")}`,
      );
    }
    this.records.delete(id);
    this.deps.events.emit("capability-removed", id, {});
  }

  byCategory(category: string): readonly CapabilityRecord[] {
    return this.list().filter((c) => c.category === category);
  }

  byVisibility(visibility: CapabilityRecord["visibility"]): readonly CapabilityRecord[] {
    return this.list().filter((c) => c.visibility === visibility);
  }
}

export class PopulationSkillRegistry extends PopulationStore<SkillRecord> {
  constructor(deps: RegistryDeps) {
    super("skill-registry", deps);
  }

  protected activationRulesOf(): readonly ActivationRule[] {
    /* Skill activation is always dependency- and health-gated. */
    return ["dependencies-active", "health-not-critical"];
  }

  protected registeredEvent(record: SkillRecord): void {
    this.deps.events.emit("skill-registered", record.id, { version: record.version });
  }

  register(record: SkillRecord): SkillRecord {
    return this.store(record);
  }

  /** Metadata/contract update — identity and version stay; version changes go through the timeline. */
  update(id: string, patch: Partial<Pick<SkillRecord, "policies" | "metadata">>): SkillRecord {
    const record = this.records.get(id);
    if (!record) throw new PopulationError(this.area, `unknown id "${id}"`);
    const next = { ...record, ...patch };
    this.records.set(id, next);
    this.deps.events.emit("skill-updated", id, { fields: Object.keys(patch) });
    return next;
  }

  byCategory(category: string): readonly SkillRecord[] {
    return this.list().filter((s) => s.category === category);
  }

  requiringCapability(capabilityId: string): readonly SkillRecord[] {
    return this.list().filter((s) => s.requiredCapabilities.includes(capabilityId));
  }
}

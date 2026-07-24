/**
 * Policy Engine · Governance Layer · Audit Layer · Rollback Manager.
 *
 * The policy engine evaluates EVERY task before execution — capability,
 * permission (gated capabilities need explicit human approval: no privilege
 * escalation), resource limits, execution limits, safety and compliance. The
 * governance layer owns the policy set and records every decision. The audit
 * layer is an append-only HASH-CHAINED trail (tamper-evident). The rollback
 * manager runs registered compensations in reverse.
 */
import {
  OrchError,
  type Clock,
  type OrchPolicy,
  type OrchTask,
  type PolicyDecision,
  type PolicyEnvironment,
} from "./types";

// ── Built-in policies ───────────────────────────────────────────────────────

export const capabilityPolicy: OrchPolicy = {
  id: "policy.capability",
  evaluate: (task, env) => {
    for (const cap of task.capabilities) {
      if (!env.agentFor(cap)) {
        return {
          policyId: "policy.capability",
          allowed: false,
          reason: `capability "${cap}" is not routable`,
        };
      }
    }
    return { policyId: "policy.capability", allowed: true, reason: "all capabilities routable" };
  },
};

/** Gated capabilities demand explicit approval — privilege escalation is denied. */
export const permissionPolicy: OrchPolicy = {
  id: "policy.permission",
  evaluate: (task, env) => {
    const gated = task.capabilities.filter((cap) => env.gatedCapabilities.has(cap));
    if (gated.length > 0 && task.approvalGranted !== true) {
      return {
        policyId: "policy.permission",
        allowed: false,
        reason: `gated capabilities [${gated.join(", ")}] require human approval`,
      };
    }
    return { policyId: "policy.permission", allowed: true, reason: "permissions satisfied" };
  },
};

export const resourcePolicy: OrchPolicy = {
  id: "policy.resource",
  evaluate: (_task, env) => {
    if (env.queueDepth >= env.limits.maxQueueDepth) {
      return { policyId: "policy.resource", allowed: false, reason: "queue depth limit reached" };
    }
    if (env.runningCount >= env.limits.maxRunning) {
      return { policyId: "policy.resource", allowed: false, reason: "running limit reached" };
    }
    return { policyId: "policy.resource", allowed: true, reason: "resources available" };
  },
};

export const executionPolicy: OrchPolicy = {
  id: "policy.execution",
  evaluate: (task) => {
    if (task.retry.maxAttempts < 1 || task.retry.maxAttempts > 5) {
      return {
        policyId: "policy.execution",
        allowed: false,
        reason: "retry attempts out of bounds",
      };
    }
    if (task.timeoutMs < 1 || task.timeoutMs > 300_000) {
      return { policyId: "policy.execution", allowed: false, reason: "timeout out of bounds" };
    }
    return { policyId: "policy.execution", allowed: true, reason: "execution bounds ok" };
  },
};

export const compliancePolicy: OrchPolicy = {
  id: "policy.compliance",
  evaluate: (task) => {
    if (!task.owner || !task.context.correlationId) {
      return {
        policyId: "policy.compliance",
        allowed: false,
        reason: "task lacks owner or correlation id (unauditable)",
      };
    }
    return { policyId: "policy.compliance", allowed: true, reason: "auditable" };
  },
};

// ── Policy Engine + Governance ──────────────────────────────────────────────

export interface GovernanceRecord {
  readonly taskId: string;
  readonly decisions: readonly PolicyDecision[];
  readonly allowed: boolean;
  readonly atISO: string;
}

export class PolicyEngine {
  private readonly policies = new Map<string, OrchPolicy>();

  register(policy: OrchPolicy): void {
    if (this.policies.has(policy.id)) {
      throw new OrchError("policy", `duplicate policy "${policy.id}"`);
    }
    this.policies.set(policy.id, policy);
  }

  /** Evaluate the global set + the task's own required policies. Fail closed. */
  evaluate(
    task: OrchTask,
    env: PolicyEnvironment,
  ): { allowed: boolean; decisions: PolicyDecision[] } {
    const decisions: PolicyDecision[] = [];
    for (const policy of this.policies.values()) {
      decisions.push(policy.evaluate(task, env));
    }
    for (const required of task.policies) {
      if (!this.policies.has(required)) {
        decisions.push({
          policyId: required,
          allowed: false,
          reason: "required policy is not registered — fail closed",
        });
      }
    }
    return { allowed: decisions.every((d) => d.allowed), decisions };
  }
}

export class GovernanceLayer {
  private readonly records: GovernanceRecord[] = [];

  constructor(
    private readonly engine: PolicyEngine,
    private readonly clock: Clock,
    private readonly limit = 500,
  ) {}

  /** The single governance gate the dispatcher calls — always recorded. */
  clear(task: OrchTask, env: PolicyEnvironment): GovernanceRecord {
    const { allowed, decisions } = this.engine.evaluate(task, env);
    const record: GovernanceRecord = { taskId: task.id, decisions, allowed, atISO: this.clock() };
    this.records.push(record);
    while (this.records.length > this.limit) this.records.shift();
    return record;
  }

  decisions(taskId?: string): readonly GovernanceRecord[] {
    return taskId ? this.records.filter((r) => r.taskId === taskId) : [...this.records];
  }

  deniedCount(): number {
    return this.records.filter((r) => !r.allowed).length;
  }
}

// ── Audit Layer (hash-chained, tamper-evident) ──────────────────────────────

export interface AuditEntry {
  readonly seq: number;
  readonly taskId: string;
  readonly phase: string;
  readonly detail: string;
  readonly atISO: string;
  readonly prevHash: string;
  readonly hash: string;
}

/** djb2 over the canonical entry string — lightweight tamper evidence. */
function chainHash(prevHash: string, payload: string): string {
  const s = `${prevHash}|${payload}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

export class AuditLayer {
  private readonly entries: AuditEntry[] = [];
  private seq = 0;

  constructor(
    private readonly clock: Clock,
    private readonly limit = 2000,
  ) {}

  record(taskId: string, phase: string, detail: string): AuditEntry {
    const prevHash = this.entries[this.entries.length - 1]?.hash ?? "genesis0";
    const atISO = this.clock();
    const payload = `${this.seq}|${taskId}|${phase}|${detail}|${atISO}`;
    const entry: AuditEntry = {
      seq: this.seq++,
      taskId,
      phase,
      detail,
      atISO,
      prevHash,
      hash: chainHash(prevHash, payload),
    };
    this.entries.push(entry);
    while (this.entries.length > this.limit) this.entries.shift();
    return entry;
  }

  trail(taskId: string): readonly AuditEntry[] {
    return this.entries.filter((e) => e.taskId === taskId);
  }

  all(): readonly AuditEntry[] {
    return [...this.entries];
  }

  /** Recompute the chain — any tampering breaks verification. */
  verify(): boolean {
    let prev = this.entries[0]?.prevHash ?? "genesis0";
    for (const entry of this.entries) {
      const payload = `${entry.seq}|${entry.taskId}|${entry.phase}|${entry.detail}|${entry.atISO}`;
      if (entry.prevHash !== prev || entry.hash !== chainHash(prev, payload)) return false;
      prev = entry.hash;
    }
    return true;
  }
}

// ── Rollback Manager ────────────────────────────────────────────────────────

export type Compensation = () => void | Promise<void>;

export class RollbackManager {
  private readonly compensations = new Map<string, { label: string; run: Compensation }[]>();

  constructor(private readonly audit: AuditLayer) {}

  registerCompensation(taskId: string, label: string, run: Compensation): void {
    const list = this.compensations.get(taskId) ?? [];
    list.push({ label, run });
    this.compensations.set(taskId, list);
  }

  /** Run compensations in REVERSE registration order; failures are contained. */
  async rollback(taskId: string): Promise<{ compensated: number; failed: number }> {
    const list = this.compensations.get(taskId) ?? [];
    let compensated = 0;
    let failed = 0;
    for (const step of [...list].reverse()) {
      try {
        await step.run();
        compensated++;
        this.audit.record(taskId, "rollback", `compensated: ${step.label}`);
      } catch (error) {
        failed++;
        this.audit.record(
          taskId,
          "rollback",
          `compensation failed: ${step.label}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    this.compensations.delete(taskId);
    return { compensated, failed };
  }
}

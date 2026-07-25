/**
 * Section 09 — Security model.
 *
 * Composes the population layer's deny-by-default PermissionModel and adds:
 * policy checks (blocking policies veto, advisory policies annotate),
 * registerable approval hooks (any hook can veto an execution), and an
 * append-only audit trail. Every consequential decision leaves a record.
 */
import type { PermissionModel } from "../population/permissions";
import type { SkillPolicy } from "../population/records";
import { AgentRuntimeError, type Clock, type IdFactory } from "./types";
import type { ExecutionContext } from "./execution-context";

export interface PolicyDecision {
  readonly allowed: boolean;
  readonly blockedBy: readonly string[];
  readonly advisories: readonly string[];
}

export interface ApprovalRequest {
  readonly agentIds: readonly string[];
  readonly mode: string;
  readonly context: ExecutionContext;
}

/** Returns a veto reason to reject, or null to allow. */
export type ApprovalHook = (request: ApprovalRequest) => string | null;

export interface AuditEntry {
  readonly auditId: string;
  readonly actor: string;
  readonly action: string;
  readonly subjectId: string;
  readonly at: string;
  readonly detail: Readonly<Record<string, unknown>>;
}

export class AuditTrail {
  private readonly entries: AuditEntry[] = [];

  constructor(
    private readonly clock: Clock,
    private readonly idFactory: IdFactory,
  ) {}

  append(
    actor: string,
    action: string,
    subjectId: string,
    detail: Record<string, unknown> = {},
  ): AuditEntry {
    const entry: AuditEntry = {
      auditId: this.idFactory("audit"),
      actor,
      action,
      subjectId,
      at: this.clock(),
      detail,
    };
    this.entries.push(entry);
    return entry;
  }

  list(filter?: { subjectId?: string; actor?: string }): readonly AuditEntry[] {
    return this.entries.filter(
      (e) =>
        (filter?.subjectId === undefined || e.subjectId === filter.subjectId) &&
        (filter?.actor === undefined || e.actor === filter.actor),
    );
  }
}

export class SecurityModel {
  private readonly approvalHooks: ApprovalHook[] = [];

  constructor(
    readonly permissions: PermissionModel,
    readonly audit: AuditTrail,
  ) {}

  /** Authorization: the executing principal needs "execution" on the agent. */
  assertCanExecute(context: ExecutionContext, agentId: string): void {
    if (!context.can(agentId, "execution")) {
      this.audit.append(context.identity.principal, "execution-denied", agentId, {
        reason: "missing execution permission",
      });
      throw new AgentRuntimeError(
        "security",
        `"${context.identity.principal}" lacks "execution" on "${agentId}" (deny-by-default)`,
      );
    }
  }

  /** Policy checks: blocking policies veto; advisory ones only annotate. */
  evaluatePolicies(policies: readonly SkillPolicy[]): PolicyDecision {
    const blockedBy = policies.filter((p) => p.enforcement === "blocking").map((p) => p.id);
    const advisories = policies.filter((p) => p.enforcement === "advisory").map((p) => p.id);
    return { allowed: blockedBy.length === 0, blockedBy, advisories };
  }

  registerApprovalHook(hook: ApprovalHook): () => void {
    this.approvalHooks.push(hook);
    return () => {
      const index = this.approvalHooks.indexOf(hook);
      if (index >= 0) this.approvalHooks.splice(index, 1);
    };
  }

  /** Runs every hook; the first veto wins (audited). Null = all clear. */
  consultApprovalHooks(request: ApprovalRequest): string | null {
    for (const hook of this.approvalHooks) {
      const veto = hook(request);
      if (veto !== null) {
        this.audit.append(
          request.context.identity.principal,
          "approval-hook-veto",
          request.agentIds.join(","),
          { veto, mode: request.mode },
        );
        return veto;
      }
    }
    return null;
  }
}

/**
 * Section 07 — Execution context.
 *
 * Everything a future agent invocation carries: who (identity), where
 * (session), scoped memory, a read-only permission view, and the three
 * traceability ids (correlation / trace / audit). Child contexts share the
 * correlation id and memory scope parentage — the whole chain of a
 * composite execution is one correlated story.
 */
import type { PermissionModel } from "../population/permissions";
import type { PermissionAction } from "../population/types";
import { AgentRuntimeError, type Clock, type IdFactory } from "./types";

export interface ExecutionIdentity {
  readonly principal: string;
  readonly kind: "human" | "service" | "agent";
}

/** Scoped, hierarchical KV memory — child scopes read through to parents. */
export class ContextMemory {
  private readonly store = new Map<string, unknown>();

  constructor(private readonly parent?: ContextMemory) {}

  set(key: string, value: unknown): void {
    if (key.trim() === "") throw new AgentRuntimeError("context", "memory key must be non-empty");
    this.store.set(key, value);
  }

  get<T = unknown>(key: string): T | undefined {
    if (this.store.has(key)) return this.store.get(key) as T;
    return this.parent?.get<T>(key);
  }

  has(key: string): boolean {
    return this.store.has(key) || (this.parent?.has(key) ?? false);
  }

  child(): ContextMemory {
    return new ContextMemory(this);
  }
}

export interface ExecutionContext {
  readonly identity: ExecutionIdentity;
  readonly sessionId: string;
  readonly memory: ContextMemory;
  readonly correlationId: string;
  readonly traceId: string;
  readonly auditId: string;
  readonly createdAt: string;
  readonly parentTraceId?: string;
  /** Read-only permission view bound to this identity. */
  can(subjectId: string, action: PermissionAction): boolean;
  /** Child context for a nested invocation — same correlation, new trace/audit. */
  child(): ExecutionContext;
}

export class ExecutionContextFactory {
  constructor(
    private readonly options: {
      readonly clock: Clock;
      readonly idFactory: IdFactory;
      readonly permissions: PermissionModel;
    },
  ) {}

  create(identity: ExecutionIdentity, sessionId?: string): ExecutionContext {
    const { clock, idFactory, permissions } = this.options;
    if (identity.principal.trim() === "") {
      throw new AgentRuntimeError("context", "identity principal must be non-empty");
    }

    const build = (
      memory: ContextMemory,
      correlationId: string,
      session: string,
      parentTraceId?: string,
    ): ExecutionContext => {
      const traceId = idFactory("trace");
      const auditId = idFactory("audit");
      const context: ExecutionContext = {
        identity,
        sessionId: session,
        memory,
        correlationId,
        traceId,
        auditId,
        createdAt: clock(),
        parentTraceId,
        can: (subjectId, action) => permissions.isAllowed(identity.principal, subjectId, action),
        child: () => build(memory.child(), correlationId, session, traceId),
      };
      return context;
    };

    return build(
      new ContextMemory(),
      idFactory("corr"),
      sessionId ?? idFactory("session"),
      undefined,
    );
  }
}

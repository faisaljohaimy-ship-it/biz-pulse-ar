/**
 * Section 04 — Execution model (coordinator).
 *
 * Seven modes over one governed core. The runtime hosts NO agents yet:
 * invocation goes through a single pluggable AgentInvoker installed once by
 * a later phase — until then execution fails honestly. Every run is
 * authorized (deny-by-default), policy-checked, approval-hook-consulted,
 * traced, metered, journaled and audited.
 *
 * Governance:
 *  - approval-driven plans and agents carrying BLOCKING policies can never
 *    run directly — request → approve (human "approval" permission) → run.
 *  - event-driven bindings only FILE requests; nothing auto-runs.
 *  - operational lifecycle states are entered through the OperationalGate,
 *    which only this coordinator holds.
 */
import { AgentRuntimeError, type AgentEventName, type IdFactory } from "./types";
import type { AgentEventBus } from "./events";
import type { AgentRuntimeRegistry, OperationalGate } from "./registry";
import type { ExecutionContext } from "./execution-context";
import type { MetricsRegistry, TraceCollector, LogJournal } from "./observability";
import type { SecurityModel } from "./security";

export type AgentInvoker = (
  agentId: string,
  input: unknown,
  context: ExecutionContext,
) => Promise<unknown> | unknown;

export type ExecutionPlan =
  | { readonly mode: "single"; readonly agentId: string; readonly input: unknown }
  | {
      readonly mode: "sequential";
      readonly steps: readonly { readonly agentId: string; readonly input: unknown }[];
    }
  | {
      readonly mode: "parallel";
      readonly branches: readonly { readonly agentId: string; readonly input: unknown }[];
    }
  | {
      readonly mode: "pipeline";
      readonly stageAgentIds: readonly string[];
      readonly input: unknown;
    }
  | { readonly mode: "broadcast"; readonly agentIds: readonly string[]; readonly input: unknown }
  | { readonly mode: "approval-driven"; readonly inner: ExecutionPlan };

export interface InvocationResult {
  readonly agentId: string;
  readonly ok: boolean;
  readonly output?: unknown;
  readonly error?: string;
  readonly latency: number;
  readonly traceId: string;
}

export interface ExecutionResult {
  readonly mode: ExecutionPlan["mode"];
  readonly ok: boolean;
  readonly invocations: readonly InvocationResult[];
}

export type RequestStatus = "pending" | "approved" | "rejected" | "completed";

/**
 * Read-only snapshot of a request. The live state (status, plan, context)
 * is PRIVATE to the coordinator — callers can neither flip a status nor
 * swap plan agents after filing; approve/reject/run are the only writers.
 */
export interface ExecutionRequest {
  readonly requestId: string;
  readonly mode: ExecutionPlan["mode"];
  readonly agentIds: readonly string[];
  readonly filedBy: string;
  readonly status: RequestStatus;
  readonly decidedBy?: string;
  readonly reason?: string;
}

interface InternalRequest {
  readonly requestId: string;
  readonly plan: ExecutionPlan;
  readonly context: ExecutionContext;
  readonly filedBy: string;
  status: RequestStatus;
  decidedBy?: string;
  reason?: string;
}

/**
 * Structural clone of a plan at filing time — the coordinator authorizes
 * and runs ITS copy, so a caller mutating their own plan object after
 * `request()` changes nothing that was filed. Inputs are opaque payloads
 * and pass through by reference.
 */
function snapshotPlan(plan: ExecutionPlan): ExecutionPlan {
  switch (plan.mode) {
    case "single":
      return Object.freeze({ mode: plan.mode, agentId: plan.agentId, input: plan.input });
    case "sequential":
      return Object.freeze({
        mode: plan.mode,
        steps: Object.freeze(
          plan.steps.map((s) => Object.freeze({ agentId: s.agentId, input: s.input })),
        ),
      });
    case "parallel":
      return Object.freeze({
        mode: plan.mode,
        branches: Object.freeze(
          plan.branches.map((b) => Object.freeze({ agentId: b.agentId, input: b.input })),
        ),
      });
    case "pipeline":
      return Object.freeze({
        mode: plan.mode,
        stageAgentIds: Object.freeze([...plan.stageAgentIds]),
        input: plan.input,
      });
    case "broadcast":
      return Object.freeze({
        mode: plan.mode,
        agentIds: Object.freeze([...plan.agentIds]),
        input: plan.input,
      });
    case "approval-driven":
      return Object.freeze({ mode: plan.mode, inner: snapshotPlan(plan.inner) });
  }
}

export function collectAgentIds(plan: ExecutionPlan): readonly string[] {
  switch (plan.mode) {
    case "single":
      return [plan.agentId];
    case "sequential":
      return plan.steps.map((s) => s.agentId);
    case "parallel":
      return plan.branches.map((b) => b.agentId);
    case "pipeline":
      return [...plan.stageAgentIds];
    case "broadcast":
      return [...plan.agentIds];
    case "approval-driven":
      return collectAgentIds(plan.inner);
  }
}

interface CoordinatorDeps {
  readonly registry: AgentRuntimeRegistry;
  readonly operationalGate: OperationalGate;
  readonly events: AgentEventBus;
  readonly security: SecurityModel;
  readonly traces: TraceCollector;
  readonly metrics: MetricsRegistry;
  readonly logs: LogJournal;
  readonly idFactory: IdFactory;
}

export class ExecutionCoordinator {
  private invoker: AgentInvoker | undefined;
  private readonly requests = new Map<string, InternalRequest>();
  private readonly eventBindings: {
    event: AgentEventName;
    plan: ExecutionPlan;
    principal: string;
  }[] = [];

  constructor(private readonly deps: CoordinatorDeps) {}

  /** Installed once by the phase that brings real agents. Re-install refused. */
  installInvoker(invoker: AgentInvoker): void {
    if (this.invoker !== undefined) {
      throw new AgentRuntimeError(
        "execution",
        "an invoker is already installed — refusing replacement",
      );
    }
    this.invoker = invoker;
  }

  hasInvoker(): boolean {
    return this.invoker !== undefined;
  }

  /* ── Request / approve / reject / run (the governed protocol) ─────────── */

  request(plan: ExecutionPlan, context: ExecutionContext): ExecutionRequest {
    const filed = snapshotPlan(plan);
    this.assertPlanAgents(filed);
    const internal: InternalRequest = {
      requestId: this.deps.idFactory("exec"),
      plan: filed,
      context,
      filedBy: context.identity.principal,
      status: "pending",
    };
    this.requests.set(internal.requestId, internal);
    this.deps.events.emit("execution-requested", internal.requestId, {
      mode: filed.mode,
      agents: collectAgentIds(filed),
      filedBy: internal.filedBy,
    });
    this.deps.security.audit.append(internal.filedBy, "execution-requested", internal.requestId, {
      mode: filed.mode,
    });
    return this.viewOf(internal);
  }

  approve(requestId: string, approver: string): ExecutionRequest {
    const request = this.pending(requestId);
    for (const agentId of collectAgentIds(request.plan)) {
      this.deps.security.permissions.assertAllowed(approver, agentId, "approval");
    }
    request.status = "approved";
    request.decidedBy = approver;
    this.deps.events.emit("execution-approved", requestId, { approver });
    this.deps.security.audit.append(approver, "execution-approved", requestId, {});
    return this.viewOf(request);
  }

  reject(requestId: string, approver: string, reason: string): ExecutionRequest {
    const request = this.pending(requestId);
    for (const agentId of collectAgentIds(request.plan)) {
      this.deps.security.permissions.assertAllowed(approver, agentId, "approval");
    }
    request.status = "rejected";
    request.decidedBy = approver;
    request.reason = reason;
    this.deps.events.emit("execution-rejected", requestId, { approver, reason });
    this.deps.security.audit.append(approver, "execution-rejected", requestId, { reason });
    return this.viewOf(request);
  }

  async run(requestId: string): Promise<ExecutionResult> {
    const request = this.requests.get(requestId);
    if (!request) throw new AgentRuntimeError("execution", `unknown request "${requestId}"`);
    if (request.status !== "approved") {
      throw new AgentRuntimeError(
        "execution",
        `request "${requestId}" is ${request.status} — only approved requests run`,
      );
    }
    const plan = request.plan.mode === "approval-driven" ? request.plan.inner : request.plan;
    const result = await this.runPlan(plan, request.context);
    request.status = "completed";
    return result;
  }

  requestOf(requestId: string): ExecutionRequest | undefined {
    const request = this.requests.get(requestId);
    return request ? this.viewOf(request) : undefined;
  }

  /** Frozen snapshot — the live record never leaves the coordinator. */
  private viewOf(request: InternalRequest): ExecutionRequest {
    return Object.freeze({
      requestId: request.requestId,
      mode: request.plan.mode,
      agentIds: collectAgentIds(request.plan),
      filedBy: request.filedBy,
      status: request.status,
      decidedBy: request.decidedBy,
      reason: request.reason,
    });
  }

  /* ── Direct execution (only for plans free of human-gate requirements) ── */

  async execute(plan: ExecutionPlan, context: ExecutionContext): Promise<ExecutionResult> {
    if (plan.mode === "approval-driven") {
      throw new AgentRuntimeError(
        "execution",
        "approval-driven plans cannot execute directly — request → approve → run",
      );
    }
    this.assertPlanAgents(plan);
    for (const agentId of collectAgentIds(plan)) {
      const record = this.deps.registry.get(agentId)!;
      const decision = this.deps.security.evaluatePolicies(record.policies);
      if (!decision.allowed) {
        throw new AgentRuntimeError(
          "execution",
          `"${agentId}" carries blocking policies (${decision.blockedBy.join(", ")}) — direct execution refused; use request → approve → run`,
        );
      }
    }
    return this.runPlan(plan, context);
  }

  /* ── Event-driven bindings: events FILE requests, never run them ──────── */

  bindEventTrigger(
    event: AgentEventName,
    plan: ExecutionPlan,
    contextForBinding: ExecutionContext,
  ): void {
    /* snapshot at bind time — later mutation of the caller's plan object
       must not change what future events will file */
    const bound = snapshotPlan(plan);
    this.assertPlanAgents(bound);
    this.eventBindings.push({
      event,
      plan: bound,
      principal: contextForBinding.identity.principal,
    });
    this.deps.events.on(event, () => {
      const request = this.request(bound, contextForBinding.child());
      this.deps.logs.log("info", request.requestId, "event-triggered execution request filed", {
        trigger: event,
      });
    });
  }

  bindings(): readonly { event: AgentEventName; principal: string }[] {
    return this.eventBindings.map(({ event, principal }) => ({ event, principal }));
  }

  /* ── Pause / resume (operational states through the gate only) ────────── */

  pause(agentId: string, context: ExecutionContext): void {
    this.deps.security.assertCanExecute(context, agentId);
    this.deps.operationalGate.apply(agentId, "paused");
    this.deps.events.emit("agent-paused", agentId, { by: context.identity.principal });
  }

  resume(agentId: string, context: ExecutionContext): void {
    this.deps.security.assertCanExecute(context, agentId);
    this.deps.operationalGate.apply(agentId, "running");
    this.deps.events.emit("agent-resumed", agentId, { by: context.identity.principal });
  }

  /* ── Internals ────────────────────────────────────────────────────────── */

  private pending(requestId: string): InternalRequest {
    const request = this.requests.get(requestId);
    if (!request) throw new AgentRuntimeError("execution", `unknown request "${requestId}"`);
    if (request.status !== "pending") {
      throw new AgentRuntimeError("execution", `request "${requestId}" already ${request.status}`);
    }
    return request;
  }

  private assertPlanAgents(plan: ExecutionPlan): void {
    const ids = collectAgentIds(plan);
    if (ids.length === 0) throw new AgentRuntimeError("execution", "plan references no agents");
    for (const agentId of ids) {
      const record = this.deps.registry.get(agentId);
      if (!record) throw new AgentRuntimeError("execution", `unknown agent "${agentId}"`);
      const effectiveMode = plan.mode === "approval-driven" ? plan.inner.mode : plan.mode;
      if (
        !record.supportedModes.includes(effectiveMode) &&
        !(plan.mode === "approval-driven" && record.supportedModes.includes("approval-driven"))
      ) {
        throw new AgentRuntimeError(
          "execution",
          `"${agentId}" does not support execution mode "${effectiveMode}"`,
        );
      }
    }
  }

  private async runPlan(plan: ExecutionPlan, context: ExecutionContext): Promise<ExecutionResult> {
    const veto = this.deps.security.consultApprovalHooks({
      agentIds: collectAgentIds(plan),
      mode: plan.mode,
      context,
    });
    if (veto !== null) {
      this.deps.events.emit("execution-rejected", collectAgentIds(plan).join(","), { veto });
      throw new AgentRuntimeError("execution", `approval hook veto: ${veto}`);
    }

    switch (plan.mode) {
      case "single": {
        const invocation = await this.invokeOne(plan.agentId, plan.input, context);
        return { mode: plan.mode, ok: invocation.ok, invocations: [invocation] };
      }
      case "sequential": {
        const invocations: InvocationResult[] = [];
        for (const step of plan.steps) {
          const invocation = await this.invokeOne(step.agentId, step.input, context);
          invocations.push(invocation);
          if (!invocation.ok) break; // fail fast — later steps never start
        }
        return { mode: plan.mode, ok: invocations.every((i) => i.ok), invocations };
      }
      case "parallel": {
        const invocations = await Promise.all(
          plan.branches.map((b) => this.invokeOne(b.agentId, b.input, context)),
        );
        return { mode: plan.mode, ok: invocations.every((i) => i.ok), invocations };
      }
      case "pipeline": {
        const invocations: InvocationResult[] = [];
        let carried: unknown = plan.input;
        for (const agentId of plan.stageAgentIds) {
          const invocation = await this.invokeOne(agentId, carried, context);
          invocations.push(invocation);
          if (!invocation.ok) break;
          carried = invocation.output;
        }
        return { mode: plan.mode, ok: invocations.every((i) => i.ok), invocations };
      }
      case "broadcast": {
        const invocations = await Promise.all(
          plan.agentIds.map((agentId) => this.invokeOne(agentId, plan.input, context)),
        );
        return { mode: plan.mode, ok: invocations.every((i) => i.ok), invocations };
      }
      case "approval-driven":
        /* unreachable — unwrapped in run(); execute() refuses it */
        throw new AgentRuntimeError("execution", "approval-driven plans run via the protocol");
    }
  }

  private async invokeOne(
    agentId: string,
    input: unknown,
    parentContext: ExecutionContext,
  ): Promise<InvocationResult> {
    const { registry, operationalGate, events, security, traces, metrics, logs } = this.deps;
    if (this.invoker === undefined) {
      throw new AgentRuntimeError(
        "execution",
        "no invoker installed — the runtime hosts no agents yet (a later phase installs one)",
      );
    }
    const record = registry.get(agentId);
    if (!record) throw new AgentRuntimeError("execution", `unknown agent "${agentId}"`);
    if (record.lifecycle !== "ready") {
      throw new AgentRuntimeError(
        "execution",
        `"${agentId}" is lifecycle "${record.lifecycle}" — only "ready" agents run`,
      );
    }
    if (record.health === "critical" || record.health === "offline") {
      throw new AgentRuntimeError(
        "execution",
        `"${agentId}" health is ${record.health} — execution refused`,
      );
    }
    security.assertCanExecute(parentContext, agentId);

    const context = parentContext.child();
    const span = traces.start(context.traceId, "agent-invocation", agentId, context.parentTraceId, {
      correlationId: context.correlationId,
    });
    operationalGate.apply(agentId, "running");
    events.emit("agent-started", agentId, { traceId: span.traceId });
    metrics.recordStart(agentId);
    security.audit.append(context.identity.principal, "agent-invocation", agentId, {
      auditId: context.auditId,
      traceId: span.traceId,
    });

    try {
      const output = await this.invoker(agentId, input, context);
      traces.end(span.traceId, "ok");
      const latency = traces.durationOf(span.traceId) ?? 0;
      metrics.recordFinish(agentId, latency);
      registry.transition(agentId, "ready");
      events.emit("agent-finished", agentId, { traceId: span.traceId, latency });
      return { agentId, ok: true, output, latency, traceId: span.traceId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      traces.end(span.traceId, "error");
      const latency = traces.durationOf(span.traceId) ?? 0;
      metrics.recordFailure(agentId, latency);
      registry.transition(agentId, "ready");
      registry.reportHealth(agentId, "warning", `last invocation failed: ${message}`);
      events.emit("agent-failed", agentId, { traceId: span.traceId, error: message });
      logs.log("error", agentId, "agent invocation failed", { error: message }, span.traceId);
      return { agentId, ok: false, error: message, latency, traceId: span.traceId };
    }
  }
}

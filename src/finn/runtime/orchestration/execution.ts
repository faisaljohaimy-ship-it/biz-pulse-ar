/**
 * Execution core — Execution Queue · Task Dispatcher · Priority Manager ·
 * Resource Allocator · Timeout Manager · Retry Manager · Circuit Breaker.
 *
 * The dispatcher is the ONLY execution path: dependency-gated, governance-
 * cleared, circuit-checked, resource-bounded, timed out, retried, audited.
 * A failing agent fails its task — never the orchestrator. Circular task
 * dependencies are detected up front (zero deadlocks); tasks whose owner
 * agent disappears are flagged orphaned (zero orphan tasks go unnoticed).
 */
import { OrchError, type OrchTask, type OrchTaskState, type Sleep, type TaskResult } from "./types";
import type { AgentRegistry, CapabilityRouter } from "./registries";
import type { AuditLayer, GovernanceLayer } from "./policy";
import type { PolicyEnvironment } from "./types";
import type { RuntimeMetrics } from "../executive/metrics";

// ── Priority Manager ────────────────────────────────────────────────────────

/** Effective priority = base + age boost (starvation-proof ordering). */
export class PriorityManager {
  effective(task: OrchTask, waitedRounds: number): number {
    return task.priority + Math.min(10, waitedRounds);
  }
}

// ── Resource Allocator ──────────────────────────────────────────────────────

export class ResourceAllocator {
  private readonly capacity = new Map<string, number>();
  private readonly used = new Map<string, number>();

  define(resource: string, slots: number): void {
    if (this.capacity.has(resource)) {
      throw new OrchError("resources", `duplicate resource "${resource}"`);
    }
    this.capacity.set(resource, slots);
    this.used.set(resource, 0);
  }

  tryAcquire(resource: string): boolean {
    const cap = this.capacity.get(resource);
    if (cap === undefined) throw new OrchError("resources", `unknown resource "${resource}"`);
    const used = this.used.get(resource) ?? 0;
    if (used >= cap) return false;
    this.used.set(resource, used + 1);
    return true;
  }

  release(resource: string): void {
    const used = this.used.get(resource) ?? 0;
    this.used.set(resource, Math.max(0, used - 1));
  }

  usage(resource: string): { used: number; capacity: number } {
    return { used: this.used.get(resource) ?? 0, capacity: this.capacity.get(resource) ?? 0 };
  }
}

// ── Timeout Manager ─────────────────────────────────────────────────────────

export class TimeoutManager {
  /** Race work against a deadline; the loser is marked, never leaks a timer. */
  async withTimeout<T>(
    ms: number,
    work: (signal: AbortSignal) => Promise<T>,
  ): Promise<{ timedOut: false; value: T } | { timedOut: true }> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<{ timedOut: true }>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve({ timedOut: true });
      }, ms);
    });
    try {
      return await Promise.race([
        work(controller.signal).then((value) => ({ timedOut: false as const, value })),
        timeout,
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

// ── Retry Manager ───────────────────────────────────────────────────────────

export class RetryManager {
  constructor(private readonly sleep: Sleep) {}

  /** Run with bounded attempts + optional linear backoff; returns attempts used. */
  async run<T>(
    strategy: { maxAttempts: number; backoff: "none" | "linear"; baseDelayMs: number },
    work: () => Promise<T>,
  ): Promise<
    { ok: true; value: T; attempts: number } | { ok: false; error: string; attempts: number }
  > {
    let lastError = "";
    for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
      try {
        return { ok: true, value: await work(), attempts: attempt };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (attempt < strategy.maxAttempts && strategy.backoff === "linear") {
          await this.sleep(strategy.baseDelayMs * attempt);
        }
      }
    }
    return { ok: false, error: lastError, attempts: strategy.maxAttempts };
  }
}

// ── Circuit Breaker ─────────────────────────────────────────────────────────

export type CircuitState = "closed" | "open" | "half_open";

export class CircuitBreaker {
  private readonly circuits = new Map<
    string,
    { state: CircuitState; failures: number; probes: number }
  >();

  constructor(
    private readonly failureThreshold = 3,
    private readonly cooldownProbes = 2,
  ) {}

  private circuit(target: string) {
    let c = this.circuits.get(target);
    if (!c) {
      c = { state: "closed", failures: 0, probes: 0 };
      this.circuits.set(target, c);
    }
    return c;
  }

  /** May a call to this target proceed? Open circuits ripen into half-open. */
  canPass(target: string): boolean {
    const c = this.circuit(target);
    if (c.state === "closed") return true;
    if (c.state === "open") {
      c.probes++;
      if (c.probes >= this.cooldownProbes) {
        c.state = "half_open";
        return true; // one probe allowed through
      }
      return false;
    }
    return true; // half_open: probe in flight
  }

  recordSuccess(target: string): void {
    const c = this.circuit(target);
    c.state = "closed";
    c.failures = 0;
    c.probes = 0;
  }

  recordFailure(target: string): void {
    const c = this.circuit(target);
    c.failures++;
    if (c.state === "half_open" || c.failures >= this.failureThreshold) {
      c.state = "open";
      c.probes = 0;
    }
  }

  stateOf(target: string): CircuitState {
    return this.circuit(target).state;
  }
}

// ── Execution Queue ─────────────────────────────────────────────────────────

interface QueueEntry {
  task: OrchTask;
  state: OrchTaskState;
  waitedRounds: number;
  result?: TaskResult;
}

export class ExecutionQueue {
  private readonly entries = new Map<string, QueueEntry>();

  enqueue(task: OrchTask): void {
    if (this.entries.has(task.id)) throw new OrchError("queue", `duplicate task "${task.id}"`);
    this.entries.set(task.id, { task, state: "pending", waitedRounds: 0 });
    this.assertAcyclic();
  }

  /** Zero deadlocks: circular task dependencies are refused at enqueue time. */
  private assertAcyclic(): void {
    const marks = new Map<string, "visiting" | "done">();
    const visit = (id: string, path: string[]): void => {
      const mark = marks.get(id);
      if (mark === "done") return;
      if (mark === "visiting") {
        throw new OrchError("queue", `circular dependency: ${[...path, id].join(" → ")}`);
      }
      marks.set(id, "visiting");
      const entry = this.entries.get(id);
      if (entry) for (const dep of entry.task.dependencies) visit(dep, [...path, id]);
      marks.set(id, "done");
    };
    for (const id of this.entries.keys()) visit(id, []);
  }

  stateOf(taskId: string): OrchTaskState | undefined {
    return this.entries.get(taskId)?.state;
  }

  setState(taskId: string, state: OrchTaskState, result?: TaskResult): void {
    const entry = this.entries.get(taskId);
    if (!entry) throw new OrchError("queue", `unknown task "${taskId}"`);
    entry.state = state;
    if (result) entry.result = result;
  }

  resultOf(taskId: string): TaskResult | undefined {
    return this.entries.get(taskId)?.result;
  }

  cancel(taskId: string): boolean {
    const entry = this.entries.get(taskId);
    if (!entry || entry.state !== "pending") return false;
    entry.state = "cancelled";
    return true;
  }

  depth(): number {
    return [...this.entries.values()].filter((e) => e.state === "pending" || e.state === "blocked")
      .length;
  }

  runningCount(): number {
    return [...this.entries.values()].filter((e) => e.state === "running").length;
  }

  /** Pending tasks whose dependencies are all completed, priority-ordered. */
  eligible(priorities: PriorityManager): readonly OrchTask[] {
    const ready: { task: OrchTask; effective: number }[] = [];
    for (const entry of this.entries.values()) {
      if (entry.state !== "pending") continue;
      const depsDone = entry.task.dependencies.every(
        (dep) => this.entries.get(dep)?.state === "completed",
      );
      const depFailed = entry.task.dependencies.some((dep) => {
        const s = this.entries.get(dep)?.state;
        return s === "failed" || s === "cancelled" || s === "timed_out" || s === "denied";
      });
      if (depFailed) {
        entry.state = "cancelled"; // dependency failure cascades deterministically
        continue;
      }
      if (!depsDone) {
        entry.waitedRounds++;
        continue;
      }
      ready.push({
        task: entry.task,
        effective: priorities.effective(entry.task, entry.waitedRounds),
      });
    }
    return ready
      .sort((a, b) => b.effective - a.effective || a.task.id.localeCompare(b.task.id))
      .map((r) => r.task);
  }

  all(): readonly { task: OrchTask; state: OrchTaskState }[] {
    return [...this.entries.values()].map((e) => ({ task: e.task, state: e.state }));
  }
}

// ── Task Dispatcher — the ONLY execution path ───────────────────────────────

export interface DispatcherDeps {
  readonly queue: ExecutionQueue;
  readonly agents: AgentRegistry;
  readonly router: CapabilityRouter;
  readonly governance: GovernanceLayer;
  readonly audit: AuditLayer;
  readonly timeouts: TimeoutManager;
  readonly retries: RetryManager;
  readonly breaker: CircuitBreaker;
  readonly priorities: PriorityManager;
  readonly metrics: RuntimeMetrics;
  readonly gatedCapabilities: ReadonlySet<string>;
  readonly limits: { maxQueueDepth: number; maxRunning: number };
}

export class TaskDispatcher {
  private readonly agentLoad = new Map<string, number>();

  constructor(private readonly deps: DispatcherDeps) {}

  private environment(): PolicyEnvironment {
    return {
      queueDepth: this.deps.queue.depth(),
      runningCount: this.deps.queue.runningCount(),
      agentFor: (cap) => this.deps.router.agentFor(cap),
      agentSkills: (agentId) => this.deps.agents.get(agentId)?.skills ?? [],
      gatedCapabilities: this.deps.gatedCapabilities,
      limits: this.deps.limits,
    };
  }

  /** Dispatch ONE task end-to-end. Never throws — failures become results. */
  async dispatch(task: OrchTask): Promise<TaskResult> {
    const { queue, agents, governance, audit, timeouts, retries, breaker, metrics } = this.deps;
    const started = performance.now();
    const finish = (state: OrchTaskState, extra: Partial<TaskResult> = {}): TaskResult => {
      const result: TaskResult = {
        taskId: task.id,
        state,
        attempts: extra.attempts ?? 0,
        latencyMs: Math.round(performance.now() - started),
        ...(extra.output !== undefined ? { output: extra.output } : {}),
        ...(extra.error ? { error: extra.error } : {}),
      };
      queue.setState(task.id, state, result);
      metrics.timing("orch.task.latency", result.latencyMs);
      return result;
    };

    audit.record(task.id, "dispatch", `owner=${task.owner}`);

    // 1) Governance — EVERY dispatch is policy-cleared and recorded.
    const clearance = governance.clear(task, this.environment());
    if (!clearance.allowed) {
      const denied = clearance.decisions.filter((d) => !d.allowed).map((d) => d.reason);
      audit.record(task.id, "policy", `DENIED: ${denied.join("; ")}`);
      metrics.increment("orch.policy.denied");
      return finish("denied", { error: denied.join("; ") });
    }
    audit.record(task.id, "policy", "cleared");

    // 2) Orphan detection — the owner agent must exist.
    const agent = agents.get(task.owner);
    if (!agent) {
      audit.record(task.id, "orphan", `owner agent "${task.owner}" is not registered`);
      metrics.increment("orch.task.orphaned");
      return finish("orphaned", { error: `owner agent "${task.owner}" missing` });
    }

    // 3) Circuit breaker per owner agent.
    if (!breaker.canPass(task.owner)) {
      audit.record(task.id, "circuit", "open — execution refused");
      metrics.increment("orch.circuit.rejected");
      return finish("failed", { error: `circuit open for agent "${task.owner}"` });
    }

    // 4) Agent concurrency slot.
    const load = this.agentLoad.get(task.owner) ?? 0;
    if (load >= agent.maxConcurrent) {
      audit.record(task.id, "capacity", "agent at max concurrency");
      return finish("blocked", { error: "agent at capacity" });
    }
    this.agentLoad.set(task.owner, load + 1);
    queue.setState(task.id, "running");

    try {
      const attempt = await retries.run(task.retry, async () => {
        const raced = await timeouts.withTimeout(task.timeoutMs, async (signal) => {
          return agent.execute(task, signal);
        });
        if (raced.timedOut) throw new OrchError("timeout", `task exceeded ${task.timeoutMs}ms`);
        return raced.value;
      });

      if (attempt.ok) {
        breaker.recordSuccess(task.owner);
        audit.record(task.id, "complete", `attempts=${attempt.attempts}`);
        metrics.increment("orch.task.completed");
        return finish("completed", { output: attempt.value, attempts: attempt.attempts });
      }
      breaker.recordFailure(task.owner);
      metrics.increment("orch.task.failed");
      const timedOut = attempt.error.includes("[orch:timeout]");
      audit.record(task.id, timedOut ? "timeout" : "fail", attempt.error);
      return finish(timedOut ? "timed_out" : "failed", {
        error: attempt.error,
        attempts: attempt.attempts,
      });
    } finally {
      this.agentLoad.set(task.owner, (this.agentLoad.get(task.owner) ?? 1) - 1);
    }
  }

  /** Drain every eligible task (repeatedly) — the orchestrator's heartbeat. */
  async drain(): Promise<readonly TaskResult[]> {
    const results: TaskResult[] = [];
    for (;;) {
      const batch = this.deps.queue.eligible(this.deps.priorities);
      if (batch.length === 0) break;
      for (const task of batch) results.push(await this.dispatch(task));
    }
    this.deps.metrics.gauge("orch.queue.depth", this.deps.queue.depth());
    return results;
  }

  utilization(agentId: string): number {
    return this.agentLoad.get(agentId) ?? 0;
  }
}

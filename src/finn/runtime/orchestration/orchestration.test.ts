import { describe, expect, it } from "vitest";
import { DEFAULT_SHELL_CONFIG, createKernel } from "../kernel";
import type { ShellConfig } from "../types";
import { Diagnostics } from "../diagnostics";
import { EventBus } from "../event-bus";
import { createExecutiveShell } from "../executive/controller";
import { ORCH_TOKENS, createOrchestrationLayer } from "./kernel";
import {
  AgentRegistry,
  CapabilityRouter,
  ContextRouter,
  IntentRouter,
  SkillRegistry,
  ToolRegistry,
} from "./registries";
import {
  AuditLayer,
  GovernanceLayer,
  PolicyEngine,
  RollbackManager,
  capabilityPolicy,
  compliancePolicy,
  executionPolicy,
  permissionPolicy,
  resourcePolicy,
} from "./policy";
import { CircuitBreaker, ExecutionQueue, PriorityManager, RetryManager } from "./execution";
import { WorkflowEngine, type WorkflowStep } from "./workflow";
import {
  ArbitrationEngine,
  ConsensusManager,
  DecisionEngine,
  PlanningEngine,
  SchedulingEngine,
} from "./planning";
import { instantSleep, type OrchAgent, type OrchTask, type PolicyEnvironment } from "./types";
import type { Actor } from "@/finn/shell";

// ── Deterministic ports ─────────────────────────────────────────────────────

const seqIds = () => {
  let n = 0;
  return () => `id-${++n}`;
};
const FIXED_ISO = "2026-07-24T12:00:00Z";
const fixedClock = () => FIXED_ISO;
const CONFIG: ShellConfig = { ...DEFAULT_SHELL_CONFIG, environment: "test" };

const ADMIN: Actor = { userId: "u-1", appRoles: ["admin"], orgRole: "manager", orgId: "org-1" };

function makeTask(overrides: Partial<OrchTask> = {}): OrchTask {
  return {
    id: overrides.id ?? "t-1",
    owner: overrides.owner ?? "agent-x",
    context: overrides.context ?? { actor: ADMIN, locale: "ar", correlationId: "corr-1" },
    priority: overrides.priority ?? 1,
    dependencies: overrides.dependencies ?? [],
    capabilities: overrides.capabilities ?? ["cap.read"],
    requiredSkills: overrides.requiredSkills ?? [],
    policies: overrides.policies ?? [],
    timeoutMs: overrides.timeoutMs ?? 1000,
    retry: overrides.retry ?? { maxAttempts: 1, backoff: "none", baseDelayMs: 0 },
    input: overrides.input ?? null,
    ...(overrides.approvalGranted !== undefined
      ? { approvalGranted: overrides.approvalGranted }
      : {}),
  };
}

function makeAgent(overrides: Partial<OrchAgent> = {}): OrchAgent {
  return {
    id: overrides.id ?? "agent-x",
    role: overrides.role ?? "worker",
    capabilities: overrides.capabilities ?? ["cap.read"],
    skills: overrides.skills ?? [],
    maxConcurrent: overrides.maxConcurrent ?? 4,
    execute: overrides.execute ?? (async () => "ok"),
  };
}

/** Boot a kernel hosting the executive shell + orchestration layer (DI only). */
async function bootOrch(opts: { gated?: readonly string[] } = {}) {
  const idFactory = seqIds();
  const kernel = createKernel(CONFIG, {
    idFactory,
    modules: [
      createExecutiveShell({ idFactory, clock: fixedClock }),
      createOrchestrationLayer({
        idFactory,
        clock: fixedClock,
        sleep: instantSleep,
        ...(opts.gated ? { gatedCapabilities: opts.gated } : {}),
      }),
    ],
  });
  await kernel.boot();
  return kernel;
}

/** Wire an agent + capability route into a booted kernel. */
function wireAgent(kernel: Awaited<ReturnType<typeof bootOrch>>, agent: OrchAgent): void {
  const agents = kernel.services.resolve(ORCH_TOKENS.agents);
  const router = kernel.services.resolve(ORCH_TOKENS.capabilityRouter);
  agents.register(agent);
  for (const cap of agent.capabilities) router.bind(cap, agent.id);
}

// ── 1) Boot / DI ────────────────────────────────────────────────────────────

describe("Orchestration Layer — boots as a kernel module on the executive shell", () => {
  it("boots to READY and every orchestration service resolves via the bus", async () => {
    const kernel = await bootOrch();
    expect(kernel.state).toBe("ready");
    for (const token of Object.values(
      ORCH_TOKENS,
    ) as import("../service-bus").ServiceToken<unknown>[]) {
      expect(kernel.services.resolve(token)).toBeTruthy();
    }
  });

  it("refuses to resolve orchestration without the executive-shell dependency", async () => {
    const idFactory = seqIds();
    const kernel = createKernel(CONFIG, {
      idFactory,
      modules: [createOrchestrationLayer({ idFactory, clock: fixedClock })],
    });
    await expect(kernel.boot()).rejects.toThrow();
  });
});

// ── 2) Orchestrator — multi-agent execution modes ───────────────────────────

describe("Orchestrator — single / sequential / parallel / hierarchical", () => {
  it("runSingle dispatches one task through governance", async () => {
    const kernel = await bootOrch();
    wireAgent(kernel, makeAgent());
    const orchestrator = kernel.services.resolve(ORCH_TOKENS.orchestrator);
    const result = await orchestrator.runSingle(makeTask());
    expect(result.state).toBe("completed");
    expect(result.output).toBe("ok");
  });

  it("runSequential respects declared dependency order", async () => {
    const kernel = await bootOrch();
    const order: string[] = [];
    wireAgent(
      kernel,
      makeAgent({
        execute: async (task) => {
          order.push(task.id);
          return task.id;
        },
      }),
    );
    const orchestrator = kernel.services.resolve(ORCH_TOKENS.orchestrator);
    const results = await orchestrator.runSequential([
      makeTask({ id: "a" }),
      makeTask({ id: "b", dependencies: ["a"] }),
      makeTask({ id: "c", dependencies: ["b"] }),
    ]);
    expect(order).toEqual(["a", "b", "c"]);
    expect(results.every((r) => r.state === "completed")).toBe(true);
  });

  it("runParallel executes independent tasks and returns every result", async () => {
    const kernel = await bootOrch();
    wireAgent(kernel, makeAgent({ maxConcurrent: 8 }));
    const orchestrator = kernel.services.resolve(ORCH_TOKENS.orchestrator);
    const results = await orchestrator.runParallel([
      makeTask({ id: "p1" }),
      makeTask({ id: "p2" }),
      makeTask({ id: "p3" }),
    ]);
    expect(results.map((r) => r.taskId).sort()).toEqual(["p1", "p2", "p3"]);
    expect(results.every((r) => r.state === "completed")).toBe(true);
  });

  it("runHierarchical cancels workers deterministically when the supervisor fails", async () => {
    const kernel = await bootOrch();
    wireAgent(
      kernel,
      makeAgent({
        execute: async (task) => {
          if (task.id === "sup") throw new Error("supervisor down");
          return "worker-ok";
        },
      }),
    );
    const orchestrator = kernel.services.resolve(ORCH_TOKENS.orchestrator);
    const queue = kernel.services.resolve(ORCH_TOKENS.queue);
    const results = await orchestrator.runHierarchical(makeTask({ id: "sup" }), [
      makeTask({ id: "w1" }),
      makeTask({ id: "w2" }),
    ]);
    const byId = new Map(results.map((r) => [r.taskId, r.state]));
    expect(byId.get("sup")).toBe("failed");
    // Dependents of a failed supervisor are cancelled in the queue and never run.
    expect(queue.stateOf("w1")).toBe("cancelled");
    expect(queue.stateOf("w2")).toBe("cancelled");
  });
});

// ── 3) Workflow Engine ──────────────────────────────────────────────────────

describe("Workflow Engine — conditions, loops, approvals, events, rollback", () => {
  function freshEngine() {
    const idFactory = seqIds();
    const events = new EventBus({
      maxRetries: 0,
      deadLetterLimit: 10,
      idFactory,
      diagnostics: new Diagnostics(),
    });
    const audit = new AuditLayer(fixedClock);
    const rollback = new RollbackManager(audit);
    return { engine: new WorkflowEngine(events, audit, rollback, instantSleep), events, audit };
  }

  it("runs conditional branches and bounded loops", async () => {
    const { engine } = freshEngine();
    const seen: string[] = [];
    const steps: WorkflowStep[] = [
      {
        kind: "action",
        id: "seed",
        run: (m) => {
          m.set("n", 0);
          return 0;
        },
      },
      {
        kind: "loop",
        id: "count",
        maxIterations: 5,
        while: (m) => (m.get("n") as number) < 3,
        body: [
          {
            kind: "action",
            id: "inc",
            run: (m) => {
              const n = (m.get("n") as number) + 1;
              m.set("n", n);
              seen.push(`n=${n}`);
              return n;
            },
          },
        ],
      },
      {
        kind: "condition",
        id: "check",
        when: (m) => (m.get("n") as number) === 3,
        then: [{ kind: "action", id: "done", run: () => "reached" }],
      },
    ];
    engine.register({ id: "wf", steps });
    const run = await engine.run("wf");
    expect(run.state).toBe("completed");
    expect(seen).toEqual(["n=1", "n=2", "n=3"]);
  });

  it("refuses a loop that exceeds maxIterations (no runaway)", async () => {
    const { engine } = freshEngine();
    engine.register({
      id: "wf",
      steps: [
        {
          kind: "action",
          id: "seed",
          run: (m) => {
            m.set("n", 0);
            return 0;
          },
        },
        {
          kind: "loop",
          id: "boom",
          maxIterations: 2,
          while: () => true,
          body: [{ kind: "action", id: "noop", run: () => 1 }],
        },
      ],
    });
    const run = await engine.run("wf");
    expect(run.state).toBe("rolled_back");
    expect(run.error).toMatch(/maxIterations/);
  });

  it("pauses fail-closed at an approval step and resumes only after approval", async () => {
    const { engine } = freshEngine();
    const after: string[] = [];
    engine.register({
      id: "wf",
      steps: [
        { kind: "action", id: "before", run: () => "before" },
        { kind: "approval", id: "gate", description: "human sign-off" },
        {
          kind: "action",
          id: "after",
          run: () => {
            after.push("ran");
            return "after";
          },
        },
      ],
    });
    const paused = await engine.run("wf");
    expect(paused.state).toBe("awaiting_approval");
    expect(paused.snapshot.pendingStepId).toBe("gate");
    expect(after).toEqual([]); // fail-closed: nothing past the gate ran

    engine.approve("wf", "gate");
    const resumed = await engine.run("wf", { resumeFrom: paused.snapshot });
    expect(resumed.state).toBe("completed");
    expect(after).toEqual(["ran"]);
  });

  it("waits fail-closed for an event, then resumes once the topic has fired", async () => {
    const { engine, events } = freshEngine();
    engine.register({
      id: "wf",
      steps: [
        { kind: "wait-event", id: "wait", topic: "ops.green" },
        { kind: "action", id: "go", run: () => "go" },
      ],
    });
    const paused = await engine.run("wf");
    expect(paused.state).toBe("awaiting_event");

    await events.publish("ops.green", {});
    const resumed = await engine.run("wf", { resumeFrom: paused.snapshot });
    expect(resumed.state).toBe("completed");
  });

  it("rolls back compensations in reverse when a later step fails", async () => {
    const { engine } = freshEngine();
    const undone: string[] = [];
    engine.register({
      id: "wf",
      steps: [
        {
          kind: "action",
          id: "s1",
          run: () => 1,
          compensate: () => {
            undone.push("s1");
          },
        },
        {
          kind: "action",
          id: "s2",
          run: () => 2,
          compensate: () => {
            undone.push("s2");
          },
        },
        {
          kind: "action",
          id: "s3",
          run: () => {
            throw new Error("kaboom");
          },
        },
      ],
    });
    const run = await engine.run("wf");
    expect(run.state).toBe("rolled_back");
    expect(undone).toEqual(["s2", "s1"]); // reverse order
  });

  it("refuses a workflow that (transitively) invokes itself", async () => {
    const { engine } = freshEngine();
    engine.register({ id: "a", steps: [{ kind: "workflow", id: "callB", workflowId: "b" }] });
    engine.register({ id: "b", steps: [{ kind: "workflow", id: "callA", workflowId: "a" }] });
    // The cycle guard hard-throws when an ancestor re-enters (no infinite recursion).
    await expect(engine.run("a", { ancestors: ["a"] })).rejects.toThrow(/circular workflow/);
    // Mutual recursion terminates fail-closed (rolled back), never loops forever.
    const run = await engine.run("a");
    expect(run.state).toBe("rolled_back");
  });
});

// ── 4) Decision Engine ──────────────────────────────────────────────────────

describe("Decision Engine — weighted scoring with a stable tie-break", () => {
  it("chooses the highest weighted-sum option", () => {
    const engine = new DecisionEngine();
    const decision = engine.decide(
      [
        { id: "cheap", scores: { cost: 1, quality: 0.2 } },
        { id: "good", scores: { cost: 0.3, quality: 1 } },
      ],
      { cost: 0.2, quality: 0.8 },
    );
    expect(decision.chosen).toBe("good");
    expect(decision.ranking[0].id).toBe("good");
  });

  it("breaks ties by option id (deterministic)", () => {
    const engine = new DecisionEngine();
    const decision = engine.decide(
      [
        { id: "b", scores: { x: 1 } },
        { id: "a", scores: { x: 1 } },
      ],
      { x: 1 },
    );
    expect(decision.chosen).toBe("a");
  });
});

// ── 5) Planning Engine ──────────────────────────────────────────────────────

describe("Planning Engine — DAG ordering, cycle refusal, parallel layers", () => {
  it("topologically orders a plan's nodes", () => {
    const engine = new PlanningEngine();
    const order = engine.order({
      goal: "g",
      nodes: [
        { id: "c", capability: "cap.c", dependsOn: ["a", "b"] },
        { id: "a", capability: "cap.a", dependsOn: [] },
        { id: "b", capability: "cap.b", dependsOn: ["a"] },
      ],
    });
    const ids = order.map((n) => n.id);
    expect(ids.indexOf("a")).toBeLessThan(ids.indexOf("b"));
    expect(ids.indexOf("b")).toBeLessThan(ids.indexOf("c"));
  });

  it("refuses a circular plan", () => {
    const engine = new PlanningEngine();
    expect(() =>
      engine.order({
        goal: "g",
        nodes: [
          { id: "a", capability: "cap.a", dependsOn: ["b"] },
          { id: "b", capability: "cap.b", dependsOn: ["a"] },
        ],
      }),
    ).toThrow(/circular plan/);
  });

  it("groups independent nodes into parallelizable layers", () => {
    const engine = new PlanningEngine();
    const layers = engine.layers({
      goal: "g",
      nodes: [
        { id: "a", capability: "cap.a", dependsOn: [] },
        { id: "b", capability: "cap.b", dependsOn: [] },
        { id: "c", capability: "cap.c", dependsOn: ["a", "b"] },
      ],
    });
    expect(layers[0]).toEqual(["a", "b"]);
    expect(layers[1]).toEqual(["c"]);
  });
});

// ── 6) Scheduling Engine ────────────────────────────────────────────────────

describe("Scheduling Engine — priority + readiness within available slots", () => {
  it("schedules only ready items, highest priority first, within slots", () => {
    const engine = new SchedulingEngine();
    const picked = engine.schedule(
      [
        { id: "low", priority: 1, ready: true },
        { id: "high", priority: 9, ready: true },
        { id: "blocked", priority: 10, ready: false },
      ],
      2,
    );
    expect(picked).toEqual(["high", "low"]);
  });
});

// ── 7) Execution Queue — zero deadlocks / cascade ───────────────────────────

describe("Execution Queue — acyclic enforcement, dependency cascade, ordering", () => {
  it("refuses a circular task dependency at enqueue (zero deadlocks)", () => {
    const queue = new ExecutionQueue();
    queue.enqueue(makeTask({ id: "a", dependencies: ["b"] }));
    expect(() => queue.enqueue(makeTask({ id: "b", dependencies: ["a"] }))).toThrow(
      /circular dependency/,
    );
  });

  it("orders eligible tasks by effective priority with id tie-break", () => {
    const queue = new ExecutionQueue();
    queue.enqueue(makeTask({ id: "z", priority: 5 }));
    queue.enqueue(makeTask({ id: "a", priority: 5 }));
    queue.enqueue(makeTask({ id: "top", priority: 9 }));
    const eligible = queue.eligible(new PriorityManager()).map((t) => t.id);
    expect(eligible).toEqual(["top", "a", "z"]);
  });

  it("cascades cancellation to dependents when a dependency fails", () => {
    const queue = new ExecutionQueue();
    queue.enqueue(makeTask({ id: "dep" }));
    queue.enqueue(makeTask({ id: "child", dependencies: ["dep"] }));
    queue.setState("dep", "failed");
    queue.eligible(new PriorityManager());
    expect(queue.stateOf("child")).toBe("cancelled");
  });
});

// ── 8) Policy Engine — fail closed / no privilege escalation ────────────────

describe("Policy Engine — fail closed, no privilege escalation", () => {
  function engineWithAll(): PolicyEngine {
    const engine = new PolicyEngine();
    for (const p of [
      capabilityPolicy,
      permissionPolicy,
      resourcePolicy,
      executionPolicy,
      compliancePolicy,
    ]) {
      engine.register(p);
    }
    return engine;
  }
  function env(overrides: Partial<PolicyEnvironment> = {}): PolicyEnvironment {
    return {
      queueDepth: overrides.queueDepth ?? 0,
      runningCount: overrides.runningCount ?? 0,
      agentFor: overrides.agentFor ?? (() => "agent-x"),
      agentSkills: overrides.agentSkills ?? (() => []),
      gatedCapabilities: overrides.gatedCapabilities ?? new Set<string>(),
      limits: overrides.limits ?? { maxQueueDepth: 1000, maxRunning: 32 },
    };
  }

  it("allows a fully routable, in-bounds, auditable task", () => {
    const result = engineWithAll().evaluate(makeTask(), env());
    expect(result.allowed).toBe(true);
  });

  it("denies a gated capability without explicit approval (no escalation)", () => {
    const result = engineWithAll().evaluate(
      makeTask({ capabilities: ["cap.emergency"] }),
      env({ agentFor: () => "agent-x", gatedCapabilities: new Set(["cap.emergency"]) }),
    );
    expect(result.allowed).toBe(false);
    expect(result.decisions.some((d) => d.policyId === "policy.permission" && !d.allowed)).toBe(
      true,
    );
  });

  it("permits the same gated capability once approval is granted", () => {
    const result = engineWithAll().evaluate(
      makeTask({ capabilities: ["cap.emergency"], approvalGranted: true }),
      env({ agentFor: () => "agent-x", gatedCapabilities: new Set(["cap.emergency"]) }),
    );
    expect(result.allowed).toBe(true);
  });

  it("fails closed when a task demands a policy that is not registered", () => {
    const result = engineWithAll().evaluate(makeTask({ policies: ["policy.nonexistent"] }), env());
    expect(result.allowed).toBe(false);
    expect(result.decisions.some((d) => d.policyId === "policy.nonexistent" && !d.allowed)).toBe(
      true,
    );
  });
});

// ── 9) Governance Layer ─────────────────────────────────────────────────────

describe("Governance Layer — records every decision", () => {
  it("records and counts denials", () => {
    const engine = new PolicyEngine();
    engine.register(capabilityPolicy);
    const gov = new GovernanceLayer(engine, fixedClock);
    const okEnv: PolicyEnvironment = {
      queueDepth: 0,
      runningCount: 0,
      agentFor: () => "agent-x",
      agentSkills: () => [],
      gatedCapabilities: new Set(),
      limits: { maxQueueDepth: 10, maxRunning: 10 },
    };
    gov.clear(makeTask({ id: "ok" }), okEnv);
    gov.clear(makeTask({ id: "bad", capabilities: ["cap.unrouted"] }), {
      ...okEnv,
      agentFor: () => undefined,
    });
    expect(gov.decisions()).toHaveLength(2);
    expect(gov.deniedCount()).toBe(1);
  });
});

// ── 10) Audit Layer — tamper-evident ────────────────────────────────────────

describe("Audit Layer — hash-chained tamper evidence", () => {
  it("verifies an intact chain and detects tampering", () => {
    const audit = new AuditLayer(fixedClock);
    audit.record("t", "phase", "one");
    audit.record("t", "phase", "two");
    audit.record("t", "phase", "three");
    expect(audit.verify()).toBe(true);

    const entries = audit.all() as unknown as { detail: string }[];
    entries[1].detail = "TAMPERED"; // mutate a recorded entry
    expect(audit.verify()).toBe(false);
  });
});

// ── 11) Rollback Manager ────────────────────────────────────────────────────

describe("Rollback Manager — reverse order, contained failures", () => {
  it("runs compensations in reverse and contains a failing one", async () => {
    const audit = new AuditLayer(fixedClock);
    const rollback = new RollbackManager(audit);
    const undone: string[] = [];
    rollback.registerCompensation("t", "first", () => {
      undone.push("first");
    });
    rollback.registerCompensation("t", "boom", () => {
      throw new Error("no");
    });
    rollback.registerCompensation("t", "last", () => {
      undone.push("last");
    });
    const result = await rollback.rollback("t");
    expect(undone).toEqual(["last", "first"]);
    expect(result.compensated).toBe(2);
    expect(result.failed).toBe(1);
  });
});

// ── 12) Retry Manager ───────────────────────────────────────────────────────

describe("Retry Manager — bounded attempts", () => {
  it("retries up to maxAttempts then reports failure", async () => {
    const retries = new RetryManager(instantSleep);
    let calls = 0;
    const result = await retries.run(
      { maxAttempts: 3, backoff: "linear", baseDelayMs: 1 },
      async () => {
        calls++;
        throw new Error("always");
      },
    );
    expect(calls).toBe(3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.attempts).toBe(3);
  });

  it("succeeds and stops early once work passes", async () => {
    const retries = new RetryManager(instantSleep);
    let calls = 0;
    const result = await retries.run(
      { maxAttempts: 3, backoff: "none", baseDelayMs: 0 },
      async () => {
        calls++;
        if (calls < 2) throw new Error("flaky");
        return "ok";
      },
    );
    expect(result.ok).toBe(true);
    expect(calls).toBe(2);
  });
});

// ── 13) Circuit Breaker ─────────────────────────────────────────────────────

describe("Circuit Breaker — closed / open / half-open", () => {
  it("opens after the failure threshold and refuses calls", () => {
    const breaker = new CircuitBreaker(2, 2);
    expect(breaker.canPass("svc")).toBe(true);
    breaker.recordFailure("svc");
    breaker.recordFailure("svc");
    expect(breaker.stateOf("svc")).toBe("open");
    expect(breaker.canPass("svc")).toBe(false); // first probe blocked
  });

  it("ripens to half-open then closes on a successful probe", () => {
    const breaker = new CircuitBreaker(1, 1);
    breaker.recordFailure("svc"); // open
    expect(breaker.canPass("svc")).toBe(true); // probe allowed → half_open
    expect(breaker.stateOf("svc")).toBe("half_open");
    breaker.recordSuccess("svc");
    expect(breaker.stateOf("svc")).toBe("closed");
  });
});

// ── 14) Consensus Manager ───────────────────────────────────────────────────

describe("Consensus Manager — quorum + majority; missing votes never approve", () => {
  it("approves only when quorum is met and yes > no", () => {
    const cm = new ConsensusManager();
    const approved = cm.tally(
      [
        { voter: "a", value: true },
        { voter: "b", value: true },
        { voter: "c", value: false },
      ],
      { quorum: 3 },
    );
    expect(approved.quorumMet).toBe(true);
    expect(approved.approved).toBe(true);
  });

  it("does NOT approve when quorum is unmet (missing votes never count as yes)", () => {
    const cm = new ConsensusManager();
    const result = cm.tally([{ voter: "a", value: true }], { quorum: 3 });
    expect(result.quorumMet).toBe(false);
    expect(result.approved).toBe(false);
  });

  it("counts only the last vote per voter", () => {
    const cm = new ConsensusManager();
    const result = cm.tally(
      [
        { voter: "a", value: true },
        { voter: "a", value: false },
        { voter: "b", value: false },
      ],
      { quorum: 2 },
    );
    expect(result.yes).toBe(0);
    expect(result.no).toBe(2);
    expect(result.approved).toBe(false);
  });
});

// ── 15) Arbitration Engine ──────────────────────────────────────────────────

describe("Arbitration Engine — deterministic conflict resolution", () => {
  it("resolves by priority, then confidence, then agent id", () => {
    const engine = new ArbitrationEngine();
    const winner = engine.arbitrate([
      { agentId: "z", action: "act", confidence: 0.9, priority: 1 },
      { agentId: "a", action: "act", confidence: 0.5, priority: 2 },
      { agentId: "b", action: "act", confidence: 0.5, priority: 2 },
    ]);
    expect(winner?.agentId).toBe("a"); // priority 2 wins; a<b tie-break
  });

  it("returns null with no proposals", () => {
    expect(new ArbitrationEngine().arbitrate([])).toBeNull();
  });
});

// ── Zero-tolerance quality gates (dispatcher-enforced) ──────────────────────

describe("Zero-tolerance gates — dispatcher is the only path, fail-closed", () => {
  it("no orphan tasks: a task whose owner agent is unregistered is flagged orphaned", async () => {
    const kernel = await bootOrch();
    // The capability IS routable (so governance clears), but the task's declared
    // owner is a different, unregistered agent → orphan detection must catch it.
    wireAgent(kernel, makeAgent({ id: "agent-x", capabilities: ["cap.read"] }));
    const orchestrator = kernel.services.resolve(ORCH_TOKENS.orchestrator);
    const result = await orchestrator.runSingle(makeTask({ id: "orphan", owner: "ghost" }));
    expect(result.state).toBe("orphaned");
  });

  it("no policy bypass: a gated capability without approval is DENIED at dispatch", async () => {
    const kernel = await bootOrch({ gated: ["cap.emergency"] });
    wireAgent(kernel, makeAgent({ capabilities: ["cap.emergency"] }));
    const orchestrator = kernel.services.resolve(ORCH_TOKENS.orchestrator);
    const denied = await orchestrator.runSingle(
      makeTask({ id: "gated", capabilities: ["cap.emergency"] }),
    );
    expect(denied.state).toBe("denied");
  });

  it("no privilege escalation: the SAME gated task passes once approval is granted", async () => {
    const kernel = await bootOrch({ gated: ["cap.emergency"] });
    wireAgent(kernel, makeAgent({ capabilities: ["cap.emergency"] }));
    const orchestrator = kernel.services.resolve(ORCH_TOKENS.orchestrator);
    const ok = await orchestrator.runSingle(
      makeTask({ id: "approved", capabilities: ["cap.emergency"], approvalGranted: true }),
    );
    expect(ok.state).toBe("completed");
  });

  it("no unsafe routing: an unroutable capability is denied (closed world)", async () => {
    const kernel = await bootOrch();
    wireAgent(kernel, makeAgent({ id: "agent-x", capabilities: ["cap.read"] }));
    const orchestrator = kernel.services.resolve(ORCH_TOKENS.orchestrator);
    const denied = await orchestrator.runSingle(
      makeTask({ id: "bad-route", capabilities: ["cap.unknown"] }),
    );
    expect(denied.state).toBe("denied");
  });

  it("no hidden tool path: unknown or disabled tools are refused by the registry", async () => {
    const tools = new ToolRegistry();
    tools.register({ id: "off", enabled: false, execute: async () => "should not run" });
    await expect(tools.invoke("off", {})).rejects.toThrow(/disabled/);
    await expect(tools.invoke("missing", {})).rejects.toThrow(/unknown tool/);
  });

  it("dispatch never throws: a throwing agent yields a failed result, not an exception", async () => {
    const kernel = await bootOrch();
    wireAgent(
      kernel,
      makeAgent({
        execute: async () => {
          throw new Error("agent blew up");
        },
      }),
    );
    const orchestrator = kernel.services.resolve(ORCH_TOKENS.orchestrator);
    const result = await orchestrator.runSingle(makeTask({ id: "boom" }));
    expect(result.state).toBe("failed");
    expect(result.error).toMatch(/agent blew up/);
  });

  it("timeout is enforced: a task exceeding its budget is timed_out", async () => {
    const kernel = await bootOrch();
    wireAgent(
      kernel,
      makeAgent({
        execute: (_task, signal) =>
          new Promise((_resolve, reject) => {
            const t = setTimeout(() => reject(new Error("late")), 10_000);
            signal?.addEventListener("abort", () => {
              clearTimeout(t);
              reject(new Error("aborted"));
            });
          }),
      }),
    );
    const orchestrator = kernel.services.resolve(ORCH_TOKENS.orchestrator);
    const result = await orchestrator.runSingle(makeTask({ id: "slow", timeoutMs: 1 }));
    expect(result.state).toBe("timed_out");
  });
});

// ── Registries / routers — closed-world safety ──────────────────────────────

describe("Registries & routers — closed-world binding", () => {
  it("capability router refuses to bind a capability the agent does not declare", () => {
    const agents = new AgentRegistry();
    agents.register(makeAgent({ id: "a", capabilities: ["cap.read"] }));
    const router = new CapabilityRouter(agents);
    expect(() => router.bind("cap.write", "a")).toThrow(/does not declare/);
  });

  it("intent router resolves the best keyword match and refuses unroutable intents", () => {
    const agents = new AgentRegistry();
    agents.register(makeAgent({ id: "a", capabilities: ["cap.read"] }));
    const router = new CapabilityRouter(agents);
    router.bind("cap.read", "a");
    const intents = new IntentRouter(router);
    intents.register({
      intent: "read",
      keywords: ["show", "view"],
      capability: "cap.read",
      priority: 1,
    });
    expect(intents.resolve("please show me the report")?.intent).toBe("read");
    expect(intents.resolve("delete everything")).toBeNull();
    expect(() =>
      intents.register({ intent: "x", keywords: ["x"], capability: "cap.absent", priority: 1 }),
    ).toThrow(/unroutable/);
  });

  it("context router routes by verified attributes and refuses unknown agents", () => {
    const agents = new AgentRegistry();
    agents.register(makeAgent({ id: "ar-agent" }));
    const ctx = new ContextRouter(agents);
    ctx.addRule({ match: (c) => c.locale === "ar", agentId: "ar-agent", priority: 1 });
    expect(ctx.route({ actor: ADMIN, locale: "ar", correlationId: "c" })).toBe("ar-agent");
    expect(ctx.route({ actor: ADMIN, locale: "en", correlationId: "c" })).toBeNull();
    expect(() => ctx.addRule({ match: () => true, agentId: "ghost", priority: 1 })).toThrow(
      /unknown agent/,
    );
  });

  it("skill registry refuses duplicates", () => {
    const skills = new SkillRegistry();
    skills.register({ id: "s1", description: "one" });
    expect(() => skills.register({ id: "s1", description: "dup" })).toThrow(/duplicate skill/);
  });
});

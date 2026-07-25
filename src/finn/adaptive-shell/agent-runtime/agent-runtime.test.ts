import { describe, expect, it } from "vitest";
import type { AgentManifest } from "../schemas/manifests";
import type { RecordMetadata } from "../population/records";
import {
  AgentLifecycleMachine,
  createAgentRuntime,
  type AgentRecord,
  type AgentRuntime,
  type ExecutionPlan,
} from "./index";

// ── Deterministic time & identity ───────────────────────────────────────────

function makeClock(): () => string {
  let tick = 0;
  return () => `2026-07-25T01:00:${String(tick++).padStart(2, "0")}Z`;
}

function makeMonotonic(step = 5): () => number {
  let tick = 0;
  return () => (tick += step);
}

function makeIdFactory(): (prefix: string) => string {
  const counters = new Map<string, number>();
  return (prefix) => {
    const n = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, n);
    return `${prefix}-${n}`;
  };
}

function makeRuntime(knownCapabilityIds?: () => readonly string[]): AgentRuntime {
  return createAgentRuntime({
    clock: makeClock(),
    monotonic: makeMonotonic(),
    idFactory: makeIdFactory(),
    knownCapabilityIds,
  });
}

// ── Generic fixtures (no business content) ──────────────────────────────────

function metadata(): RecordMetadata {
  return {
    tags: ["reference"],
    keywords: ["runtime"],
    sector: "generic",
    department: "platform",
    language: "ar",
    owner: "agent-platform",
    createdAt: "2026-07-01",
    updatedAt: "2026-07-02",
    compatibility: ["shell>=1"],
  };
}

function baseManifest(id: string): AgentManifest {
  return {
    kind: "agent",
    id,
    name: `Agent ${id}`,
    role: "generic-worker",
    description: "Reference agent for runtime tests.",
    systemPrompt: "You are a reference agent used only to test the runtime.",
    supportedSkills: [],
    supportedTools: [],
    supportedCapabilities: [],
    memoryProfile: "session",
    contextWindow: 8192,
    executionMode: "advisory",
    permissions: ["execution"],
    priority: 1,
    dependencies: [],
    metadata: {},
  };
}

function agentRecord(id: string, overrides: Partial<AgentRecord> = {}): AgentRecord {
  return {
    id,
    name: `Agent ${id}`,
    description: "Reference agent record for runtime tests.",
    version: "1.0.0",
    category: "utilities",
    capabilities: [],
    dependencies: [],
    owner: "agent-platform",
    permissions: ["execution"],
    policies: [],
    metadata: metadata(),
    lifecycle: "draft",
    health: "unknown",
    supportedModes: [
      "single",
      "sequential",
      "parallel",
      "pipeline",
      "broadcast",
      "approval-driven",
    ],
    manifest: {
      base: baseManifest(id),
      version: "1.0.0",
      capabilities: [],
      requiredSkills: [],
      requiredKnowledge: [],
      requiredTools: [],
      dependencies: [],
      executionContract: {
        invocation: "synchronous",
        timeoutMs: 30_000,
        retryable: true,
        idempotent: true,
      },
      inputs: [{ name: "input", type: "string" }],
      outputs: [{ name: "output", type: "string" }],
      policies: [],
    },
    ...overrides,
  };
}

/** Admit an agent and walk it to ready; grant the runner execution rights. */
function readyAgent(runtime: AgentRuntime, id: string, overrides: Partial<AgentRecord> = {}): void {
  const report = runtime.admitAgent(agentRecord(id, overrides));
  expect(report.admitted).toBe(true);
  runtime.registry.transition(id, "validated");
  runtime.registry.transition(id, "approved");
  runtime.registry.transition(id, "ready");
}

const RUNNER = { principal: "runner", kind: "human" as const };

function grantRunner(runtime: AgentRuntime): void {
  runtime.permissions.grant({ principal: "runner", subjectId: "*", actions: ["execution"] });
}

// ── Section 03 · Lifecycle ──────────────────────────────────────────────────

describe("AgentLifecycleMachine", () => {
  const machine = new AgentLifecycleMachine();

  it("walks governance then operational paths; archived terminal", () => {
    expect(machine.canTransition("draft", "registered")).toBe(true);
    expect(machine.canTransition("approved", "ready")).toBe(true);
    expect(machine.canTransition("ready", "running")).toBe(true);
    expect(machine.canTransition("running", "paused")).toBe(true);
    expect(machine.canTransition("paused", "running")).toBe(true);
    expect(machine.canTransition("running", "stopped")).toBe(true);
    expect(machine.canTransition("stopped", "ready")).toBe(true);
    expect(machine.canTransition("deprecated", "archived")).toBe(true);
    expect(machine.isTerminal("archived")).toBe(true);
    expect(machine.canTransition("draft", "running")).toBe(false);
    expect(machine.canTransition("registered", "ready")).toBe(false);
  });
});

// ── Sections 01–02 · Admission & registry ───────────────────────────────────

describe("agent admission", () => {
  it("admits a valid record as registered, versioned and audited", () => {
    const runtime = makeRuntime();
    const report = runtime.admitAgent(agentRecord("agent.alpha", { lifecycle: "draft" }));
    expect(report.admitted).toBe(true);
    expect(runtime.registry.get("agent.alpha")?.lifecycle).toBe("registered");
    expect(runtime.versions.currentOf("agent.alpha")).toBe("1.0.0");
    expect(runtime.audit.list({ subjectId: "agent.alpha" })[0].action).toBe("admission-accepted");
  });

  it("rejects malformed records with the full issue list", () => {
    const runtime = makeRuntime();
    const report = runtime.admitAgent({ id: "agent.broken" });
    expect(report.admitted).toBe(false);
    expect(report.issues.length).toBeGreaterThan(1);
    expect(runtime.registry.has("agent.broken")).toBe(false);
    expect(runtime.audit.list({ subjectId: "agent.broken" })[0].action).toBe("admission-rejected");
  });

  it("enforces identity, contract and category laws", () => {
    const runtime = makeRuntime();
    const bad = agentRecord("agent.alpha");
    const report = runtime.admitAgent({
      ...bad,
      category: "no-such",
      manifest: {
        ...bad.manifest,
        base: baseManifest("agent.other"),
        executionContract: { ...bad.manifest.executionContract, idempotent: false },
      },
    });
    expect(report.admitted).toBe(false);
    const checks = report.issues.map((i) => i.check);
    expect(checks).toContain("category");
    expect(checks).toContain("manifest");
    expect(checks).toContain("contract");
  });

  it("resolves capability references only when a resolver is wired", () => {
    const unwired = makeRuntime();
    expect(
      unwired.admitAgent(agentRecord("agent.a", { capabilities: ["cap.ghost"] })).admitted,
    ).toBe(true);

    const wired = makeRuntime(() => ["cap.known"]);
    const rejected = wired.admitAgent(agentRecord("agent.b", { capabilities: ["cap.ghost"] }));
    expect(rejected.admitted).toBe(false);
    expect(rejected.issues[0].check).toBe("capability-references");
    expect(wired.admitAgent(agentRecord("agent.c", { capabilities: ["cap.known"] })).admitted).toBe(
      true,
    );
  });

  it("refuses duplicates and operational-state transitions", () => {
    const runtime = makeRuntime();
    runtime.admitAgent(agentRecord("agent.alpha"));
    expect(runtime.admitAgent(agentRecord("agent.alpha")).admitted).toBe(false);
    runtime.registry.transition("agent.alpha", "validated");
    runtime.registry.transition("agent.alpha", "approved");
    runtime.registry.transition("agent.alpha", "ready");
    expect(() => runtime.registry.transition("agent.alpha", "running")).toThrow(
      /execution coordinator/,
    );
    expect(() => runtime.registry.transition("agent.alpha", "paused")).toThrow(
      /execution coordinator/,
    );
  });
});

// ── Section 07 · Execution context ──────────────────────────────────────────

describe("execution context", () => {
  it("carries identity, session, memory, permissions and the three ids", () => {
    const runtime = makeRuntime();
    runtime.permissions.grant({ principal: "runner", subjectId: "x", actions: ["read"] });
    const context = runtime.createContext(RUNNER);
    expect(context.correlationId).toBe("corr-1");
    expect(context.traceId).toMatch(/^trace-/);
    expect(context.auditId).toMatch(/^audit-/);
    expect(context.can("x", "read")).toBe(true);
    expect(context.can("x", "write")).toBe(false);

    context.memory.set("k", 42);
    const child = context.child();
    expect(child.correlationId).toBe(context.correlationId);
    expect(child.parentTraceId).toBe(context.traceId);
    expect(child.traceId).not.toBe(context.traceId);
    expect(child.memory.get("k")).toBe(42);
    child.memory.set("k", 7);
    expect(context.memory.get("k")).toBe(42);
  });
});

// ── Sections 04/05/06/08/09 · Execution end-to-end ─────────────────────────

describe("execution coordinator", () => {
  it("refuses execution while no invoker is installed — honest empty runtime", async () => {
    const runtime = makeRuntime();
    grantRunner(runtime);
    readyAgent(runtime, "agent.a");
    await expect(
      runtime.coordinator.execute(
        { mode: "single", agentId: "agent.a", input: "x" },
        runtime.createContext(RUNNER),
      ),
    ).rejects.toThrow(/no invoker installed/);
    expect(runtime.coordinator.hasInvoker()).toBe(false);
  });

  it("single mode: runs, traces, meters, journals and returns to ready", async () => {
    const runtime = makeRuntime();
    grantRunner(runtime);
    readyAgent(runtime, "agent.a");
    runtime.coordinator.installInvoker((agentId, input) => `${agentId}:${String(input)}`);
    expect(() => runtime.coordinator.installInvoker(() => null)).toThrow(/already installed/);

    const result = await runtime.coordinator.execute(
      { mode: "single", agentId: "agent.a", input: "x" },
      runtime.createContext(RUNNER),
    );
    expect(result.ok).toBe(true);
    expect(result.invocations[0].output).toBe("agent.a:x");
    expect(result.invocations[0].latency).toBeGreaterThan(0);
    expect(runtime.registry.get("agent.a")?.lifecycle).toBe("ready");
    expect(runtime.events.logFor("agent.a").map((e) => e.event)).toEqual([
      "agent-started",
      "agent-finished",
    ]);
    expect(runtime.metrics.snapshotOf("agent.a").finished).toBe(1);
    expect(runtime.traces.list()).toHaveLength(1);
    expect(
      runtime.audit.list({ subjectId: "agent.a" }).some((e) => e.action === "agent-invocation"),
    ).toBe(true);
  });

  it("deny-by-default: a principal without execution permission is refused and audited", async () => {
    const runtime = makeRuntime();
    readyAgent(runtime, "agent.a");
    runtime.coordinator.installInvoker(() => "ok");
    await expect(
      runtime.coordinator.execute(
        { mode: "single", agentId: "agent.a", input: null },
        runtime.createContext({ principal: "intruder", kind: "human" }),
      ),
    ).rejects.toThrow(/deny-by-default/);
    expect(
      runtime.audit.list({ actor: "intruder" }).some((e) => e.action === "execution-denied"),
    ).toBe(true);
  });

  it("failure path: agent-failed event, failure metric, health degraded, agent stays ready", async () => {
    const runtime = makeRuntime();
    grantRunner(runtime);
    readyAgent(runtime, "agent.bad");
    runtime.coordinator.installInvoker(() => {
      throw new Error("boom");
    });
    const result = await runtime.coordinator.execute(
      { mode: "single", agentId: "agent.bad", input: null },
      runtime.createContext(RUNNER),
    );
    expect(result.ok).toBe(false);
    expect(result.invocations[0].error).toBe("boom");
    expect(runtime.registry.get("agent.bad")?.lifecycle).toBe("ready");
    expect(runtime.registry.get("agent.bad")?.health).toBe("warning");
    expect(runtime.metrics.snapshotOf("agent.bad").failed).toBe(1);
    expect(runtime.logs.list({ level: "error", subjectId: "agent.bad" })).toHaveLength(1);
  });

  it("sequential fails fast; pipeline chains outputs; broadcast shares input; parallel fans out", async () => {
    const runtime = makeRuntime();
    grantRunner(runtime);
    for (const id of ["agent.a", "agent.b", "agent.c"]) readyAgent(runtime, id);
    runtime.coordinator.installInvoker((agentId, input) => {
      if (input === "explode") throw new Error(`${agentId} failed`);
      return `${agentId}(${String(input)})`;
    });
    const context = () => runtime.createContext(RUNNER);

    const sequential = await runtime.coordinator.execute(
      {
        mode: "sequential",
        steps: [
          { agentId: "agent.a", input: "1" },
          { agentId: "agent.b", input: "explode" },
          { agentId: "agent.c", input: "3" },
        ],
      },
      context(),
    );
    expect(sequential.ok).toBe(false);
    expect(sequential.invocations).toHaveLength(2); // c never started

    const pipeline = await runtime.coordinator.execute(
      { mode: "pipeline", stageAgentIds: ["agent.a", "agent.b"], input: "seed" },
      context(),
    );
    expect(pipeline.invocations[1].output).toBe("agent.b(agent.a(seed))");

    const broadcast = await runtime.coordinator.execute(
      { mode: "broadcast", agentIds: ["agent.a", "agent.b", "agent.c"], input: "all" },
      context(),
    );
    expect(broadcast.invocations.map((i) => i.output)).toEqual([
      "agent.a(all)",
      "agent.b(all)",
      "agent.c(all)",
    ]);

    const parallel = await runtime.coordinator.execute(
      {
        mode: "parallel",
        branches: [
          { agentId: "agent.a", input: "p1" },
          { agentId: "agent.b", input: "p2" },
        ],
      },
      context(),
    );
    expect(parallel.ok).toBe(true);
    expect(parallel.invocations).toHaveLength(2);
  });

  it("approval-driven protocol: request → approve (permission-gated) → run; direct execute refused", async () => {
    const runtime = makeRuntime();
    grantRunner(runtime);
    readyAgent(runtime, "agent.a");
    runtime.coordinator.installInvoker(() => "done");
    runtime.permissions.grant({ principal: "board", subjectId: "*", actions: ["approval"] });
    const plan: ExecutionPlan = {
      mode: "approval-driven",
      inner: { mode: "single", agentId: "agent.a", input: "x" },
    };

    await expect(runtime.coordinator.execute(plan, runtime.createContext(RUNNER))).rejects.toThrow(
      /request → approve → run/,
    );

    const request = runtime.coordinator.request(plan, runtime.createContext(RUNNER));
    expect(runtime.events.log().at(-1)?.event).toBe("execution-requested");
    await expect(runtime.coordinator.run(request.requestId)).rejects.toThrow(/only approved/);
    expect(() => runtime.coordinator.approve(request.requestId, "intruder")).toThrow(
      /deny-by-default/,
    );
    runtime.coordinator.approve(request.requestId, "board");
    const result = await runtime.coordinator.run(request.requestId);
    expect(result.ok).toBe(true);
    expect(runtime.coordinator.requestOf(request.requestId)?.status).toBe("completed");
    const eventNames = runtime.events.log().map((e) => e.event);
    expect(eventNames).toContain("execution-approved");
  });

  it("blocking policies force the protocol; rejection is final and audited", async () => {
    const runtime = makeRuntime();
    grantRunner(runtime);
    readyAgent(runtime, "agent.gated", {
      policies: [{ id: "policy.gate", description: "Needs a human.", enforcement: "blocking" }],
    });
    runtime.coordinator.installInvoker(() => "done");
    runtime.permissions.grant({ principal: "board", subjectId: "*", actions: ["approval"] });

    await expect(
      runtime.coordinator.execute(
        { mode: "single", agentId: "agent.gated", input: null },
        runtime.createContext(RUNNER),
      ),
    ).rejects.toThrow(/blocking policies/);

    const request = runtime.coordinator.request(
      { mode: "single", agentId: "agent.gated", input: null },
      runtime.createContext(RUNNER),
    );
    runtime.coordinator.reject(request.requestId, "board", "not today");
    expect(runtime.events.log().at(-1)?.event).toBe("execution-rejected");
    await expect(runtime.coordinator.run(request.requestId)).rejects.toThrow(/rejected/);
    expect(() => runtime.coordinator.approve(request.requestId, "board")).toThrow(
      /already rejected/,
    );
  });

  it("approval hooks can veto any run (audited, event emitted)", async () => {
    const runtime = makeRuntime();
    grantRunner(runtime);
    readyAgent(runtime, "agent.a");
    runtime.coordinator.installInvoker(() => "done");
    const release = runtime.security.registerApprovalHook((request) =>
      request.agentIds.includes("agent.a") ? "maintenance window" : null,
    );
    await expect(
      runtime.coordinator.execute(
        { mode: "single", agentId: "agent.a", input: null },
        runtime.createContext(RUNNER),
      ),
    ).rejects.toThrow(/maintenance window/);
    expect(runtime.events.log().at(-1)?.event).toBe("execution-rejected");
    release();
    const result = await runtime.coordinator.execute(
      { mode: "single", agentId: "agent.a", input: null },
      runtime.createContext(RUNNER),
    );
    expect(result.ok).toBe(true);
  });

  it("event-driven bindings file requests but never auto-run", () => {
    const runtime = makeRuntime();
    grantRunner(runtime);
    readyAgent(runtime, "agent.reactor");
    runtime.coordinator.installInvoker(() => "done");
    runtime.coordinator.bindEventTrigger(
      "agent-failed",
      { mode: "single", agentId: "agent.reactor", input: "triage" },
      runtime.createContext({ principal: "runner", kind: "service" }),
    );

    runtime.events.emit("agent-failed", "agent.someone", { error: "x" });
    const requested = runtime.events.log().filter((e) => e.event === "execution-requested");
    expect(requested).toHaveLength(1);
    const requestId = requested[0].subjectId;
    expect(runtime.coordinator.requestOf(requestId)?.status).toBe("pending");
    expect(runtime.metrics.snapshotOf("agent.reactor").started).toBe(0);
  });

  it("pause/resume are gate-guarded: running is unreachable externally and pause demands running", async () => {
    const runtime = makeRuntime();
    grantRunner(runtime);
    readyAgent(runtime, "agent.a");
    runtime.coordinator.installInvoker(async (agentId, _input, context) => {
      /* a long-running agent pauses and resumes itself mid-flight —
         the ONLY legal road into paused/running is the coordinator */
      runtime.coordinator.pause(agentId, context);
      runtime.coordinator.resume(agentId, context);
      return "done";
    });

    // running/paused are unreachable from outside the protocol
    expect(() => runtime.registry.transition("agent.a", "running")).toThrow(
      /execution coordinator/,
    );
    // pause from ready (not running) violates the lifecycle machine
    expect(() => runtime.coordinator.pause("agent.a", runtime.createContext(RUNNER))).toThrow(
      /cannot transition/,
    );

    const result = await runtime.coordinator.execute(
      { mode: "single", agentId: "agent.a", input: null },
      runtime.createContext(RUNNER),
    );
    expect(result.ok).toBe(true);
    const eventNames = runtime.events.logFor("agent.a").map((e) => e.event);
    expect(eventNames).toContain("agent-paused");
    expect(eventNames).toContain("agent-resumed");
    expect(runtime.registry.get("agent.a")?.lifecycle).toBe("ready");
  });

  it("request state is sealed: snapshots are frozen and the plan is cloned at filing", async () => {
    const runtime = makeRuntime();
    grantRunner(runtime);
    readyAgent(runtime, "agent.a");
    readyAgent(runtime, "agent.evil");
    const invoked: string[] = [];
    runtime.coordinator.installInvoker((agentId) => {
      invoked.push(agentId);
      return "done";
    });
    runtime.permissions.grant({ principal: "board", subjectId: "*", actions: ["approval"] });

    // a caller-owned mutable plan object, legally satisfying the plan type
    const callerPlan = { mode: "single" as const, agentId: "agent.a", input: "x" };
    const view = runtime.coordinator.request(callerPlan, runtime.createContext(RUNNER));

    // flipping the snapshot's status must throw (frozen) and change nothing
    expect(() => {
      (view as { status: string }).status = "approved";
    }).toThrow(TypeError);
    expect(runtime.coordinator.requestOf(view.requestId)?.status).toBe("pending");
    await expect(runtime.coordinator.run(view.requestId)).rejects.toThrow(/only approved/);

    // swapping the caller's plan after filing must not change what runs
    callerPlan.agentId = "agent.evil";
    runtime.coordinator.approve(view.requestId, "board");
    await runtime.coordinator.run(view.requestId);
    expect(invoked).toEqual(["agent.a"]);
  });

  it("mode support is enforced per agent", async () => {
    const runtime = makeRuntime();
    grantRunner(runtime);
    readyAgent(runtime, "agent.solo", { supportedModes: ["single"] });
    runtime.coordinator.installInvoker(() => "done");
    await expect(
      runtime.coordinator.execute(
        { mode: "broadcast", agentIds: ["agent.solo"], input: null },
        runtime.createContext(RUNNER),
      ),
    ).rejects.toThrow(/does not support execution mode/);
  });
});

// ── Section 08 · Observability detail ───────────────────────────────────────

describe("observability", () => {
  it("spans nest under the invocation's parent trace and measure latency", async () => {
    const runtime = makeRuntime();
    grantRunner(runtime);
    readyAgent(runtime, "agent.a");
    runtime.coordinator.installInvoker(() => "ok");
    const context = runtime.createContext(RUNNER);
    await runtime.coordinator.execute({ mode: "single", agentId: "agent.a", input: null }, context);
    const span = runtime.traces.list()[0];
    expect(span.parentTraceId).toBe(context.traceId);
    expect(span.status).toBe("ok");
    expect(runtime.traces.durationOf(span.traceId)).toBeGreaterThan(0);
    const snapshot = runtime.metrics.snapshotOf("agent.a");
    expect(snapshot.meanLatency).toBeGreaterThan(0);
    expect(snapshot.maxLatency).toBeGreaterThanOrEqual(snapshot.meanLatency);
  });
});

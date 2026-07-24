import { describe, expect, it } from "vitest";
import { DEFAULT_SHELL_CONFIG, TOKENS, createKernel } from "./kernel";
import type { RuntimeModule, ShellConfig } from "./types";

const seqIds = () => {
  let n = 0;
  return () => `id-${++n}`;
};

const CONFIG: ShellConfig = {
  ...DEFAULT_SHELL_CONFIG,
  environment: "test",
  requiredCapabilities: [],
};

const makeModule = (id: string, over: Partial<RuntimeModule> = {}): RuntimeModule => ({
  id,
  version: "1.0.0",
  capabilities: [],
  dependencies: [],
  health: () => ({ status: "healthy" as const }),
  initialize: () => undefined,
  activate: () => undefined,
  deactivate: () => undefined,
  dispose: () => undefined,
  ...over,
});

describe("Kernel — deterministic boot", () => {
  it("boots through every stage in order and reaches READY", async () => {
    const lifecycle: string[] = [];
    const kernel = createKernel(CONFIG, {
      idFactory: seqIds(),
      uiMount: () => void lifecycle.push("ui-mounted"),
      modules: [
        makeModule("core", { capabilities: ["core"] }),
        makeModule("panel", {
          dependencies: ["core"],
          initialize: () => void lifecycle.push("panel:init"),
          activate: () => void lifecycle.push("panel:active"),
        }),
      ],
    });
    await kernel.boot();
    expect(kernel.state).toBe("ready");
    expect(lifecycle).toEqual(["panel:init", "panel:active", "ui-mounted"]);
    const stages = kernel.diagnostics.snapshot().bootTimeline.map((s) => s.stage);
    expect(stages).toEqual([
      "kernel",
      "configuration",
      "capability-registry",
      "dependency-validation",
      "service-bus",
      "event-bus",
      "module-registration",
      "agent-runtime",
      "navigation",
      "ui-mount",
      "ready",
    ]);
    expect(kernel.registry.stateOf("panel")).toBe("active");
    await kernel.dispose();
    expect(kernel.state).toBe("disposed");
  });

  it("FAILS CLOSED: a crashing module aborts boot and tears down what started", async () => {
    const torn: string[] = [];
    const kernel = createKernel(CONFIG, {
      idFactory: seqIds(),
      modules: [
        makeModule("first", {
          deactivate: () => void torn.push("first:deactivated"),
          dispose: () => void torn.push("first:disposed"),
        }),
        makeModule("second", {
          dependencies: ["first"],
          activate: () => {
            throw new Error("second refuses to start");
          },
        }),
      ],
    });
    await expect(kernel.boot()).rejects.toThrow(/module-registration.*second refuses/);
    expect(kernel.state).toBe("failed");
    expect(torn).toEqual(["first:deactivated", "first:disposed"]); // no partial boot survives
  });

  it("FAILS CLOSED when a required capability has no provider", async () => {
    const kernel = createKernel(
      { ...CONFIG, requiredCapabilities: ["voice"] },
      { idFactory: seqIds(), modules: [makeModule("core")] },
    );
    await expect(kernel.boot()).rejects.toThrow(/required capability "voice"/);
    expect(kernel.state).toBe("failed");
  });
});

describe("Kernel — health, recovery, quarantine (no shell reboot)", () => {
  it("auto-recovers an unhealthy module through the health monitor", async () => {
    let healthy = true;
    let initCount = 0;
    const flaky = makeModule("flaky", {
      health: () => ({ status: healthy ? ("healthy" as const) : ("unhealthy" as const) }),
      initialize: () => {
        initCount++;
        healthy = true; // re-initialization heals it
      },
    });
    const kernel = createKernel(CONFIG, { idFactory: seqIds(), modules: [flaky] });
    await kernel.boot();
    expect(initCount).toBe(1);

    healthy = false;
    const sick = await kernel.health.tick();
    expect(initCount).toBe(2); // recovered in place
    expect(sick.modules.find((m) => m.moduleId === "flaky")).toBeTruthy();
    const after = await kernel.health.tick();
    expect(after.overall).toBe("healthy");
    expect(kernel.state).toBe("ready"); // the shell never rebooted
  });

  it("quarantines a module that keeps crashing — shell stays READY", async () => {
    let poisoned = false;
    const doomed = makeModule("doomed", {
      health: () => ({ status: poisoned ? ("unhealthy" as const) : ("healthy" as const) }),
      initialize: () => {
        if (poisoned) throw new Error("still broken");
      },
    });
    const kernel = createKernel(CONFIG, { idFactory: seqIds(), modules: [doomed] });
    await kernel.boot();
    poisoned = true;
    const outcome = await kernel.recovery.recoverModule("doomed");
    expect(outcome.quarantined).toBe(true);
    expect(kernel.registry.stateOf("doomed")).toBe("quarantined");
    expect(kernel.state).toBe("ready");
    const report = await kernel.health.tick();
    expect(report.overall).toBe("unhealthy"); // honest reporting, no crash
  });

  it("recovers services (DI reset) and memory (snapshot rollback)", async () => {
    const kernel = createKernel(CONFIG, { idFactory: seqIds(), modules: [] });
    await kernel.boot();
    // service recovery
    expect(kernel.services.resolve(TOKENS.agents)).toBeTruthy();
    expect(kernel.recovery.recoverService(TOKENS.agents)).toBe(true);
    expect(kernel.services.resolve(TOKENS.agents)).toBeTruthy();
    // memory recovery
    const store = kernel.stateManager.createStore("ops", { rows: 3 });
    store.set({ rows: 7 });
    expect(kernel.recovery.recoverMemory("ops")).toBe(true);
    expect(store.get().rows).toBe(7); // last good IS the latest valid write
  });
});

describe("Kernel — bridges: agents, permissions, output gateway, memory", () => {
  it("routes a GATED agent task to approval_required through the REAL output gateway", async () => {
    const kernel = createKernel(CONFIG, { idFactory: seqIds(), modules: [] });
    await kernel.boot();
    const agents = kernel.services.resolve(TOKENS.agents);
    const result = agents.runTask("أصدر تصريح عمل ساخن لمحطة الوسطى", kernel.context.current(), {
      advisoryText: "تم الإصدار.", // hostile claim — must NOT surface
    });
    expect(result.selection.hits[0]?.id).toBe("ptw-issue");
    expect(result.gated).toBe(true);
    expect(result.envelope.status).toBe("approval_required");
    expect(result.envelope.displayText).not.toMatch(/تم الإصدار/);
    expect(result.telemetry.isSimulation).toBe(true);
  });

  it("an ungated read task emits an answer envelope; selection is deterministic", async () => {
    const kernel = createKernel(CONFIG, { idFactory: seqIds(), modules: [] });
    await kernel.boot();
    const agents = kernel.services.resolve(TOKENS.agents);
    const result = agents.runTask("تحقق من صلاحية التصريح عبر رمز QR", kernel.context.current(), {
      advisoryText: "التصريح ساري الصلاحية.",
    });
    expect(result.selection.hits[0]?.id).toBe("ptw-verify");
    expect(result.gated).toBe(false);
    expect(result.envelope.status).toBe("answer");
  });

  it("output integration blocks a secret leak — the gateway is wrapped, never bypassed", async () => {
    const kernel = createKernel(CONFIG, { idFactory: seqIds(), modules: [] });
    await kernel.boot();
    const output = kernel.services.resolve(TOKENS.output);
    const envelope = output.emit(
      { userText: "لخّص", modelText: "secret = sk-abcdef123456789" },
      kernel.context.current(),
    );
    expect(envelope.status).toBe("refusal");
    expect(JSON.stringify(envelope)).not.toContain("sk-abcdef");
  });

  it("permission layer delegates to shell authz (admin-only, org boundary)", async () => {
    const kernel = createKernel(CONFIG, { idFactory: seqIds(), modules: [] });
    await kernel.boot();
    const permissions = kernel.services.resolve(TOKENS.permissions);
    expect(permissions.requiresHumanGate("broadcast")).toBe(true);
    expect(
      permissions.canDecideProposal(
        { userId: "u1", appRoles: ["admin"], orgRole: "admin", orgId: "org-1" },
        "org-1",
      ),
    ).toBe(true);
    expect(
      permissions.canDecideProposal(
        { userId: "u1", appRoles: ["admin"], orgRole: "admin", orgId: "org-2" },
        "org-1",
      ),
    ).toBe(false);
  });

  it("memory bridge is fail-safe: a broken adapter never crashes the shell", async () => {
    const kernel = createKernel(CONFIG, {
      idFactory: seqIds(),
      modules: [],
      memoryAdapter: {
        remember: async () => {
          throw new Error("db down");
        },
        recall: async () => {
          throw new Error("db down");
        },
      },
    });
    await kernel.boot();
    const memory = kernel.services.resolve(TOKENS.memory);
    expect(await memory.remember({ question: "q", answer: "a" }, kernel.context.current())).toBe(
      false,
    );
    expect(await memory.recall("q", kernel.context.current())).toEqual([]);
    expect(kernel.state).toBe("ready");
  });

  it("navigation is wired through the kernel with the configured fallback", async () => {
    const visited: string[] = [];
    const kernel = createKernel(CONFIG, {
      idFactory: seqIds(),
      modules: [],
      navigationAdapter: { go: (p) => void visited.push(p) },
    });
    await kernel.boot();
    kernel.navigation.registerRoute("/hcis");
    expect((await kernel.navigation.navigate("/hcis")).ok).toBe(true);
    expect((await kernel.navigation.navigate("/nope")).path).toBe("/");
    expect(visited).toEqual(["/hcis", "/"]);
  });
});

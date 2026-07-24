import { describe, expect, it } from "vitest";
import { ServiceBus, serviceToken } from "./service-bus";
import { EventBus } from "./event-bus";
import { Diagnostics } from "./diagnostics";
import { CapabilityRegistry, ModuleRegistry, discoverModules } from "./registry";
import {
  ShellContextManager,
  ShellLayoutManager,
  ShellNavigationEngine,
  ShellStateManager,
} from "./managers";
import type { RuntimeModule } from "./types";

const seqIds = () => {
  let n = 0;
  return () => `id-${++n}`;
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

const makeBus = () =>
  new EventBus({
    maxRetries: 2,
    deadLetterLimit: 10,
    idFactory: seqIds(),
    diagnostics: new Diagnostics(),
  });

describe("Service Bus — DI only", () => {
  it("registers and resolves through tokens; singleton is cached, transient is not", () => {
    const bus = new ServiceBus();
    const tok = serviceToken<{ n: number }>("svc.counter");
    let built = 0;
    bus.register(tok, () => ({ n: ++built }));
    expect(bus.resolve(tok).n).toBe(1);
    expect(bus.resolve(tok).n).toBe(1); // cached singleton
    const tok2 = serviceToken<{ n: number }>("svc.transient");
    bus.register(tok2, () => ({ n: ++built }), "transient");
    expect(bus.resolve(tok2).n).not.toBe(bus.resolve(tok2).n);
  });

  it("rejects duplicates, unknown tokens, and circular resolution", () => {
    const bus = new ServiceBus();
    const a = serviceToken<unknown>("svc.a");
    const b = serviceToken<unknown>("svc.b");
    bus.register(a, (s) => s.resolve(b));
    bus.register(b, (s) => s.resolve(a));
    expect(() => bus.register(a, () => null)).toThrow(/duplicate/);
    expect(() => bus.resolve(serviceToken("svc.nope"))).toThrow(/unknown service/);
    expect(() => bus.resolve(a)).toThrow(/circular/);
  });

  it("reset() drops a singleton so recovery can rebuild it", () => {
    const bus = new ServiceBus();
    const tok = serviceToken<{ n: number }>("svc.reset");
    let built = 0;
    bus.register(tok, () => ({ n: ++built }));
    expect(bus.resolve(tok).n).toBe(1);
    expect(bus.reset(tok)).toBe(true);
    expect(bus.resolve(tok).n).toBe(2);
  });
});

describe("Event Bus — priority, retry, dead-letter, correlation", () => {
  it("dispatches by priority desc and supports unsubscribe + wildcard", async () => {
    const bus = makeBus();
    const order: string[] = [];
    bus.subscribe("t", () => void order.push("low"), { priority: 1 });
    bus.subscribe("t", () => void order.push("high"), { priority: 9 });
    const wild = bus.subscribe("*", () => void order.push("wild"));
    const sub = bus.subscribe("t", () => void order.push("gone"));
    sub.unsubscribe();
    const result = await bus.publish("t", {});
    expect(order).toEqual(["high", "low", "wild"]);
    expect(result.delivered).toBe(3);
    expect(result.traceId).toBeTruthy();
    wild.unsubscribe();
  });

  it("retries a failing handler then dead-letters it; redeliver() recovers", async () => {
    const bus = makeBus();
    let calls = 0;
    let healed = false;
    bus.subscribe("flaky", () => {
      calls++;
      if (!healed) throw new Error("boom");
    });
    const r1 = await bus.publish("flaky", { x: 1 });
    expect(calls).toBe(3); // 1 + maxRetries(2)
    expect(r1.deadLettered).toBe(1);
    const dead = bus.getDeadLetters();
    expect(dead).toHaveLength(1);
    healed = true;
    expect(await bus.redeliver(dead[0].id)).toBe(true);
    expect(bus.getDeadLetters()).toHaveLength(0);
  });

  it("broadcast reaches every subscriber regardless of topic", async () => {
    const bus = makeBus();
    const seen: string[] = [];
    bus.subscribe("a", (e) => void seen.push(`a:${e.broadcast}`));
    bus.subscribe("b", (e) => void seen.push(`b:${e.broadcast}`));
    const r = await bus.broadcast({ msg: "all-hands" });
    expect(r.delivered).toBe(2);
    expect(seen.sort()).toEqual(["a:true", "b:true"]);
  });

  it("request/response is correlated; duplicate or missing responders are refused", async () => {
    const bus = makeBus();
    bus.respond<{ q: number }, { a: number }>("math.double", (e) => ({ a: e.payload.q * 2 }));
    const { response, correlationId } = await bus.request<{ q: number }, { a: number }>(
      "math.double",
      { q: 21 },
      { correlationId: "corr-7" },
    );
    expect(response.a).toBe(42);
    expect(correlationId).toBe("corr-7");
    expect(() => bus.respond("math.double", () => null)).toThrow(/duplicate responder/);
    await expect(bus.request("math.nope", {})).rejects.toThrow(/no responder/);
  });
});

describe("Module Registry + Capability Registry + Dependency Graph", () => {
  it("detects duplicates and version conflicts", () => {
    const reg = new ModuleRegistry();
    reg.register(makeModule("m1"));
    expect(() => reg.register(makeModule("m1"))).toThrow(/duplicate module/);
    expect(() => reg.register(makeModule("m1", { version: "2.0.0" }))).toThrow(/version conflict/);
  });

  it("discoverModules() keeps well-formed candidates and reports rejects", () => {
    const good = makeModule("ok");
    const { modules, rejected } = discoverModules([good, { id: "bad" }, null, 42]);
    expect(modules.map((m) => m.id)).toEqual(["ok"]);
    expect(rejected).toHaveLength(3);
  });

  it("validates dependencies: missing dep and cycles are boot errors; order is topological", () => {
    const reg = new ModuleRegistry();
    reg.register(makeModule("a", { dependencies: ["b"] }));
    expect(() => reg.bootOrder()).toThrow(/missing module "b"/);
    reg.register(makeModule("b", { dependencies: [] }));
    const order = reg.bootOrder().map((m) => m.id);
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("a"));

    const cyc = new ModuleRegistry();
    cyc.register(makeModule("x", { dependencies: ["y"] }));
    cyc.register(makeModule("y", { dependencies: ["x"] }));
    expect(() => cyc.bootOrder()).toThrow(/cycle detected/);
  });

  it("capability conflicts (two providers) are refused", () => {
    const reg = new ModuleRegistry();
    const caps = new CapabilityRegistry();
    reg.register(makeModule("p1", { capabilities: ["voice"] }));
    reg.register(makeModule("p2", { capabilities: ["voice"] }));
    expect(() => reg.declareCapabilities(caps)).toThrow(/provided by both/);
  });
});

describe("Context · State · Layout · Navigation", () => {
  it("context defaults to an anonymous actor and applies server-side updates", () => {
    const ctx = new ShellContextManager();
    expect(ctx.current().actor.userId).toBeNull();
    ctx.update({ requestId: "r9", locale: "en" });
    expect(ctx.current().requestId).toBe("r9");
    expect(ctx.current().locale).toBe("en");
  });

  it("state manager rejects corrupt writes, restores snapshots, and recovers", () => {
    const state = new ShellStateManager();
    const store = state.createStore("kpi", { value: 1 }, (v) => v.value >= 0);
    store.set({ value: 5 });
    expect(() => store.set({ value: -1 })).toThrow(/corrupt/);
    expect(store.get().value).toBe(5); // last good survives the corrupt write
    const snap = store.snapshot();
    store.set({ value: 9 });
    store.restore(snap);
    expect(store.get().value).toBe(5);
    expect(state.recover("kpi")).toBe(true);
    expect(state.recover("nope")).toBe(false);
  });

  it("layout registers named regions per slot and rejects duplicates", () => {
    const layout = new ShellLayoutManager();
    layout.registerRegion({ id: "top-nav", slot: "header" });
    expect(() => layout.registerRegion({ id: "top-nav", slot: "footer" })).toThrow(/duplicate/);
    expect(layout.regionsFor("header").map((r) => r.id)).toEqual(["top-nav"]);
    layout.setActiveLayout("boardroom");
    expect(layout.activeLayout()).toBe("boardroom");
  });

  it("navigation: guard denial and adapter failure both land on the fallback", async () => {
    const gone: string[] = [];
    const diagnostics = new Diagnostics();
    const ctx = new ShellContextManager();
    const nav = new ShellNavigationEngine(
      {
        go: (p) => {
          if (p === "/broken") throw new Error("router down");
          gone.push(p);
        },
      },
      ctx,
      diagnostics,
      "/",
    );
    nav.registerRoute("/");
    nav.registerRoute("/secure", { guard: (_p, c) => c.actor.userId !== null });
    nav.registerRoute("/broken");
    nav.registerRoute("/open");

    expect((await nav.navigate("/open")).ok).toBe(true);
    expect((await nav.navigate("/secure")).reason).toBe("guard-denied");
    expect((await nav.navigate("/missing")).reason).toBe("unknown-route");
    const broken = await nav.navigate("/broken");
    expect(broken.ok).toBe(false);
    expect(broken.path).toBe("/"); // fallback engaged — shell never strands
    expect(gone.filter((p) => p === "/")).not.toHaveLength(0);
  });
});

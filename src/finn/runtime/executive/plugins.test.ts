import { describe, expect, it } from "vitest";
import { DEFAULT_SHELL_CONFIG, createKernel } from "../kernel";
import type { ShellConfig } from "../types";
import { EXEC_TOKENS, createExecutiveShell } from "./controller";
import type { PluginHost, PluginManifest } from "./plugins";

const seqIds = () => {
  let n = 0;
  return () => `id-${++n}`;
};

const CONFIG: ShellConfig = { ...DEFAULT_SHELL_CONFIG, environment: "test" };

async function bootExec() {
  const idFactory = seqIds();
  const kernel = createKernel(CONFIG, {
    idFactory,
    modules: [createExecutiveShell({ idFactory, clock: () => "2026-07-24T12:00:00Z" })],
  });
  await kernel.boot();
  return kernel;
}

const manifest = (over: Partial<PluginManifest>): PluginManifest => ({
  id: "p1",
  version: "1.0.0",
  permissions: [],
  dependencies: [],
  capabilities: [],
  factory: () => ({}),
  ...over,
});

describe("Plugin Runtime — validation is fail-closed", () => {
  it("refuses duplicates, version conflicts, bad versions, and missing dependencies", async () => {
    const kernel = await bootExec();
    const plugins = kernel.services.resolve(EXEC_TOKENS.plugins);
    await plugins.load(manifest({ id: "base" }));
    await expect(plugins.load(manifest({ id: "base" }))).rejects.toThrow(/duplicate/);
    await expect(plugins.load(manifest({ id: "base", version: "2.0.0" }))).rejects.toThrow(
      /version conflict/,
    );
    await expect(plugins.load(manifest({ id: "x", version: "nope" }))).rejects.toThrow(
      /invalid version/,
    );
    await expect(plugins.load(manifest({ id: "y", dependencies: ["missing"] }))).rejects.toThrow(
      /missing plugin/,
    );
  });

  it("refuses a capability already provided by another plugin", async () => {
    const kernel = await bootExec();
    const plugins = kernel.services.resolve(EXEC_TOKENS.plugins);
    await plugins.load(manifest({ id: "a", capabilities: ["voice-panel"] }));
    await expect(
      plugins.load(manifest({ id: "b", capabilities: ["voice-panel"] })),
    ).rejects.toThrow(/already provided/);
  });
});

describe("Plugin Runtime — permissions, hot load/unload, crash isolation", () => {
  it("permission-scoped host: ungranted APIs are refused, granted ones work", async () => {
    const kernel = await bootExec();
    const plugins = kernel.services.resolve(EXEC_TOKENS.plugins);
    const seen: string[] = [];
    let deniedError = "";
    await plugins.load(
      manifest({
        id: "scoped",
        permissions: ["notifications:post"], // NO commands:register
        factory: () => ({
          start: async (host: PluginHost) => {
            await host.notify("info", "plugin online"); // granted → works
            try {
              host.registerCommand({
                id: "rogue.cmd",
                title: "Rogue",
                category: "quick",
                keywords: [],
                run: () => null,
              });
            } catch (error) {
              deniedError = error instanceof Error ? error.message : String(error);
            }
            seen.push("started");
          },
        }),
      }),
    );
    expect(seen).toEqual(["started"]);
    expect(deniedError).toMatch(/lacks permission "commands:register"/);
    const notifications = kernel.services.resolve(EXEC_TOKENS.notifications);
    expect(notifications.list().some((n) => n.title === "plugin online")).toBe(true);
    const commands = kernel.services.resolve(EXEC_TOKENS.commands);
    expect(commands.list().some((c) => c.id === "rogue.cmd")).toBe(false);
  });

  it("a plugin that crashes on start is quarantined — kernel and buses stay up", async () => {
    const kernel = await bootExec();
    const plugins = kernel.services.resolve(EXEC_TOKENS.plugins);
    const state = await plugins.load(
      manifest({
        id: "bomb",
        factory: () => ({
          start: () => {
            throw new Error("explode on start");
          },
        }),
      }),
    );
    expect(state).toBe("quarantined");
    expect(kernel.state).toBe("ready"); // shell survived
    const crashes = kernel.services.resolve(EXEC_TOKENS.crashes);
    expect(crashes.list("plugin:bomb")).toHaveLength(1);
    // Both buses still fully operational after the crash:
    await kernel.events.publish("post-crash-probe", {});
    expect(kernel.services.resolve(EXEC_TOKENS.metrics)).toBeTruthy();
  });

  it("a crashing subscriber quarantines the plugin after repeated crashes — bus unaffected", async () => {
    const kernel = await bootExec();
    const plugins = kernel.services.resolve(EXEC_TOKENS.plugins);
    let healthyDeliveries = 0;
    kernel.events.subscribe("ops.alert", () => void healthyDeliveries++);
    await plugins.load(
      manifest({
        id: "flaky-sub",
        permissions: ["events:subscribe"],
        factory: () => ({
          start: (host: PluginHost) => {
            host.subscribe("ops.alert", () => {
              throw new Error("handler crash");
            });
          },
        }),
      }),
    );
    await kernel.events.publish("ops.alert", { n: 1 });
    await kernel.events.publish("ops.alert", { n: 2 });
    await kernel.events.publish("ops.alert", { n: 3 });
    expect(plugins.stateOf("flaky-sub")).toBe("quarantined"); // 3 crashes → out
    expect(plugins.crashCountOf("flaky-sub")).toBe(3);
    expect(healthyDeliveries).toBe(3); // other subscribers never missed a beat
    await kernel.events.publish("ops.alert", { n: 4 });
    expect(healthyDeliveries).toBe(4);
    expect(plugins.crashCountOf("flaky-sub")).toBe(3); // quarantined = unsubscribed
  });

  it("hot-unload tears down plugin commands and subscriptions; dependents block unload", async () => {
    const kernel = await bootExec();
    const plugins = kernel.services.resolve(EXEC_TOKENS.plugins);
    const commands = kernel.services.resolve(EXEC_TOKENS.commands);
    let ticks = 0;
    await plugins.load(
      manifest({
        id: "toolkit",
        permissions: ["commands:register", "events:subscribe"],
        factory: () => ({
          start: (host: PluginHost) => {
            host.registerCommand({
              id: "toolkit.hello",
              title: "Hello",
              category: "quick",
              keywords: [],
              run: () => "hi",
            });
            host.subscribe("tick", () => void ticks++);
          },
        }),
      }),
    );
    await plugins.load(manifest({ id: "addon", dependencies: ["toolkit"] }));
    expect(commands.list().some((c) => c.id === "toolkit.hello")).toBe(true);
    await kernel.events.publish("tick", {});
    expect(ticks).toBe(1);

    await expect(plugins.unload("toolkit")).rejects.toThrow(/required by addon/);
    expect(await plugins.unload("addon")).toBe(true);
    expect(await plugins.unload("toolkit")).toBe(true);
    expect(commands.list().some((c) => c.id === "toolkit.hello")).toBe(false); // gone
    await kernel.events.publish("tick", {});
    expect(ticks).toBe(1); // subscription torn down — hot-unload is total
  });
});

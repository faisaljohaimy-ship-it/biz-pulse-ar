import { describe, expect, it } from "vitest";
import { DEFAULT_SHELL_CONFIG, createKernel } from "../kernel";
import type { ShellConfig } from "../types";
import { EXEC_TOKENS, createExecutiveShell } from "./controller";
import { createMemoryStorage, type StorageAdapter } from "./persistence";

const seqIds = () => {
  let n = 0;
  return () => `id-${++n}`;
};

const CONFIG: ShellConfig = { ...DEFAULT_SHELL_CONFIG, environment: "test" };

/** Boot a kernel hosting the executive shell (optionally on shared storage). */
async function bootExec(overrides: { storage?: StorageAdapter; clockISO?: string } = {}) {
  const idFactory = seqIds();
  const kernel = createKernel(CONFIG, {
    idFactory,
    modules: [
      createExecutiveShell({
        idFactory,
        clock: () => overrides.clockISO ?? "2026-07-24T12:00:00Z",
        ...(overrides.storage ? { storage: overrides.storage } : {}),
      }),
    ],
  });
  await kernel.boot();
  return kernel;
}

describe("Executive Shell — boots as a kernel module (DI only)", () => {
  it("boots to READY and every executive service resolves via the bus", async () => {
    const kernel = await bootExec();
    expect(kernel.state).toBe("ready");
    for (const token of Object.values(
      EXEC_TOKENS,
    ) as import("../service-bus").ServiceToken<unknown>[]) {
      expect(kernel.services.resolve(token)).toBeTruthy();
    }
    const metrics = kernel.services.resolve(EXEC_TOKENS.metrics);
    expect(metrics.snapshot().timings["exec.startup"]?.count).toBe(1); // startup measured
  });
});

describe("Workspaces · Windows · Docks · Persistence", () => {
  it("supports multiple workspaces, floating/docked windows, and switching", async () => {
    const kernel = await bootExec();
    const workspaces = kernel.services.resolve(EXEC_TOKENS.workspaces);
    const windows = kernel.services.resolve(EXEC_TOKENS.windows);
    const dock = kernel.services.resolve(EXEC_TOKENS.dock);

    const w1 = windows.open("hcis", { dock: "main" });
    const w2 = windows.open("ptw", { mode: "floating" });
    windows.moveResize(w2.id, { x: 10, y: 20, w: 500, h: 300 });
    expect(() => windows.moveResize(w1.id, { x: 0, y: 0, w: 1, h: 1 })).toThrow(/docked/);
    dock.moveTo(w2.id, "right");
    expect(dock.panels("right").map((w) => w.moduleId)).toEqual(["ptw"]);
    windows.focus(w1.id);
    expect(windows.list()[0].moduleId).toBe("hcis"); // z-order after focus

    const ops = workspaces.create("العمليات");
    workspaces.switchTo(ops.id);
    expect(workspaces.active().name).toBe("العمليات");
    expect(windows.list()).toHaveLength(0); // fresh workspace, fresh layout
  });

  it("restores workspaces, windows, theme and locale after a full restart", async () => {
    const storage = createMemoryStorage();
    const kernel1 = await bootExec({ storage });
    const workspaces1 = kernel1.services.resolve(EXEC_TOKENS.workspaces);
    const windows1 = kernel1.services.resolve(EXEC_TOKENS.windows);
    windows1.open("boardroom", { dock: "left" });
    workspaces1.pinModule("hcis");
    workspaces1.saveActive();
    kernel1.services.resolve(EXEC_TOKENS.theme).setActive("nexios-light");
    kernel1.services.resolve(EXEC_TOKENS.locale).setLocale("en");
    kernel1.services.resolve(EXEC_TOKENS.a11y).update({ fontScale: 5 }); // clamped
    await kernel1.dispose();

    const kernel2 = await bootExec({ storage }); // SAME storage = simulated restart
    const workspaces2 = kernel2.services.resolve(EXEC_TOKENS.workspaces);
    expect(workspaces2.active().windows.map((w) => w.moduleId)).toEqual(["boardroom"]);
    expect(workspaces2.active().pinnedModules).toEqual(["hcis"]);
    expect(kernel2.services.resolve(EXEC_TOKENS.theme).active().id).toBe("nexios-light");
    expect(kernel2.services.resolve(EXEC_TOKENS.locale).locale()).toBe("en");
    expect(kernel2.services.resolve(EXEC_TOKENS.a11y).preferences().fontScale).toBe(1.6);
  });

  it("deep links resolve to a workspace and open the addressed module", async () => {
    const kernel = await bootExec();
    const workspaces = kernel.services.resolve(EXEC_TOKENS.workspaces);
    const windows = kernel.services.resolve(EXEC_TOKENS.windows);
    const target = workspaces.create("الطوارئ");
    const link = workspaces.deepLink(target.id, "urgent-ops");
    const opened = workspaces.openDeepLink(link);
    expect(opened?.id).toBe(target.id);
    expect(windows.list().some((w) => w.moduleId === "urgent-ops")).toBe(true);
    expect(workspaces.openDeepLink("nexios://workspace/غير-موجود")).toBeNull();
  });
});

describe("Command System · Palette · Global Search", () => {
  it("executes built-ins, ranks palette hits, and gates permissioned commands", async () => {
    const kernel = await bootExec();
    const commands = kernel.services.resolve(EXEC_TOKENS.commands);
    const palette = kernel.services.resolve(EXEC_TOKENS.palette);

    const open = await commands.execute("shell.open-module", kernel.context.current(), {
      moduleId: "hcis",
    });
    expect(open.ok).toBe(true);

    // Anonymous context → permission-gated settings command is refused.
    const denied = await commands.execute("shell.open-settings", kernel.context.current());
    expect(denied).toMatchObject({ ok: false, error: "permission-denied" });

    // Authenticated context → allowed.
    kernel.context.update({
      actor: { userId: "u1", appRoles: [], orgRole: "manager", orgId: "org-1" },
    });
    const allowed = await commands.execute("shell.open-settings", kernel.context.current());
    expect(allowed.ok).toBe(true);

    const hits = palette.query("open");
    expect(hits.length).toBeGreaterThan(0);
    // Equal prefix matches rank by recency — open-settings ran most recently.
    expect(hits[0].command.id).toBe("shell.open-settings");
    expect(hits.map((h) => h.command.id)).toContain("shell.open-module");

    // A crashing command is isolated — the shell keeps running.
    commands.register({
      id: "bad.command",
      title: "Bad",
      category: "quick",
      keywords: [],
      run: () => {
        throw new Error("kaboom");
      },
    });
    const crashed = await commands.execute("bad.command", kernel.context.current());
    expect(crashed.ok).toBe(false);
    expect(kernel.state).toBe("ready");
  });

  it("global search aggregates providers and isolates a failing provider", async () => {
    const kernel = await bootExec();
    const search = kernel.services.resolve(EXEC_TOKENS.search);
    search.registerProvider({
      id: "broken",
      search: () => {
        throw new Error("index down");
      },
    });
    const results = await search.search("Open");
    expect(results.some((r) => r.providerId === "commands")).toBe(true); // others still answer
  });
});

describe("Notifications · Activity · Tasks · Session", () => {
  it("posts/reads/dismisses notifications and records activity taps", async () => {
    const kernel = await bootExec();
    const notifications = kernel.services.resolve(EXEC_TOKENS.notifications);
    const activity = kernel.services.resolve(EXEC_TOKENS.activity);
    const posted = await notifications.post({ severity: "warning", title: "انقطاع مستشعر" });
    expect(notifications.unreadCount()).toBe(1);
    expect(notifications.markRead(posted.id)).toBe(true);
    expect(notifications.unreadCount()).toBe(0);
    expect(activity.list("notification")).toHaveLength(1); // event-bus tap recorded
    expect(notifications.dismiss(posted.id)).toBe(true);
  });

  it("task center enforces legal transitions; session manager expires on idle", async () => {
    const kernel = await bootExec();
    const tasks = kernel.services.resolve(EXEC_TOKENS.tasks);
    const task = await tasks.create("تدقيق التصاريح");
    await tasks.transition(task.id, "in_progress", 40);
    await expect(tasks.transition(task.id, "pending")).rejects.toThrow(/illegal transition/);
    await tasks.transition(task.id, "completed", 100);

    // Session: fixed clock ⇒ deterministic idle expiry via a second kernel.
    let now = "2026-07-24T12:00:00Z";
    const idFactory = seqIds();
    const kernel2 = createKernel(CONFIG, {
      idFactory,
      modules: [createExecutiveShell({ idFactory, clock: () => now })],
    });
    await kernel2.boot();
    const session = kernel2.services.resolve(EXEC_TOKENS.session);
    await session.start({ userId: "u1", appRoles: [], orgRole: "manager", orgId: "org-1" });
    expect(kernel2.context.current().actor.userId).toBe("u1");
    now = "2026-07-24T13:00:00Z"; // 60 min later > 30 min idle limit
    const idle = await session.checkIdle();
    expect(idle.expired).toBe(true);
    expect(kernel2.context.current().actor.userId).toBeNull(); // context reset
  });
});

describe("Theme · Localization · Accessibility · Flags", () => {
  it("theme tokens, ar-first localization with fallback, a11y bounds, flag kill switch", async () => {
    const kernel = await bootExec();
    const theme = kernel.services.resolve(EXEC_TOKENS.theme);
    expect(theme.token("color.accent")).toBeTruthy();
    expect(() => theme.setActive("nope")).toThrow(/unknown theme/);

    const locale = kernel.services.resolve(EXEC_TOKENS.locale);
    locale.addBundle("ar", { welcome: "مرحبًا" });
    locale.addBundle("en", { welcome: "Welcome", only_en: "English only" });
    expect(locale.direction()).toBe("rtl");
    expect(locale.t("welcome")).toBe("مرحبًا");
    expect(locale.t("only_en")).toBe("English only"); // cross-locale fallback
    expect(locale.t("missing.key")).toBe("missing.key"); // never undefined

    const a11y = kernel.services.resolve(EXEC_TOKENS.a11y);
    a11y.update({ fontScale: 0.1 });
    expect(a11y.preferences().fontScale).toBe(0.8); // clamped low
    a11y.announce("تم حفظ مساحة العمل");
    expect(a11y.drainAnnouncements()).toEqual(["تم حفظ مساحة العمل"]);
    expect(a11y.drainAnnouncements()).toEqual([]);

    const flags = kernel.services.resolve(EXEC_TOKENS.flags);
    flags.define({ id: "exec.new-dock", defaultValue: true, description: "dock v2" });
    expect(flags.isEnabled("exec.new-dock")).toBe(true);
    expect(flags.isEnabled("unknown.flag")).toBe(false); // fail closed
    flags.setKillSwitch(true);
    expect(flags.isEnabled("exec.new-dock")).toBe(false); // incident brake
    flags.setKillSwitch(false);
    flags.override("exec.new-dock", false);
    expect(flags.isEnabled("exec.new-dock")).toBe(false);
  });
});

describe("Resources · Offline · Sync · Updates · Performance", () => {
  it("scheduler drains by priority with crash isolation; assets preload through it", async () => {
    const kernel = await bootExec();
    const scheduler = kernel.services.resolve(EXEC_TOKENS.scheduler);
    const assets = kernel.services.resolve(EXEC_TOKENS.assets);
    const ran: string[] = [];
    scheduler.schedule({ id: "low", priority: 1, run: () => void ran.push("low") });
    scheduler.schedule({
      id: "boom",
      priority: 9,
      run: () => Promise.reject(new Error("job died")),
    });
    scheduler.schedule({ id: "high", priority: 8, run: () => void ran.push("high") });
    assets.register({ id: "toroid", kind: "image", url: "/assets/toroid.png" });
    assets.preload("toroid", 5);
    const outcome = await scheduler.drain();
    expect(outcome).toMatchObject({ failed: 1 });
    expect(ran[0]).toBe("high"); // priority order despite the crash
    expect(assets.isPreloaded("toroid")).toBe(true);
    expect(kernel.state).toBe("ready");
  });

  it("cache LRU+TTL against the injected clock; capability lazy-loads exactly once", async () => {
    let now = "2026-07-24T12:00:00Z";
    const idFactory = seqIds();
    const kernel = createKernel(CONFIG, {
      idFactory,
      modules: [createExecutiveShell({ idFactory, clock: () => now })],
    });
    await kernel.boot();
    const cache = kernel.services.resolve(EXEC_TOKENS.cache);
    cache.set("kpi", { v: 1 }, 60_000);
    expect(cache.get("kpi")).toEqual({ v: 1 });
    now = "2026-07-24T12:02:00Z"; // TTL exceeded
    expect(cache.get("kpi")).toBeUndefined();
    expect(cache.stats().hits).toBe(1);

    const loader = kernel.services.resolve(EXEC_TOKENS.capabilityLoader);
    let built = 0;
    loader.register("heavy-reports", async () => ({ engine: ++built }));
    await loader.loadCapability("heavy-reports");
    await loader.loadCapability("heavy-reports");
    expect(built).toBe(1); // built once, cached
    expect(loader.loadCount("heavy-reports")).toBe(1);
  });

  it("offline queues operations; sync drains with bounded retry when back online", async () => {
    let failures = 1;
    const idFactory = seqIds();
    const kernel = createKernel(CONFIG, {
      idFactory,
      modules: [
        createExecutiveShell({
          idFactory,
          clock: () => "2026-07-24T12:00:00Z",
          syncTransport: {
            send: async () => {
              if (failures > 0) {
                failures--;
                return { ok: false };
              }
              return { ok: true };
            },
          },
        }),
      ],
    });
    await kernel.boot();
    const offline = kernel.services.resolve(EXEC_TOKENS.offline);
    const sync = kernel.services.resolve(EXEC_TOKENS.sync);
    offline.setOnline(false);
    offline.enqueue({ id: "op1", kind: "ack-alert", payload: { alertId: "a1" } });
    expect(await sync.sync()).toMatchObject({ sent: 0 }); // offline ⇒ nothing moves
    offline.setOnline(true);
    expect(await sync.sync()).toMatchObject({ sent: 0, retried: 1 }); // first attempt fails
    expect(await sync.sync()).toMatchObject({ sent: 1, retried: 0 }); // retry succeeds
    expect(offline.pending()).toHaveLength(0);
  });

  it("update manager walks idle→available→staged→applied and rolls back", async () => {
    const idFactory = seqIds();
    const kernel = createKernel(CONFIG, {
      idFactory,
      modules: [
        createExecutiveShell({
          idFactory,
          clock: () => "2026-07-24T12:00:00Z",
          updateProvider: { check: async () => ({ available: true, version: "3.1.0" }) },
        }),
      ],
    });
    await kernel.boot();
    const updates = kernel.services.resolve(EXEC_TOKENS.updates);
    expect(await updates.check()).toBe("available");
    expect(updates.stage()).toBe("staged");
    expect(updates.apply()).toBe("applied");
    expect(updates.rollback()).toBe("idle");
    expect(() => updates.apply()).toThrow(/no staged update/);
  });

  it("performance monitor measures spans into runtime metrics", async () => {
    const kernel = await bootExec();
    const perf = kernel.services.resolve(EXEC_TOKENS.perf);
    const metrics = kernel.services.resolve(EXEC_TOKENS.metrics);
    await perf.measureFn("palette-query", () => 42);
    expect(metrics.snapshot().timings["perf.palette-query"]?.count).toBe(1);
  });
});

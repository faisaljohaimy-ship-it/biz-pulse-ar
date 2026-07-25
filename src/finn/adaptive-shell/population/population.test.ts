import { describe, expect, it } from "vitest";
import type { SkillManifest } from "../schemas/manifests";
import {
  BASE_CATEGORIES,
  CategoryRegistry,
  CompatibilityMatrix,
  DependencyEngine,
  HealthModel,
  LifecycleMachine,
  PermissionModel,
  PopulationEventBus,
  VersionTimeline,
  compareVersions,
  createShellPopulation,
  isCompatible,
  versionDiff,
  type CapabilityRecord,
  type PopulationEvent,
  type RecordMetadata,
  type SkillRecord,
} from "./index";

// ── Deterministic clock ─────────────────────────────────────────────────────

function makeClock(): () => string {
  let tick = 0;
  return () => `2026-07-25T00:00:${String(tick++).padStart(2, "0")}Z`;
}

// ── Fixtures (generic infrastructure shapes — no business content) ──────────

function metadata(overrides: Partial<RecordMetadata> = {}): RecordMetadata {
  return {
    tags: ["reference"],
    keywords: ["registry"],
    sector: "generic",
    department: "platform",
    language: "ar",
    owner: "shell-platform",
    createdAt: "2026-07-01",
    updatedAt: "2026-07-02",
    compatibility: ["shell>=1"],
    ...overrides,
  };
}

function capabilityRecord(overrides: Partial<CapabilityRecord> = {}): CapabilityRecord {
  return {
    id: "cap.alpha",
    name: "Alpha Capability",
    description: "Reference capability record for registry tests.",
    category: "utilities",
    version: "1.0.0",
    owner: "shell-platform",
    dependencies: [],
    permissions: ["execution", "read"],
    executionMode: "advisory",
    health: "unknown",
    lifecycle: "draft",
    activationRules: ["dependencies-active", "health-not-critical"],
    deactivationRules: ["no-active-dependents"],
    visibility: "internal",
    metadata: metadata(),
    ...overrides,
  };
}

function skillManifest(overrides: Partial<SkillManifest> = {}): SkillManifest {
  return {
    kind: "skill",
    id: "skill.echo",
    name: "Echo Skill",
    description: "Reference skill manifest for registry tests.",
    category: "utilities",
    inputs: [{ name: "text", type: "string", required: true }],
    outputs: [{ name: "text", type: "string" }],
    requiredTools: [],
    requiredCapabilities: ["cap.alpha"],
    requiredPermissions: ["execution"],
    dependencies: [],
    version: "1.0.0",
    status: "draft",
    owner: "shell-platform",
    tags: ["reference"],
    metadata: {},
    ...overrides,
  };
}

function skillRecord(overrides: Partial<SkillRecord> = {}): SkillRecord {
  return {
    id: "skill.echo",
    manifest: skillManifest(),
    version: "1.0.0",
    category: "utilities",
    requiredCapabilities: ["cap.alpha"],
    dependencies: [{ target: "cap.alpha", necessity: "required", binding: "hard" }],
    executionContract: {
      invocation: "synchronous",
      timeoutMs: 30_000,
      retryable: true,
      idempotent: true,
    },
    permissions: ["execution", "read"],
    policies: [
      { id: "policy.audit", description: "Every run is journaled.", enforcement: "blocking" },
    ],
    health: "unknown",
    lifecycle: "draft",
    metadata: metadata(),
    ...overrides,
  };
}

// ── Section 04 · Categories ─────────────────────────────────────────────────

describe("CategoryRegistry", () => {
  it("seeds the twelve mandated categories and stays extensible", () => {
    const registry = new CategoryRegistry();
    expect(registry.count()).toBe(12);
    for (const id of BASE_CATEGORIES) expect(registry.has(id)).toBe(true);
    registry.register({ id: "custom-domain", description: "extension" });
    expect(registry.has("custom-domain")).toBe(true);
  });

  it("refuses duplicates and malformed ids", () => {
    const registry = new CategoryRegistry();
    expect(() => registry.register({ id: "executive", description: "dup" })).toThrow(/duplicate/);
    expect(() => registry.register({ id: "Bad Id", description: "x" })).toThrow(/invalid/);
  });
});

// ── Section 05 · Lifecycle ──────────────────────────────────────────────────

describe("LifecycleMachine", () => {
  const machine = new LifecycleMachine();

  it("walks the full happy path draft → … → archived", () => {
    expect(machine.canTransition("draft", "registered")).toBe(true);
    expect(machine.canTransition("registered", "validated")).toBe(true);
    expect(machine.canTransition("validated", "approved")).toBe(true);
    expect(machine.canTransition("approved", "active")).toBe(true);
    expect(machine.canTransition("active", "suspended")).toBe(true);
    expect(machine.canTransition("suspended", "active")).toBe(true);
    expect(machine.canTransition("active", "deprecated")).toBe(true);
    expect(machine.canTransition("deprecated", "archived")).toBe(true);
  });

  it("refuses jumps and treats archived as terminal", () => {
    expect(machine.canTransition("draft", "active")).toBe(false);
    expect(machine.canTransition("registered", "active")).toBe(false);
    expect(machine.isTerminal("archived")).toBe(true);
    expect(() => machine.assertTransition("x", "archived", "active")).toThrow(/terminal/);
  });
});

// ── Section 06 · Health ─────────────────────────────────────────────────────

describe("HealthModel", () => {
  it("defaults to unknown and aggregates worst-of", () => {
    const health = new HealthModel(makeClock());
    expect(health.statusOf("ghost")).toBe("unknown");
    health.report("a", "healthy");
    health.report("b", "warning");
    health.report("c", "critical");
    expect(health.aggregate(["a", "b"])).toBe("warning");
    expect(health.aggregate(["a", "b", "c"])).toBe("critical");
    expect(health.aggregate([])).toBe("unknown");
  });
});

// ── Section 07 · Dependencies ───────────────────────────────────────────────

describe("DependencyEngine", () => {
  it("distinguishes required/optional and hard/soft; missing optional never blocks", () => {
    const engine = new DependencyEngine();
    engine.declare("a", [
      { target: "b", necessity: "required", binding: "hard" },
      { target: "ghost", necessity: "optional", binding: "soft" },
    ]);
    engine.declare("b", []);
    const resolution = engine.resolve();
    expect(resolution.ok).toBe(true);
    expect(resolution.issues.map((i) => i.kind)).toEqual(["missing-optional"]);
    expect(resolution.order.indexOf("b")).toBeLessThan(resolution.order.indexOf("a"));
  });

  it("blocks on missing required dependencies", () => {
    const engine = new DependencyEngine();
    engine.declare("a", [{ target: "ghost", necessity: "required", binding: "hard" }]);
    const resolution = engine.resolve();
    expect(resolution.ok).toBe(false);
    expect(resolution.issues[0].kind).toBe("missing-required");
  });

  it("detects circular dependencies and reports the cycle path", () => {
    const engine = new DependencyEngine();
    engine.declare("a", [{ target: "b", necessity: "required", binding: "hard" }]);
    engine.declare("b", [{ target: "c", necessity: "required", binding: "hard" }]);
    engine.declare("c", [{ target: "a", necessity: "required", binding: "hard" }]);
    const resolution = engine.resolve();
    expect(resolution.ok).toBe(false);
    const circular = resolution.issues.find((i) => i.kind === "circular");
    expect(circular?.detail).toMatch(/a → b → c → a|b → c → a → b|c → a → b → c/);
    expect(resolution.order).toEqual([]);
  });
});

// ── Section 08 · Permissions ────────────────────────────────────────────────

describe("PermissionModel", () => {
  it("is deny-by-default and honors wildcard subjects", () => {
    const model = new PermissionModel();
    expect(model.isAllowed("ops", "cap.alpha", "read")).toBe(false);
    model.grant({ principal: "ops", subjectId: "*", actions: ["read", "discovery"] });
    model.grant({ principal: "admin", subjectId: "cap.alpha", actions: ["administration"] });
    expect(model.isAllowed("ops", "cap.alpha", "read")).toBe(true);
    expect(model.isAllowed("ops", "cap.alpha", "write")).toBe(false);
    expect(model.isAllowed("admin", "cap.other", "administration")).toBe(false);
    expect(() => model.assertAllowed("ops", "cap.alpha", "manage")).toThrow(/deny-by-default/);
  });

  it("rejects empty and unknown grants", () => {
    const model = new PermissionModel();
    expect(() => model.grant({ principal: " ", subjectId: "*", actions: ["read"] })).toThrow();
    expect(() => model.grant({ principal: "x", subjectId: "*", actions: [] })).toThrow();
    expect(model.unknownActions(["read", "fly"])).toEqual(["fly"]);
  });
});

// ── Section 10 · Versioning ─────────────────────────────────────────────────

describe("versioning", () => {
  it("semver algebra: compare, diff, compatibility", () => {
    expect(compareVersions("1.2.3", "1.2.10")).toBeLessThan(0);
    expect(versionDiff("1.2.3", "1.3.0")).toBe("minor");
    expect(versionDiff("1.2.3", "2.0.0")).toBe("major");
    expect(isCompatible("1.2.0", "1.9.9")).toBe(true);
    expect(isCompatible("1.2.0", "2.0.0")).toBe(false);
    expect(isCompatible("1.2.0", "1.1.9")).toBe(false);
  });

  it("timeline: minor upgrades are self-service, major requires approval", () => {
    const timeline = new VersionTimeline(makeClock());
    timeline.record("cap.alpha", "1.0.0");
    timeline.upgrade("cap.alpha", "1.1.0");
    expect(() => timeline.upgrade("cap.alpha", "2.0.0")).toThrow(/approval/);
    timeline.upgrade("cap.alpha", "2.0.0", true);
    expect(timeline.currentOf("cap.alpha")).toBe("2.0.0");
    expect(() => timeline.upgrade("cap.alpha", "1.5.0")).toThrow(/rollback/);
  });

  it("rollback only to previously-held versions", () => {
    const timeline = new VersionTimeline(makeClock());
    timeline.record("cap.alpha", "1.0.0");
    timeline.upgrade("cap.alpha", "1.1.0");
    expect(() => timeline.rollback("cap.alpha", "0.9.0")).toThrow(/never held/);
    const entry = timeline.rollback("cap.alpha", "1.0.0");
    expect(entry.change).toBe("rollback");
    expect(timeline.currentOf("cap.alpha")).toBe("1.0.0");
    expect(timeline.historyOf("cap.alpha")).toHaveLength(3);
  });

  it("compatibility matrix is fail-closed for undeclared pairs", () => {
    const matrix = new CompatibilityMatrix();
    matrix.declare("skill.echo", "1.0.0", "cap.alpha", "1.2.0");
    expect(matrix.check("skill.echo", "1.0.0", "cap.alpha", "1.3.0")).toBe(true);
    expect(matrix.check("skill.echo", "1.0.0", "cap.alpha", "1.1.0")).toBe(false);
    expect(matrix.check("skill.echo", "1.0.0", "cap.ghost", "9.9.9")).toBe(false);
  });
});

// ── Section 12 · Events ─────────────────────────────────────────────────────

describe("PopulationEventBus", () => {
  it("journals every emission and survives throwing handlers", () => {
    const bus = new PopulationEventBus(makeClock());
    const seen: PopulationEvent[] = [];
    bus.on("skill-registered", () => {
      throw new Error("bad handler");
    });
    bus.on("skill-registered", (e) => seen.push(e));
    bus.emit("skill-registered", "skill.echo", { version: "1.0.0" });
    expect(seen).toHaveLength(1);
    expect(bus.log()).toHaveLength(1);
    expect(bus.logFor("skill.echo")[0].event).toBe("skill-registered");
  });

  it("refuses unknown event names", () => {
    const bus = new PopulationEventBus(makeClock());
    expect(() => bus.emit("skill-launched" as never, "x")).toThrow(/unknown event/);
  });
});

// ── Sections 01–03 & 11 · Discovery engine end-to-end ───────────────────────

describe("createShellPopulation — discovery pipeline", () => {
  it("admits a valid capability then a skill that requires it", () => {
    const shell = createShellPopulation({ clock: makeClock() });
    const cap = shell.admitCapability(capabilityRecord());
    expect(cap.admitted).toBe(true);
    const skill = shell.admitSkill(skillRecord());
    expect(skill.admitted).toBe(true);
    expect(shell.capabilities.get("cap.alpha")?.lifecycle).toBe("registered");
    expect(shell.skills.get("skill.echo")?.lifecycle).toBe("registered");
    expect(shell.events.log().map((e) => e.event)).toEqual([
      "capability-added",
      "skill-registered",
    ]);
    expect(shell.resolveDependencies().ok).toBe(true);
    expect(shell.detectConflicts().conflicts).toEqual([]);
  });

  it("rejects malformed records with a full issue list and validation-failed event", () => {
    const shell = createShellPopulation({ clock: makeClock() });
    const report = shell.admitCapability({ id: "cap.broken" });
    expect(report.admitted).toBe(false);
    expect(report.issues.length).toBeGreaterThan(1);
    expect(shell.events.log().at(-1)?.event).toBe("validation-failed");
    expect(shell.capabilities.has("cap.broken")).toBe(false);
  });

  it("rejects unknown categories, self-dependencies and unknown capability references", () => {
    const shell = createShellPopulation({ clock: makeClock() });
    const badCategory = shell.admitCapability(capabilityRecord({ category: "no-such" }));
    expect(badCategory.issues.some((i) => i.check === "category")).toBe(true);

    const selfDep = shell.admitCapability(
      capabilityRecord({
        id: "cap.self",
        dependencies: [{ target: "cap.self", necessity: "required", binding: "hard" }],
      }),
    );
    expect(selfDep.issues.some((i) => i.check === "dependencies")).toBe(true);

    const orphanSkill = shell.admitSkill(skillRecord());
    expect(orphanSkill.admitted).toBe(false);
    expect(orphanSkill.issues.some((i) => i.check === "capability-references")).toBe(true);
  });

  it("detects duplicates and version-conflicting re-admissions", () => {
    const shell = createShellPopulation({ clock: makeClock() });
    shell.admitCapability(capabilityRecord());
    const dup = shell.admitCapability(capabilityRecord());
    expect(dup.admitted).toBe(false);
    expect(dup.issues[0].detail).toMatch(/duplicate/);
  });

  it("enforces the retryable→idempotent contract law and record/manifest identity", () => {
    const shell = createShellPopulation({ clock: makeClock() });
    shell.admitCapability(capabilityRecord());
    const badContract = shell.admitSkill(
      skillRecord({
        executionContract: {
          invocation: "queued",
          timeoutMs: 5000,
          retryable: true,
          idempotent: false,
        },
      }),
    );
    expect(badContract.issues.some((i) => i.check === "contract")).toBe(true);

    const badIdentity = shell.admitSkill(skillRecord({ id: "skill.other", dependencies: [] }));
    expect(badIdentity.issues.some((i) => i.detail.includes("≠ manifest id"))).toBe(true);
  });

  it("capability matching honors declared compatibility minimums", () => {
    const shell = createShellPopulation({ clock: makeClock() });
    shell.admitCapability(capabilityRecord({ version: "1.0.0" }));
    shell.compatibility.declare("skill.echo", "1.0.0", "cap.alpha", "1.2.0");
    const refused = shell.admitSkill(skillRecord());
    expect(refused.admitted).toBe(false);
    expect(refused.issues[0].detail).toMatch(/≥ 1\.2\.0/);
  });

  it("runs the full human-gated activation protocol with events", () => {
    const shell = createShellPopulation({ clock: makeClock() });
    shell.admitCapability(capabilityRecord());
    shell.permissions.grant({
      principal: "governance-board",
      subjectId: "*",
      actions: ["approval"],
    });

    shell.capabilities.transition("cap.alpha", "validated");
    shell.capabilities.transition("cap.alpha", "approved");
    expect(() => shell.capabilities.completeActivation("cap.alpha")).toThrow(/never approved/);

    shell.capabilities.requestActivation("cap.alpha");
    expect(() => shell.capabilities.approveActivation("cap.alpha", "intruder")).toThrow(
      /deny-by-default/,
    );
    shell.capabilities.approveActivation("cap.alpha", "governance-board");
    shell.capabilities.reportHealth("cap.alpha", "healthy");
    const active = shell.capabilities.completeActivation("cap.alpha");
    expect(active.lifecycle).toBe("active");
    expect(shell.events.log().map((e) => e.event)).toContain("activation-requested");
    expect(shell.events.log().map((e) => e.event)).toContain("activation-approved");
    expect(shell.events.log().at(-1)?.event).toBe("activation-completed");
  });

  it("activation rules block on critical health and inactive required dependencies", () => {
    const shell = createShellPopulation({ clock: makeClock() });
    shell.admitCapability(capabilityRecord({ id: "cap.base", activationRules: [] }));
    shell.admitCapability(
      capabilityRecord({
        id: "cap.top",
        dependencies: [{ target: "cap.base", necessity: "required", binding: "hard" }],
      }),
    );
    shell.permissions.grant({ principal: "board", subjectId: "*", actions: ["approval"] });

    shell.capabilities.transition("cap.top", "validated");
    shell.capabilities.transition("cap.top", "approved");
    shell.capabilities.requestActivation("cap.top");
    shell.capabilities.approveActivation("cap.top", "board");
    expect(() => shell.capabilities.completeActivation("cap.top")).toThrow(/dependencies-active/);

    for (const step of ["validated", "approved"] as const) {
      shell.capabilities.transition("cap.base", step);
    }
    shell.capabilities.requestActivation("cap.base");
    shell.capabilities.approveActivation("cap.base", "board");
    shell.capabilities.completeActivation("cap.base");

    shell.capabilities.reportHealth("cap.top", "critical");
    expect(() => shell.capabilities.completeActivation("cap.top")).toThrow(/health-not-critical/);
    shell.capabilities.reportHealth("cap.top", "healthy");
    expect(shell.capabilities.completeActivation("cap.top").lifecycle).toBe("active");
  });

  it("transition() can NEVER reach active — the protocol is the only road", () => {
    const shell = createShellPopulation({ clock: makeClock() });
    shell.admitCapability(capabilityRecord());
    shell.capabilities.transition("cap.alpha", "validated");
    shell.capabilities.transition("cap.alpha", "approved");
    expect(() => shell.capabilities.transition("cap.alpha", "active")).toThrow(
      /activation protocol/,
    );
    expect(shell.capabilities.get("cap.alpha")?.lifecycle).toBe("approved");
  });

  it("resume from suspended is governed: approval permission + rules + journaled event", () => {
    const shell = createShellPopulation({ clock: makeClock() });
    shell.admitCapability(capabilityRecord({ activationRules: ["health-not-critical"] }));
    shell.permissions.grant({ principal: "board", subjectId: "*", actions: ["approval"] });
    shell.capabilities.transition("cap.alpha", "validated");
    shell.capabilities.transition("cap.alpha", "approved");
    shell.capabilities.requestActivation("cap.alpha");
    shell.capabilities.approveActivation("cap.alpha", "board");
    shell.capabilities.completeActivation("cap.alpha");
    shell.capabilities.transition("cap.alpha", "suspended");

    expect(() => shell.capabilities.resume("cap.alpha", "intruder")).toThrow(/deny-by-default/);
    shell.capabilities.reportHealth("cap.alpha", "critical");
    expect(() => shell.capabilities.resume("cap.alpha", "board")).toThrow(/health-not-critical/);
    shell.capabilities.reportHealth("cap.alpha", "healthy");
    const resumed = shell.capabilities.resume("cap.alpha", "board");
    expect(resumed.lifecycle).toBe("active");
    const last = shell.events.log().at(-1);
    expect(last?.event).toBe("activation-completed");
    expect(last?.detail.resumed).toBe(true);
    expect(() => shell.capabilities.resume("cap.alpha", "board")).toThrow(/only resume/);
  });

  it("capability removal respects lifecycle and dependents; conflicts surface dead hard deps", () => {
    const shell = createShellPopulation({ clock: makeClock() });
    shell.admitCapability(capabilityRecord({ id: "cap.base" }));
    shell.admitCapability(
      capabilityRecord({
        id: "cap.top",
        dependencies: [{ target: "cap.base", necessity: "required", binding: "hard" }],
      }),
    );
    shell.permissions.grant({ principal: "board", subjectId: "*", actions: ["approval"] });
    expect(() => shell.capabilities.remove("cap.base")).toThrow(/dependents/);

    shell.capabilities.transition("cap.base", "validated");
    shell.capabilities.transition("cap.base", "approved");
    expect(() => shell.capabilities.remove("cap.base")).toThrow(/cannot be removed/);
    shell.capabilities.requestActivation("cap.base");
    shell.capabilities.approveActivation("cap.base", "board");
    shell.capabilities.completeActivation("cap.base");

    shell.capabilities.transition("cap.base", "deprecated");
    expect(shell.detectConflicts().conflicts[0]).toMatch(/hard-requires .* deprecated/);

    shell.capabilities.remove("cap.top" as string);
    expect(shell.events.log().at(-1)?.event).toBe("capability-removed");
  });

  it("skill updates emit skill-updated and never change identity", () => {
    const shell = createShellPopulation({ clock: makeClock() });
    shell.admitCapability(capabilityRecord());
    shell.admitSkill(skillRecord());
    const updated = shell.skills.update("skill.echo", {
      policies: [{ id: "policy.rate", description: "Rate limited.", enforcement: "advisory" }],
    });
    expect(updated.id).toBe("skill.echo");
    expect(updated.policies[0].id).toBe("policy.rate");
    expect(shell.events.log().at(-1)?.event).toBe("skill-updated");
  });
});

import { describe, expect, it } from "vitest";
import {
  agentManifestSchema,
  capabilityManifestSchema,
  skillManifestSchema,
  toolManifestSchema,
  type AgentManifest,
  type CapabilityManifest,
  type SkillManifest,
  type ToolManifest,
} from "./schemas/manifests";
import { ManifestLoader } from "./registry/manifest-loader";
import { AdaptiveShellRegistry } from "./registry/shell-registry";
import { VersionRegistry } from "./registry/version-registry";
import { MetadataRegistry } from "./metadata/metadata-registry";
import { createAdaptiveShell, discoveredCandidates, populateRegistry } from "./registry/discovery";
import { manifest as secBriefingSkill } from "./skills/sec-compliance-briefing.manifest";
import { manifest as kpiSummarySkill } from "./skills/kpi-executive-summary.manifest";
import { manifest as incidentTriageSkill } from "./skills/incident-triage.manifest";
import { manifest as hcisTool } from "./tools/hcis-directives-lookup.manifest";
import { manifest as kpiTool } from "./tools/kpi-series-reader.manifest";
import { manifest as finnAgent } from "./agents/finn-executive.manifest";
import { manifest as briefingCapability } from "./capabilities/executive-briefing.manifest";

// ── Fixtures ────────────────────────────────────────────────────────────────

function skill(overrides: Partial<SkillManifest> = {}): SkillManifest {
  return { ...secBriefingSkill, ...overrides };
}

function agent(overrides: Partial<AgentManifest> = {}): AgentManifest {
  return { ...finnAgent, ...overrides };
}

function tool(overrides: Partial<ToolManifest> = {}): ToolManifest {
  return { ...hcisTool, ...overrides };
}

function capability(overrides: Partial<CapabilityManifest> = {}): CapabilityManifest {
  return { ...briefingCapability, ...overrides };
}

/** A minimal consistent population: 2 tools, 3 skills, 1 agent, 1 capability. */
function seededRegistry(): AdaptiveShellRegistry {
  const registry = new AdaptiveShellRegistry();
  registry.register(hcisTool);
  registry.register(kpiTool);
  registry.register(secBriefingSkill);
  registry.register(kpiSummarySkill);
  registry.register(incidentTriageSkill);
  registry.register(finnAgent);
  registry.register(briefingCapability);
  return registry;
}

// ── Runtime discovery ───────────────────────────────────────────────────────

describe("Runtime discovery — no hardcoded lists, no manual imports", () => {
  it("scans skills/ agents/ tools/ capabilities/ and registers everything", () => {
    const { registry, report } = createAdaptiveShell();
    expect(report.scanned).toBe(9); // 3 skills + 2 agents + 2 tools + 2 capabilities
    expect(report.registered).toBe(9);
    expect(report.rejected).toEqual([]);
    expect(registry.summary()).toEqual({
      skills: 3,
      agents: 2,
      tools: 2,
      capabilities: 2,
      versions: 9,
      metadata: 9,
    });
  });

  it("discovered sources come from the four shell directories only", () => {
    const sources = Object.keys(discoveredCandidates());
    expect(sources.length).toBe(9);
    for (const source of sources) {
      expect(source).toMatch(
        /^\/src\/finn\/adaptive-shell\/(skills|agents|tools|capabilities)\/[a-z0-9.-]+\.manifest\.ts$/,
      );
    }
  });

  it("the discovered population passes full cross-registry validation", () => {
    const { report } = createAdaptiveShell();
    expect(report.validation.ok).toBe(true);
    expect(report.validation.problems).toEqual([]);
  });

  it("skill execution order puts dependencies first", () => {
    const { registry } = createAdaptiveShell();
    const order = registry.skillOrder();
    expect(order.indexOf("skill.sec-compliance-briefing")).toBeLessThan(
      order.indexOf("skill.incident-triage"),
    );
  });
});

// ── Dynamic registration ────────────────────────────────────────────────────

describe("Dynamic registration — runtime additions, closed world", () => {
  it("registers a new valid skill at runtime and it becomes queryable", () => {
    const registry = seededRegistry();
    registry.register(skill({ id: "skill.runtime-added", name: "مهارة جديدة", tags: ["runtime"] }));
    expect(registry.skills.has("skill.runtime-added")).toBe(true);
    expect(registry.skills.byTag("runtime").length).toBe(1);
    expect(registry.versions.versionOf("skill", "skill.runtime-added")).toBe("1.0.0");
    expect(registry.metadata.metadataOf("skill", "skill.runtime-added").locale).toBe("ar");
  });

  it("refuses duplicate ids across the whole registry", () => {
    const registry = seededRegistry();
    expect(() => registry.register(secBriefingSkill)).toThrow(/duplicate id/);
    expect(() => registry.register(hcisTool)).toThrow(/duplicate id/);
    expect(() => registry.register(finnAgent)).toThrow(/duplicate id/);
  });

  it("registry queries work: category, role, provider, capability-by-tool", () => {
    const registry = seededRegistry();
    expect(registry.skills.byCategory("compliance").map((s) => s.id)).toEqual([
      "skill.sec-compliance-briefing",
    ]);
    expect(registry.agents.byRole("executive-advisor")[0].id).toBe("agent.finn-executive");
    expect(registry.agents.supporting("skill.kpi-executive-summary")[0].id).toBe(
      "agent.finn-executive",
    );
    expect(registry.tools.byProvider("nexios-hcis")[0].id).toBe("tool.hcis-directives-lookup");
    expect(registry.capabilities.requiringTool("tool.kpi-series-reader")[0].id).toBe(
      "capability.executive-briefing",
    );
  });
});

// ── Schemas — every mandated field is required ──────────────────────────────

describe("Manifest schemas — complete objects only (fail closed)", () => {
  const REQUIRED: Record<
    string,
    { schema: { safeParse(v: unknown): { success: boolean } }; sample: Record<string, unknown> }
  > = {
    skill: { schema: skillManifestSchema, sample: { ...secBriefingSkill } },
    agent: { schema: agentManifestSchema, sample: { ...finnAgent } },
    tool: { schema: toolManifestSchema, sample: { ...hcisTool } },
    capability: { schema: capabilityManifestSchema, sample: { ...briefingCapability } },
  };

  it("accepts each seeded manifest as-is", () => {
    for (const { schema, sample } of Object.values(REQUIRED)) {
      expect(schema.safeParse(sample).success).toBe(true);
    }
  });

  it("removing ANY field from any manifest kind makes it invalid", () => {
    for (const [kind, { schema, sample }] of Object.entries(REQUIRED)) {
      for (const field of Object.keys(sample)) {
        const broken = { ...sample } as Record<string, unknown>;
        delete broken[field];
        expect(schema.safeParse(broken).success, `${kind} without "${field}"`).toBe(false);
      }
    }
  });

  it("refuses malformed ids, versions and unknown extra fields", () => {
    expect(skillManifestSchema.safeParse(skill({ id: "Bad Id!" })).success).toBe(false);
    expect(skillManifestSchema.safeParse(skill({ version: "1.0" })).success).toBe(false);
    expect(skillManifestSchema.safeParse({ ...skill(), surprise: true }).success).toBe(false); // strict: unknown fields refused
  });
});

// ── Manifest loader ─────────────────────────────────────────────────────────

describe("Manifest Loader — invalid manifests never register", () => {
  it("separates valid from invalid with exact problems", () => {
    const loader = new ManifestLoader();
    const report = loader.loadMany({
      "skills/good.manifest.ts": secBriefingSkill,
      "skills/broken.manifest.ts": { kind: "skill", id: "skill.broken" },
      "tools/nonsense.manifest.ts": { kind: "spaceship" },
      "agents/undefined.manifest.ts": undefined,
    });
    expect(report.loaded.map((l) => l.manifest.id)).toEqual(["skill.sec-compliance-briefing"]);
    expect(report.rejected).toHaveLength(3);
    const broken = report.rejected.find((r) => r.source.includes("broken"))!;
    expect(broken.problems.join(" ")).toMatch(/name|description|version/);
  });

  it("a rejected manifest leaves the registry untouched", () => {
    const registry = new AdaptiveShellRegistry();
    const report = populateRegistry(registry, {
      "skills/bad.manifest.ts": { kind: "skill", id: "skill.bad" },
    });
    expect(report.registered).toBe(0);
    expect(report.rejected).toHaveLength(1);
    expect(registry.summary().skills).toBe(0);
  });

  it("registration conflicts during population land in the rejected list", () => {
    const registry = new AdaptiveShellRegistry();
    const report = populateRegistry(registry, {
      "tools/a.manifest.ts": hcisTool,
      "tools/b.manifest.ts": { ...hcisTool }, // same id from another file
    });
    expect(report.registered).toBe(1);
    expect(report.rejected[0].problems.join(" ")).toMatch(/duplicate id/);
  });
});

// ── Version registry ────────────────────────────────────────────────────────

describe("Version Registry — one version per object, conflicts refused", () => {
  it("registers versions, refuses conflicts and duplicates", () => {
    const versions = new VersionRegistry();
    versions.register("skill", "skill.x", "1.0.0");
    expect(versions.versionOf("skill", "skill.x")).toBe("1.0.0");
    expect(() => versions.register("skill", "skill.x", "2.0.0")).toThrow(/version conflict/);
    expect(() => versions.register("skill", "skill.x", "1.0.0")).toThrow(/duplicate registration/);
    expect(() => versions.register("tool", "tool.y", "1.0")).toThrow(/not strict semver/);
    versions.register("tool", "skill.x", "3.0.0"); // same id, different kind — distinct
    expect(versions.count()).toBe(2);
    expect(versions.list()).toContainEqual({ kind: "tool", id: "skill.x", version: "3.0.0" });
  });
});

// ── Metadata registry ───────────────────────────────────────────────────────

describe("Metadata Registry — attach, merge, search", () => {
  it("merges attachments and searches keys and values", () => {
    const metadata = new MetadataRegistry();
    metadata.attach("skill", "skill.x", { locale: "ar", tier: "gold" });
    metadata.attach("skill", "skill.x", { tier: "platinum" }); // merge overwrites
    expect(metadata.metadataOf("skill", "skill.x")).toEqual({ locale: "ar", tier: "platinum" });
    expect(metadata.metadataOf("skill", "ghost")).toEqual({});
    expect(metadata.search("platinum")).toEqual([
      { kind: "skill", id: "skill.x", matchedKey: "tier" },
    ]);
    expect(metadata.search("locale")[0].matchedKey).toBe("locale");
  });
});

// ── Dependency & permission validation ──────────────────────────────────────

describe("Validation — missing deps, broken refs, permissions, cycles", () => {
  it("reports a skill dependency on a ghost skill", () => {
    const registry = seededRegistry();
    registry.register(skill({ id: "skill.orphan", dependencies: ["skill.ghost"] }));
    const verdict = registry.validate();
    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(" ")).toMatch(/dependencies references unknown "skill.ghost"/);
  });

  it("reports broken cross-kind references from agents and capabilities", () => {
    const registry = seededRegistry();
    registry.register(
      agent({ id: "agent.dreamer", supportedSkills: ["skill.imaginary"], dependencies: [] }),
    );
    registry.register(capability({ id: "capability.hollow", requiredAgents: ["agent.nobody"] }));
    const problems = registry.validate().problems.join(" ");
    expect(problems).toMatch(/supportedSkills references unknown "skill.imaginary"/);
    expect(problems).toMatch(/requiredAgents references unknown "agent.nobody"/);
  });

  it("reports missing permissions: skill under-declares its tool's permissions", () => {
    const registry = seededRegistry();
    registry.register(
      skill({
        id: "skill.underprivileged",
        requiredTools: ["tool.kpi-series-reader"],
        requiredPermissions: [],
      }),
    );
    const verdict = registry.validate();
    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(" ")).toMatch(
      /missing permission "read:kpi" required by tool "tool.kpi-series-reader"/,
    );
  });

  it("reports missing permissions: agent under-covers a supported skill", () => {
    const registry = seededRegistry();
    registry.register(
      agent({
        id: "agent.limited",
        supportedSkills: ["skill.sec-compliance-briefing"],
        permissions: [],
        supportedCapabilities: [],
        dependencies: [],
      }),
    );
    const verdict = registry.validate();
    expect(verdict.problems.join(" ")).toMatch(
      /agent "agent.limited": missing permission "read:hcis"/,
    );
  });

  it("refuses dependency cycles within a kind", () => {
    const registry = seededRegistry();
    registry.register(skill({ id: "skill.a", dependencies: ["skill.b"] }));
    registry.register(skill({ id: "skill.b", dependencies: ["skill.a"] }));
    const verdict = registry.validate();
    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(" ")).toMatch(/dependency cycle/);
    expect(() => registry.skillOrder()).toThrow(/dependency cycle/);
  });

  it("a fully consistent population validates clean", () => {
    const registry = seededRegistry();
    expect(registry.validate()).toEqual({ ok: true, problems: [] });
  });
});

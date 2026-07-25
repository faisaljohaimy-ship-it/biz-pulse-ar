import { describe, expect, it } from "vitest";
import {
  AgentBuilder,
  CapabilityBuilder,
  ConnectorBuilder,
  ManifestBuilder,
  MemoryBuilder,
  PlaybookBuilder,
  PolicyBuilder,
  PromptBuilder,
  SkillBuilder,
  TemplateBuilder,
  ToolBuilder,
  WorkflowBuilder,
} from "./builders/builders";
import {
  CapabilityValidator,
  DependencyValidator,
  ManifestValidator,
  PermissionValidator,
  RuntimeValidator,
  SchemaValidator,
  VersionValidator,
} from "./validators/validators";
import {
  generateDependencyGraph,
  generateMetadata,
  generatePackageManifest,
  generateRuntimeDescriptor,
  generateVersionInfo,
} from "./generators/generators";
import { OFFICIAL_TEMPLATES, TEMPLATE_KINDS } from "./templates/templates";
import { scaffold } from "./scaffolds/scaffolder";
import { NdkCompiler } from "./compiler/compiler";
import { createNdk } from "./runtime/ndk-runtime";
import { NdkError } from "./types";
import { AdaptiveShellRegistry } from "../registry/shell-registry";
import type { NdkArtifact } from "./schemas/extended";

const FIXED_ISO = "2026-07-24T12:00:00Z";
const fixedClock = () => FIXED_ISO;

/** A consistent tool + skill + agent trio built through the NDK. */
function trio() {
  const tool = new ToolBuilder({ id: "tool.ptw-reader", name: "قارئ التصاريح" })
    .permission("read:ptw")
    .set("inputs", [{ name: "permitId", type: "string", required: true }])
    .set("outputs", [{ name: "permit", type: "Permit" }])
    .build();
  const skill = new SkillBuilder({ id: "skill.ptw-briefing", name: "إحاطة التصاريح" })
    .requiresTool("tool.ptw-reader", "read:ptw")
    .build();
  const agent = new AgentBuilder({ id: "agent.ptw-advisor", name: "مستشار التصاريح" })
    .supports("skill.ptw-briefing", "read:ptw")
    .build();
  return { tool, skill, agent };
}

// ── Builders ────────────────────────────────────────────────────────────────

describe("NDK Builders — valid artifacts only leave a builder", () => {
  it("core builders produce schema-valid Shell manifests with coverage helpers", () => {
    const { tool, skill, agent } = trio();
    expect(tool.kind).toBe("tool");
    expect(skill.requiredTools).toEqual(["tool.ptw-reader"]);
    expect(skill.requiredPermissions).toEqual(["read:ptw"]); // covered by construction
    expect(agent.permissions).toEqual(["read:ptw"]);
    const capability = new CapabilityBuilder({ id: "capability.ptw", name: "قدرة التصاريح" })
      .requires({
        skills: ["skill.ptw-briefing"],
        tools: ["tool.ptw-reader"],
        agents: ["agent.ptw-advisor"],
      })
      .build();
    expect(capability.requiredAgents).toEqual(["agent.ptw-advisor"]);
  });

  it("an incomplete draft throws with the exact problems; tryBuild reports them", () => {
    const builder = new WorkflowBuilder({ id: "workflow.empty", name: "فارغ" }); // no steps
    expect(() => builder.build()).toThrow(NdkError);
    const result = builder.tryBuild();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.join(" ")).toMatch(/steps/);
  });

  it("extended builders: workflow, policy, prompt, memory, playbook, template", () => {
    const workflow = new WorkflowBuilder({ id: "workflow.isolation", name: "عزل الشبكة" })
      .step({ id: "brief", stepKind: "skill", skillId: "skill.ptw-briefing", note: "إحاطة أولية" })
      .step({ id: "gate", stepKind: "approval", note: "اعتماد بشري" })
      .build();
    expect(workflow.approvalRequired).toBe(true);
    expect(workflow.steps).toHaveLength(2);

    const policy = new PolicyBuilder({ id: "policy.no-export", name: "منع التصدير" })
      .denies("data.export")
      .build();
    expect(policy).toMatchObject({ effect: "deny", actions: ["data.export"] });

    const prompt = new PromptBuilder({ id: "prompt.brief", name: "قالب الإحاطة" })
      .template("أوجز حالة {{directive}} للمحطة {{station}}", "directive", "station")
      .build();
    expect(prompt.variables.sort()).toEqual(["directive", "station"]);

    const memory = new MemoryBuilder({ id: "memory.exec", name: "ذاكرة تنفيذية" })
      .set("scope", "persistent")
      .build();
    expect(memory.scope).toBe("persistent");

    const playbook = new PlaybookBuilder({
      id: "playbook.demo",
      name: "دليل العرض",
      scenario: "عرض تنفيذي",
      audience: "executive",
    })
      .play({ order: 1, title: "الافتتاح", note: "الرؤية بجملة" })
      .build();
    expect(playbook.plays[0].order).toBe(1);

    const template = new TemplateBuilder({
      id: "template.custom-skill",
      name: "قالب مهارة",
      targetKind: "skill",
    }).build();
    expect(template.targetKind).toBe("skill");
  });

  it("prompt builder refuses undeclared template variables", () => {
    const builder = new PromptBuilder({ id: "prompt.leaky", name: "ناقص" }).template(
      "أوجز {{directive}}", // declared nothing
    );
    const result = builder.tryBuild();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.join(" ")).toMatch(/undeclared variable "directive"/);
  });

  it("connector and generic manifest builders validate on build", () => {
    const connector = new ConnectorBuilder({
      id: "connector.scada",
      name: "موصل سكادا",
      provider: "nexios-ot",
    })
      .capability("capability.telemetry")
      .operation("readTags", "قراءة نقاط القياس")
      .build();
    expect(connector.operations).toHaveLength(1);

    const viaGeneric = new ManifestBuilder({ ...trio().skill, id: "skill.copy" }).build();
    expect(viaGeneric.id).toBe("skill.copy");
    expect(() => new ManifestBuilder({ kind: "skill", id: "skill.broken" }).build()).toThrow(
      /invalid draft/,
    );
  });
});

// ── Validators ──────────────────────────────────────────────────────────────

describe("NDK Validators — seven fail-closed gates", () => {
  it("schema + manifest validators accept valid and reject invalid", () => {
    const { skill } = trio();
    expect(new SchemaValidator().validate(skill).ok).toBe(true);
    expect(new SchemaValidator().validate({ kind: "skill" }).ok).toBe(false);
    expect(new ManifestValidator().validate(skill).ok).toBe(true);
    expect(
      new ManifestValidator().validate(
        new PolicyBuilder({ id: "policy.x", name: "x" }).denies("a").build(),
      ).ok,
    ).toBe(false); // policy is NDK-only, not a Shell manifest
  });

  it("version validator flags conflicts across a set", () => {
    const { skill } = trio();
    const v2 = { ...skill, version: "2.0.0" };
    const verdict = new VersionValidator().validate([skill, v2] as NdkArtifact[]);
    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(" ")).toMatch(/version conflict.*1\.0\.0 vs 2\.0\.0/);
  });

  it("dependency validator flags missing deps and cycles", () => {
    const a = new SkillBuilder({ id: "skill.a", name: "أ" }).dependsOn("skill.b").build();
    const b = new SkillBuilder({ id: "skill.b", name: "ب" }).dependsOn("skill.a").build();
    const cycle = new DependencyValidator().validate([a, b]);
    expect(cycle.ok).toBe(false);
    expect(cycle.problems.join(" ")).toMatch(/dependency cycle/);
    const missing = new DependencyValidator().validate([a]);
    expect(missing.problems.join(" ")).toMatch(/missing dependency "skill.b"/);
  });

  it("permission validator enforces tool→skill and skill→agent coverage", () => {
    const { tool } = trio();
    const uncovered = new SkillBuilder({ id: "skill.naked", name: "بلا صلاحيات" })
      .set("requiredTools", ["tool.ptw-reader"])
      .build();
    const verdict = new PermissionValidator().validate([tool, uncovered]);
    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(" ")).toMatch(/missing permission "read:ptw"/);
  });

  it("capability validator resolves references within the set", () => {
    const capability = new CapabilityBuilder({ id: "capability.lonely", name: "معزولة" })
      .requires({ skills: ["skill.ghost"] })
      .build();
    const verdict = new CapabilityValidator().validate([capability]);
    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(" ")).toMatch(/unresolved skill "skill.ghost"/);
  });

  it("runtime validator enforces entry format and enums", () => {
    const good = new RuntimeValidator().validate({
      kind: "skill",
      entry: "shell://skill/skill.x",
      isolation: "none",
      activation: "discovery",
      version: "1.0.0",
    });
    expect(good.ok).toBe(true);
    const bad = new RuntimeValidator().validate({
      kind: "skill",
      entry: "http://evil",
      isolation: "none",
      activation: "discovery",
      version: "1.0",
    });
    expect(bad.ok).toBe(false);
    expect(bad.problems).toHaveLength(2);
  });
});

// ── Generators ──────────────────────────────────────────────────────────────

describe("NDK Generators — deterministic derivation", () => {
  it("generates provenance metadata with the injected clock", () => {
    const { skill } = trio();
    const metadata = generateMetadata(skill, fixedClock);
    expect(metadata).toMatchObject({
      generatedBy: "ndk@1.0.0",
      generatedAtISO: FIXED_ISO,
      kind: "skill",
      artifactId: "skill.ptw-briefing",
      source: "ndk",
    });
  });

  it("generates runtime descriptors with kind-appropriate isolation", () => {
    const { tool, agent, skill } = trio();
    expect(generateRuntimeDescriptor(tool)).toMatchObject({
      entry: "shell://tool/tool.ptw-reader",
      isolation: "sandboxed",
    });
    expect(generateRuntimeDescriptor(agent).isolation).toBe("advisory");
    expect(generateRuntimeDescriptor(skill).isolation).toBe("none");
    expect(generateRuntimeDescriptor(agent).version).toBe("1.0.0"); // defaulted kind
  });

  it("generates dependency graphs with topological order; cycles throw", () => {
    const base = new SkillBuilder({ id: "skill.base", name: "أساس" }).build();
    const top = new SkillBuilder({ id: "skill.top", name: "قمة" }).dependsOn("skill.base").build();
    const graph = generateDependencyGraph([top, base]);
    expect(graph.edges).toEqual([{ from: "skill:skill.top", to: "skill:skill.base" }]);
    expect(graph.order.indexOf("skill:skill.base")).toBeLessThan(
      graph.order.indexOf("skill:skill.top"),
    );
    const a = new SkillBuilder({ id: "skill.a", name: "أ" }).dependsOn("skill.b").build();
    const b = new SkillBuilder({ id: "skill.b", name: "ب" }).dependsOn("skill.a").build();
    expect(() => generateDependencyGraph([a, b])).toThrow(/dependency cycle/);
  });

  it("generates version info with conflicts", () => {
    const { skill } = trio();
    const info = generateVersionInfo([skill, { ...skill, version: "3.0.0" } as NdkArtifact]);
    expect(info.versions["skill:skill.ptw-briefing"]).toBe("3.0.0");
    expect(info.conflicts).toHaveLength(1);
  });
});

// ── Templates & scaffolds ───────────────────────────────────────────────────

describe("Official templates — all ten scaffold into compilable artifacts", () => {
  it("every official template compiles clean through the NDK compiler", () => {
    const compiler = new NdkCompiler(fixedClock);
    expect(TEMPLATE_KINDS).toHaveLength(10);
    for (const kind of TEMPLATE_KINDS) {
      const artifact = scaffold(kind, {
        id: `${kind === "knowledge-pack" ? "knowledge" : kind}.demo`,
        name: `تجربة ${kind}`,
      });
      const result = compiler.compile({ artifact, documentation: `توثيق ${kind}` });
      expect(
        result.ok,
        `template "${kind}" should compile: ${!result.ok ? result.problems.join("; ") : ""}`,
      ).toBe(true);
    }
  });

  it("scaffold refuses unknown kinds and overrides that break the template", () => {
    expect(() => scaffold("starship", { id: "x.y", name: "z" })).toThrow(/no official template/);
    expect(() =>
      scaffold("skill", { id: "skill.x", name: "x" }, { version: "not-semver" }),
    ).toThrow(/broke the template/);
    const overridden = scaffold("skill", { id: "skill.x", name: "x" }, { category: "compliance" });
    expect(overridden).toMatchObject({ kind: "skill", category: "compliance" });
  });

  it("OFFICIAL_TEMPLATES covers exactly the ten mandated kinds", () => {
    expect(Object.keys(OFFICIAL_TEMPLATES).sort()).toEqual(
      [
        "agent",
        "capability",
        "connector",
        "knowledge-pack",
        "playbook",
        "plugin",
        "policy",
        "skill",
        "tool",
        "workflow",
      ].sort(),
    );
  });
});

// ── Compiler ────────────────────────────────────────────────────────────────

describe("NDK Compiler — fail-closed pipeline, complete package format", () => {
  const compiler = new NdkCompiler(fixedClock);

  it("compiles a valid artifact into a deep-frozen package with all nine fields", () => {
    const { skill, tool } = trio();
    const result = compiler.compile({ artifact: skill, documentation: "إحاطة التصاريح" }, [tool]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pkg = result.pkg;
    for (const field of [
      "manifest",
      "metadata",
      "version",
      "dependencies",
      "permissions",
      "capabilities",
      "runtimeDescriptor",
      "documentation",
      "validationResult",
    ]) {
      expect(pkg).toHaveProperty(field);
    }
    expect(pkg.version).toBe("1.0.0");
    expect(pkg.permissions).toEqual(["read:ptw"]);
    expect(pkg.runtimeDescriptor.entry).toBe("shell://skill/skill.ptw-briefing");
    expect(pkg.validationResult).toEqual({ ok: true, problems: [] });
    expect(() => {
      (pkg as { version: string }).version = "9.9.9";
    }).toThrow(TypeError); // deep-frozen
  });

  it("rejects invalid schemas, missing documentation and empty metadata", () => {
    expect(compiler.compile({ artifact: { kind: "skill" }, documentation: "x" }).ok).toBe(false);
    const { skill } = trio();
    const noDocs = compiler.compile({ artifact: skill, documentation: "  " }, [trio().tool]);
    expect(noDocs).toMatchObject({ ok: false });
    if (!noDocs.ok) expect(noDocs.problems.join(" ")).toMatch(/documentation is required/);
    const bare = { ...skill, metadata: {} };
    const noMeta = compiler.compile({ artifact: bare, documentation: "x" }, [trio().tool]);
    if (!noMeta.ok) expect(noMeta.problems.join(" ")).toMatch(/metadata is required/);
  });

  it("rejects permission gaps and dependency cycles at compile time", () => {
    const { tool } = trio();
    const uncovered = new SkillBuilder({ id: "skill.gap", name: "فجوة" })
      .set("requiredTools", ["tool.ptw-reader"])
      .build();
    const gap = compiler.compile({ artifact: uncovered, documentation: "x" }, [tool]);
    expect(gap.ok).toBe(false);
    if (!gap.ok) expect(gap.problems.join(" ")).toMatch(/missing permission/);

    const a = new SkillBuilder({ id: "skill.a", name: "أ" }).dependsOn("skill.b").build();
    const b = new SkillBuilder({ id: "skill.b", name: "ب" }).dependsOn("skill.a").build();
    const cyclic = compiler.compile({ artifact: a, documentation: "x" }, [b]);
    expect(cyclic.ok).toBe(false);
    if (!cyclic.ok) expect(cyclic.problems.join(" ")).toMatch(/dependency cycle/);
  });

  it("compileMany validates the set together and separates rejects", () => {
    const { tool, skill, agent } = trio();
    const { packages, rejected } = compiler.compileMany([
      { artifact: tool, documentation: "أداة" },
      { artifact: skill, documentation: "مهارة" },
      { artifact: agent, documentation: "وكيل" },
      { artifact: { kind: "tool", id: "tool.broken" }, documentation: "x" },
    ]);
    expect(packages).toHaveLength(3);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].index).toBe(3);
  });

  it("package manifest summaries are generated from compiled packages", () => {
    const { tool } = trio();
    const result = compiler.compile({ artifact: tool, documentation: "أداة التصاريح" });
    if (!result.ok) throw new Error("expected ok");
    expect(generatePackageManifest(result.pkg)).toEqual({
      id: "tool.ptw-reader",
      kind: "tool",
      version: "1.0.0",
      dependencies: [],
      permissions: ["read:ptw"],
      capabilities: [],
      entry: "shell://tool/tool.ptw-reader",
      documented: true,
    });
  });
});

// ── NDK Runtime + Shell integration ─────────────────────────────────────────

describe("NDK Runtime — versioned store + Shell installation", () => {
  it("installs packages versioned and discoverable; duplicates refused", () => {
    const ndk = createNdk(fixedClock);
    const { tool } = trio();
    const result = ndk.compile({ artifact: tool, documentation: "أداة" });
    if (!result.ok) throw new Error("expected ok");
    const key = ndk.install(result.pkg);
    expect(key).toBe("tool:tool.ptw-reader@1.0.0");
    expect(() => ndk.install(result.pkg)).toThrow(/already installed/);
    expect(ndk.list()).toHaveLength(1);
    expect(ndk.find("ptw")[0].id).toBe("tool.ptw-reader");
    expect(ndk.find("nothing-matches")).toEqual([]);
  });

  it("NDK-built core artifacts install into the Phase-1 Shell registry cleanly", () => {
    const ndk = createNdk(fixedClock);
    const { tool, skill, agent } = trio();
    const workflow = new WorkflowBuilder({ id: "workflow.side", name: "جانبي" })
      .step({ id: "s", stepKind: "approval", note: "اعتماد" })
      .build();
    const { packages, rejected } = ndk.compiler.compileMany([
      { artifact: tool, documentation: "أداة" },
      { artifact: skill, documentation: "مهارة" },
      { artifact: agent, documentation: "وكيل" },
      { artifact: workflow, documentation: "سير عمل" },
    ]);
    expect(rejected).toEqual([]);

    const registry = new AdaptiveShellRegistry();
    const { installed, skipped } = ndk.installIntoShell(registry, packages);
    expect([...installed].sort()).toEqual([
      "agent.ptw-advisor",
      "skill.ptw-briefing",
      "tool.ptw-reader",
    ]);
    expect(skipped).toEqual(["workflow.side"]); // extended kind stays NDK-hosted
    expect(registry.validate()).toEqual({ ok: true, problems: [] }); // Shell-compatible
    expect(registry.versions.versionOf("skill", "skill.ptw-briefing")).toBe("1.0.0");
  });

  it("scaffold → compile → shell round trip through the runtime facade", () => {
    const ndk = createNdk(fixedClock);
    const artifact = ndk.scaffold("tool", { id: "tool.scaffolded", name: "أداة مولّدة" });
    const result = ndk.compile({ artifact, documentation: "مولّدة من القالب الرسمي" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const registry = new AdaptiveShellRegistry();
    const { installed } = ndk.installIntoShell(registry, [result.pkg]);
    expect(installed).toEqual(["tool.scaffolded"]);
    expect(registry.tools.has("tool.scaffolded")).toBe(true);
  });
});

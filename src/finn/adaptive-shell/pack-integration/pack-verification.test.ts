/**
 * Install Verification (Phase 0) — the vendored packs verified against the
 * REAL files in packs/ and registered through the Shell's admission doors.
 * Every assertion here is the evidence line for the verification report.
 */
import { describe, expect, it, beforeAll } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { createShellPopulation } from "../population/discovery-engine";
import { createAgentRuntime } from "../agent-runtime/runtime";
import { ToolRegistry } from "../registry/registries";
import { integrateContentPacks, normalizeAgentId, type PackIntegrationReport } from "./index";
import type { PackAgentDescriptor, PackSkillDescriptor, PackToolDescriptor } from "./adapters";

const ROOT = process.cwd();
const SKILLS_PACK = join(ROOT, "packs/nexios-modern-skills-pack");
const AGENTS_PACK = join(ROOT, "packs/nexios-modern-agents-tools-pack");
const STACK_PACK = join(ROOT, "packs/nexios-modern-stack");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function makeClock(): () => string {
  let tick = 0;
  return () => `2026-07-25T02:00:${String(tick++ % 60).padStart(2, "0")}Z`;
}

function makeIdFactory(): (prefix: string) => string {
  const counters = new Map<string, number>();
  return (prefix) => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}-${next}`;
  };
}

/* ── Loaded once: the real vendored descriptors ─────────────────────────── */

let skills: PackSkillDescriptor[];
let agents: PackAgentDescriptor[];
let tools: PackToolDescriptor[];

beforeAll(() => {
  skills = readJson<{ skills: PackSkillDescriptor[] }>(
    join(SKILLS_PACK, "registry/skills.registry.json"),
  ).skills;
  agents = readdirSync(join(AGENTS_PACK, "agents"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<PackAgentDescriptor>(join(AGENTS_PACK, "agents", f)));
  tools = readdirSync(join(AGENTS_PACK, "tools"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<PackToolDescriptor>(join(AGENTS_PACK, "tools", f)));
});

function integrateAll(): {
  report: PackIntegrationReport;
  shell: ReturnType<typeof createShellPopulation>;
  runtime: ReturnType<typeof createAgentRuntime>;
  toolRegistry: ToolRegistry;
} {
  const shell = createShellPopulation({ clock: makeClock() });
  let tick = 0;
  const runtime = createAgentRuntime({
    clock: makeClock(),
    monotonic: () => (tick += 1),
    idFactory: makeIdFactory(),
    knownCapabilityIds: () => shell.capabilities.list().map((c) => c.id),
  });
  const toolRegistry = new ToolRegistry();
  const report = integrateContentPacks({ skills, agents, tools }, { shell, runtime, toolRegistry });
  return { report, shell, runtime, toolRegistry };
}

/* ── Phase 1 · Package discovery & inventory ────────────────────────────── */

describe("Phase 1 — package discovery", () => {
  it("all three pack directories exist with their manifests and schemas", () => {
    for (const dir of [SKILLS_PACK, AGENTS_PACK, STACK_PACK]) {
      expect(existsSync(dir), dir).toBe(true);
    }
    expect(existsSync(join(SKILLS_PACK, "PACK_MANIFEST.json"))).toBe(true);
    expect(existsSync(join(SKILLS_PACK, "schemas/skill-registry.schema.json"))).toBe(true);
    expect(existsSync(join(AGENTS_PACK, "PACK_MANIFEST.json"))).toBe(true);
    expect(existsSync(join(AGENTS_PACK, "schemas"))).toBe(true);
  });

  it("declared counts match the actual files", () => {
    const manifest = readJson<{ counts: Record<string, number> }>(
      join(AGENTS_PACK, "PACK_MANIFEST.json"),
    );
    expect(skills).toHaveLength(144);
    expect(agents).toHaveLength(manifest.counts.agents); // 72
    expect(tools).toHaveLength(manifest.counts.tools); // 180
    expect(readdirSync(join(AGENTS_PACK, "a2a/agent-cards"))).toHaveLength(72);
  });

  it("every skill folder ships its SKILL.md", () => {
    const missing = skills.filter(
      (s) => !existsSync(join(SKILLS_PACK, "skills", s.id, "SKILL.md")),
    );
    expect(missing.map((s) => s.id)).toEqual([]);
  });
});

/* ── Phases 2 & 3 · Skills + agents through the admission doors ─────────── */

describe("Phases 2–3 — registration through the shell", () => {
  it("all 144 skills admit with zero rejections and land as registered@1.0.0", () => {
    const { report, shell } = integrateAll();
    expect(report.skills.rejected).toEqual([]);
    expect(report.skills.admitted).toBe(144);
    expect(shell.skills.count()).toBe(144);
    expect(shell.skills.byLifecycle("registered")).toHaveLength(144);
    expect(shell.versions.currentOf("nx-build-executive-brief")).toBe("1.0.0");
  });

  it("all 72 agents admit with zero rejections, normalized ids, canonical id preserved", () => {
    const { report, runtime } = integrateAll();
    expect(report.agents.rejected).toEqual([]);
    expect(report.agents.admitted).toBe(72);
    expect(runtime.registry.count()).toBe(72);
    expect(runtime.registry.byLifecycle("registered")).toHaveLength(72);
    const router = runtime.registry.get(normalizeAgentId("nx_ai_model_router"))!;
    expect(router.metadata.keywords).toContain("packId:nx_ai_model_router");
  });

  it("all 180 tools register with zero rejections, disabled posture preserved", () => {
    const { report, toolRegistry } = integrateAll();
    expect(report.tools.rejected).toEqual([]);
    expect(report.tools.admitted).toBe(180);
    expect(toolRegistry.count()).toBe(180);
    expect(toolRegistry.byStatus("draft")).toHaveLength(180);
  });

  it("duplicate re-admission is refused for every kind (no silent overwrite)", () => {
    const { shell, runtime, toolRegistry } = integrateAll();
    const again = integrateContentPacks(
      { skills, agents, tools },
      { shell, runtime, toolRegistry },
    );
    expect(again.skills.admitted).toBe(0);
    expect(again.agents.admitted).toBe(0);
    expect(again.tools.admitted).toBe(0);
    expect(again.skills.rejected).toHaveLength(144);
    expect(again.agents.rejected).toHaveLength(72);
    expect(again.tools.rejected).toHaveLength(180);
  });

  it("every adapted record carries the blocking descriptor-only policy — nothing can run", () => {
    const { shell, runtime } = integrateAll();
    for (const record of [...shell.skills.list(), ...runtime.registry.list()]) {
      expect(record.policies.some((p) => p.id === "policy.descriptor-only")).toBe(true);
    }
    const decision = runtime.security.evaluatePolicies(
      runtime.registry.get("nx-ai-model-router")!.policies,
    );
    expect(decision.allowed).toBe(false);
    expect(decision.blockedBy).toContain("policy.descriptor-only");
  });
});

/* ── Phase 4 · STARK (modern stack) ─────────────────────────────────────── */

describe("Phase 4 — modern-stack (STARK) package", () => {
  const MODULES: readonly [string, RegExp][] = [
    ["evals/promptfooconfig.yaml", /redteam|tests/],
    ["ci/finn-quality.yml", /jobs:/],
    ["otel/genai.ts", /gen_ai/],
    ["mcp/MCP_STRATEGY_AR.md", /MCP/],
  ];

  it("all four modules exist, are non-empty and carry their integration markers", () => {
    for (const [file, marker] of MODULES) {
      const path = join(STACK_PACK, file);
      expect(existsSync(path), file).toBe(true);
      expect(statSync(path).size).toBeGreaterThan(0);
      expect(readFileSync(path, "utf8")).toMatch(marker);
    }
  });

  it("the CI module is NOT wired into live workflows (inert by design)", () => {
    expect(existsSync(join(ROOT, ".github/workflows/finn-quality.yml"))).toBe(false);
  });
});

/* ── Phase 5 · Registry consistency (cross-references) ──────────────────── */

describe("Phase 5 — registry consistency", () => {
  it("no duplicate ids anywhere; registries and files agree", () => {
    expect(new Set(skills.map((s) => s.id)).size).toBe(144);
    expect(new Set(agents.map((a) => a.id)).size).toBe(72);
    expect(new Set(tools.map((t) => t.id)).size).toBe(180);
    const agentsRegistry = readJson<{ agents: { id: string }[] }>(
      join(AGENTS_PACK, "registry/agents.registry.json"),
    );
    const toolsRegistry = readJson<{ tools: { id: string }[] }>(
      join(AGENTS_PACK, "registry/tools.registry.json"),
    );
    expect(new Set(agentsRegistry.agents.map((a) => a.id))).toEqual(
      new Set(agents.map((a) => a.id)),
    );
    expect(new Set(toolsRegistry.tools.map((t) => t.id))).toEqual(new Set(tools.map((t) => t.id)));
  });

  it("every binding and reference resolves (720 agent-skill + 432 skill-tool + handoffs)", () => {
    const skillIds = new Set(skills.map((s) => s.id));
    const agentIds = new Set(agents.map((a) => a.id));
    const toolIds = new Set(tools.map((t) => t.id));
    const agentSkill = readJson<{ agentId: string; skillId: string }[]>(
      join(AGENTS_PACK, "bindings/agent-skill-bindings.json"),
    );
    const skillTool = readJson<{ skillId: string; toolId: string }[]>(
      join(AGENTS_PACK, "bindings/skill-tool-bindings.json"),
    );
    expect(agentSkill).toHaveLength(720);
    expect(skillTool).toHaveLength(432);
    const broken = [
      ...agentSkill.filter((b) => !agentIds.has(b.agentId) || !skillIds.has(b.skillId)),
      ...skillTool.filter((b) => !skillIds.has(b.skillId) || !toolIds.has(b.toolId)),
      ...agents.flatMap((a) => a.skills.filter((s) => !skillIds.has(s))),
      ...agents.flatMap((a) => a.toolAllowlist.filter((t) => !toolIds.has(t))),
      ...agents.flatMap((a) => a.handoffTargets.filter((h) => !agentIds.has(h))),
      ...skills.flatMap((s) => (s.recommendedTools ?? []).filter((t) => !toolIds.has(t))),
      ...skills.flatMap((s) => (s.recommendedAgents ?? []).filter((g) => !agentIds.has(g))),
    ];
    expect(broken).toEqual([]);
  });

  it("shell-side consistency: zero conflicts, zero dependency issues, orphan skills documented", () => {
    const { shell } = integrateAll();
    expect(shell.detectConflicts().conflicts).toEqual([]);
    const resolution = shell.resolveDependencies();
    expect(resolution.ok).toBe(true);
    expect(resolution.issues).toEqual([]);
    // 84 skills ship unbound to any agent — standalone by design, documented
    const bound = new Set(
      readJson<{ skillId: string }[]>(join(AGENTS_PACK, "bindings/agent-skill-bindings.json")).map(
        (b) => b.skillId,
      ),
    );
    expect(skills.filter((s) => !bound.has(s.id))).toHaveLength(84);
  });

  it("protocol surfaces agree: 72 A2A cards, 180 MCP descriptors, 180 OpenAPI operations", () => {
    const cards = readdirSync(join(AGENTS_PACK, "a2a/agent-cards")).filter((f) =>
      f.endsWith(".json"),
    );
    expect(new Set(cards.map((f) => f.replace(/\.json$/, "")))).toEqual(
      new Set(agents.map((a) => a.id)),
    );
    const mcp = readJson<{ tools: { id?: string; name?: string }[] }>(
      join(AGENTS_PACK, "mcp/tools.registry.json"),
    );
    expect(mcp.tools).toHaveLength(180);
    const openapi = readJson<{ paths: Record<string, unknown> }>(
      join(AGENTS_PACK, "openapi/nexios-modern-tools.openapi.json"),
    );
    expect(Object.keys(openapi.paths)).toHaveLength(180);
  });
});

/* ── Phase 6 · Shell integration evidence ───────────────────────────────── */

describe("Phase 6 — shell integration evidence", () => {
  it("discovery, lifecycle, validation, versioning and events all see the packs", () => {
    const { shell, runtime, toolRegistry } = integrateAll();
    // discovery engine: admission events journaled per skill
    const skillEvents = shell.events.log().filter((e) => e.event === "skill-registered");
    expect(skillEvents).toHaveLength(144);
    // lifecycle engine: everything sits in `registered` (nothing active)
    expect(shell.skills.byLifecycle("registered")).toHaveLength(144);
    expect(runtime.registry.byLifecycle("registered")).toHaveLength(72);
    expect(shell.skills.byLifecycle("active")).toHaveLength(0);
    expect(runtime.registry.byLifecycle("ready")).toHaveLength(0);
    expect(runtime.registry.byLifecycle("running")).toHaveLength(0);
    // validation engine: zero issues across the full corpus (proven by zero rejections)
    // version engine: one timeline entry per subject
    expect(shell.versions.currentOf("nx-verify-vehicle-access")).toBe("1.0.0");
    expect(runtime.versions.currentOf("nx-crisis-response-commander")).toBe("1.0.0");
    // agent runtime audit trail recorded each admission
    expect(runtime.audit.list().filter((e) => e.action === "admission-accepted")).toHaveLength(72);
    // capability registry consistent (packs define none; references empty by design)
    expect(shell.capabilities.count()).toBe(0);
    expect(toolRegistry.count()).toBe(180);
    // categories the packs introduced are registered taxonomy, not typos
    expect(shell.categories.has("executive-strategy")).toBe(true);
    expect(runtime.categories.has("data-ai")).toBe(true);
  });
});

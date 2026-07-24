import { describe, expect, it } from "vitest";
import { AGENTS, SKILLS } from "./capabilities";
import { buildIndex, selectSkills } from "./index";

/** Structural contract: exactly 12 skills + 5 agents, no dangling refs, no
 *  collisions, catalog within the architectural limit. */
describe("FINN shell — registry contract", () => {
  const index = buildIndex();

  it("holds exactly 12 skills and 5 agents", () => {
    expect(index.counts.skills).toBe(12);
    expect(index.counts.agents).toBe(5);
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(12);
    expect(new Set(AGENTS.map((a) => a.id)).size).toBe(5);
  });

  it("carries the exact FINN skill set", () => {
    expect(new Set(index.skillIds)).toEqual(
      new Set([
        "ptw-issue",
        "ptw-verify",
        "approval-stages",
        "directive-lookup",
        "gap-analysis",
        "compliance-report",
        "emergency-triage",
        "region-ops",
        "rag-arabic",
        "tashkeel-tts",
        "doc-export",
        "audit-narrate",
      ]),
    );
  });

  it("carries the exact five agents", () => {
    expect(new Set(index.agentIds)).toEqual(
      new Set(["compliance", "ptw", "operations", "reporting", "qa-guardian"]),
    );
  });

  it("has no dangling agent→skill refs, no oversized agents, no description collisions", () => {
    expect(index.danglingRefs).toHaveLength(0);
    expect(index.oversizedAgents).toHaveLength(0);
    expect(index.descriptionCollisions).toHaveLength(0);
    expect(index.withinCatalogLimit).toBe(true);
  });

  it("every skill description is long enough for retrieval (≥ 40 chars)", () => {
    for (const s of SKILLS) expect(s.description.length).toBeGreaterThanOrEqual(40);
  });

  it("tools stay empty until a real connector exists", () => {
    for (const a of AGENTS) expect(a.toolAllowlist).toHaveLength(0);
    expect(index.counts.tools).toBe(0);
  });

  it("selects a skill for a clear task and abstains on noise", () => {
    expect(selectSkills("أصدر تصريح عمل").hits[0]?.id).toBe("ptw-issue");
    expect(selectSkills("").hits).toHaveLength(0);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const AGENTS_ROUTE = read("src/routes/_authenticated/agents.tsx");
const ROOT_ROUTE = read("src/routes/__root.tsx");
const LEGACY_FLOW_ROUTE = read("src/routes/agents-flow.tsx");
const LEGACY_REFERENCE_ROUTE = read("src/routes/agents-reference.tsx");
const AGENT_DISPLAY = read("src/lib/agents/industrial-security-display.ts");

describe("agent operations platform contract", () => {
  it("uses the canonical name and industrial-security role mapping", () => {
    expect(AGENTS_ROUTE).toContain('"منصة عمليات الوكلاء"');
    expect(AGENTS_ROUTE).toContain("industrialSecurityAgentDisplay");

    for (const role of [
      "وكيل مراقبة العمليات",
      "وكيل الحوادث والتصعيد",
      "وكيل الصيانة التنبؤية",
      "وكيل امتثال HCIS",
      "وكيل الهوية والدخول",
      "وكيل الحركة والدوريات",
      "وكيل التقارير الأمنية",
    ]) {
      expect(AGENT_DISPLAY).toContain(role);
    }
  });

  it("keeps the retired holographic tree out of the canonical page", () => {
    expect(AGENTS_ROUTE).not.toContain("AgentHierarchyGraph");
    expect(AGENTS_ROUTE).not.toContain("AgenticFlowCanvas");
    expect(AGENTS_ROUTE).not.toContain("HolographicFlowShowcase");
  });

  it("removes global portrait and map backdrops from agent operations routes", () => {
    expect(ROOT_ROUTE).toContain("const isAgentOperations");
    expect(ROOT_ROUTE).toMatch(/!isAgentOperations[\s\S]{0,120}<ArabianPeninsulaBackdrop/);
    expect(ROOT_ROUTE).toMatch(/!isAgentOperations[\s\S]{0,120}<GlobalPageBackdrop/);
    expect(ROOT_ROUTE).toContain(
      "const suppressOverlays = isPromo || isAccessGate || isAgentOperations || introActive",
    );
  });

  it("redirects retired agent-tree routes to the canonical platform", () => {
    for (const legacyRoute of [LEGACY_FLOW_ROUTE, LEGACY_REFERENCE_ROUTE]) {
      expect(legacyRoute).toContain('throw redirect({ to: "/agents" })');
      expect(legacyRoute).not.toContain("AgentHierarchyGraph");
      expect(legacyRoute).not.toContain("AgenticFlowCanvas");
    }
  });
});

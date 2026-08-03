import { test, expect } from "vitest";
test("council registers", async () => {
  const m = await import("@/lib/finn/orchestrator");
  expect(m.listAgents().map(a=>a.contract.id).sort()).toContain("planning");
});

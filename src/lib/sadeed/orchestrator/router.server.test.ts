import { describe, expect, it } from "vitest";
import { SADEED_COUNCIL_OF_TEN } from "./council";
import { planMission } from "./router.server";

describe("SADEED mission router", () => {
  it("assigns SADEED and the complete Council of Ten to every normal mission", () => {
    const plan = planMission("mission-1", "حلل وضع السلامة والأمن الصناعي عالميًا");
    const selected = plan.nodes.map((node) => node.agent_id);

    expect(selected).toEqual(["executive_brain", ...SADEED_COUNCIL_OF_TEN, "fnn"]);
    expect(new Set(selected).size).toBe(12);
    expect(plan.nodes.filter((node) => node.reason.includes("council=true"))).toHaveLength(10);
  });

  it("keeps explicit diagnostic overrides narrow while retaining SADEED as chief", () => {
    const plan = planMission("mission-2", "اختبار تشخيصي", ["knowledge", "risk"]);

    expect(plan.nodes.map((node) => node.agent_id)).toEqual([
      "executive_brain",
      "knowledge",
      "risk",
    ]);
  });
});

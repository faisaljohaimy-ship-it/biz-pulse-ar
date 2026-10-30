import { describe, expect, it } from "vitest";
import { prepareFnnPlan } from "./fnn-plan";

describe("FNN deterministic planning foundation", () => {
  it("does not prepare an unrelated task", () => {
    expect(prepareFnnPlan("كيف اطبخ الكبسة؟").status).toBe("out_of_scope");
    expect(prepareFnnPlan("").steps).toEqual([]);
  });

  it("links only supplied peer identities without copying confidential record fields", () => {
    const peer = { id: "operations", name: "العمليات", secret: "must not reach the plan" };
    const plan = prepareFnnPlan("متابعة صيانة", [peer, { id: "fnn", name: "FNN" }]);
    expect(plan.peers).toEqual([{ id: "operations", name: "العمليات" }]);
    expect(plan.workflow).toBe("maintenance_follow_up");
    expect(JSON.stringify(plan)).not.toContain(peer.secret);
  });

  it("bounds oversized input and keeps permits separate from task assignments", () => {
    expect(prepareFnnPlan("تقرير".repeat(1000)).status).toBe("out_of_scope");
    expect(prepareFnnPlan("مراجعة تصريح العمل").workflow).toBe("permit_review");
  });
});

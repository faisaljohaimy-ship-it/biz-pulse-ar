import { describe, expect, it } from "vitest";
import { fnnAgent, FNN_LINKED_SCOPES } from "./fnn";
import { prepareFnnPlan } from "./fnn-plan";

describe("FNN free automation agent", () => {
  it("prepares a bounded automation plan without a model or external side effect", async () => {
    const result = await fnnAgent.run({
      mission_id: "fnn-test",
      request: { question: "أنشئ تقرير حادث للأمن الصناعي" },
      memory: null,
      prior_results: [],
      signal: new AbortController().signal,
    });

    expect(result.ok).toBe(true);
    expect(result.agent_id).toBe("fnn");
    expect(result.contribution.automation).toMatchObject({
      workflow: "incident_triage",
      side_effects: "approval_required",
    });
    expect(result.contribution.automation?.linked_scopes).toEqual([...FNN_LINKED_SCOPES]);
    expect(result.contribution.sources).toContain("fnn:local-automation-policy");
  });

  it("does not prepare an unrelated task", () => {
    expect(prepareFnnPlan("كيف اطبخ الكبسة؟").status).toBe("out_of_scope");
    expect(prepareFnnPlan("").steps).toEqual([]);
  });

  it("honours cancellation before preparing work", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await fnnAgent.run({
      mission_id: "cancelled",
      request: { question: "تقرير بلاغ" },
      memory: null,
      prior_results: [],
      signal: controller.signal,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("cancelled");
    expect(result.contribution.automation?.steps).toEqual([]);
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

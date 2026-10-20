import { describe, expect, it } from "vitest";
import { fnnAgent, FNN_LINKED_SCOPES } from "./fnn";

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
});

import { describe, it, expect } from "vitest";
import { WorkflowDefinitionSchema, type WorkflowDefinition } from "./exec/workflow-engine.server";

describe("WorkflowDefinitionSchema", () => {
  it("accepts a minimal tool-only workflow", () => {
    const def: WorkflowDefinition = {
      start: "s1",
      steps: [
        {
          id: "s1",
          kind: "tool",
          toolId: "sql.read",
          input: { table: "sec_incidents", columns: ["id", "status"] },
        },
      ],
    };
    expect(WorkflowDefinitionSchema.parse(def)).toEqual(def);
  });

  it("accepts a condition + approval + parallel pipeline", () => {
    const def: WorkflowDefinition = {
      start: "check",
      steps: [
        {
          id: "check",
          kind: "condition",
          when: { path: "trigger.severity", equals: "critical" },
          ifTrue: "approve",
          ifFalse: "notify",
        },
        { id: "approve", kind: "approval", message: "Escalate?", next: "fanout" },
        {
          id: "fanout",
          kind: "parallel",
          branches: ["notify"],
        },
        {
          id: "notify",
          kind: "tool",
          toolId: "m365.teams.post_message",
          input: { teamId: "{{ctx.trigger.teamId}}", channelId: "x", content: "alert" },
        },
      ],
    };
    const parsed = WorkflowDefinitionSchema.parse(def);
    expect(parsed.steps).toHaveLength(4);
  });

  it("rejects an unknown step kind", () => {
    expect(() =>
      WorkflowDefinitionSchema.parse({
        start: "s1",
        steps: [{ id: "s1", kind: "magic" }],
      }),
    ).toThrow();
  });

  it("rejects a workflow with no steps", () => {
    expect(() => WorkflowDefinitionSchema.parse({ start: "s1", steps: [] })).toThrow();
  });
});

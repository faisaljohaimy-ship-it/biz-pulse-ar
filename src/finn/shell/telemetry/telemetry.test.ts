import { describe, expect, it } from "vitest";
import { buildRun, hashTask, recordRun } from "./index";

describe("FINN shell — telemetry", () => {
  it("hashes a task stably", () => {
    expect(hashTask("أصدر تصريح")).toBe(hashTask("أصدر تصريح"));
    expect(hashTask("a")).not.toBe(hashTask("b"));
  });

  it("builds a simulation-marked run row", () => {
    const run = buildRun({
      capabilityId: "ptw-issue",
      task: "أصدر تصريح",
      selectedRank: 1,
      latencyMs: 12,
      outcome: "success",
      userRole: "manager",
      region: "central",
    });
    expect(run.isSimulation).toBe(true);
    expect(run.capabilityId).toBe("ptw-issue");
    expect(run.taskHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("records without a writer as a safe no-op returning the row", async () => {
    const run = buildRun({
      capabilityId: null,
      task: "x",
      selectedRank: null,
      latencyMs: null,
      outcome: "partial",
      userRole: null,
      region: null,
    });
    await expect(recordRun(run)).resolves.toEqual(run);
  });
});

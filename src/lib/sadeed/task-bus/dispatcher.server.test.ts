// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentResult } from "../orchestrator/types";
import type { Task } from "./types";

const sim = vi.hoisted(() => ({ run: vi.fn(), registered: true }));
vi.mock("../orchestrator/registry", () => ({
  getAgent: () => (sim.registered ? { run: sim.run } : undefined),
}));
import { dispatchTask } from "./dispatcher.server";

const task: Task = {
  taskId: "local-resource-test",
  missionId: "local-mission",
  parentTaskId: null,
  agentId: "planning",
  intent: "question",
  priority: "medium",
  status: "queued",
  deadline: null,
  timeout: 100,
  createdAt: "2026-11-22T00:00:00.000Z",
  startedAt: null,
  completedAt: null,
  retryCount: 0,
  dependencies: [],
  approvalRequired: false,
  evidenceRefs: [],
  contextSignature: "",
  memoryScope: "local-mission",
  confidence: null,
  businessImpact: null,
  estimatedCost: "low",
  estimatedLatency: 10,
  payload: {},
  metadata: {},
  reasons: [],
};
const context = { request: { question: "local synthetic task" }, memory: null, priorResults: [] };
const completed: AgentResult = {
  agent_id: "planning",
  ok: true,
  status: "completed",
  contribution: { text_en: "Synthetic completed result" },
  started_at: "2026-11-22T00:00:00.000Z",
  finished_at: "2026-11-22T00:00:00.010Z",
  duration_ms: 10,
};

beforeEach(() => {
  vi.useFakeTimers();
  sim.run.mockReset();
  sim.registered = true;
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Task Bus dispatch resource boundaries", () => {
  it("settles at the task deadline even if the specialist ignores its aborted signal", async () => {
    sim.run.mockImplementation(() => new Promise(() => {}));
    const pending = dispatchTask(task, context, new AbortController().signal);
    let outcome: AgentResult | undefined;
    void pending.then((result) => {
      outcome = result;
    });
    await vi.advanceTimersByTimeAsync(task.timeout);
    expect(outcome).toMatchObject({ ok: false, status: "timeout", contribution: {} });
    expect(sim.run.mock.calls[0][0].signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not start a specialist when the parent was already cancelled", async () => {
    sim.run.mockResolvedValue(completed);
    const parent = new AbortController();
    parent.abort();
    const outcome = await dispatchTask(task, context, parent.signal);
    expect(sim.run).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ ok: false, status: "cancelled", contribution: {} });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("settles immediately on parent cancellation even if the specialist never finishes", async () => {
    sim.run.mockImplementation(() => new Promise(() => {}));
    const parent = new AbortController();
    const pending = dispatchTask(task, context, parent.signal);
    await vi.advanceTimersByTimeAsync(0);
    parent.abort();
    let outcome: AgentResult | undefined;
    void pending.then((result) => {
      outcome = result;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toMatchObject({ ok: false, status: "cancelled", contribution: {} });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("never exposes a late success after the deadline or leaves listeners attached", async () => {
    let finish!: (result: AgentResult) => void;
    sim.run.mockImplementation(
      () =>
        new Promise<AgentResult>((resolve) => {
          finish = resolve;
        }),
    );
    const parent = new AbortController();
    const removeParent = vi.spyOn(parent.signal, "removeEventListener");
    const pending = dispatchTask(task, context, parent.signal);
    await vi.advanceTimersByTimeAsync(task.timeout);
    let outcome: AgentResult | undefined;
    void pending.then((result) => {
      outcome = result;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome?.status).toBe("timeout");
    finish(completed);
    await vi.advanceTimersByTimeAsync(0);
    expect(await pending).toBe(outcome);
    expect(outcome?.contribution).toEqual({});
    const taskSignal = sim.run.mock.calls[0][0].signal as AbortSignal;
    expect(taskSignal.aborted).toBe(true);
    expect(removeParent).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves successful contributions and cleans up deadline resources", async () => {
    sim.run.mockResolvedValue(completed);
    const parent = new AbortController();
    const removeParent = vi.spyOn(parent.signal, "removeEventListener");
    expect(await dispatchTask(task, context, parent.signal)).toBe(completed);
    expect(removeParent).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retains ordinary failure and missing-agent behavior without starting other work", async () => {
    sim.run.mockRejectedValue(new Error("synthetic local failure"));
    expect(await dispatchTask(task, context, new AbortController().signal)).toMatchObject({
      ok: false,
      status: "failed",
      error: "synthetic local failure",
    });
    sim.registered = false;
    expect(await dispatchTask(task, context, new AbortController().signal)).toMatchObject({
      ok: false,
      status: "skipped",
      unavailable: true,
    });
    expect(sim.run).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

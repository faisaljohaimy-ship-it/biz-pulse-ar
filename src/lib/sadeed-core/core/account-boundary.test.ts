import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSadeedStore } from "../state/sadeed-store";
import { executiveAiOrchestrator, type OrchestratedSubmission } from "./executive-ai-orchestrator";
import { sadeedBrain } from "./sadeed-brain";
import { memoryManager } from "./memory-manager";
import { conversationIntelligence } from "./conversation-intelligence";

vi.mock("@/lib/sadeed/singletons", () => ({ assertOne: vi.fn() }));
vi.mock("../services/sadeed-service", () => ({ setPendingRouteHint: vi.fn() }));
vi.mock("./avatar-brain", () => ({ avatarBrain: { onThinking: vi.fn() } }));

beforeEach(() => {
  vi.restoreAllMocks();
  useSadeedStore.setState({
    accountScope: "account-A",
    accountRevision: 0,
    activeTurn: null,
    activeEnvelope: null,
    activeExecution: null,
  });
  conversationIntelligence.clear();
});

describe("account transition during asynchronous preparation", () => {
  it("cannot create a prior-account turn after memory recall settles", async () => {
    let release!: () => void;
    vi.spyOn(memoryManager, "recall").mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve([]);
        }),
    );
    const pending = executiveAiOrchestrator.prepare("PRIVATE-A-QUESTION");
    useSadeedStore.getState().bindAccountScope("account-B");
    conversationIntelligence.clear();
    release();
    await expect(pending).resolves.toBeNull();
    expect(useSadeedStore.getState().activeTurn).toBeNull();
    expect(useSadeedStore.getState().activeEnvelope).toBeNull();
    expect(conversationIntelligence.snapshot().currentObjective).toBeNull();
  });

  it("does not forward an old prompt to the newly bound sender, including A→B→A", async () => {
    let release!: (value: OrchestratedSubmission) => void;
    vi.spyOn(executiveAiOrchestrator, "prepare").mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const oldSender = vi.fn();
    const newSender = vi.fn();
    const unbindOld = sadeedBrain.bindSender(oldSender);
    const pending = sadeedBrain.submit("PRIVATE-A-PROMPT");
    useSadeedStore.getState().bindAccountScope("account-B");
    useSadeedStore.getState().bindAccountScope("account-A");
    const unbindNew = sadeedBrain.bindSender(newSender);
    release({ text: "PRIVATE-A-PROMPT", turn: { id: "old-turn" } } as OrchestratedSubmission);
    await pending;
    expect(oldSender).not.toHaveBeenCalled();
    expect(newSender).not.toHaveBeenCalled();
    unbindNew();
    unbindOld();
  });

  it("does not mark the new account's turn failed when a detached old sender rejects", async () => {
    const oldTurn = {
      id: "old-turn",
      startedAt: "2026-11-24T00:00:00Z",
      status: "queued",
      intent: "general",
    } as const;
    const newTurn = { ...oldTurn, id: "new-turn" };
    vi.spyOn(executiveAiOrchestrator, "prepare").mockResolvedValue({
      text: "PRIVATE-A",
      turn: oldTurn,
    } as OrchestratedSubmission);
    const fail = vi.spyOn(executiveAiOrchestrator, "failTurn");
    let rejectOld!: (error: Error) => void;
    const oldSender = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectOld = reject;
        }),
    );
    const unbindOld = sadeedBrain.bindSender(oldSender);
    useSadeedStore.getState().setActiveTurn(oldTurn);
    const pending = sadeedBrain.submit("PRIVATE-A");
    await vi.waitFor(() => expect(oldSender).toHaveBeenCalled());
    useSadeedStore.getState().bindAccountScope("account-B");
    useSadeedStore.getState().setActiveTurn(newTurn);
    const unbindNew = sadeedBrain.bindSender(vi.fn());
    rejectOld(new Error("detached request failed"));
    await expect(pending).resolves.toBeUndefined();
    expect(fail).not.toHaveBeenCalled();
    expect(useSadeedStore.getState().activeTurn).toEqual(newTurn);
    unbindNew();
    unbindOld();
  });
});

/**
 * ExecutiveAiOrchestrator — the single pipeline every ARIA request follows.
 *
 * Sequence:
 *   1. ConversationManager.beginTurn (dedupe + cancel guards)
 *   2. ContextManager.snapshot       (route/module/screen/locale)
 *   3. MemoryManager.recall          (no-op stub in Phase 1)
 *   4. AiRouter.selectHint           (published to AriaService via header)
 *   5. AriaService transport         (the actual /api/chat call)
 *   6. ResponsePipeline.finalize     (runs on stream completion)
 *
 * The orchestrator does NOT own the streaming socket — that stays with the
 * singleton `useChat` inside <AriaProvider>. It hands the caller a `sender`
 * function that the provider invokes with its bound chat instance.
 */
import { aiRouter } from "./ai-router";
import { contextManager } from "./context-manager";
import { conversationManager } from "./conversation-manager";
import { memoryManager } from "./memory-manager";
import { responsePipeline } from "./response-pipeline";
import { setPendingRouteHint } from "../services/aria-service";
import type { AriaTurn } from "../types/aria";

export interface OrchestratedSubmission {
  text: string;
  turn: AriaTurn;
}

export const executiveAiOrchestrator = {
  async prepare(text: string): Promise<OrchestratedSubmission | null> {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const context = contextManager.snapshot();
    const hint = aiRouter.selectHint(trimmed, context);

    // Phase 1: memory is a no-op. Kept in the pipeline so Phase 2 can inject.
    await memoryManager.recall(trimmed).catch(() => []);

    const turn = conversationManager.beginTurn(trimmed, hint.intent);
    if (!turn) return null; // duplicate within dedupe window

    setPendingRouteHint(hint);
    return { text: trimmed, turn };
  },
  markStreaming(turnId: string) {
    conversationManager.markStreaming(turnId);
  },
  completeTurn(turnId: string, finalText: string) {
    const scrubbed = responsePipeline.finalize(finalText);
    conversationManager.completeTurn(turnId);
    setPendingRouteHint(null);
    return scrubbed;
  },
  failTurn(turnId: string, err: unknown, locale: "ar" | "en") {
    const message = responsePipeline.formatError(err, locale);
    conversationManager.failTurn(turnId, message);
    setPendingRouteHint(null);
    return message;
  },
};

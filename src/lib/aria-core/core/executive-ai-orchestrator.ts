/**
 * ExecutiveAiOrchestrator — the single pipeline every ARIA request follows.
 *
 * Phase 2 sequence:
 *   1. ConversationManager.beginTurn        (dedupe + cancel guards)
 *   2. ContextManager.snapshot              (route/module/screen/locale)
 *   3. ContextAwareness.assess              (what ARIA sees / is missing)
 *   4. ConversationIntelligence.observePrompt (ephemeral session memory)
 *   5. ExecutiveReasoning.build             (intent, summary, evidence)
 *   6. RiskEngine.assess                    (risk level + probability/impact)
 *   7. PriorityEngine.assess                (P0..INFO band)
 *   8. DecisionEngine.propose               (recommended + alternatives)
 *   9. ConfidenceEngine.assess              (evidence-backed confidence)
 *  10. PlanningEngine.plan                  (next actions)
 *  11. MemoryManager.recall                 (no-op stub — Phase 3 wires this)
 *  12. AiRouter.selectHint                  (published to AriaService header)
 *  13. AriaService transport                (the actual /api/chat call)
 *  14. ResponsePipeline.finalize + ResponseValidator (on stream completion)
 *
 * The orchestrator does NOT own the streaming socket — that stays with the
 * singleton `useChat` inside <AriaProvider>. The Executive Envelope produced
 * pre-submit is exposed via the store so executive UI panels can read it.
 */
import { aiRouter } from "./ai-router";
import { confidenceEngine } from "./confidence-engine";
import { contextAwareness } from "./context-awareness";
import { contextManager } from "./context-manager";
import { conversationIntelligence } from "./conversation-intelligence";
import { conversationManager } from "./conversation-manager";
import { decisionEngine } from "./decision-engine";
import { executiveReasoning } from "./executive-reasoning";
import { memoryManager } from "./memory-manager";
import { planningEngine } from "./planning-engine";
import { priorityEngine } from "./priority-engine";
import { responsePipeline } from "./response-pipeline";
import { responseValidator } from "./response-validator";
import { riskEngine } from "./risk-engine";
import { setPendingRouteHint } from "../services/aria-service";
import { useAriaStore } from "../state/aria-store";
import type { AriaTurn } from "../types/aria";
import type { ExecutiveEnvelope } from "../types/executive";

export interface OrchestratedSubmission {
  text: string;
  turn: AriaTurn;
  envelope: ExecutiveEnvelope;
}

export const executiveAiOrchestrator = {
  async prepare(text: string): Promise<OrchestratedSubmission | null> {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const context = contextManager.snapshot();
    const hint = aiRouter.selectHint(trimmed, context);

    // Ephemeral session memory observation (never persisted).
    conversationIntelligence.observePrompt(trimmed);

    // Phase 1: memory is a no-op. Kept in the pipeline so Phase 3 can inject.
    await memoryManager.recall(trimmed).catch(() => []);

    const turn = conversationManager.beginTurn(trimmed, hint.intent);
    if (!turn) return null; // duplicate within dedupe window

    // ── Executive Intelligence Envelope ───────────────────────────────
    const awareness = contextAwareness.assess(context, hint.intent);
    const reasoning = executiveReasoning.build(trimmed, context, hint.intent);
    const risk = riskEngine.assess(trimmed, context);
    const priority = priorityEngine.assess(risk, hint.intent);
    const decision = decisionEngine.propose(
      risk,
      priority,
      // Confidence needs reasoning + context first — pass a provisional
      // report using awareness/reasoning so decision can gate on it.
      confidenceEngine.assess(awareness, reasoning),
    );
    const confidence = confidenceEngine.assess(awareness, reasoning);
    const nextActions = planningEngine.plan(decision, priority);

    conversationIntelligence.recordDecision(turn.id, decision);
    conversationIntelligence.recordTasks(nextActions);

    const envelope: ExecutiveEnvelope = {
      turnId: turn.id,
      intent: hint.intent,
      context: awareness,
      reasoning,
      risk,
      priority,
      decision,
      confidence,
      nextActions,
      finalAnswer: null,
      contextSnapshot: context,
      createdAt: new Date().toISOString(),
    };
    useAriaStore.getState().setActiveEnvelope(envelope);

    // ── Phase 3: Executive Execution Envelope ─────────────────────────
    const executionEnvelope = executionPlanner.plan({
      turnId: turn.id,
      intent: hint.intent,
      objective_ar: reasoning.executive_summary_ar,
      objective_en: reasoning.executive_summary_en,
      decision,
      risk,
      priority,
      confidence,
      nextActions,
    });
    useAriaStore.getState().setActiveExecution(executionEnvelope);

    setPendingRouteHint(hint);
    return { text: trimmed, turn, envelope, execution: executionEnvelope };
  },
  markStreaming(turnId: string) {
    conversationManager.markStreaming(turnId);
  },
  completeTurn(turnId: string, finalText: string) {
    const scrubbed = responsePipeline.finalize(finalText);
    const store = useAriaStore.getState();
    const envelope = store.activeEnvelope;
    const locale = envelope?.context.locale ?? "en";

    const validated = responseValidator.validate(scrubbed.text, locale);

    if (envelope && envelope.turnId === turnId) {
      store.setActiveEnvelope({ ...envelope, finalAnswer: validated.text });
    }
    conversationManager.completeTurn(turnId);
    setPendingRouteHint(null);
    return { ok: scrubbed.ok && validated.ok, text: validated.text };
  },
  failTurn(turnId: string, err: unknown, locale: "ar" | "en") {
    const message = responsePipeline.formatError(err, locale);
    conversationManager.failTurn(turnId, message);
    setPendingRouteHint(null);
    return message;
  },
  /** Read-only accessor for the current executive envelope. */
  currentEnvelope(): ExecutiveEnvelope | null {
    return useAriaStore.getState().activeEnvelope;
  },
};

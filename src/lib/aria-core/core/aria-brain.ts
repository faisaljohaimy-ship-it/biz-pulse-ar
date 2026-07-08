/**
 * ARIA Brain — the single request entry point for the entire NEXIOS OS.
 *
 * Every page, hook, and component that wants to talk to ARIA MUST go through
 * `ariaBrain.submit(...)` (via `useAria().ask(...)`). No component may call
 * OpenAI, Claude, OpenRouter, or `/api/chat` directly.
 *
 * The Brain is a pure orchestration façade — it does not own the streaming
 * socket. The provider passes it a `send` callback bound to the singleton
 * `useChat` instance; the Brain runs the orchestrator, then invokes `send`.
 */
import { executiveAiOrchestrator } from "./executive-ai-orchestrator";
import { assertOne } from "@/lib/aria/singletons";

assertOne("BRAIN", "ariaBrain@aria-core/core/aria-brain");

export type BrainSender = (text: string) => Promise<void> | void;

let boundSender: BrainSender | null = null;
let telemetryHandler: ((event: BrainEvent) => void) | null = null;

export interface BrainEvent {
  type: "submitted" | "duplicate" | "cancelled" | "failed" | "completed";
  turnId?: string;
  reason?: string;
  /** Client-observed latency from submit → completion (ms). */
  latencyMs?: number;
}

export const ariaBrain = {
  /** Called ONCE by <AriaProvider> to bind the singleton chat sender. */
  bindSender(send: BrainSender) {
    boundSender = send;
    return () => {
      if (boundSender === send) boundSender = null;
    };
  },
  /** Optional telemetry sink. Phase 2 will plug real analytics in. */
  onTelemetry(handler: ((event: BrainEvent) => void) | null) {
    telemetryHandler = handler;
  },
  emit(event: BrainEvent) {
    try {
      telemetryHandler?.(event);
    } catch {
      // telemetry must never throw into the brain
    }
  },
  /** The single request entry point. */
  async submit(text: string): Promise<void> {
    if (!boundSender) {
      // Provider not mounted — refuse silently rather than crash the app.
      // The type system + singleton README already forbid this at build time.
      console.warn("[ariaBrain] submit called before provider mount");
      return;
    }
    const submission = await executiveAiOrchestrator.prepare(text);
    if (!submission) {
      ariaBrain.emit({ type: "duplicate" });
      return;
    }
    submitStamps.set(submission.turn.id, performance.now());
    ariaBrain.emit({ type: "submitted", turnId: submission.turn.id });
    try {
      await boundSender(submission.text);
      // completion is reported by the provider on stream finish.
    } catch (err) {
      const message = executiveAiOrchestrator.failTurn(
        submission.turn.id,
        err,
        submission.turn.intent === "unknown" ? "en" : "en",
      );
      const latencyMs = takeLatency(submission.turn.id);
      ariaBrain.emit({ type: "failed", turnId: submission.turn.id, reason: message, latencyMs });
      throw err;
    }
  },
  /** Provider notifies the brain that the current stream finished. */
  reportCompletion(turnId: string, finalText: string) {
    const scrubbed = executiveAiOrchestrator.completeTurn(turnId, finalText);
    const latencyMs = takeLatency(turnId);
    ariaBrain.emit({ type: "completed", turnId, latencyMs });
    return scrubbed;
  },
  /** Provider notifies the brain that a stream failed. */
  reportFailure(turnId: string, err: unknown, locale: "ar" | "en") {
    const message = executiveAiOrchestrator.failTurn(turnId, err, locale);
    const latencyMs = takeLatency(turnId);
    ariaBrain.emit({ type: "failed", turnId, reason: message, latencyMs });
    return message;
  },
};

// Client-observed latency: submit → completion (ms). SSR-safe (Map on module).
const submitStamps = new Map<string, number>();
function takeLatency(turnId: string): number | undefined {
  const t = submitStamps.get(turnId);
  if (t === undefined) return undefined;
  submitStamps.delete(turnId);
  return Math.round(performance.now() - t);
}

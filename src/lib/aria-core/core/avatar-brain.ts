/**
 * AvatarBrain — the SINGLE avatar coordinator.
 *
 * Sits under the ARIA Brain and translates conversation/voice/navigation/
 * system signals into avatar state transitions. It owns nothing visual —
 * it only tells the state manager where to go and pushes events onto the
 * one animation queue. All rendering happens in AvatarRenderer.
 *
 * Rules:
 *   • No business logic. No LLM calls. No page-specific behavior.
 *   • Exactly ONE brain, ONE renderer, ONE queue, ONE state manager.
 *   • Never lip-sync without an active speech turn.
 *   • Never overlap animations — the queue serializes.
 */
import { attentionEngine } from "./attention-engine";
import { avatarAnimationQueue } from "./avatar-animation-queue";
import { avatarRenderer } from "./avatar-renderer";
import { avatarStateManager, type AvatarEvent, type AvatarState, type Emotion } from "./avatar-state-manager";
import { emotionEngine } from "./emotion-engine";
import { lipSyncEngine } from "./lip-sync-engine";
import type { AriaIntent } from "../types/aria";
import type { ExecutiveEnvelope } from "../types/executive";

type Source = AvatarEvent["source"];
type Priority = AvatarEvent["priority"];

const STATE_PRIORITY: Record<AvatarState, Priority> = {
  warning: "critical",
  speaking: "high",
  explaining: "high",
  listening: "medium",
  thinking: "medium",
  success: "medium",
  idle: "low",
  closed: "low",
};

class AvatarBrain {
  private started = false;

  init(): void {
    if (this.started) return;
    this.started = true;
    avatarAnimationQueue.setConsumer((ev) => {
      // Queue consumer is a no-op besides updating state — the renderer
      // pulls frames from the state manager continuously.
      void ev;
    });
    avatarRenderer.start();
  }

  shutdown(): void {
    if (!this.started) return;
    avatarRenderer.stop();
    avatarAnimationQueue.clear();
    lipSyncEngine.end();
    this.dispatch("closed", "neutral", "system", "medium");
    this.started = false;
  }

  // ── Public signal handlers (called by AriaProvider / orchestrator) ──

  onOpen(): void {
    this.init();
    this.dispatch("idle", emotionEngine.forIdle(), "system", "medium");
  }

  onClose(): void {
    this.dispatch("closed", "neutral", "system", "medium");
    lipSyncEngine.end();
  }

  onListeningStart(): void { this.dispatch("listening", "focused", "voice", "medium"); }
  onListeningEnd(): void { this.dispatch("idle", emotionEngine.forIdle(), "voice", "low"); }

  onThinking(envelope?: ExecutiveEnvelope | null): void {
    const emotion = envelope
      ? emotionEngine.fromSignals({ risk: envelope.risk.level, priority: envelope.priority.level, intent: envelope.intent })
      : "focused";
    this.dispatch("thinking", emotion, "conversation", "medium");
  }

  onSpeakingStart(turnId: string, envelope?: ExecutiveEnvelope | null): void {
    const emotion = envelope
      ? emotionEngine.fromSignals({ risk: envelope.risk.level, priority: envelope.priority.level, intent: envelope.intent })
      : "executive";
    lipSyncEngine.begin(turnId);
    this.dispatch("speaking", emotion, "conversation", "high");
  }

  pushLipAmplitude(amp: number): void { lipSyncEngine.push(amp); }

  onSpeakingEnd(turnId: string): void {
    lipSyncEngine.end(turnId);
    this.dispatch("idle", emotionEngine.forIdle(), "conversation", "low");
  }

  onExplain(targetX: number, targetY: number, label?: string): void {
    attentionEngine.focusUi(targetX, targetY, label);
    this.dispatch("explaining", "executive", "navigation", "high");
  }

  onReturnCamera(): void { attentionEngine.focusCamera(); }

  onWarning(intent?: AriaIntent): void {
    const emotion = emotionEngine.fromSignals({ risk: "high", intent });
    this.dispatch("warning", emotion, "system", "critical");
  }

  onSuccess(): void {
    this.dispatch("success", emotionEngine.forSuccess(), "conversation", "medium");
  }

  onError(): void {
    this.dispatch("warning", "critical", "system", "critical");
  }

  // ── Read-only accessors for React / tests ────────────────────────────
  getState(): AvatarState { return avatarStateManager.getState(); }
  getEmotion(): Emotion { return avatarStateManager.getEmotion(); }
  subscribe(fn: (ev: AvatarEvent) => void): () => void { return avatarStateManager.subscribe(fn); }

  private dispatch(state: AvatarState, emotion: Emotion, source: Source, priority?: Priority): void {
    const pri = priority ?? STATE_PRIORITY[state] ?? "medium";
    const ev = avatarStateManager.transition(state, emotion, source, pri);
    if (ev) avatarAnimationQueue.enqueue(ev);
  }
}

export const avatarBrain = new AvatarBrain();

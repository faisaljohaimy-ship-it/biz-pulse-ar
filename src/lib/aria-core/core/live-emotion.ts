/**
 * LiveEmotion — Phase 11 reactive emotion sync.
 *
 * Watches the ExecutiveEnvelope in the store and re-derives the avatar's
 * emotion whenever risk/priority/intent changes mid-turn. Does NOT change
 * the avatar's state (that is owned by conversation/execution animators);
 * only nudges the emotion channel.
 */
import { avatarStateManager } from "./avatar-state-manager";
import { emotionEngine } from "./emotion-engine";
import { useAriaStore } from "../state/aria-store";
import type { ExecutiveEnvelope } from "../types/executive";

class LiveEmotion {
  private unsub: (() => void) | null = null;
  private lastEnvelopeId: string | null = null;

  start(): () => void {
    if (this.unsub) return () => this.stop();
    this.unsub = useAriaStore.subscribe((s, prev) => {
      if (s.activeEnvelope !== prev.activeEnvelope) this.handle(s.activeEnvelope);
    });
    return () => this.stop();
  }

  stop(): void {
    if (this.unsub) { this.unsub(); this.unsub = null; }
    this.lastEnvelopeId = null;
  }

  private handle(env: ExecutiveEnvelope | null): void {
    if (!env) return;
    const sig = `${env.turnId}:${env.risk.level}:${env.priority.level}:${env.intent}`;
    if (sig === this.lastEnvelopeId) return;
    this.lastEnvelopeId = sig;
    const emotion = emotionEngine.fromSignals({
      risk: env.risk.level,
      priority: env.priority.level,
      intent: env.intent,
    });
    // Re-emit current state with the fresh emotion; the state machine
    // no-ops if emotion + state are unchanged.
    avatarStateManager.transition(
      avatarStateManager.getState(),
      emotion,
      "conversation",
      "medium",
    );
  }
}

export const liveEmotion = new LiveEmotion();

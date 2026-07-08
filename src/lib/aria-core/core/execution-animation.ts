/**
 * ExecutionAnimation — Phase 11 reaction layer for execution envelopes.
 *
 * When the ExecutionEnvelope changes we surface the avatar's posture:
 *   • critical risk or `denied` permission → warning transition
 *   • pending approval → concerned emotion
 *   • completed / low risk → nothing (conversation animator handles success)
 */
import { avatarBrain } from "./avatar-brain";
import { avatarStateManager } from "./avatar-state-manager";
import { useAriaStore } from "../state/aria-store";
import type { ExecutionEnvelope } from "./execution-envelope";

class ExecutionAnimation {
  private unsub: (() => void) | null = null;
  private lastKey: string | null = null;

  start(): () => void {
    if (this.unsub) return () => this.stop();
    this.unsub = useAriaStore.subscribe((s, prev) => {
      if (s.activeExecution !== prev.activeExecution) this.handle(s.activeExecution);
    });
    return () => this.stop();
  }

  stop(): void {
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }
    this.lastKey = null;
  }

  private handle(env: ExecutionEnvelope | null): void {
    if (!env) return;
    const key = `${env.turnId}:${env.permission.decision}:${env.risk.level}:${env.approval.required}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    if (env.permission.decision === "blocked" || env.risk.level === "critical") {
      avatarBrain.onWarning();
      return;
    }
    if (env.approval.required || env.risk.level === "high") {
      // Nudge emotion to "concerned" without changing state.
      avatarStateManager.transition(avatarStateManager.getState(), "concerned", "system", "medium");
    }
  }
}

export const executionAnimation = new ExecutionAnimation();

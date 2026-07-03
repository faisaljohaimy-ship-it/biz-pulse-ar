/**
 * ThinkingAnimation — Phase 11 subtle micro-motion while state === "thinking".
 *
 * Adds a slow attention "look-away" oscillation so ARIA never freezes while
 * reasoning. Does not change state or emotion; only nudges the attention
 * engine on a fixed cadence.
 */
import { attentionEngine } from "./attention-engine";
import { avatarStateManager } from "./avatar-state-manager";

class ThinkingAnimation {
  private timer: ReturnType<typeof setInterval> | null = null;
  private phase = 0;

  start(): () => void {
    if (this.timer) return () => this.stop();
    if (typeof window === "undefined") return () => {};
    this.timer = setInterval(() => this.tick(), 1600);
    return () => this.stop();
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.phase = 0;
  }

  private tick(): void {
    if (avatarStateManager.getState() !== "thinking") return;
    this.phase += 1;
    // Alternate: soft look-away → return to camera. Deterministic, not random.
    if (this.phase % 2 === 0) attentionEngine.focusCamera();
    else attentionEngine.lookAway();
  }
}

export const thinkingAnimation = new ThinkingAnimation();

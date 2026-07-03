/**
 * IdleEngine — subtle ambient parameters when no active turn is running.
 * Emits phase values a renderer can plug into sway/breathing without ever
 * freezing the avatar.
 */
class IdleEngine {
  private phase = 0;
  private lastTs = 0;

  tick(nowMs: number): { phase: number; sway: number; breath: number } {
    const dt = this.lastTs === 0 ? 16 : Math.max(1, nowMs - this.lastTs);
    this.lastTs = nowMs;
    this.phase += (dt / 1000) * 0.35;
    return {
      phase: this.phase,
      sway: Math.sin(this.phase) * 0.05,
      breath: 0.5 + 0.5 * Math.sin(this.phase * 0.6),
    };
  }

  reset(): void { this.phase = 0; this.lastTs = 0; }
}

export const idleEngine = new IdleEngine();

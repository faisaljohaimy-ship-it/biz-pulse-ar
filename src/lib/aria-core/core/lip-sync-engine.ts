/**
 * LipSyncEngine — deterministic mouth-open channel driven by an audio
 * amplitude stream. When no audio is being fed (speaking = false), the
 * channel is forced to 0 — the avatar NEVER lip-syncs without speech.
 */
class LipSyncEngine {
  private amplitude = 0;
  private active = false;
  private turnId: string | null = null;

  begin(turnId: string): void {
    this.turnId = turnId;
    this.active = true;
    this.amplitude = 0;
  }

  push(amp: number): void {
    if (!this.active) return;
    // Smoothing to avoid jitter and cartoon motion.
    const clamped = Math.max(0, Math.min(1, amp));
    this.amplitude = this.amplitude * 0.6 + clamped * 0.4;
  }

  end(turnId?: string): void {
    if (turnId && turnId !== this.turnId) return;
    this.active = false;
    this.amplitude = 0;
    this.turnId = null;
  }

  read(): number {
    return this.active ? this.amplitude : 0;
  }

  isActive(): boolean { return this.active; }
}

export const lipSyncEngine = new LipSyncEngine();

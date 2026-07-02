// Gesture Engine — spring-based one-shot gesture envelopes triggered by cues
// from the Interaction Coordinator (e.g. "accept", "explain", "reassure").

import type { HeroTick } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";

export type GestureCue = "acknowledge" | "explain" | "reassure" | "accent";

interface Envelope {
  readonly startAt: number;
  readonly peak: number;
  readonly durationMs: number;
}

const CUE_PROFILE: Record<GestureCue, { peak: number; durationMs: number }> = {
  acknowledge: { peak: 0.35, durationMs: 640 },
  explain: { peak: 0.55, durationMs: 900 },
  reassure: { peak: 0.28, durationMs: 780 },
  accent: { peak: 0.42, durationMs: 520 },
};

export class GestureEngine {
  private active: Envelope | null = null;
  private reduced = false;

  constructor(private readonly sync: HeroStateSynchronizer) {}

  setReducedMotion(r: boolean): void { this.reduced = r; }

  trigger(cue: GestureCue, now: number): void {
    if (this.reduced) return;
    const p = CUE_PROFILE[cue];
    this.active = { startAt: now, peak: p.peak, durationMs: p.durationMs };
  }

  cancel(): void { this.active = null; }

  tick(tick: HeroTick): void {
    if (!this.active) return;
    const dt = tick.t - this.active.startAt;
    if (dt >= this.active.durationMs) {
      this.active = null;
      this.sync.patch({ gesture: 0 });
      return;
    }
    // Overdamped spring: 0 → peak → 0 via sin(π·x)
    const x = dt / this.active.durationMs;
    const v = Math.sin(x * Math.PI) * this.active.peak;
    this.sync.patch({ gesture: v });
  }
}

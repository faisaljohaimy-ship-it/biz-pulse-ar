// Eye Contact Engine — maintains gentle gaze on the interaction target with
// occasional natural glance-away. Deterministic sinusoidal drift + a slow
// low-frequency wander so ARIA never stares.

import type { HeroTick, Vec2 } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";

export class EyeContactEngine {
  private target: Vec2 = { x: 0, y: 0 };
  private lastGlanceAt = 0;
  private glanceUntil = 0;
  private glanceOffset: Vec2 = { x: 0, y: 0 };
  private reduced = false;

  constructor(private readonly sync: HeroStateSynchronizer) {}

  setTarget(t: Vec2): void {
    this.target = { x: clamp(t.x, -1, 1), y: clamp(t.y, -1, 1) };
  }

  setReducedMotion(r: boolean): void { this.reduced = r; }

  tick(tick: HeroTick): void {
    const attentive = this.sync.get().presence === "listening";
    // Trigger a natural glance-away roughly every 4.5–7 seconds while idle.
    if (!attentive && !this.reduced && tick.t - this.lastGlanceAt > 4800 && tick.t > this.glanceUntil) {
      this.lastGlanceAt = tick.t;
      this.glanceUntil = tick.t + 520;
      this.glanceOffset = {
        x: (pseudo(tick.frame * 7) - 0.5) * 0.35,
        y: (pseudo(tick.frame * 11) - 0.5) * 0.20,
      };
    }
    const glancing = tick.t < this.glanceUntil && !this.reduced;
    const drift: Vec2 = this.reduced
      ? { x: 0, y: 0 }
      : { x: Math.sin(tick.t / 1600) * 0.03, y: Math.cos(tick.t / 1900) * 0.02 };
    const base = glancing ? this.glanceOffset : this.target;
    const eye: Vec2 = { x: base.x + drift.x, y: base.y + drift.y };
    // Head follows the eye at ~40% and much slower.
    const head: Vec2 = { x: eye.x * 0.4, y: eye.y * 0.35 };
    this.sync.patch({ eye, head });
  }
}

function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

// Deterministic pseudo-random in [0, 1) from an integer seed.
function pseudo(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

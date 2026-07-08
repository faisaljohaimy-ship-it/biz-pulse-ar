// Welcome Animation Engine — one-shot elegant entrance (fade + light sweep +
// gentle camera push). Fires ONLY on the first launch of a session; the
// coordinator persists the "welcomed" flag externally.

import type { HeroTick } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";
import type { HeroAudit } from "./audit";

interface Envelope {
  readonly startAt: number;
  readonly durationMs: number;
}

const DURATION_MS = 2400;

export class WelcomeAnimationEngine {
  private active: Envelope | null = null;
  private reduced = false;

  constructor(
    private readonly sync: HeroStateSynchronizer,
    private readonly audit: HeroAudit,
  ) {}

  setReducedMotion(r: boolean): void {
    this.reduced = r;
  }

  fire(now: number): void {
    if (this.active) return;
    this.active = { startAt: now, durationMs: this.reduced ? 900 : DURATION_MS };
    this.audit.append({ at: now, kind: "welcome", from: "idle", to: "playing" });
  }

  isPlaying(): boolean {
    return this.active !== null;
  }

  tick(tick: HeroTick): void {
    if (!this.active) return;
    const dt = tick.t - this.active.startAt;
    if (dt >= this.active.durationMs) {
      this.active = null;
      this.sync.patch({ glow: 0.2, cameraDolly: 0 });
      this.audit.append({ at: tick.t, kind: "welcome", from: "playing", to: "done" });
      return;
    }
    const x = dt / this.active.durationMs;
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - x, 3);
    this.sync.patch({
      glow: 0.15 + eased * 0.55,
      cameraDolly: 0.25 * (1 - eased),
    });
  }
}

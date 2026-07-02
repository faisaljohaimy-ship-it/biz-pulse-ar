// Ambient Lighting Controller — modulates the ambient glow channel so the
// scene never feels static, and boosts glow subtly when speaking/thinking.

import type { HeroTick } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";
import type { HeroAudit } from "./audit";

export class AmbientLightingController {
  private lastReport = 0;
  private lastBucket = "";
  constructor(
    private readonly sync: HeroStateSynchronizer,
    private readonly audit: HeroAudit,
  ) {}

  tick(tick: HeroTick): void {
    const s = this.sync.get();
    let boost = 0;
    if (s.presence === "speaking") boost = 0.15;
    else if (s.presence === "thinking") boost = 0.08;
    else if (s.presence === "listening") boost = 0.05;
    const target = Math.max(s.glow, Math.min(1, s.glow + boost));
    if (Math.abs(target - s.glow) > 0.001) this.sync.patch({ glow: target });
    // Emit an audit line at most once every 4 s when the bucket changes.
    if (tick.t - this.lastReport > 4000) {
      const bucket = s.presence;
      if (bucket !== this.lastBucket) {
        this.audit.append({
          at: tick.t,
          kind: "lighting",
          from: this.lastBucket || "boot",
          to: bucket,
          detail: `glow=${target.toFixed(2)}`,
        });
        this.lastBucket = bucket;
      }
      this.lastReport = tick.t;
    }
  }
}

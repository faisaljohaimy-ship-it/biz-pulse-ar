// Dynamic Camera Controller — subtle dolly bias reacting to presence.
// Only ever nudges the camera by ±0.25; the renderer decides how to apply it.

import type { HeroTick } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";
import type { HeroAudit } from "./audit";

export class DynamicCameraController {
  private current = 0;
  private target = 0;
  private lastBucket = "";
  constructor(
    private readonly sync: HeroStateSynchronizer,
    private readonly audit: HeroAudit,
  ) {}

  tick(tick: HeroTick): void {
    const s = this.sync.get();
    switch (s.presence) {
      case "listening":
        this.target = 0.14;
        break;
      case "thinking":
        this.target = -0.05;
        break;
      case "speaking":
        this.target = 0.08;
        break;
      case "welcome":
        this.target = 0.2;
        break;
      default:
        this.target = 0;
    }
    this.current = this.current + (this.target - this.current) * 0.06;
    this.sync.patch({ cameraDolly: this.current });
    if (s.presence !== this.lastBucket) {
      this.audit.append({
        at: tick.t,
        kind: "camera",
        from: this.lastBucket || "boot",
        to: s.presence,
        detail: `dolly=${this.target.toFixed(2)}`,
      });
      this.lastBucket = s.presence;
    }
  }
}

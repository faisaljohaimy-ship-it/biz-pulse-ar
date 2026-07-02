// Hero Metrics — frame timing + dropped-frame accounting.
// GPU-friendly by construction: no per-frame allocations beyond primitives.

import type { HeroTelemetry } from "./types";

export class HeroMetrics {
  private ticks = 0;
  private droppedFrames = 0;
  private lastTickAt = 0;
  private lastFrameCostMs = 0;
  private readonly targetFrameMs: number;
  private ringSum = 0;
  private readonly ring: number[] = [];
  private readonly ringCap = 60;

  constructor(targetFps = 60) {
    this.targetFrameMs = 1000 / Math.max(24, targetFps);
  }

  recordTick(now: number, costMs: number): void {
    this.ticks += 1;
    if (this.lastTickAt > 0) {
      const gap = now - this.lastTickAt;
      // Anything more than 1.5× the target budget is a dropped frame.
      if (gap > this.targetFrameMs * 1.5) {
        const dropped = Math.floor(gap / this.targetFrameMs) - 1;
        if (dropped > 0) this.droppedFrames += dropped;
      }
      this.ring.push(gap);
      this.ringSum += gap;
      if (this.ring.length > this.ringCap) {
        this.ringSum -= this.ring.shift() ?? 0;
      }
    }
    this.lastTickAt = now;
    this.lastFrameCostMs = costMs;
  }

  snapshot(now: number): HeroTelemetry {
    const avgGap = this.ring.length > 0 ? this.ringSum / this.ring.length : this.targetFrameMs;
    const fps = avgGap > 0 ? Math.min(240, Math.round(1000 / avgGap)) : 0;
    return {
      emittedAt: now,
      fps,
      frameBudgetMs: this.targetFrameMs,
      droppedFrames: this.droppedFrames,
      ticks: this.ticks,
      latencyMs: this.lastFrameCostMs,
    };
  }
}

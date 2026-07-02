// Performance guard — 60 FPS budget accounting + adaptive drop signal.
export interface PerfSnapshot {
  readonly targetFps: number;
  readonly avgFrameMs: number | null;
  readonly droppedFrames: number;
  readonly degraded: boolean;
}

export class PerformanceGuard {
  private samples: number[] = [];
  private dropped = 0;
  private budgetMs = 1000 / 60;

  record(frameMs: number): void {
    if (!Number.isFinite(frameMs) || frameMs < 0) return;
    this.samples.push(frameMs);
    if (this.samples.length > 120) this.samples.shift();
    if (frameMs > this.budgetMs * 2) this.dropped++;
  }

  snapshot(): PerfSnapshot {
    const avg = this.samples.length === 0 ? null :
      this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    return {
      targetFps: 60,
      avgFrameMs: avg === null ? null : Math.round(avg * 100) / 100,
      droppedFrames: this.dropped,
      degraded: (avg ?? 0) > this.budgetMs * 1.5,
    };
  }

  shouldDegrade(): boolean { return this.snapshot().degraded; }
}

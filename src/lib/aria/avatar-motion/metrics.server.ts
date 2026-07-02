// Motion metrics — ticks, transitions, chunk throughput.
export interface MotionMetricsSnapshot {
  readonly ticks: number;
  readonly transitions: number;
  readonly gestures: number;
  readonly chunks: number;
  readonly interruptions: number;
}

export class MotionMetrics {
  private ticks = 0;
  private transitions = 0;
  private gestures = 0;
  private chunks = 0;
  private interruptions = 0;

  recordTick(): void { this.ticks++; }
  recordTransition(): void { this.transitions++; }
  recordGesture(): void { this.gestures++; }
  recordChunk(): void { this.chunks++; }
  recordInterruption(): void { this.interruptions++; }

  snapshot(): MotionMetricsSnapshot {
    return {
      ticks: this.ticks,
      transitions: this.transitions,
      gestures: this.gestures,
      chunks: this.chunks,
      interruptions: this.interruptions,
    };
  }
}

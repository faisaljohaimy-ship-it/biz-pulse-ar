// Conversation metrics — latency + interruption counters.
export interface ConversationMetricsSnapshot {
  readonly turns: number;
  readonly interruptions: number;
  readonly avgFirstTokenMs: number | null;
  readonly avgSpeakStartMs: number | null;
  readonly errors: number;
}

export class ConversationMetrics {
  private turns = 0;
  private interruptions = 0;
  private errors = 0;
  private firstTokenSamples: number[] = [];
  private speakStartSamples: number[] = [];

  recordTurn(): void { this.turns++; }
  recordInterruption(): void { this.interruptions++; }
  recordError(): void { this.errors++; }

  recordFirstToken(ms: number): void {
    if (ms >= 0 && Number.isFinite(ms)) {
      this.firstTokenSamples.push(ms);
      if (this.firstTokenSamples.length > 200) this.firstTokenSamples.shift();
    }
  }
  recordSpeakStart(ms: number): void {
    if (ms >= 0 && Number.isFinite(ms)) {
      this.speakStartSamples.push(ms);
      if (this.speakStartSamples.length > 200) this.speakStartSamples.shift();
    }
  }

  snapshot(): ConversationMetricsSnapshot {
    return {
      turns: this.turns,
      interruptions: this.interruptions,
      errors: this.errors,
      avgFirstTokenMs: avg(this.firstTokenSamples),
      avgSpeakStartMs: avg(this.speakStartSamples),
    };
  }
}

function avg(a: number[]): number | null {
  if (a.length === 0) return null;
  let s = 0;
  for (const n of a) s += n;
  return Math.round(s / a.length);
}

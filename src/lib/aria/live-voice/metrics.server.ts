// Live voice metrics.
export interface LiveVoiceMetricsSnapshot {
  readonly sttRequests: number;
  readonly ttsRequests: number;
  readonly interruptions: number;
  readonly errors: number;
  readonly avgSttMs: number | null;
  readonly avgFirstAudioMs: number | null;
}

export class LiveVoiceMetrics {
  private stt = 0;
  private tts = 0;
  private interruptions = 0;
  private errors = 0;
  private sttSamples: number[] = [];
  private firstAudioSamples: number[] = [];

  recordStt(ms: number): void { this.stt++; this.push(this.sttSamples, ms); }
  recordTts(): void { this.tts++; }
  recordFirstAudio(ms: number): void { this.push(this.firstAudioSamples, ms); }
  recordInterruption(): void { this.interruptions++; }
  recordError(): void { this.errors++; }

  snapshot(): LiveVoiceMetricsSnapshot {
    return {
      sttRequests: this.stt,
      ttsRequests: this.tts,
      interruptions: this.interruptions,
      errors: this.errors,
      avgSttMs: avg(this.sttSamples),
      avgFirstAudioMs: avg(this.firstAudioSamples),
    };
  }

  private push(arr: number[], v: number): void {
    if (!Number.isFinite(v) || v < 0) return;
    arr.push(v);
    if (arr.length > 200) arr.shift();
  }
}

function avg(a: number[]): number | null {
  if (a.length === 0) return null;
  return Math.round(a.reduce((x, y) => x + y, 0) / a.length);
}

// Voice Activity Detection — deterministic RMS-threshold gate.
import { VadFrameSchema } from "./contracts";
import type { VadDecision, VadFrame } from "./types";

export interface VadOptions {
  readonly onsetThreshold?: number; // 0..1
  readonly offsetThreshold?: number; // 0..1
  readonly onsetHoldMs?: number;
  readonly offsetHoldMs?: number;
}

export class VadEngine {
  private speaking = false;
  private since = 0;
  private aboveSince = 0;
  private belowSince = 0;
  private readonly onset: number;
  private readonly offset: number;
  private readonly onsetHold: number;
  private readonly offsetHold: number;

  constructor(opts: VadOptions = {}) {
    this.onset = opts.onsetThreshold ?? 0.06;
    this.offset = opts.offsetThreshold ?? 0.03;
    this.onsetHold = opts.onsetHoldMs ?? 150;
    this.offsetHold = opts.offsetHoldMs ?? 600;
  }

  feed(frameInput: unknown): VadDecision {
    const frame: VadFrame = VadFrameSchema.parse(frameInput);
    if (frame.rms >= this.onset) {
      if (this.aboveSince === 0) this.aboveSince = frame.ts;
      this.belowSince = 0;
      if (!this.speaking && frame.ts - this.aboveSince >= this.onsetHold) {
        this.speaking = true;
        this.since = frame.ts;
      }
    } else if (frame.rms <= this.offset) {
      if (this.belowSince === 0) this.belowSince = frame.ts;
      this.aboveSince = 0;
      if (this.speaking && frame.ts - this.belowSince >= this.offsetHold) {
        this.speaking = false;
        this.since = frame.ts;
      }
    }
    return { speaking: this.speaking, since: this.since };
  }

  reset(): void {
    this.speaking = false;
    this.since = 0;
    this.aboveSince = 0;
    this.belowSince = 0;
  }
}

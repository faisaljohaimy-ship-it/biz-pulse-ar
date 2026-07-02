// Lip Sync Engine — deterministic mouth-open envelope driven by an
// external audio amplitude source (e.g. AnalyserNode RMS). Never fakes
// speech: if no amplitude is provided, mouth stays closed.

import type { HeroTick } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";

export type AmplitudeSource = () => number | null; // returns 0..1 or null

const ATTACK = 0.35;
const RELEASE = 0.18;

export class LipSyncEngine {
  private source: AmplitudeSource | null = null;
  private current = 0;

  constructor(private readonly sync: HeroStateSynchronizer) {}

  bindSource(source: AmplitudeSource | null): void {
    this.source = source;
    if (!source) {
      this.current = 0;
      this.sync.patch({ lip: 0 });
    }
  }

  tick(_tick: HeroTick): void {
    const amp = this.source ? this.source() : null;
    if (amp === null || amp === undefined || !Number.isFinite(amp)) {
      // No live signal → asymptote to closed. Never invent motion.
      this.current = this.current + (0 - this.current) * RELEASE;
    } else {
      const target = clamp01(amp);
      const rate = target > this.current ? ATTACK : RELEASE;
      this.current = this.current + (target - this.current) * rate;
    }
    this.sync.patch({ lip: this.current });
  }
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

// Voice Presence Engine — a low-band envelope of the same lip-sync amplitude
// used to drive the "speakingBars" channel for waveform indicators. Independent
// smoothing so the two visuals feel connected but never identical.

import type { HeroTick } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";
import type { AmplitudeSource } from "./lip-sync";

export class VoicePresenceEngine {
  private source: AmplitudeSource | null = null;
  private current = 0;
  constructor(private readonly sync: HeroStateSynchronizer) {}

  bindSource(source: AmplitudeSource | null): void {
    this.source = source;
    if (!source) this.sync.patch({ speakingBars: 0 });
  }

  tick(_tick: HeroTick): void {
    const s = this.sync.get();
    if (s.presence !== "speaking") {
      this.current = this.current * 0.75;
      this.sync.patch({ speakingBars: this.current });
      return;
    }
    const amp = this.source ? this.source() : null;
    const target = amp !== null && amp !== undefined && Number.isFinite(amp)
      ? Math.min(1, Math.max(0, amp))
      : 0;
    // Slower attack than lip so bars feel like breath, not lips
    this.current = this.current + (target - this.current) * 0.22;
    this.sync.patch({ speakingBars: this.current });
  }
}

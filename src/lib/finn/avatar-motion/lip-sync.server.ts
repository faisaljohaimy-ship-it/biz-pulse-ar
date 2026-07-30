// Lip-sync engine — text-length + amplitude driven mouth channel.
// Never fabricates speech; if no chunk is active, lip returns 0.
import { getLipSyncProfile } from "../avatar-identity/lip-sync-profile.server";
import type { MotionTick, SpeechChunkInput } from "./types";

interface ActiveChunk {
  readonly startMs: number;
  readonly durationMs: number;
  readonly amplitude: number;
  readonly closures: number;
}

export class LipSyncEngine {
  private active: ActiveChunk | null = null;
  private value = 0;

  enqueue(chunk: SpeechChunkInput, nowMs: number): void {
    const amp = typeof chunk.amplitude === "number" ? chunk.amplitude : 0.6;
    const closures = Math.max(1, Math.round(chunk.text.replace(/\s+/g, "").length / 2));
    this.active = {
      startMs: nowMs,
      durationMs: Math.max(1, chunk.durationMs),
      amplitude: amp,
      closures,
    };
  }

  clear(): void {
    this.active = null;
    this.value = 0;
  }

  tick(tick: MotionTick): number {
    if (!this.active) {
      this.value *= 0.5;
      return this.value;
    }
    const t = (tick.nowMs - this.active.startMs) / this.active.durationMs;
    if (t >= 1) {
      this.active = null;
      this.value *= 0.5;
      return this.value;
    }
    const profile = getLipSyncProfile();
    // deterministic viseme oscillation: N closures over the chunk
    const phase = t * this.active.closures * Math.PI * 2;
    const raw = (0.5 + 0.5 * Math.sin(phase)) * this.active.amplitude;
    const target = Math.max(
      profile.closure_threshold * 0.5,
      Math.min(1 - profile.overshoot_max, raw),
    );
    // low-pass to respect identity's max_delta_per_frame for lip channel
    this.value += (target - this.value) * (tick.reducedMotion ? 0.15 : 0.35);
    return this.value;
  }
}

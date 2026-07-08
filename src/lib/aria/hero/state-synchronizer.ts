// State Synchronizer — deterministic single source of truth for hero channels.
// Every engine writes into named channels; components read the merged snapshot.

import type { Emotion, HeroAvatarSample, PresenceMode, Vec2 } from "./types";

const ZERO_VEC: Vec2 = { x: 0, y: 0 };

export interface HeroChannelPatch {
  presence?: PresenceMode;
  emotion?: Emotion;
  breath?: number;
  blink?: number;
  eye?: Vec2;
  head?: Vec2;
  lip?: number;
  gesture?: number;
  glow?: number;
  listeningRing?: number;
  thinkingHalo?: number;
  speakingBars?: number;
  cameraDolly?: number;
}

export class HeroStateSynchronizer {
  private sample: HeroAvatarSample = {
    presence: "boot",
    emotion: "neutral",
    breath: 0,
    blink: 0,
    eye: ZERO_VEC,
    head: ZERO_VEC,
    lip: 0,
    gesture: 0,
    glow: 0,
    listeningRing: 0,
    thinkingHalo: 0,
    speakingBars: 0,
    cameraDolly: 0,
  };
  private listeners = new Set<(s: HeroAvatarSample) => void>();

  get(): HeroAvatarSample {
    return this.sample;
  }

  patch(p: HeroChannelPatch): HeroAvatarSample {
    if (
      p.presence === undefined &&
      p.emotion === undefined &&
      p.breath === undefined &&
      p.blink === undefined &&
      p.eye === undefined &&
      p.head === undefined &&
      p.lip === undefined &&
      p.gesture === undefined &&
      p.glow === undefined &&
      p.listeningRing === undefined &&
      p.thinkingHalo === undefined &&
      p.speakingBars === undefined &&
      p.cameraDolly === undefined
    )
      return this.sample;
    this.sample = {
      presence: p.presence ?? this.sample.presence,
      emotion: p.emotion ?? this.sample.emotion,
      breath: clamp01(p.breath ?? this.sample.breath),
      blink: clamp01(p.blink ?? this.sample.blink),
      eye: p.eye ?? this.sample.eye,
      head: p.head ?? this.sample.head,
      lip: clamp01(p.lip ?? this.sample.lip),
      gesture: clamp01(p.gesture ?? this.sample.gesture),
      glow: clamp01(p.glow ?? this.sample.glow),
      listeningRing: clamp01(p.listeningRing ?? this.sample.listeningRing),
      thinkingHalo: clamp01(p.thinkingHalo ?? this.sample.thinkingHalo),
      speakingBars: clamp01(p.speakingBars ?? this.sample.speakingBars),
      cameraDolly: clampBipolar(p.cameraDolly ?? this.sample.cameraDolly),
    };
    for (const l of this.listeners) {
      try {
        l(this.sample);
      } catch {
        /* isolated */
      }
    }
    return this.sample;
  }

  subscribe(l: (s: HeroAvatarSample) => void): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function clampBipolar(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < -1) return -1;
  if (n > 1) return 1;
  return n;
}

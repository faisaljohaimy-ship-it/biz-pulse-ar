// Phase 11.0 — Hero Experience Engine: shared types.
// Additive presentation-only layer. No dependencies on Brain/Memory/Runtime.

export type PresenceMode =
  | "boot"
  | "welcome"
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "paused";

export type Emotion =
  | "neutral"
  | "attentive"
  | "warm"
  | "focused"
  | "concerned"
  | "confident";

export type ExpressionIntensity = "subtle" | "gentle" | "assertive";

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface HeroTick {
  /** Monotonic frame timestamp in milliseconds. */
  readonly t: number;
  /** Time delta since previous tick, clamped to [0, 100] ms. */
  readonly dt: number;
  /** Frame index since scheduler start. */
  readonly frame: number;
}

export interface HeroReducedMotion {
  readonly enabled: boolean;
  readonly source: "user" | "system" | "auto";
}

/** Snapshot of one animation channel at a tick. All values are ∈ [0, 1] unless noted. */
export interface ChannelSample {
  readonly value: number;
  readonly at: number;
}

export interface HeroAvatarSample {
  readonly presence: PresenceMode;
  readonly emotion: Emotion;
  readonly breath: number; // 0..1 chest/shoulder expansion
  readonly blink: number; // 0 open .. 1 closed
  readonly eye: Vec2; // gaze offset in normalized [-1, 1]
  readonly head: Vec2; // yaw/pitch normalized [-1, 1]
  readonly lip: number; // mouth openness 0..1
  readonly gesture: number; // 0 rest .. 1 gesture peak
  readonly glow: number; // ambient rim glow 0..1
  readonly listeningRing: number; // 0..1 listening indicator strength
  readonly thinkingHalo: number; // 0..1 thinking halo strength
  readonly speakingBars: number; // 0..1 speaking waveform envelope
  readonly cameraDolly: number; // -1 pull .. +1 push
}

export interface HeroTelemetry {
  readonly emittedAt: number;
  readonly fps: number;
  readonly frameBudgetMs: number;
  readonly droppedFrames: number;
  readonly ticks: number;
  readonly latencyMs: number;
}

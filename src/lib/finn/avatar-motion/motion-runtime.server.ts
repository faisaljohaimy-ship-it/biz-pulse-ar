// Motion runtime — orchestrates all engines into a single MotionSample stream.
// Consumers call tick(nowMs) each frame and read getSample().
import { clampChannelDelta } from "../avatar-identity/animation-profile.server";
import { MotionStateMachine } from "./animation-state.server";
import { IdleEngine } from "./idle.server";
import { BlinkEngine } from "./blink.server";
import { EyeContactEngine } from "./eye-contact.server";
import { BreathingEngine } from "./breathing.server";
import { HeadMotionEngine } from "./head-motion.server";
import { HandGestureEngine } from "./hand-gesture.server";
import { ExpressionEngine } from "./expression.server";
import { LipSyncEngine } from "./lip-sync.server";
import { SpeechSyncCoordinator } from "./speech-sync.server";
import { EmotionSync } from "./emotion-sync.server";
import { ease, clamp01, clampBipolar } from "./transition.server";
import { PerformanceGuard } from "./performance.server";
import { MotionAudit } from "./audit.server";
import { MotionMetrics } from "./metrics.server";
import type { EmotionCue, MotionSample, MotionState, MotionTick, SpeechChunkInput } from "./types";

const STATE_GLOW: Record<MotionState, number> = {
  idle: 0.3,
  greeting: 0.7,
  listening: 0.55,
  thinking: 0.75,
  speaking: 0.85,
  explaining: 0.75,
  interrupted: 0.4,
  warning: 0.7,
  success: 0.65,
  error: 0.6,
};

export interface MotionRuntimeOptions {
  readonly reducedMotion?: boolean;
}

export class MotionRuntime {
  readonly fsm = new MotionStateMachine();
  readonly expression = new ExpressionEngine();
  readonly audit = new MotionAudit();
  readonly metrics = new MotionMetrics();
  readonly perf = new PerformanceGuard();

  private idle = new IdleEngine();
  private blink = new BlinkEngine();
  private eyes = new EyeContactEngine();
  private breath = new BreathingEngine();
  private head = new HeadMotionEngine();
  private hand = new HandGestureEngine();
  private lip = new LipSyncEngine();
  private speech = new SpeechSyncCoordinator(this.lip);
  private emotion = new EmotionSync(this.expression);

  private sample: MotionSample = {
    state: "idle",
    emotion: "confident",
    breath: 0,
    blink: 0,
    gazeX: 0,
    gazeY: 0,
    headYaw: 0,
    headPitch: 0,
    gesture: 0,
    gestureId: null,
    lip: 0,
    glow: STATE_GLOW.idle,
    ts: 0,
  };
  private lastNow = 0;
  private reducedMotion: boolean;

  constructor(opts: MotionRuntimeOptions = {}) {
    this.reducedMotion = !!opts.reducedMotion;
    this.fsm.subscribe(() => {
      this.metrics.recordTransition();
    });
  }

  setReducedMotion(v: boolean): void {
    this.reducedMotion = v;
  }

  transition(to: MotionState): boolean {
    const ok = this.fsm.transition(to);
    if (ok) this.audit.log("state_transition", { to });
    if (to === "interrupted") {
      this.speech.abort();
      this.hand.cancel();
      this.metrics.recordInterruption();
    }
    return ok;
  }

  triggerGesture(id: string): void {
    this.hand.trigger(id);
    this.audit.log("gesture_trigger", { id });
    this.metrics.recordGesture();
  }

  pushSpeechChunk(chunk: SpeechChunkInput): void {
    this.speech.push(chunk, this.lastNow || Date.now());
    this.audit.log("chunk_enqueued", { seq: chunk.seq, turnId: chunk.turnId });
    this.metrics.recordChunk();
  }

  applyEmotionCue(cue: EmotionCue): void {
    this.emotion.applyCue(cue);
    this.audit.log("emotion_cue", { emotion: cue.emotion, intensity: cue.intensity });
  }

  setGazeTarget(x: number, y: number): void {
    this.eyes.setTarget(x, y);
  }

  tick(nowMs: number = Date.now()): MotionSample {
    const dtMs = this.lastNow === 0 ? 16 : Math.max(1, nowMs - this.lastNow);
    const tick: MotionTick = { nowMs, dtMs, reducedMotion: this.reducedMotion };
    const state = this.fsm.current;
    this.emotion.syncTo(state, nowMs);
    this.speech.tick(nowMs);

    const idleSway = this.idle.tick(tick);
    const headOff = this.head.tick(tick, state);
    const gaze = this.eyes.tick(tick, state);
    const gest = this.hand.tick(tick);
    const nextBreath = this.breath.tick(tick, state);
    const nextBlink = this.blink.tick(tick);
    const nextLip = this.lip.tick(tick);
    const glowTarget = STATE_GLOW[state];
    const glowNext = ease(this.sample.glow, glowTarget, dtMs, 200);

    const prev = this.sample;
    const next: MotionSample = {
      state,
      emotion: this.expression.emotion,
      breath: clamp01(clampChannelDelta("breath", prev.breath, nextBreath)),
      blink: clamp01(clampChannelDelta("blink", prev.blink, nextBlink)),
      gazeX: clampBipolar(clampChannelDelta("gaze", prev.gazeX, gaze.gazeX)),
      gazeY: clampBipolar(clampChannelDelta("gaze", prev.gazeY, gaze.gazeY)),
      headYaw: clampBipolar(
        clampChannelDelta("head", prev.headYaw, idleSway.headYaw + headOff.yaw),
      ),
      headPitch: clampBipolar(
        clampChannelDelta("head", prev.headPitch, idleSway.headPitch + headOff.pitch),
      ),
      gesture: clamp01(clampChannelDelta("gesture", prev.gesture, gest.amplitude)),
      gestureId: gest.id,
      lip: clamp01(clampChannelDelta("lip", prev.lip, nextLip)),
      glow: clamp01(glowNext),
      ts: nowMs,
    };
    this.sample = next;
    this.lastNow = nowMs;
    this.perf.record(dtMs);
    this.metrics.recordTick();
    if (this.perf.shouldDegrade() && !this.reducedMotion) {
      this.reducedMotion = true;
      this.audit.log("perf_degrade");
    }
    return next;
  }

  getSample(): MotionSample {
    return this.sample;
  }
}

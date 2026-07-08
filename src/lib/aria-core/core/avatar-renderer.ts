/**
 * AvatarRenderer — the single sink of truth for the avatar visual pipeline.
 *
 * Composes channel outputs from all sub-engines into an AvatarFrame every
 * tick. React components subscribe via `avatarRenderer.subscribe(fn)` and
 * receive frames without owning any animation math themselves. There is
 * exactly ONE renderer in the app.
 */
import { attentionEngine } from "./attention-engine";
import { avatarStateManager, type AvatarState, type Emotion } from "./avatar-state-manager";
import { bodyEngine, type BodyChannel } from "./body-engine";
import { eyeEngine, type EyeChannel } from "./eye-engine";
import { faceEngine, type FaceChannel } from "./face-engine";
import { gestureEngine, type GestureId } from "./gesture-engine";
import { headEngine, type HeadChannel } from "./head-engine";
import { idleEngine } from "./idle-engine";
import { lipSyncEngine } from "./lip-sync-engine";
import { transitionEngine } from "./transition-engine";

export interface AvatarFrame {
  state: AvatarState;
  emotion: Emotion;
  eyes: EyeChannel;
  head: HeadChannel;
  face: FaceChannel;
  body: BodyChannel;
  gesture: GestureId;
  lip: number; // 0..1
  breath: number; // 0..1
  sway: number; // -1..1
  gazeX: number; // -1..1 eased
  gazeY: number; // -1..1 eased
  ts: number;
}

type Subscriber = (frame: AvatarFrame) => void;

class AvatarRenderer {
  private frame: AvatarFrame = this.seed();
  private subs = new Set<Subscriber>();
  private raf: number | null = null;
  private running = false;

  private seed(): AvatarFrame {
    return {
      state: "closed",
      emotion: "neutral",
      eyes: eyeEngine.channelFor("closed"),
      head: headEngine.channelFor("closed"),
      face: faceEngine.channelFor("neutral"),
      body: bodyEngine.channelFor("closed"),
      gesture: "none",
      lip: 0,
      breath: 0.5,
      sway: 0,
      gazeX: 0,
      gazeY: 0,
      ts: 0,
    };
  }

  start(): void {
    if (this.running || typeof window === "undefined") return;
    this.running = true;
    const loop = (t: number) => {
      if (!this.running) return;
      this.tick(t);
      this.raf = window.requestAnimationFrame(loop);
    };
    this.raf = window.requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    if (this.raf !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.raf);
    }
    this.raf = null;
  }

  getFrame(): AvatarFrame {
    return this.frame;
  }

  subscribe(fn: Subscriber): () => void {
    this.subs.add(fn);
    fn(this.frame);
    return () => this.subs.delete(fn);
  }

  private tick(nowMs: number): void {
    const state = avatarStateManager.getState();
    const emotion = avatarStateManager.getEmotion();
    const eyesTarget = eyeEngine.channelFor(state);
    const headTarget = headEngine.channelFor(state);
    const faceTarget = faceEngine.channelFor(emotion);
    const bodyTarget = bodyEngine.channelFor(state);
    const gesture = gestureEngine.select(state, emotion);
    const idle = idleEngine.tick(nowMs);
    const attention = attentionEngine.current();

    // Attention override for gaze
    let targetGazeX = eyesTarget.gazeTargetX;
    let targetGazeY = eyesTarget.gazeTargetY;
    if (attention.kind === "ui") {
      targetGazeX = attention.x;
      targetGazeY = attention.y;
    } else if (attention.kind === "away") {
      targetGazeX = 0.35;
      targetGazeY = -0.1;
    }

    const dt = this.frame.ts === 0 ? 16 : Math.max(1, nowMs - this.frame.ts);
    const gazeX = transitionEngine.clampBipolar(
      transitionEngine.ease(this.frame.gazeX, targetGazeX, dt),
    );
    const gazeY = transitionEngine.clampBipolar(
      transitionEngine.ease(this.frame.gazeY, targetGazeY, dt),
    );
    const lip = transitionEngine.clamp01(
      transitionEngine.ease(this.frame.lip, lipSyncEngine.read(), dt, 80),
    );
    const breath = transitionEngine.clamp01(
      transitionEngine.ease(
        this.frame.breath,
        idle.breath * bodyTarget.breathingDepth + 0.2,
        dt,
        400,
      ),
    );

    const next: AvatarFrame = {
      state,
      emotion,
      eyes: eyesTarget,
      head: headTarget,
      face: faceTarget,
      body: bodyTarget,
      gesture,
      lip,
      breath,
      sway: idle.sway * (bodyTarget.swayAmplitude || 0),
      gazeX,
      gazeY,
      ts: nowMs,
    };
    this.frame = next;
    this.subs.forEach((s) => {
      try {
        s(next);
      } catch {
        /* isolate */
      }
    });
  }
}

export const avatarRenderer = new AvatarRenderer();

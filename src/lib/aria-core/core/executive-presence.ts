/**
 * ExecutivePresence — Phase 11 composed presence report.
 *
 * Combines AvatarState + Emotion + AvatarFrame into a single normalized
 * "presence" object that HUD widgets (status strip, ambient glow, mission
 * control) can consume without knowing about individual engines.
 */
import { avatarStateManager, type AvatarState, type Emotion } from "./avatar-state-manager";
import { realtimeAnimation } from "./realtime-animation";
import type { AvatarFrame } from "./avatar-renderer";

export type PresenceLevel = "dormant" | "ambient" | "attentive" | "assertive" | "urgent";
export type PresenceGlow = "muted" | "steady" | "focused" | "radiant" | "alert";

export interface PresenceSnapshot {
  state: AvatarState;
  emotion: Emotion;
  level: PresenceLevel;
  glow: PresenceGlow;
  intensity: number;   // 0..1
  gazeContact: boolean;
  speaking: boolean;
  ts: number;
}

const STATE_LEVEL: Record<AvatarState, PresenceLevel> = {
  closed: "dormant",
  idle: "ambient",
  listening: "attentive",
  thinking: "attentive",
  explaining: "assertive",
  speaking: "assertive",
  success: "ambient",
  warning: "urgent",
};

const EMOTION_GLOW: Record<Emotion, PresenceGlow> = {
  neutral: "muted",
  executive: "steady",
  friendly: "steady",
  confident: "focused",
  focused: "focused",
  concerned: "alert",
  critical: "alert",
  success: "radiant",
};

type Listener = (snap: PresenceSnapshot) => void;

class ExecutivePresence {
  private listeners = new Set<Listener>();
  private unsub: (() => void) | null = null;
  private last: PresenceSnapshot = this.seed();

  private seed(): PresenceSnapshot {
    return {
      state: "closed", emotion: "neutral",
      level: "dormant", glow: "muted", intensity: 0,
      gazeContact: false, speaking: false, ts: 0,
    };
  }

  start(): () => void {
    if (this.unsub) return () => this.stop();
    this.unsub = realtimeAnimation.subscribe((frame) => this.update(frame));
    return () => this.stop();
  }

  stop(): void {
    if (this.unsub) { this.unsub(); this.unsub = null; }
    this.listeners.clear();
    this.last = this.seed();
  }

  snapshot(): PresenceSnapshot { return this.last; }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.last);
    return () => this.listeners.delete(fn);
  }

  private update(frame: AvatarFrame): void {
    const state = avatarStateManager.getState();
    const emotion = avatarStateManager.getEmotion();
    const speaking = state === "speaking" && frame.lip > 0.02;
    const intensity = Math.min(
      1,
      0.25 +
        (state === "speaking" || state === "explaining" ? 0.35 : 0) +
        (state === "warning" ? 0.55 : 0) +
        frame.face.intensity * 0.35 +
        frame.lip * 0.15,
    );
    const snap: PresenceSnapshot = {
      state,
      emotion,
      level: STATE_LEVEL[state],
      glow: EMOTION_GLOW[emotion],
      intensity,
      gazeContact: frame.eyes.contact,
      speaking,
      ts: frame.ts,
    };
    this.last = snap;
    this.listeners.forEach((l) => { try { l(snap); } catch { /* isolate */ } });
  }
}

export const executivePresence = new ExecutivePresence();

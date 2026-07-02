// Interaction Coordinator — external-facing controller that translates
// high-level events (userStartedSpeaking, requestStarted, responseChunk, …)
// into presence + emotion + gesture commands. This is the ONLY place other
// modules should ever call from application code.

import type { PresenceEngine } from "./presence";
import type { EmotionEngine } from "./emotion";
import type { GestureEngine, GestureCue } from "./gesture";
import type { WelcomeAnimationEngine } from "./welcome-animation";
import type { ExecutiveGreetingEngine } from "./executive-greeting";
import type { LipSyncEngine, AmplitudeSource } from "./lip-sync";
import type { VoicePresenceEngine } from "./voice-presence";
import type { ConversationAnimationEngine, ConversationCue } from "./conversation-animation";
import type { Emotion } from "./types";

export interface HeroInteractionEvent {
  readonly kind:
    | "user-started-speaking"
    | "user-stopped-speaking"
    | "request-started"
    | "request-cancelled"
    | "response-started"
    | "response-chunk"
    | "response-finished"
    | "pause"
    | "resume";
  readonly at: number;
  readonly amplitude?: AmplitudeSource;
  readonly emotion?: Emotion;
  readonly cue?: ConversationCue;
  readonly detail?: string;
}

export class InteractionCoordinator {
  constructor(
    private readonly presence: PresenceEngine,
    private readonly emotion: EmotionEngine,
    private readonly gestures: GestureEngine,
    private readonly welcome: WelcomeAnimationEngine,
    private readonly greeting: ExecutiveGreetingEngine,
    private readonly lipSync: LipSyncEngine,
    private readonly voicePresence: VoicePresenceEngine,
    private readonly conversation: ConversationAnimationEngine,
  ) {}

  playWelcome(now: number): void {
    this.presence.request("welcome", now, "welcome");
    this.emotion.onPresence("welcome", now);
    this.welcome.fire(now);
    this.greeting.request(now);
    // Return to idle after the entrance completes.
    setTimeoutSafe(() => {
      if (this.presence.current() === "welcome") {
        this.presence.request("idle", now + 2500, "welcome-complete");
        this.emotion.onPresence("idle", now + 2500);
      }
    }, 2500);
  }

  markGreetingFulfilled(now: number): void {
    this.greeting.fulfill(now);
  }

  handle(ev: HeroInteractionEvent): void {
    switch (ev.kind) {
      case "user-started-speaking":
        this.presence.request("listening", ev.at, "voice-in");
        this.emotion.onPresence("listening", ev.at);
        if (ev.emotion) this.emotion.setHint(ev.emotion, ev.at);
        break;
      case "user-stopped-speaking":
        this.presence.request("idle", ev.at, "voice-in-end");
        this.emotion.onPresence("idle", ev.at);
        break;
      case "request-started":
        this.presence.request("thinking", ev.at, "request");
        this.emotion.onPresence("thinking", ev.at);
        break;
      case "request-cancelled":
        this.gestures.cancel();
        this.presence.request("idle", ev.at, "cancel");
        this.emotion.onPresence("idle", ev.at);
        break;
      case "response-started":
        this.presence.request("speaking", ev.at, "response");
        this.emotion.onPresence("speaking", ev.at);
        this.lipSync.bindSource(ev.amplitude ?? null);
        this.voicePresence.bindSource(ev.amplitude ?? null);
        this.gestures.trigger("acknowledge", ev.at);
        break;
      case "response-chunk":
        if (ev.cue) this.conversation.cue(ev.cue, ev.at);
        break;
      case "response-finished":
        this.lipSync.bindSource(null);
        this.voicePresence.bindSource(null);
        this.gestures.cancel();
        this.presence.request("idle", ev.at, "response-end");
        this.emotion.onPresence("idle", ev.at);
        break;
      case "pause":
        this.presence.request("paused", ev.at, "pause");
        break;
      case "resume":
        this.presence.request("idle", ev.at, "resume");
        this.emotion.onPresence("idle", ev.at);
        break;
    }
  }

  triggerGesture(cue: GestureCue, at: number): void {
    this.gestures.trigger(cue, at);
  }
}

function setTimeoutSafe(fn: () => void, ms: number): void {
  const g = globalThis as unknown as { setTimeout?: (cb: () => void, ms: number) => unknown };
  if (typeof g.setTimeout === "function") g.setTimeout(fn, ms);
}

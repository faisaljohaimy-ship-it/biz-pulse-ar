// Avatar Runtime — binds all channel engines into a single per-tick pipeline.
// Deterministic evaluation order: expression → breathing → blink → eye →
// idle → gesture → lip-sync → voice-presence → conversation → thinking →
// listening → welcome → ambient-lighting → dynamic-camera → micro-motion.

import type { HeroTick } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";
import type { ExpressionEngine } from "./expression";
import type { BreathingEngine } from "./breathing";
import type { BlinkEngine } from "./blink";
import type { EyeContactEngine } from "./eye-contact";
import type { IdleMotionEngine } from "./idle-motion";
import type { GestureEngine } from "./gesture";
import type { LipSyncEngine } from "./lip-sync";
import type { VoicePresenceEngine } from "./voice-presence";
import type { ConversationAnimationEngine } from "./conversation-animation";
import type { ThinkingAnimationEngine } from "./thinking-animation";
import type { ListeningAnimationEngine } from "./listening-animation";
import type { WelcomeAnimationEngine } from "./welcome-animation";
import type { AmbientLightingController } from "./ambient-lighting";
import type { DynamicCameraController } from "./dynamic-camera";
import type { MicroMotionSystem } from "./micro-motion";

export class AvatarRuntime {
  constructor(
    private readonly sync: HeroStateSynchronizer,
    private readonly expression: ExpressionEngine,
    private readonly breathing: BreathingEngine,
    private readonly blink: BlinkEngine,
    private readonly eye: EyeContactEngine,
    private readonly idle: IdleMotionEngine,
    private readonly gesture: GestureEngine,
    private readonly lipSync: LipSyncEngine,
    private readonly voicePresence: VoicePresenceEngine,
    private readonly conversation: ConversationAnimationEngine,
    private readonly thinking: ThinkingAnimationEngine,
    private readonly listening: ListeningAnimationEngine,
    private readonly welcome: WelcomeAnimationEngine,
    private readonly lighting: AmbientLightingController,
    private readonly camera: DynamicCameraController,
    private readonly micro: MicroMotionSystem,
  ) {}

  tick(tick: HeroTick): void {
    this.expression.tick(tick);
    this.breathing.tick(tick);
    this.blink.tick(tick);
    this.eye.tick(tick);
    this.idle.tick(tick);
    this.gesture.tick(tick);
    this.lipSync.tick(tick);
    this.voicePresence.tick(tick);
    this.conversation.tick(tick);
    this.thinking.tick(tick);
    this.listening.tick(tick);
    this.welcome.tick(tick);
    this.lighting.tick(tick);
    this.camera.tick(tick);
    this.micro.tick(tick);
  }

  snapshot() {
    return this.sync.get();
  }
}

// Hero Runtime — top-level composition object. Instantiate once per app;
// call start()/stop() to control the frame loop. All engines are wired in
// dependency order and exposed for read-only inspection.

import { AnimationScheduler } from "./scheduler";
import { HeroAudit } from "./audit";
import { HeroMetrics } from "./metrics";
import { HeroStateSynchronizer } from "./state-synchronizer";
import { PresenceEngine } from "./presence";
import { EmotionEngine } from "./emotion";
import { ExpressionEngine } from "./expression";
import { BreathingEngine } from "./breathing";
import { BlinkEngine } from "./blink";
import { EyeContactEngine } from "./eye-contact";
import { IdleMotionEngine } from "./idle-motion";
import { GestureEngine } from "./gesture";
import { LipSyncEngine } from "./lip-sync";
import { VoicePresenceEngine } from "./voice-presence";
import { ConversationAnimationEngine } from "./conversation-animation";
import { ThinkingAnimationEngine } from "./thinking-animation";
import { ListeningAnimationEngine } from "./listening-animation";
import { WelcomeAnimationEngine } from "./welcome-animation";
import { ExecutiveGreetingEngine } from "./executive-greeting";
import { AmbientLightingController } from "./ambient-lighting";
import { DynamicCameraController } from "./dynamic-camera";
import { MicroMotionSystem } from "./micro-motion";
import { AvatarRuntime } from "./avatar-runtime";
import { InteractionCoordinator } from "./interaction-coordinator";
import type { HeroReducedMotion, HeroAvatarSample, HeroTelemetry } from "./types";

export interface HeroRuntimeOptions {
  readonly targetFps?: number;
  readonly reducedMotion?: HeroReducedMotion;
  readonly auditCap?: number;
}

export class HeroRuntime {
  readonly audit: HeroAudit;
  readonly metrics: HeroMetrics;
  readonly sync: HeroStateSynchronizer;
  readonly presence: PresenceEngine;
  readonly emotion: EmotionEngine;
  readonly expression: ExpressionEngine;
  readonly breathing: BreathingEngine;
  readonly blink: BlinkEngine;
  readonly eyeContact: EyeContactEngine;
  readonly idle: IdleMotionEngine;
  readonly gestures: GestureEngine;
  readonly lipSync: LipSyncEngine;
  readonly voicePresence: VoicePresenceEngine;
  readonly conversation: ConversationAnimationEngine;
  readonly thinking: ThinkingAnimationEngine;
  readonly listening: ListeningAnimationEngine;
  readonly welcome: WelcomeAnimationEngine;
  readonly greeting: ExecutiveGreetingEngine;
  readonly lighting: AmbientLightingController;
  readonly camera: DynamicCameraController;
  readonly micro: MicroMotionSystem;
  readonly avatar: AvatarRuntime;
  readonly coordinator: InteractionCoordinator;
  readonly scheduler: AnimationScheduler;
  private reduced: HeroReducedMotion;
  private unsubscribe: (() => void) | null = null;

  constructor(opts: HeroRuntimeOptions = {}) {
    this.reduced = opts.reducedMotion ?? { enabled: false, source: "auto" };
    this.audit = new HeroAudit(opts.auditCap);
    this.metrics = new HeroMetrics(opts.targetFps);
    this.sync = new HeroStateSynchronizer();
    this.presence = new PresenceEngine(this.sync, this.audit);
    this.emotion = new EmotionEngine(this.sync, this.audit);
    this.expression = new ExpressionEngine(this.sync);
    this.breathing = new BreathingEngine(this.sync);
    this.blink = new BlinkEngine(this.sync);
    this.eyeContact = new EyeContactEngine(this.sync);
    this.idle = new IdleMotionEngine(this.sync);
    this.gestures = new GestureEngine(this.sync);
    this.lipSync = new LipSyncEngine(this.sync);
    this.voicePresence = new VoicePresenceEngine(this.sync);
    this.conversation = new ConversationAnimationEngine(this.gestures);
    this.thinking = new ThinkingAnimationEngine(this.sync);
    this.listening = new ListeningAnimationEngine(this.sync);
    this.welcome = new WelcomeAnimationEngine(this.sync, this.audit);
    this.greeting = new ExecutiveGreetingEngine(this.audit);
    this.lighting = new AmbientLightingController(this.sync, this.audit);
    this.camera = new DynamicCameraController(this.sync, this.audit);
    this.micro = new MicroMotionSystem(this.sync);
    this.avatar = new AvatarRuntime(
      this.sync,
      this.expression,
      this.breathing,
      this.blink,
      this.eyeContact,
      this.idle,
      this.gestures,
      this.lipSync,
      this.voicePresence,
      this.conversation,
      this.thinking,
      this.listening,
      this.welcome,
      this.lighting,
      this.camera,
      this.micro,
    );
    this.coordinator = new InteractionCoordinator(
      this.presence,
      this.emotion,
      this.gestures,
      this.welcome,
      this.greeting,
      this.lipSync,
      this.voicePresence,
      this.conversation,
    );
    this.scheduler = new AnimationScheduler({
      targetFps: opts.targetFps,
      reducedMotion: this.reduced.enabled,
    });
    this.applyReducedMotion();
  }

  setReducedMotion(next: HeroReducedMotion): void {
    if (next.enabled === this.reduced.enabled && next.source === this.reduced.source) return;
    this.reduced = next;
    this.applyReducedMotion();
    this.audit.append({
      at: nowSafe(),
      kind: "reduced-motion",
      from: (!next.enabled).toString(),
      to: next.enabled.toString(),
      detail: next.source,
    });
  }

  private applyReducedMotion(): void {
    const r = this.reduced.enabled;
    this.scheduler.setReducedMotion(r);
    this.blink.setReducedMotion(r);
    this.breathing.setReducedMotion(r);
    this.idle.setReducedMotion(r);
    this.eyeContact.setReducedMotion(r);
    this.gestures.setReducedMotion(r);
    this.thinking.setReducedMotion(r);
    this.listening.setReducedMotion(r);
    this.welcome.setReducedMotion(r);
    this.micro.setReducedMotion(r);
  }

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.scheduler.subscribe((tick) => {
      const started = nowSafe();
      this.avatar.tick(tick);
      const cost = nowSafe() - started;
      this.metrics.recordTick(tick.t, cost);
    });
    this.scheduler.start();
    this.audit.append({ at: nowSafe(), kind: "scheduler", from: "stopped", to: "running" });
  }

  stop(): void {
    if (!this.unsubscribe) return;
    this.unsubscribe();
    this.unsubscribe = null;
    this.scheduler.stop();
    this.audit.append({ at: nowSafe(), kind: "scheduler", from: "running", to: "stopped" });
  }

  snapshot(): HeroAvatarSample {
    return this.sync.get();
  }

  telemetry(): HeroTelemetry {
    return this.metrics.snapshot(nowSafe());
  }
}

function nowSafe(): number {
  const g = globalThis as { performance?: { now: () => number } };
  return g.performance?.now?.() ?? Date.now();
}

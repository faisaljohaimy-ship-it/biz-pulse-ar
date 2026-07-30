// Phase 11.0 — Hero Experience Engine public barrel.
// Strictly additive presentation layer. Never imports Brain/Memory/Runtime/etc.

export * from "./types";
export { HeroAudit, type HeroAuditEntry, type HeroAuditKind } from "./audit";
export { HeroMetrics } from "./metrics";
export { AnimationScheduler, type HeroTickHandler, type SchedulerOptions } from "./scheduler";
export { HeroStateSynchronizer, type HeroChannelPatch } from "./state-synchronizer";
export { PresenceEngine } from "./presence";
export { EmotionEngine } from "./emotion";
export { ExpressionEngine } from "./expression";
export { BreathingEngine } from "./breathing";
export { BlinkEngine } from "./blink";
export { EyeContactEngine } from "./eye-contact";
export { IdleMotionEngine } from "./idle-motion";
export { GestureEngine, type GestureCue } from "./gesture";
export { LipSyncEngine, type AmplitudeSource } from "./lip-sync";
export { VoicePresenceEngine } from "./voice-presence";
export { ConversationAnimationEngine, type ConversationCue } from "./conversation-animation";
export { ThinkingAnimationEngine } from "./thinking-animation";
export { ListeningAnimationEngine } from "./listening-animation";
export { WelcomeAnimationEngine } from "./welcome-animation";
export { ExecutiveGreetingEngine, type ExecutiveGreetingSlot } from "./executive-greeting";
export { AmbientLightingController } from "./ambient-lighting";
export { DynamicCameraController } from "./dynamic-camera";
export { MicroMotionSystem } from "./micro-motion";
export { AvatarRuntime } from "./avatar-runtime";
export { InteractionCoordinator, type HeroInteractionEvent } from "./interaction-coordinator";
export { HeroRuntime, type HeroRuntimeOptions } from "./hero-runtime";

// Phase 11.3 — ARIA Avatar Motion public barrel.
// Strictly additive. Consumes Phase 11.2 identity profiles.

export * from "./types";
export * from "./contracts";
export { MotionStateMachine } from "./animation-state.server";
export { IdleEngine } from "./idle.server";
export { BlinkEngine } from "./blink.server";
export { EyeContactEngine } from "./eye-contact.server";
export { BreathingEngine } from "./breathing.server";
export { HeadMotionEngine } from "./head-motion.server";
export { HandGestureEngine } from "./hand-gesture.server";
export { ExpressionEngine, type ExpressionSample } from "./expression.server";
export { LipSyncEngine } from "./lip-sync.server";
export { SpeechSyncCoordinator } from "./speech-sync.server";
export { EmotionSync } from "./emotion-sync.server";
export { ease, clamp01, clampBipolar } from "./transition.server";
export { PerformanceGuard, type PerfSnapshot } from "./performance.server";
export { MotionAudit, type MotionAuditEntry, type MotionAuditKind } from "./audit.server";
export { MotionMetrics, type MotionMetricsSnapshot } from "./metrics.server";
export { verifySample, type MotionVerification } from "./verification.server";
export { MotionRuntime, type MotionRuntimeOptions } from "./motion-runtime.server";

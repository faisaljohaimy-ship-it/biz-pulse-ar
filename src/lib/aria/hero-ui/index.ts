// Phase 11.8 — Cinematic Hero UI barrel.
export * from "./types";
export * from "./contracts";
export { computeHeroLayout } from "./hero-layout.server";
export { computePresence, type PresenceInput } from "./hero-presence.server";
export { beginEntrance, sampleEntrance, resetEntrance } from "./hero-entrance.server";
export { computeLighting } from "./hero-lighting.server";
export { computeBackground } from "./hero-background.server";
export { computeParticles } from "./hero-particles.server";
export { computeCamera, type CameraInput } from "./hero-camera.server";
export { computeDepth } from "./hero-depth.server";
export { computeOverlay } from "./hero-overlay.server";
export { computePanels } from "./hero-panels.server";
export { computeCaption, type CaptionInput } from "./hero-caption.server";
export { computeWaveform } from "./hero-waveform.server";
export { computeThinking } from "./hero-thinking.server";
export { computeListening } from "./hero-listening.server";
export { computeSpeaking } from "./hero-speaking.server";
export { computeTransition } from "./hero-transitions.server";
export { tickAnimation, resetAnimation } from "./hero-animation.server";
export {
  computePerformanceBudget, noteFrame, averageFps,
} from "./hero-performance.server";
export {
  logHero, heroAudit, type HeroAuditKind, type HeroAuditEntry,
} from "./hero-audit.server";
export {
  noteRender, noteStateChange, noteCaption, noteTransitionCancel,
  notePerfDowngrade, noteFpsSample, heroMetrics, type HeroMetricsSnapshot,
} from "./hero-metrics.server";
export {
  initHeroRuntime, updateHero, renderHeroFrame, disposeHero,
  currentHeroState, type HeroRuntimeInput, type HeroUpdate, type HeroFrame,
} from "./hero-runtime.server";
export { verifyHeroFrame, type HeroVerification } from "./verification.server";

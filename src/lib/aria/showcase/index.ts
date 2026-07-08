// Phase 11.9 — Executive Showcase Mode barrel.
export * from "./types";
export * from "./contracts";
export { buildCinematicIntro, type CinematicBeat } from "./cinematic-intro.server";
export { composeWelcome } from "./executive-welcome.server";
export { buildExecutiveTour } from "./executive-tour.server";
export { planGuidedDemo, type GuidedDemoOptions } from "./guided-demo.server";
export { presentKpis, formatKpiCaption, type KpiSource } from "./live-kpi-presenter.server";
export { planHighlights, type HighlightRequest } from "./smart-highlight.server";
export { composeStory, type StoryInput } from "./executive-storytelling.server";
export { computeFocus, type FocusInput } from "./dynamic-focus.server";
export { directVoice, type VoiceDirectorInput } from "./voice-director.server";
export {
  initController,
  currentStep,
  advanceStep,
  pause,
  resume,
  interrupt,
  recover,
  setMode,
  controllerSnapshot,
  disposeController,
  type ControllerSnapshot,
} from "./presentation-controller.server";
export { recordQuestion, markAnswered, qaHistory, clearQa } from "./executive-qa.server";
export { listScenarios, getScenario } from "./demo-scenarios.server";
export { computeConfidence, type ConfidenceInput } from "./confidence-display.server";
export {
  logShowcase,
  showcaseAudit,
  type ShowcaseAuditKind,
  type ShowcaseAuditEntry,
} from "./audit.server";
export {
  noteStart,
  noteCompletion,
  noteInterruption,
  noteRecovery,
  noteQa,
  noteStepDuration,
  showcaseMetrics,
  type ShowcaseMetricsSnapshot,
} from "./metrics.server";
export { verifyShowcase, type ShowcaseVerification } from "./verification.server";
export {
  startExecutiveShowcase,
  currentShowcaseFrame,
  nextShowcaseStep,
  pauseShowcase,
  resumeShowcase,
  interruptShowcase,
  recoverShowcase,
  switchShowcaseMode,
  askExecutiveQuestion,
  acknowledgeQaAnswer,
  showcaseQaHistory,
  endExecutiveShowcase,
  type StartShowcaseInput,
  type ShowcasePlan,
  type ShowcaseFrame,
} from "./executive-showcase.server";

/**
 * ARIA Presence — public surface.
 */
export { ARIA_VOICE_CONTRACT, sanitizeVoice } from "./voice";
export {
  remember,
  recall,
  forget,
  readCursor,
  writeCursor,
  type MemoryTier,
  type PresenceCursor,
} from "./tiers.server";
export { computePresenceDelta, type PresenceDelta } from "./since-last-visit.server";
export { composePresenceGreeting, type PresenceGreeting } from "./greeting.server";
export { detectInterruption, type InterruptionSignal } from "./interruption.server";
export {
  explainRecommendation,
  ExplanationRequestSchema,
  type ExplanationRequest,
  type ExecutiveExplanation,
} from "./explanation.server";
export {
  currentFrame,
  tryAdvanceFrame,
  resetFrame,
  frameSignature,
  type ContextFrame,
} from "./context-flow";

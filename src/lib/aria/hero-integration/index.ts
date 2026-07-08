// Phase 11.5 — Hero Integration barrel.
export * from "./types";
export * from "./contracts";
export {
  openHero,
  getHero,
  updateHero,
  setHeroPresence,
  setHeroAudio,
  setHeroButton,
  reconcileSingleHero,
  closeHero,
} from "./hero-state.server";
export { emitHeroEvent, heroEvents, clearHeroEvents } from "./hero-events.server";
export { derivePresence } from "./hero-presence.server";
export {
  openHeroTurn,
  closeHeroTurn,
  type HeroTurnInput,
  type HeroTurnResult,
} from "./hero-conversation-bridge.server";
export {
  heroVoiceReadiness,
  heroBeginListening,
  heroMirrorAudio,
  type HeroVoiceReadiness,
} from "./hero-voice-bridge.server";
export {
  avatarDirectiveFor,
  type AvatarChannel,
  type AvatarDirective,
} from "./hero-avatar-bridge.server";
export { HERO_ACTIONS, heroActionsList, type HeroActionSpec } from "./hero-actions.server";
export {
  bootHero,
  greetHeroOnce,
  heroSnapshot,
  heroClickButton,
  heroCompleteTurn,
} from "./hero-controller.server";
export {
  recordHeroMetric,
  heroMetricsSnapshot,
  type HeroMetricsSnapshot,
} from "./hero-metrics.server";
export { logHeroAudit, heroAudit, type HeroAuditEntry } from "./hero-audit.server";
export { verifyHero, type HeroVerification } from "./verification.server";

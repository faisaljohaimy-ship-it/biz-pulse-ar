// Phase 11.2 — ARIA Avatar Identity public barrel.
// Strictly additive. Single source of truth for the ARIA visual identity.

export * from "./types";
export * from "./contracts";
export { getAriaIdentity } from "./identity.server";
export { getReferenceAsset, type ReferenceAsset } from "./reference.server";
export { getStyleGuide, type StyleGuide } from "./style-guide.server";
export {
  checkConsistency,
  type CandidateAvatarDescriptor,
  type ConsistencyResult,
} from "./consistency.server";
export { getAvatarProfile, type AvatarProfile } from "./avatar-profile.server";
export {
  getAnimationProfile,
  clampChannelDelta,
  type AnimationProfile,
} from "./animation-profile.server";
export { getExpression, listExpressions } from "./expression-profile.server";
export { getGesture, getDefaultGesture, listGestures } from "./gesture-profile.server";
export { getLipSyncProfile, isLipSyncCompliant } from "./lip-sync-profile.server";
export { getVoiceProfile, isVoiceCompliant } from "./voice-profile.server";
export {
  getRenderingProfile,
  listRenderingProfiles,
  assertRenderingCompliant,
} from "./rendering-profile.server";
export { IdentityAudit, type IdentityAuditEntry, type IdentityAuditKind } from "./audit.server";
export { IdentityMetrics, type IdentityMetricsSnapshot } from "./metrics.server";
export { verifyIdentity, type IdentityVerification } from "./verification.server";

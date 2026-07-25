/**
 * Pack Integration (Install Verification Phase 0) — public surface.
 *
 * Adapters + loader that make the vendored content packs (packs/*)
 * visible to the Adaptive Shell through its governed admission doors.
 * Registration only — activation stays behind the human protocol.
 */
export {
  adaptAgent,
  adaptSkill,
  adaptTool,
  normalizeAgentId,
  type PackAgentDescriptor,
  type PackSkillDescriptor,
  type PackToolDescriptor,
} from "./adapters";
export {
  integrateContentPacks,
  type PackData,
  type PackIntegrationReport,
  type PackIntegrationTargets,
  type RejectionDetail,
} from "./loader";

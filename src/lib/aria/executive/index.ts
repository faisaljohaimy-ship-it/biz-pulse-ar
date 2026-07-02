// Phase 12.0 — Executive Digital Employee barrel.
export * from "./types";
export * from "./contracts";
export { executivePersonality, pickSignature } from "./executive-personality.server";
export {
  setExecutivePresence, getExecutivePresence, clearExecutivePresence,
} from "./executive-presence.server";
export {
  recordDialog, dialogHistory, clearDialog, shapeExecutiveReply,
} from "./executive-dialog.server";
export {
  composeBriefing, type BriefingSource,
} from "./executive-briefing.server";
export {
  rankPriorities, type PrioritySource,
} from "./executive-priorities.server";
export {
  composeDailySummary, type DailySummaryInput,
} from "./executive-daily-summary.server";
export {
  selectExecutiveAlerts, type AlertSource,
} from "./executive-alerts.server";
export {
  generateInsights, type InsightSource,
} from "./executive-insights.server";
export {
  composeRecommendations, type RecommendationSource,
} from "./executive-recommendations.server";
export {
  addFollowUp, updateFollowUpStatus, listFollowUps, pendingFollowUps, type FollowUpInput,
} from "./executive-followup.server";
export {
  listExecutiveWorkflows, getExecutiveWorkflow, nextExecutiveSteps,
} from "./executive-workflow.server";
export {
  rememberAnchor, recallAnchor, forgetAnchor, listAnchors,
} from "./executive-memory.server";
export {
  openAssistant, closeAssistant, assistantSay, assistantHear, assistantHistory,
  assistantPresence, assistantBriefing, assistantPriorities, assistantDailySummary,
  assistantAlerts, assistantInsights, assistantRecommendations, assistantAddFollowUp,
  assistantPending, assistantRemember, assistantRecall, type AssistantInit,
} from "./executive-assistant.server";
export {
  composeExecutiveExperience, type ExecutiveExperienceInput,
} from "./executive-experience.server";
export {
  logExecutive, executiveAudit, type ExecutiveAuditKind, type ExecutiveAuditEntry,
} from "./audit.server";
export {
  noteBriefing, noteRecommendation, noteAlert, noteInsight, noteDialogTurn, noteFollowUp,
  executiveMetrics, type ExecutiveMetricsSnapshot,
} from "./metrics.server";
export {
  verifyExecutiveSurface, type ExecutiveVerification,
} from "./verification.server";

import type { ExecutiveLanguage } from "./types";
import { executivePersonality } from "./executive-personality.server";
import { setExecutivePresence, getExecutivePresence } from "./executive-presence.server";
import { recordDialog, dialogHistory, shapeExecutiveReply } from "./executive-dialog.server";
import { composeBriefing, type BriefingSource } from "./executive-briefing.server";
import { rankPriorities, type PrioritySource } from "./executive-priorities.server";
import { composeDailySummary, type DailySummaryInput } from "./executive-daily-summary.server";
import { selectExecutiveAlerts, type AlertSource } from "./executive-alerts.server";
import { generateInsights, type InsightSource } from "./executive-insights.server";
import { composeRecommendations, type RecommendationSource } from "./executive-recommendations.server";
import { addFollowUp, pendingFollowUps, type FollowUpInput } from "./executive-followup.server";
import { rememberAnchor, recallAnchor } from "./executive-memory.server";
import { logExecutive } from "./audit.server";
import {
  noteBriefing, noteRecommendation, noteAlert, noteInsight, noteDialogTurn, noteFollowUp,
} from "./metrics.server";

export interface AssistantInit {
  readonly scope: string;
  readonly language: ExecutiveLanguage;
}

export function openAssistant(init: AssistantInit): void {
  setExecutivePresence(init.scope, "advisor", true);
  logExecutive(init.scope, "presence", { mode: "advisor", language: init.language });
}

export function closeAssistant(scope: string): void {
  setExecutivePresence(scope, "reporting", false);
  logExecutive(scope, "presence", { mode: "reporting", visible: false });
}

export function assistantSay(
  scope: string, draft: string, language: ExecutiveLanguage, verbosity: "brief" | "detailed" = "brief",
): { text: string; trimmed: boolean } {
  const shaped = shapeExecutiveReply(draft, verbosity);
  const personality = executivePersonality(language);
  const text = shaped.text.length > 0 ? shaped.text : (language === "ar" ? "لا تتوفر معلومات كافية للإجابة الآن." : "Not enough information to answer right now.");
  recordDialog(scope, "aria", text, language, "medium");
  noteDialogTurn();
  logExecutive(scope, "dialog", { speaker: "aria", trimmed: shaped.trimmed, tone: personality.tone });
  return { text, trimmed: shaped.trimmed };
}

export function assistantHear(
  scope: string, text: string, language: ExecutiveLanguage,
): void {
  recordDialog(scope, "user", text, language);
  noteDialogTurn();
  logExecutive(scope, "dialog", { speaker: "user" });
}

export function assistantHistory(scope: string, n?: number) { return dialogHistory(scope, n); }
export function assistantPresence(scope: string) { return getExecutivePresence(scope); }

export function assistantBriefing(scope: string, language: ExecutiveLanguage, sources: readonly BriefingSource[]) {
  const b = composeBriefing(language, sources);
  noteBriefing();
  logExecutive(scope, "briefing", { items: b.items.length, confidence: b.confidence });
  return b;
}

export function assistantPriorities(scope: string, sources: readonly PrioritySource[]) {
  const p = rankPriorities(sources);
  logExecutive(scope, "priorities", { count: p.length });
  return p;
}

export function assistantDailySummary(scope: string, input: DailySummaryInput) {
  const s = composeDailySummary(input);
  logExecutive(scope, "daily_summary", { confidence: s.confidence });
  return s;
}

export function assistantAlerts(scope: string, sources: readonly AlertSource[]) {
  const a = selectExecutiveAlerts(sources);
  a.forEach(() => noteAlert());
  logExecutive(scope, "alerts", { count: a.length });
  return a;
}

export function assistantInsights(scope: string, sources: readonly InsightSource[]) {
  const i = generateInsights(sources);
  i.forEach(() => noteInsight());
  logExecutive(scope, "insights", { count: i.length });
  return i;
}

export function assistantRecommendations(scope: string, sources: readonly RecommendationSource[]) {
  const r = composeRecommendations(sources);
  r.forEach(() => noteRecommendation());
  logExecutive(scope, "recommendations", { count: r.length });
  return r;
}

export function assistantAddFollowUp(scope: string, input: FollowUpInput) {
  const f = addFollowUp(scope, input);
  noteFollowUp();
  logExecutive(scope, "followup", { id: f.id });
  return f;
}

export function assistantPending(scope: string) { return pendingFollowUps(scope); }
export function assistantRemember(scope: string, key: string, value_ar?: string, value_en?: string, source: "user" | "aria" = "user") {
  return rememberAnchor(scope, { key, value_ar, value_en, source });
}
export function assistantRecall(scope: string, key: string) { return recallAnchor(scope, key); }

// Executive experience coordinator — one-call composition of the daily surface.
import type { ExecutiveLanguage } from "./types";
import {
  assistantBriefing,
  assistantPriorities,
  assistantDailySummary,
  assistantAlerts,
  assistantInsights,
  assistantRecommendations,
  assistantPresence,
  openAssistant,
} from "./executive-assistant.server";
import type { BriefingSource } from "./executive-briefing.server";
import type { PrioritySource } from "./executive-priorities.server";
import type { DailySummaryInput } from "./executive-daily-summary.server";
import type { AlertSource } from "./executive-alerts.server";
import type { InsightSource } from "./executive-insights.server";
import type { RecommendationSource } from "./executive-recommendations.server";

export interface ExecutiveExperienceInput {
  readonly scope: string;
  readonly language: ExecutiveLanguage;
  readonly briefing?: readonly BriefingSource[];
  readonly priorities?: readonly PrioritySource[];
  readonly daily?: DailySummaryInput;
  readonly alerts?: readonly AlertSource[];
  readonly insights?: readonly InsightSource[];
  readonly recommendations?: readonly RecommendationSource[];
}

export function composeExecutiveExperience(input: ExecutiveExperienceInput) {
  openAssistant({ scope: input.scope, language: input.language });
  return {
    presence: assistantPresence(input.scope),
    briefing: assistantBriefing(input.scope, input.language, input.briefing ?? []),
    priorities: assistantPriorities(input.scope, input.priorities ?? []),
    dailySummary: input.daily ? assistantDailySummary(input.scope, input.daily) : null,
    alerts: assistantAlerts(input.scope, input.alerts ?? []),
    insights: assistantInsights(input.scope, input.insights ?? []),
    recommendations: assistantRecommendations(input.scope, input.recommendations ?? []),
  };
}

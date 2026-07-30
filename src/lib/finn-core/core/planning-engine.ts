/**
 * PlanningEngine — turns a DecisionProposal into an ordered next-action list.
 * Pure function. No side effects.
 */
import type { DecisionProposal, NextAction, PriorityAssessment } from "../types/executive";

export const planningEngine = {
  plan(decision: DecisionProposal, priority: PriorityAssessment): readonly NextAction[] {
    const actions: NextAction[] = [];
    let order = 1;

    if (decision.immediate_action_en) {
      actions.push({
        order: order++,
        label_ar: decision.immediate_action_ar ?? decision.immediate_action_en,
        label_en: decision.immediate_action_en,
        owner: decision.escalate_to,
        eta_hint: priority.level === "P0" ? "now" : "today",
      });
    }
    if (decision.recommended && !decision.immediate_action_en) {
      actions.push({
        order: order++,
        label_ar: decision.recommended.label_ar,
        label_en: decision.recommended.label_en,
        owner: null,
        eta_hint: priority.level === "P1" ? "today" : "this_week",
      });
    }
    if (decision.delayed_action_en) {
      actions.push({
        order: order++,
        label_ar: decision.delayed_action_ar ?? decision.delayed_action_en,
        label_en: decision.delayed_action_en,
        owner: null,
        eta_hint: "scheduled",
      });
    }
    if (decision.mode === "gather_more_info") {
      actions.push({
        order: order++,
        label_ar: "اطلب البيانات الناقصة قبل المتابعة.",
        label_en: "Request the missing data before proceeding.",
        owner: null,
        eta_hint: "before_next_review",
      });
    }
    return actions;
  },
};

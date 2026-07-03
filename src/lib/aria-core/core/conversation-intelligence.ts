/**
 * ConversationIntelligence — session-only ephemeral memory.
 *
 * NOT persisted. Cleared on page reload. Phase 3 will add persistent memory.
 * Tracks: current objective, conversation goal, previous decisions,
 * pending tasks, last recommendation, active executive workflow.
 */
import type {
  DecisionMode,
  DecisionProposal,
  EphemeralMemoryState,
  NextAction,
} from "../types/executive";

const state: {
  currentObjective: string | null;
  conversationGoal: string | null;
  previousDecisions: { turnId: string; mode: DecisionMode; label: string }[];
  pendingTasks: { id: string; label_ar: string; label_en: string }[];
  lastRecommendation: string | null;
  activeExecutiveWorkflow: string | null;
} = {
  currentObjective: null,
  conversationGoal: null,
  previousDecisions: [],
  pendingTasks: [],
  lastRecommendation: null,
  activeExecutiveWorkflow: null,
};

const MAX_DECISIONS = 10;
const MAX_TASKS = 20;

export const conversationIntelligence = {
  observePrompt(prompt: string) {
    const trimmed = prompt.trim();
    if (!state.currentObjective && trimmed.length > 8) {
      state.currentObjective = trimmed.slice(0, 200);
    }
    if (!state.conversationGoal && trimmed.length > 8) {
      state.conversationGoal = trimmed.slice(0, 200);
    }
  },
  recordDecision(turnId: string, decision: DecisionProposal) {
    if (!decision.recommended) return;
    state.previousDecisions.unshift({
      turnId,
      mode: decision.mode,
      label: decision.recommended.label_en,
    });
    if (state.previousDecisions.length > MAX_DECISIONS) {
      state.previousDecisions.length = MAX_DECISIONS;
    }
    state.lastRecommendation = decision.recommended.label_en;
  },
  recordTasks(actions: readonly NextAction[]) {
    for (const a of actions) {
      const id = `${Date.now()}_${a.order}`;
      state.pendingTasks.unshift({ id, label_ar: a.label_ar, label_en: a.label_en });
    }
    if (state.pendingTasks.length > MAX_TASKS) {
      state.pendingTasks.length = MAX_TASKS;
    }
  },
  setWorkflow(name: string | null) {
    state.activeExecutiveWorkflow = name;
  },
  snapshot(): EphemeralMemoryState {
    return {
      currentObjective: state.currentObjective,
      conversationGoal: state.conversationGoal,
      previousDecisions: [...state.previousDecisions],
      pendingTasks: [...state.pendingTasks],
      lastRecommendation: state.lastRecommendation,
      activeExecutiveWorkflow: state.activeExecutiveWorkflow,
    };
  },
  clear() {
    state.currentObjective = null;
    state.conversationGoal = null;
    state.previousDecisions = [];
    state.pendingTasks = [];
    state.lastRecommendation = null;
    state.activeExecutiveWorkflow = null;
  },
};

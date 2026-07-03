/**
 * ARIA Executive Intelligence — Phase 2 canonical types.
 *
 * These describe the internal envelope every ARIA turn produces. Only
 * `finalAnswer` (and the streamed assistant text) is rendered to end users;
 * everything else is consumed by executive UI panels, telemetry, and the
 * audit trail.
 */
import type { AriaContextSnapshot, AriaIntent } from "./aria";

export type RiskLevel = "critical" | "high" | "medium" | "low" | "info";
export type PriorityLevel = "P0" | "P1" | "P2" | "P3" | "INFO";
export type ReliabilityLevel = "high" | "medium" | "low" | "unknown";
export type DecisionMode =
  | "recommend"
  | "act_now"
  | "delay"
  | "escalate"
  | "gather_more_info"
  | "no_action";

export interface RiskSignal {
  level: RiskLevel;
  probability: number; // 0..1
  impact: number; // 0..1
  urgency: number; // 0..1
  confidence: number; // 0..1
  title_ar: string;
  title_en: string;
  mitigation_ar: string;
  mitigation_en: string;
}

export interface PriorityAssessment {
  level: PriorityLevel;
  score: number; // 0..100
  reason_ar: string;
  reason_en: string;
}

export interface DecisionOption {
  id: string;
  label_ar: string;
  label_en: string;
  expected_outcome_ar: string;
  expected_outcome_en: string;
}

export interface DecisionProposal {
  mode: DecisionMode;
  recommended: DecisionOption | null;
  alternatives: readonly DecisionOption[];
  immediate_action_ar: string | null;
  immediate_action_en: string | null;
  delayed_action_ar: string | null;
  delayed_action_en: string | null;
  escalate_to: string | null;
  operational_impact_ar: string;
  operational_impact_en: string;
  requires_human_approval: boolean;
}

export interface ConfidenceReport {
  percent: number; // 0..100
  reliability: ReliabilityLevel;
  evidence_strength: "strong" | "moderate" | "weak" | "none";
  missing_information: readonly string[];
  uncertainty_notes_ar: readonly string[];
  uncertainty_notes_en: readonly string[];
}

export interface ContextAwarenessReport {
  route: string;
  module: string;
  screen: string;
  locale: "ar" | "en";
  visible_widgets: readonly string[];
  page_meta_keys: readonly string[];
  user_intent: AriaIntent;
  available_context: readonly string[];
  missing_context: readonly string[];
}

export interface ReasoningTrace {
  intent: AriaIntent;
  executive_summary_ar: string;
  executive_summary_en: string;
  operational_interpretation_ar: string;
  operational_interpretation_en: string;
  business_impact_ar: string;
  business_impact_en: string;
  evidence: readonly string[];
  missing_data: readonly string[];
  uncertainty: readonly string[];
}

export interface NextAction {
  order: number;
  label_ar: string;
  label_en: string;
  owner: string | null;
  eta_hint: string | null;
}

export interface ExecutiveEnvelope {
  turnId: string;
  intent: AriaIntent;
  context: ContextAwarenessReport;
  reasoning: ReasoningTrace;
  risk: RiskSignal;
  priority: PriorityAssessment;
  decision: DecisionProposal;
  confidence: ConfidenceReport;
  nextActions: readonly NextAction[];
  /** Populated only after streamed answer completes and is validated. */
  finalAnswer: string | null;
  /** Snapshot of the context used for reasoning. */
  contextSnapshot: AriaContextSnapshot;
  createdAt: string;
}

// ─── Temporary (session-only) memory ────────────────────────────────────
export interface EphemeralMemoryState {
  currentObjective: string | null;
  conversationGoal: string | null;
  previousDecisions: readonly { turnId: string; mode: DecisionMode; label: string }[];
  pendingTasks: readonly { id: string; label_ar: string; label_en: string }[];
  lastRecommendation: string | null;
  activeExecutiveWorkflow: string | null;
}

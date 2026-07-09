/**
 * Phase 6 — Executive Brain types (internal only).
 *
 * NEVER expose the internal chain-of-thought fields to the UI. The public
 * contract remains `{ text_ar, text_en }`. Everything else lives in the
 * `executive` payload for downstream (Evidence Panel, Decision Card, etc.).
 */

import type { AriaIntent } from "../executive-reasoning.server";
import type { PlanStep } from "../planning-engine.server";
import type { Insight } from "../insight-engine.server";

export type ReasoningType =
  | "executive"
  | "operational"
  | "safety"
  | "risk"
  | "financial"
  | "compliance"
  | "incident"
  | "maintenance"
  | "inspection"
  | "emergency"
  | "security"
  | "performance"
  | "trend"
  | "prediction";

export type DecisionMode =
  | "approve"
  | "reject"
  | "escalate"
  | "investigate"
  | "monitor"
  | "delay"
  | "optimize"
  | "assign"
  | "close"
  | "reopen";

export type RiskFacet = "operational" | "safety" | "business" | "financial" | "compliance";

export type Priority = "critical" | "high" | "medium" | "low";

export interface BrainAnchor {
  kind: string;
  id: string;
  label?: string;
}

export interface BrainWidget {
  id: string;
  kind: string;
  label: string;
  value?: unknown;
  hint?: string;
}

export interface BrainTurn {
  role: "user" | "assistant";
  text: string;
  ts?: string;
  anchors?: BrainAnchor[];
}

export interface BrainPage {
  path?: string;
  title?: string;
  section?: string;
  filters?: Record<string, unknown>;
  selected?: Record<string, unknown> | null;
}

export interface BrainRequest {
  question: string;
  lang?: "ar" | "en" | "mixed";
  page?: BrainPage;
  widgets?: BrainWidget[];
  anchors?: BrainAnchor[];
  history?: BrainTurn[];
  /** Session id used to load/save Executive Memory. */
  sessionId?: string;
  /** Caller's tenant/org id. REQUIRED for evidence retrieval — without it,
   *  cross-tenant leak protection returns an empty evidence block. */
  orgId?: string | null;
}

export interface RiskSignal {
  facet: RiskFacet;
  probability: number; // 0..1
  severity: number; // 0..1
  score: number; // probability * severity
  title_en: string;
  title_ar: string;
  mitigation_en: string;
  mitigation_ar: string;
}

export interface Recommendation {
  why_en: string;
  why_ar: string;
  evidence: string[];
  expected_impact_en: string;
  expected_impact_ar: string;
  priority: Priority;
  confidence: number; // 0..1
  responsible_department: string;
  deadline: string; // ISO or "today" / "this week" / "this month"
}

export interface DecisionProposal {
  mode: DecisionMode;
  rationale_en: string;
  rationale_ar: string;
  requires_human_approval: boolean;
}

export interface ConfidenceBreakdown {
  evidence_completeness: number;
  data_freshness: number;
  cross_validation: number;
  rule_confidence: number;
  historical_similarity: number;
  overall: number; // weighted 0..1
}

export interface ExecutiveBrainMemory {
  last_conversations: BrainTurn[];
  last_recommendations: Recommendation[];
  last_incidents: string[];
  last_decisions: DecisionProposal[];
  active_mission?: string;
  focused_site?: string;
  focused_department?: string;
}

/**
 * Internal reasoning envelope. `text_ar` / `text_en` are the only fields
 * ever shown to end users. Everything else is consumed by executive UI
 * panels or logged for auditing — never rendered as chain-of-thought.
 */
export interface ExecutiveBrainAnswer {
  // Public
  text_ar: string;
  text_en: string;

  // Internal envelope (never rendered verbatim)
  question: string;
  intent: AriaIntent;
  reasoning_type: ReasoningType;
  required_data: string[];
  evidence: string[];
  reasoning: string;
  assumptions: string[];
  risks: RiskSignal[];
  confidence: ConfidenceBreakdown;
  recommendation: Recommendation | null;
  decision: DecisionProposal | null;
  next_action: {
    owner: string;
    when: string;
    action: string;
  } | null;
  business_impact_en: string;
  business_impact_ar: string;

  // Trace (for Evidence Panel / audit)
  plan: PlanStep[];
  insights: Insight[];
  sources: string[];
}

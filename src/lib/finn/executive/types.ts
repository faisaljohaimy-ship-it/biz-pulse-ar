// Phase 12.0 — Executive Digital Employee types (server-only).
export type ExecutiveLanguage = "ar" | "en";
export type ExecutiveTone = "calm" | "confident" | "respectful" | "warm";
export type ExecutiveMode = "advisor" | "briefing" | "listening" | "reporting";

export type Severity = "info" | "watch" | "warn" | "critical";
export type Priority = "low" | "medium" | "high" | "urgent";
export type Confidence = "unknown" | "low" | "medium" | "high";

export interface ExecutivePersonality {
  readonly tone: ExecutiveTone;
  readonly formality: "formal" | "semi-formal";
  readonly verbosity: "brief" | "detailed";
  readonly language: ExecutiveLanguage;
  readonly signaturePhrases_ar: readonly string[];
  readonly signaturePhrases_en: readonly string[];
}

export interface ExecutivePresenceSnapshot {
  readonly mode: ExecutiveMode;
  readonly visible: boolean;
  readonly attentive: boolean;
  readonly readyForQuestion: boolean;
  readonly since: number;
}

export interface DialogTurn {
  readonly id: string;
  readonly at: number;
  readonly speaker: "user" | "aria";
  readonly text: string;
  readonly language: ExecutiveLanguage;
  readonly confidence: Confidence;
}

export interface EvidenceRef {
  readonly kind: "kpi" | "incident" | "report" | "policy" | "note";
  readonly id: string;
  readonly asOf?: string;
}

export interface BriefingItem {
  readonly id: string;
  readonly headline_ar: string;
  readonly headline_en: string;
  readonly detail_ar: string;
  readonly detail_en: string;
  readonly evidence: readonly EvidenceRef[];
}

export interface ExecutiveBriefing {
  readonly issuedAt: number;
  readonly language: ExecutiveLanguage;
  readonly items: readonly BriefingItem[];
  readonly confidence: Confidence;
}

export interface PriorityItem {
  readonly id: string;
  readonly title_ar: string;
  readonly title_en: string;
  readonly priority: Priority;
  readonly score: number;
  readonly evidence: readonly EvidenceRef[];
}

export interface DailySummary {
  readonly issuedAt: number;
  readonly language: ExecutiveLanguage;
  readonly headline_ar: string;
  readonly headline_en: string;
  readonly bullets_ar: readonly string[];
  readonly bullets_en: readonly string[];
  readonly openItems: number | null;
  readonly closedItems: number | null;
  readonly confidence: Confidence;
}

export interface AlertItem {
  readonly id: string;
  readonly severity: Severity;
  readonly title_ar: string;
  readonly title_en: string;
  readonly evidence: readonly EvidenceRef[];
}

export interface InsightItem {
  readonly id: string;
  readonly headline_ar: string;
  readonly headline_en: string;
  readonly reasoning_ar: string;
  readonly reasoning_en: string;
  readonly evidence: readonly EvidenceRef[];
  readonly confidence: Confidence;
}

export interface RecommendationItem {
  readonly id: string;
  readonly action_ar: string;
  readonly action_en: string;
  readonly rationale_ar: string;
  readonly rationale_en: string;
  readonly owner?: string;
  readonly dueBy?: string;
  readonly priority: Priority;
  readonly evidence: readonly EvidenceRef[];
  readonly confidence: Confidence;
}

export interface FollowUpItem {
  readonly id: string;
  readonly text_ar: string;
  readonly text_en: string;
  readonly dueBy?: string;
  readonly owner?: string;
  readonly status: "open" | "in_progress" | "done" | "blocked";
}

export interface WorkflowStep {
  readonly id: string;
  readonly title_ar: string;
  readonly title_en: string;
  readonly kind: "review" | "approve" | "delegate" | "wait" | "acknowledge";
  readonly requires?: readonly string[];
}

export interface ExecutiveWorkflow {
  readonly id: string;
  readonly name_ar: string;
  readonly name_en: string;
  readonly steps: readonly WorkflowStep[];
}

export interface MemoryAnchor {
  readonly key: string;
  readonly value_ar?: string;
  readonly value_en?: string;
  readonly addedAt: number;
  readonly source: "user" | "aria";
}

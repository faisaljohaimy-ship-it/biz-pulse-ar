/**
 * ExecutionEnvelope — internal-only record describing an executable action
 * plan derived from an ExecutiveEnvelope. Phase 3: prepared, simulated,
 * gated. Never actually executed against external systems.
 */
import type { ActionType } from "./action-registry";
import type { ToolId } from "./tool-registry";
import type {
  ConfidenceReport,
  DecisionProposal,
  PriorityAssessment,
  RiskSignal,
} from "../types/executive";
import type { AriaIntent } from "../types/aria";

export type QueueState =
  | "draft"
  | "pending_approval"
  | "approved"
  | "simulated"
  | "blocked"
  | "cancelled"
  | "completed_virtual";

export type PermissionDecision = "allowed" | "blocked" | "needs_approval";

export interface ExecutionStep {
  readonly order: number;
  readonly label_ar: string;
  readonly label_en: string;
  readonly tool: ToolId | null;
  readonly dependsOn: readonly number[];
}

export interface PermissionReport {
  readonly decision: PermissionDecision;
  readonly reason_ar: string;
  readonly reason_en: string;
  readonly requiredRole: string | null;
}

export interface ApprovalReport {
  readonly required: boolean;
  readonly reasons_ar: readonly string[];
  readonly reasons_en: readonly string[];
  readonly approver: string | null;
  readonly status: "not_required" | "pending" | "granted" | "denied";
}

export interface SimulationReport {
  readonly what_ar: string;
  readonly what_en: string;
  readonly expected_result_ar: string;
  readonly expected_result_en: string;
  readonly best_case_ar: string;
  readonly best_case_en: string;
  readonly worst_case_ar: string;
  readonly worst_case_en: string;
  readonly risk_before: number; // 0..1
  readonly risk_after: number; // 0..1
  readonly recommended_path_ar: string;
  readonly recommended_path_en: string;
}

export interface AuditRecord {
  readonly requestId: string;
  readonly intent: AriaIntent;
  readonly actionType: ActionType;
  readonly priority: PriorityAssessment["level"];
  readonly risk: RiskSignal["level"];
  readonly approvalStatus: ApprovalReport["status"];
  readonly queueState: QueueState;
  readonly timestamp: string;
  readonly finalRecommendation: string;
}

export interface ExecutionEnvelope {
  readonly id: string;
  readonly turnId: string;
  readonly intent: AriaIntent;
  readonly objective_ar: string;
  readonly objective_en: string;
  readonly recommendedAction_ar: string;
  readonly recommendedAction_en: string;
  readonly actionType: ActionType;
  readonly priority: PriorityAssessment;
  readonly risk: RiskSignal;
  readonly confidence: ConfidenceReport;
  readonly permission: PermissionReport;
  readonly approval: ApprovalReport;
  readonly steps: readonly ExecutionStep[];
  readonly dependencies: readonly string[];
  readonly expectedImpact_ar: string;
  readonly expectedImpact_en: string;
  readonly validationCriteria: readonly string[];
  readonly rollbackNote_ar: string;
  readonly rollbackNote_en: string;
  readonly simulation: SimulationReport;
  readonly queueState: QueueState;
  readonly audit: AuditRecord;
  readonly decisionRef: DecisionProposal["mode"];
  readonly createdAt: string;
}

/**
 * ExecutionPlanner — converts an executive DecisionProposal (+ risk,
 * priority, confidence, next actions) into a fully-formed ExecutionEnvelope.
 *
 * Phase 3: preparation only. Runs Permission Guard → Approval Gate →
 * Execution Simulator → Audit Trail → Execution Queue.
 */
import { actionRegistry, type ActionType } from "./action-registry";
import { approvalGate } from "./approval-gate";
import { auditTrail } from "./audit-trail";
import { executionQueue } from "./execution-queue";
import { executionSimulator } from "./execution-simulator";
import { permissionGuard, type CallerRole } from "./permission-guard";
import type {
  AuditRecord,
  ExecutionEnvelope,
  ExecutionStep,
  QueueState,
} from "./execution-envelope";
import type { ToolId } from "./tool-registry";
import type {
  ConfidenceReport,
  DecisionProposal,
  NextAction,
  PriorityAssessment,
  RiskSignal,
} from "../types/executive";
import type { AriaIntent } from "../types/aria";

function decisionToActionType(mode: DecisionProposal["mode"], intent: AriaIntent): ActionType {
  switch (mode) {
    case "escalate":
      return "escalate";
    case "act_now":
      return intent === "executive" ? "request_approval" : "prepare_task";
    case "delay":
      return "prepare_task";
    case "gather_more_info":
      return "analyze";
    case "no_action":
      return "no_action";
    case "recommend":
    default:
      return intent === "executive" ? "prepare_report" : "summarize";
  }
}

function inferTool(actionType: ActionType): ToolId | null {
  switch (actionType) {
    case "prepare_email":
      return "outlook";
    case "prepare_meeting":
      return "teams";
    case "prepare_report":
      return "reports";
    case "suggest_automation":
      return "m365";
    default:
      return null;
  }
}

function buildSteps(
  actionType: ActionType,
  nextActions: readonly NextAction[],
): readonly ExecutionStep[] {
  const tool = inferTool(actionType);
  const base: ExecutionStep[] = nextActions.map((a, idx) => ({
    order: idx + 1,
    label_ar: a.label_ar,
    label_en: a.label_en,
    tool: idx === 0 ? tool : null,
    dependsOn: idx === 0 ? [] : [idx],
  }));
  if (base.length === 0) {
    base.push({
      order: 1,
      label_ar: "تحضير المخرجات ومراجعتها قبل الاعتماد.",
      label_en: "Prepare the deliverable and review before approval.",
      tool,
      dependsOn: [],
    });
  }
  base.push({
    order: base.length + 1,
    label_ar: "التحقق من نتائج المحاكاة قبل الاعتماد النهائي.",
    label_en: "Verify simulation results before final approval.",
    tool: null,
    dependsOn: [base.length],
  });
  return base;
}

function buildValidationCriteria(actionType: ActionType): readonly string[] {
  const shared = ["objective_clear", "risk_within_tolerance", "confidence_documented"];
  const specific: Partial<Record<ActionType, readonly string[]>> = {
    prepare_report: ["kpi_verified", "narrative_bilingual"],
    prepare_email: ["recipient_verified", "tone_executive"],
    prepare_meeting: ["agenda_present", "attendees_verified"],
    escalate: ["escalation_path_defined", "approver_identified"],
    suggest_automation: ["process_baseline_measured", "rollback_defined"],
  };
  return [...shared, ...(specific[actionType] ?? [])];
}

function initialQueueState(
  permission: ReturnType<typeof permissionGuard.check>,
  approvalRequired: boolean,
): QueueState {
  if (permission.decision === "blocked") return "blocked";
  if (permission.decision === "needs_approval" || approvalRequired) return "pending_approval";
  return "draft";
}

interface PlanInput {
  turnId: string;
  intent: AriaIntent;
  objective_ar: string;
  objective_en: string;
  decision: DecisionProposal;
  risk: RiskSignal;
  priority: PriorityAssessment;
  confidence: ConfidenceReport;
  nextActions: readonly NextAction[];
  caller?: { role: CallerRole };
}

export const executionPlanner = {
  plan(input: PlanInput): ExecutionEnvelope {
    const actionType = decisionToActionType(input.decision.mode, input.intent);
    const action = actionRegistry.get(actionType);

    const permission = permissionGuard.check(action, input.risk, input.caller);
    const approval = approvalGate.evaluate(action, input.risk, permission);
    const simulation = executionSimulator.simulate(action, input.risk, input.priority);
    const steps = buildSteps(actionType, input.nextActions);
    const validationCriteria = buildValidationCriteria(actionType);
    const queueState = initialQueueState(permission, approval.required);

    const recommendedAction_ar =
      input.decision.recommended?.label_ar ?? action.label_ar;
    const recommendedAction_en =
      input.decision.recommended?.label_en ?? action.label_en;

    const id = `exec_${input.turnId}`;
    const audit: AuditRecord = {
      requestId: id,
      intent: input.intent,
      actionType,
      priority: input.priority.level,
      risk: input.risk.level,
      approvalStatus: approval.status,
      queueState,
      timestamp: new Date().toISOString(),
      finalRecommendation: recommendedAction_en,
    };
    auditTrail.record(audit);

    const envelope: ExecutionEnvelope = {
      id,
      turnId: input.turnId,
      intent: input.intent,
      objective_ar: input.objective_ar,
      objective_en: input.objective_en,
      recommendedAction_ar,
      recommendedAction_en,
      actionType,
      priority: input.priority,
      risk: input.risk,
      confidence: input.confidence,
      permission,
      approval,
      steps,
      dependencies: [],
      expectedImpact_ar: input.decision.operational_impact_ar,
      expectedImpact_en: input.decision.operational_impact_en,
      validationCriteria,
      rollbackNote_ar:
        action.type === "no_action"
          ? "لا يوجد تغيير — لا حاجة للتراجع."
          : "يمكن التراجع بإلغاء الإجراء قبل الاعتماد النهائي.",
      rollbackNote_en:
        action.type === "no_action"
          ? "No change — no rollback needed."
          : "Rollback by cancelling the action before final approval.",
      simulation,
      queueState,
      audit,
      decisionRef: input.decision.mode,
      createdAt: new Date().toISOString(),
    };

    executionQueue.enqueue(envelope);
    // Move eligible envelopes to `simulated` immediately — Phase 3 stops here.
    if (queueState === "draft") {
      executionQueue.transition(id, "simulated");
      return { ...envelope, queueState: "simulated" };
    }
    return envelope;
  },
};

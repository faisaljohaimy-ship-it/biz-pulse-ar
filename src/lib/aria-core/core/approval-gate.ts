/**
 * ApprovalGate — records approval requirements for a planned action.
 * Phase 3: prepares the approval envelope only; does not execute after
 * approval is granted.
 */
import type { ActionDefinition } from "./action-registry";
import type { ApprovalReport, PermissionReport } from "./execution-envelope";
import type { RiskSignal } from "../types/executive";

const EXTERNAL_ACTIONS = new Set([
  "prepare_email",
  "prepare_meeting",
  "prepare_report",
  "escalate",
  "request_approval",
  "suggest_automation",
]);

export const approvalGate = {
  evaluate(
    action: ActionDefinition,
    risk: RiskSignal,
    permission: PermissionReport,
  ): ApprovalReport {
    const reasons_ar: string[] = [];
    const reasons_en: string[] = [];

    if (permission.decision === "needs_approval") {
      reasons_ar.push("قرار الصلاحية يستلزم موافقة صريحة.");
      reasons_en.push("Permission decision requires explicit approval.");
    }
    if (action.approvalRequired) {
      reasons_ar.push("نوع الإجراء مصنّف كإجراء يتطلب موافقة.");
      reasons_en.push("Action type is classified as approval-required.");
    }
    if (EXTERNAL_ACTIONS.has(action.type)) {
      reasons_ar.push("الإجراء ذو أثر خارجي أو تواصل رسمي.");
      reasons_en.push("Action has external impact or formal communication.");
    }
    if (risk.level === "high" || risk.level === "critical") {
      reasons_ar.push("مستوى المخاطر مرتفع أو حرج.");
      reasons_en.push("Risk level is high or critical.");
    }

    const required = reasons_en.length > 0 && permission.decision !== "blocked";

    if (permission.decision === "blocked") {
      return {
        required: false,
        reasons_ar: ["الإجراء مرفوض بسبب نقص الصلاحية."],
        reasons_en: ["Action blocked due to insufficient permission."],
        approver: null,
        status: "denied",
      };
    }

    return {
      required,
      reasons_ar,
      reasons_en,
      approver: required ? "executive_owner" : null,
      status: required ? "pending" : "not_required",
    };
  },
};

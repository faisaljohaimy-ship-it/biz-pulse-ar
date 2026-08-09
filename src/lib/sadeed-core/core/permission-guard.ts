/**
 * PermissionGuard — decides whether a planned action is allowed, blocked,
 * or requires approval for the current caller. Pure, no side effects.
 * When permission is unknown the guard MUST return `needs_approval`.
 */
import type { ActionDefinition } from "./action-registry";
import type { PermissionReport } from "./execution-envelope";
import type { RiskSignal } from "../types/executive";

export type CallerRole = "viewer" | "operator" | "manager" | "executive" | "system" | "unknown";

const RANK: Record<Exclude<CallerRole, "unknown">, number> = {
  viewer: 1,
  operator: 2,
  manager: 3,
  executive: 4,
  system: 5,
};

export const permissionGuard = {
  check(
    action: ActionDefinition,
    risk: RiskSignal,
    caller: { role: CallerRole } = { role: "unknown" },
  ): PermissionReport {
    if (caller.role === "unknown") {
      return {
        decision: "needs_approval",
        reason_ar: "دور المستخدم غير معروف — لا يجوز افتراض الصلاحية.",
        reason_en: "Caller role is unknown — permission cannot be assumed.",
        requiredRole: action.minimumRole,
      };
    }

    const callerRank = RANK[caller.role];
    const requiredRank = RANK[action.minimumRole];

    if (callerRank < requiredRank) {
      return {
        decision: "blocked",
        reason_ar: `يتطلب هذا الإجراء صلاحية ${action.minimumRole} على الأقل.`,
        reason_en: `This action requires at least ${action.minimumRole} role.`,
        requiredRole: action.minimumRole,
      };
    }

    if (action.approvalRequired || risk.level === "high" || risk.level === "critical") {
      return {
        decision: "needs_approval",
        reason_ar: "إجراء حساس أو عالي المخاطر — يحتاج موافقة صريحة.",
        reason_en: "Sensitive or high-risk action — explicit approval required.",
        requiredRole: action.minimumRole,
      };
    }

    return {
      decision: "allowed",
      reason_ar: "ضمن صلاحيات المستخدم ولا يحتاج موافقة إضافية.",
      reason_en: "Within caller permissions and needs no extra approval.",
      requiredRole: action.minimumRole,
    };
  },
};

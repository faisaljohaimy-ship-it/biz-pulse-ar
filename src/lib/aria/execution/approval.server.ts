/**
 * Phase 8.5 — Runtime human-in-the-loop approvals.
 *
 * Distinct from Task Bus approval gates (which the Bus resolves at
 * enqueue time). These are runtime approvals raised by the Director
 * itself — for example after a policy-triggered failure or before a
 * recovery escalates to a mutating action.
 */
import type { ExecutionApproval } from "./types";
import { appendApproval, getSession } from "./session.server";
import { emitExecutionEvent } from "./events";

function newApprovalId(): string {
  return `apr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function requestApproval(
  sessionId: string,
  reason: string,
  taskId?: string | null,
): ExecutionApproval | null {
  const s = getSession(sessionId);
  if (!s) return null;
  const approval: ExecutionApproval = {
    id: newApprovalId(),
    session_id: sessionId,
    task_id: taskId ?? null,
    reason,
    requested_at: new Date().toISOString(),
    resolved_at: null,
    granted: null,
  };
  appendApproval(sessionId, approval);
  emitExecutionEvent("ApprovalRequested", sessionId, s.mission_id, {
    approval_id: approval.id,
    task_id: approval.task_id,
    reason,
  });
  return approval;
}

export function resolveApproval(
  sessionId: string,
  approvalId: string,
  granted: boolean,
  resolver: string,
): ExecutionApproval | null {
  const s = getSession(sessionId);
  if (!s) return null;
  const approval = s.approvals.find((a) => a.id === approvalId);
  if (!approval) return null;
  approval.granted = granted;
  approval.resolver = resolver;
  approval.resolved_at = new Date().toISOString();
  emitExecutionEvent(granted ? "ApprovalGranted" : "ApprovalRejected", sessionId, s.mission_id, {
    approval_id: approvalId,
    resolver,
  });
  return approval;
}

export function pendingApprovals(sessionId: string): ExecutionApproval[] {
  const s = getSession(sessionId);
  if (!s) return [];
  return s.approvals.filter((a) => a.granted === null);
}

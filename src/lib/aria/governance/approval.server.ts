/**
 * Approval store — request/approve/reject/expire.
 * In-memory; caller can wire to persistence in later phase.
 */
import type { ApprovalRequest, ApprovalStatus, AuthorityLevel } from "./types";
import { ApprovalRequestSchema } from "./contracts";
import { record } from "./audit-trail.server";
import { incr } from "./metrics.server";

const store = new Map<string, ApprovalRequest>();

function put(a: ApprovalRequest): ApprovalRequest {
  const parsed = ApprovalRequestSchema.parse(a);
  store.set(parsed.id, parsed);
  return parsed;
}

export function requestApproval(input: {
  action_id: string;
  required_from: AuthorityLevel;
  ttl_ms?: number;
  auto?: boolean;
}): ApprovalRequest {
  const now = new Date();
  const id = `appr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const status: ApprovalStatus = input.auto ? "auto_approved" : "pending";
  const req: ApprovalRequest = {
    id,
    action_id: input.action_id,
    required_from: input.required_from,
    status,
    requested_at: now.toISOString(),
    resolved_at: input.auto ? now.toISOString() : undefined,
    expires_at: input.ttl_ms ? new Date(now.getTime() + input.ttl_ms).toISOString() : undefined,
  };
  const stored = put(req);
  record({
    action_id: input.action_id,
    stage: "approval.request",
    actor: "governance",
    ok: true,
    detail: `status=${stored.status} required_from=${stored.required_from}`,
  });
  incr(`gov.approval.${stored.status}`);
  return stored;
}

export function decideApproval(
  id: string,
  decision: "approved" | "rejected" | "escalated" | "overridden",
  decided_by: string,
  reason?: string,
): ApprovalRequest | null {
  const cur = store.get(id);
  if (!cur) return null;
  if (cur.status !== "pending") return cur;
  const updated: ApprovalRequest = {
    ...cur,
    status: decision,
    resolved_at: new Date().toISOString(),
    decided_by,
    decision_reason: reason,
  };
  const stored = put(updated);
  record({
    action_id: cur.action_id,
    stage: `approval.${decision}`,
    actor: decided_by,
    ok: decision === "approved" || decision === "overridden",
    detail: reason,
  });
  incr(`gov.approval.${decision}`);
  return stored;
}

export function expireStale(now: number = Date.now()): number {
  let n = 0;
  for (const [id, req] of store) {
    if (req.status === "pending" && req.expires_at && Date.parse(req.expires_at) < now) {
      put({ ...req, status: "expired", resolved_at: new Date(now).toISOString() });
      record({
        action_id: req.action_id,
        stage: "approval.expired",
        actor: "governance",
        ok: false,
        detail: `approval ${id} expired`,
      });
      incr("gov.approval.expired");
      n++;
    }
  }
  return n;
}

export function getApproval(id: string): ApprovalRequest | null {
  return store.get(id) ?? null;
}

export function listPendingFor(level: AuthorityLevel): readonly ApprovalRequest[] {
  return Array.from(store.values()).filter(
    (a) => a.status === "pending" && a.required_from === level,
  );
}

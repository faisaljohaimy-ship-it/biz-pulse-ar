/**
 * Per-agent permission ledger. Permissions are declared explicitly in
 * the manifest and cannot be widened at runtime.
 */
import type { AgentId } from "../orchestrator/types";
import type { AgentPermission } from "./types";

const ledger = new Map<AgentId, ReadonlySet<AgentPermission>>();

export function recordPermissions(
  agentId: AgentId,
  perms: AgentPermission[],
): void {
  ledger.set(agentId, new Set(perms));
}

export function clearPermissions(agentId: AgentId): void {
  ledger.delete(agentId);
}

export function hasPermission(
  agentId: AgentId,
  perm: AgentPermission,
): boolean {
  return ledger.get(agentId)?.has(perm) ?? false;
}

export function requirePermission(
  agentId: AgentId,
  perm: AgentPermission,
): void {
  if (!hasPermission(agentId, perm)) {
    throw new Error(
      `[marketplace] agent "${agentId}" missing permission "${perm}"`,
    );
  }
}

export function listPermissions(agentId: AgentId): AgentPermission[] {
  return Array.from(ledger.get(agentId) ?? []);
}

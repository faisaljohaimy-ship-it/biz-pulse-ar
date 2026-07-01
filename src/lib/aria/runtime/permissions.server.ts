/**
 * Phase 9.2 — Permission scopes.
 */

import { requireAgent, updateAgent } from "./registry.server";
import type { PermissionScope } from "./types";

export function grantPermission(agentId: string, scope: PermissionScope): PermissionScope[] {
  const rec = requireAgent(agentId);
  const existing = rec.spec.permissions.filter((p) => p.scope !== scope.scope);
  const next: PermissionScope[] = [...existing, scope];
  updateAgent(agentId, { spec: { ...rec.spec, permissions: next } });
  return next;
}

export function revokePermission(agentId: string, scopeName: string): PermissionScope[] {
  const rec = requireAgent(agentId);
  const next = rec.spec.permissions.filter((p) => p.scope !== scopeName);
  updateAgent(agentId, { spec: { ...rec.spec, permissions: next } });
  return next;
}

export function hasPermission(agentId: string, scopeName: string): boolean {
  const rec = requireAgent(agentId);
  const now = Date.now();
  return rec.spec.permissions.some(
    (p) => p.scope === scopeName && (p.expires_at === null || Date.parse(p.expires_at) > now),
  );
}

export function assertPermission(agentId: string, scopeName: string): void {
  if (!hasPermission(agentId, scopeName)) {
    throw new Error(`runtime: agent ${agentId} lacks permission ${scopeName}`);
  }
}

/**
 * Phase 9.2 — Authorization. Capability + permission checks.
 */

import { requireAgent } from "./registry.server";
import { hasPermission } from "./permissions.server";

export interface AuthorizationDecision {
  allowed: boolean;
  reason: string;
}

export function authorizeCapability(agentId: string, capabilityId: string): AuthorizationDecision {
  const rec = requireAgent(agentId);
  const has = rec.spec.capabilities.some((c) => c.capability_id === capabilityId);
  return {
    allowed: has,
    reason: has ? "capability granted from marketplace" : "capability not present on agent",
  };
}

export function authorizeAction(
  agentId: string,
  scopeName: string,
  capabilityId?: string,
): AuthorizationDecision {
  if (!hasPermission(agentId, scopeName)) {
    return { allowed: false, reason: `missing permission ${scopeName}` };
  }
  if (capabilityId) {
    const cap = authorizeCapability(agentId, capabilityId);
    if (!cap.allowed) return cap;
  }
  return { allowed: true, reason: "permission and capability satisfied" };
}

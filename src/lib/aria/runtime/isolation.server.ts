/**
 * Phase 9.2 — Isolation. Ensures cross-tenant and cross-agent boundaries.
 */

import { requireAgent } from "./registry.server";

export function assertSameOrg(agentA: string, agentB: string): void {
  const a = requireAgent(agentA);
  const b = requireAgent(agentB);
  if (a.spec.identity.org_id !== b.spec.identity.org_id) {
    throw new Error(
      `runtime: isolation violation ${agentA}(${a.spec.identity.org_id}) vs ${agentB}(${b.spec.identity.org_id})`,
    );
  }
}

export function assertOrgScope(agentId: string, orgId: string | null): void {
  const rec = requireAgent(agentId);
  if (rec.spec.identity.org_id !== orgId) {
    throw new Error(
      `runtime: isolation violation ${agentId} expected org ${orgId} got ${rec.spec.identity.org_id}`,
    );
  }
}

export function sameParent(agentA: string, agentB: string): boolean {
  const a = requireAgent(agentA);
  const b = requireAgent(agentB);
  return a.spec.identity.parent_agent_id === b.spec.identity.parent_agent_id;
}

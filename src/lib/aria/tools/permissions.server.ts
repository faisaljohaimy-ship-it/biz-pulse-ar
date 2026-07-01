/**
 * Phase 9.3 — Permission registry per agent.
 */

const grants = new Map<string, Set<string>>(); // agent_id -> scopes

export function grantPermission(agentId: string, scope: string): void {
  const set = grants.get(agentId) ?? new Set<string>();
  set.add(scope);
  grants.set(agentId, set);
}

export function revokePermission(agentId: string, scope: string): void {
  const set = grants.get(agentId);
  if (!set) return;
  set.delete(scope);
  if (set.size === 0) grants.delete(agentId);
}

export function hasPermission(agentId: string, scope: string): boolean {
  return grants.get(agentId)?.has(scope) === true;
}

export function listPermissions(agentId: string): string[] {
  return Array.from(grants.get(agentId) ?? []);
}

export function clearPermissions(): void {
  grants.clear();
}

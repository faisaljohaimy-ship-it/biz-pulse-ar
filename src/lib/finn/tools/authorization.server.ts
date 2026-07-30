/**
 * Phase 9.3 — Authorization checks combining permissions + policy.
 */

import { hasPermission } from "./permissions.server";
import type { ToolDescriptor } from "./types";

export interface AuthorizationResult {
  allowed: boolean;
  missing: readonly string[];
  reason: string;
}

export function authorize(agentId: string, tool: ToolDescriptor): AuthorizationResult {
  const missing: string[] = [];
  for (const req of tool.requires) {
    if (!hasPermission(agentId, req.scope)) missing.push(req.scope);
  }
  if (missing.length > 0) {
    return {
      allowed: false,
      missing,
      reason: `missing permission scopes: ${missing.join(", ")}`,
    };
  }
  return { allowed: true, missing: [], reason: "all required scopes granted" };
}

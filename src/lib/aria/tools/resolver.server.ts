/**
 * Phase 9.3 — Tool resolver. Resolves a tool id or capability id to a
 * concrete descriptor, or reports unknown.
 */

import { getTool, listTools } from "./registry.server";
import type { ToolDescriptor } from "./types";

export interface ResolveResult {
  found: boolean;
  descriptor: ToolDescriptor | null;
  reason: string;
}

export function resolveByToolId(toolId: string): ResolveResult {
  const d = getTool(toolId);
  return d
    ? { found: true, descriptor: d, reason: "matched tool_id" }
    : { found: false, descriptor: null, reason: `unknown tool_id ${toolId}` };
}

export function resolveByCapability(capabilityId: string): ResolveResult {
  const hit = listTools().find((t) => t.capability_id === capabilityId);
  return hit
    ? { found: true, descriptor: hit, reason: "matched capability_id" }
    : {
        found: false,
        descriptor: null,
        reason: `no tool registered for capability ${capabilityId}`,
      };
}

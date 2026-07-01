/**
 * Phase 9.3 — Tool registry (in-memory, server-only).
 */

import { ToolDescriptorSchema } from "./contracts";
import type { AdapterKind, ToolDescriptor } from "./types";

const tools = new Map<string, ToolDescriptor>();

export function registerTool(desc: ToolDescriptor): ToolDescriptor {
  const parsed = ToolDescriptorSchema.parse(desc) as ToolDescriptor;
  if (tools.has(parsed.tool_id)) {
    throw new Error(`tools: duplicate tool_id ${parsed.tool_id}`);
  }
  tools.set(parsed.tool_id, parsed);
  return parsed;
}

export function deregisterTool(toolId: string): boolean {
  return tools.delete(toolId);
}

export function getTool(toolId: string): ToolDescriptor | null {
  return tools.get(toolId) ?? null;
}

export function requireTool(toolId: string): ToolDescriptor {
  const t = tools.get(toolId);
  if (!t) throw new Error(`tools: tool not found ${toolId}`);
  return t;
}

export function listTools(): ToolDescriptor[] {
  return Array.from(tools.values());
}

export function listToolsByAdapter(adapter: AdapterKind): ToolDescriptor[] {
  return listTools().filter((t) => t.adapter === adapter);
}

export function clearRegistry(): void {
  tools.clear();
}

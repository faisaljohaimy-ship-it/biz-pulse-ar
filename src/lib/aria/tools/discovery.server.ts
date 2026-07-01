/**
 * Phase 9.3 — Discovery. Search by keyword or adapter with a compact result.
 */

import { listTools } from "./registry.server";
import type { AdapterKind, ToolDescriptor } from "./types";

export interface DiscoveryQuery {
  query?: string;
  adapter?: AdapterKind;
  capability_id?: string;
  limit?: number;
}

export interface DiscoveryHit {
  tool_id: string;
  adapter: AdapterKind;
  capability_id: string;
  title: string;
  description: string;
  input_schema_ref: string;
  output_schema_ref: string;
}

export function discoverTools(q: DiscoveryQuery = {}): DiscoveryHit[] {
  const needle = q.query?.toLowerCase().trim() ?? "";
  const limit = Math.max(1, Math.min(50, q.limit ?? 10));
  const matches = listTools().filter((t) => {
    if (q.adapter && t.adapter !== q.adapter) return false;
    if (q.capability_id && t.capability_id !== q.capability_id) return false;
    if (!needle) return true;
    return (
      t.tool_id.toLowerCase().includes(needle) ||
      t.title.toLowerCase().includes(needle) ||
      t.description.toLowerCase().includes(needle) ||
      t.capability_id.toLowerCase().includes(needle)
    );
  });
  return matches.slice(0, limit).map(toHit);
}

function toHit(t: ToolDescriptor): DiscoveryHit {
  return {
    tool_id: t.tool_id,
    adapter: t.adapter,
    capability_id: t.capability_id,
    title: t.title,
    description: t.description,
    input_schema_ref: t.input_schema_ref,
    output_schema_ref: t.output_schema_ref,
  };
}

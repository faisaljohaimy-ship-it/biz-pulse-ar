/**
 * Phase 9.3 — Capability matching. Pairs a required capability against
 * registered tools with the strictest constraints first.
 */

import { listTools } from "./registry.server";
import type { AdapterKind, SideEffect, ToolDescriptor } from "./types";

export interface CapabilityRequirement {
  capability_id: string;
  preferred_adapters?: readonly AdapterKind[];
  max_side_effect?: SideEffect;
}

const SEVERITY: Record<SideEffect, number> = {
  none: 0,
  read: 1,
  write: 2,
  delete: 3,
  admin: 4,
};

export interface CapabilityMatch {
  descriptor: ToolDescriptor;
  score: number;
  reasons: readonly string[];
}

export function matchCapability(req: CapabilityRequirement): CapabilityMatch[] {
  const maxSev = req.max_side_effect ? SEVERITY[req.max_side_effect] : SEVERITY.admin;
  const candidates = listTools().filter(
    (t) => t.capability_id === req.capability_id && SEVERITY[t.side_effect] <= maxSev,
  );
  return candidates
    .map((t) => {
      const reasons: string[] = ["capability match"];
      let score = 10;
      if (req.preferred_adapters?.includes(t.adapter)) {
        score += 5;
        reasons.push(`preferred adapter ${t.adapter}`);
      }
      score -= SEVERITY[t.side_effect];
      return { descriptor: t, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

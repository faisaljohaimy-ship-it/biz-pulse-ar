/**
 * Permission boundary — enforces tenant, kind, and authority boundaries.
 */
import type { AuthorityLevel, ProposedAction } from "./types";
import { canDecide } from "./decision-rights.server";
import { rankOf } from "./authority.server";

export interface BoundaryCheck {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

export function withinBoundary(
  action: ProposedAction,
  granted: AuthorityLevel | null,
  tenant_context: string | null,
): BoundaryCheck {
  const reasons: string[] = [];
  if (!granted) reasons.push("no_authority");
  else if (!canDecide(granted, action.kind)) reasons.push(`kind_beyond_authority:${action.kind}`);

  if (action.tenant_id && tenant_context && action.tenant_id !== tenant_context) {
    const rank = granted ? rankOf(granted) : 0;
    if (rank < rankOf("board"))
      reasons.push(`cross_tenant:${tenant_context}->${action.tenant_id} requires board`);
  }
  return { ok: reasons.length === 0, reasons };
}

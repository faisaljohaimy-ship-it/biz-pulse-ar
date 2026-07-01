/**
 * Manual override — executive/board level bypass, always audited.
 * Never silent: every override is stored with justification and evidence.
 */
import type { AuthorityLevel, EvidenceRef, OverrideEntry } from "./types";
import { record } from "./audit-trail.server";
import { rankOf } from "./authority.server";
import { incr } from "./metrics.server";

const store = new Map<string, OverrideEntry>();

export interface OverrideInput {
  readonly action_id: string;
  readonly override_by: string;
  readonly authority: AuthorityLevel;
  readonly justification: string;
  readonly evidence: readonly EvidenceRef[];
}

export interface OverrideResult {
  readonly ok: boolean;
  readonly entry?: OverrideEntry;
  readonly reason?: string;
}

export function applyOverride(input: OverrideInput): OverrideResult {
  if (!input.justification || input.justification.trim().length < 8) {
    return { ok: false, reason: "override justification required (min 8 chars)" };
  }
  if (rankOf(input.authority) < rankOf("executive")) {
    return { ok: false, reason: `override requires executive+; got ${input.authority}` };
  }
  if (input.evidence.length === 0) {
    return { ok: false, reason: "override requires at least one evidence ref" };
  }
  const entry: OverrideEntry = {
    id: `ovr_${Date.now().toString(36)}_${store.size.toString(36)}`,
    action_id: input.action_id,
    override_by: input.override_by,
    justification: input.justification,
    at: new Date().toISOString(),
    evidence: input.evidence,
  };
  store.set(entry.id, entry);
  record({
    action_id: input.action_id,
    stage: "override",
    actor: input.override_by,
    ok: true,
    detail: input.justification,
    evidence: input.evidence,
  });
  incr("gov.override");
  return { ok: true, entry };
}

export function listOverrides(action_id: string): readonly OverrideEntry[] {
  return Array.from(store.values()).filter((o) => o.action_id === action_id);
}

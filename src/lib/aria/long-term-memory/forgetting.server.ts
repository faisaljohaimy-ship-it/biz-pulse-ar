/**
 * Policy-based forgetting.
 *
 * Forgetting is a status transition (`forgotten`) — the record id and
 * its evidence provenance are preserved for auditability. No hard
 * deletion. Only three reasons are accepted: policy, consent_revoked,
 * retention_expired.
 */

import { getRecord, replaceRecord } from "./memory-store.server";
import { audit } from "./audit.server";
import { emitTelemetry } from "./telemetry.server";
import type { ForgettingReport } from "./types";

function reportId(ts: string, ids: readonly string[]): string {
  let h = 5381;
  const seed = `forget|${ts}|${ids.join(",")}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `forget_${(h >>> 0).toString(16)}`;
}

export function forget(
  ids: readonly string[],
  reason: "policy" | "consent_revoked" | "retention_expired",
): ForgettingReport {
  if (ids.length === 0) throw new Error("forgetting: no ids provided");
  const now = new Date().toISOString();
  const forgotten: string[] = [];
  for (const id of ids) {
    const record = getRecord(id);
    if (!record) continue;
    if (record.status === "forgotten") continue;
    replaceRecord({
      ...record,
      status: "forgotten",
      body: "[forgotten]",
      updated_at: now,
    });
    forgotten.push(id);
    audit(`forget.${reason}`, id, record.evidence.map((e) => e.id));
  }
  emitTelemetry("forget.run", "notice", `reason=${reason} count=${forgotten.length}`);
  return Object.freeze({
    id: reportId(now, forgotten),
    created_at: now,
    forgotten_ids: Object.freeze(forgotten) as readonly string[],
    reason,
    evidence_preserved: true,
  });
}

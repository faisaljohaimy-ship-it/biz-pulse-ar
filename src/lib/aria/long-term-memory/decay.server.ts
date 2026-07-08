/**
 * Decay pipeline.
 *
 * Records whose freshness drops below thresholds transition status:
 *   freshness < 0.05 → status="decayed"
 *   0.05 ≤ freshness < 0.20 → status="compressed" (candidate)
 *
 * Decay never deletes a record and never mutates its evidence.
 * Every transition is audited.
 */

import { listRecords, replaceRecord } from "./memory-store.server";
import { freshnessOf } from "./freshness.server";
import { audit } from "./audit.server";
import { emitTelemetry } from "./telemetry.server";
import type { DecayReport, MemoryRecord } from "./types";

function reportId(ts: string): string {
  let h = 5381;
  const seed = `decay|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `dec_${(h >>> 0).toString(16)}`;
}

export function runDecay(now: Date = new Date()): DecayReport {
  const created_at = now.toISOString();
  const decayed: string[] = [];
  const compressed: string[] = [];
  let evaluated = 0;

  for (const record of listRecords()) {
    if (record.status !== "active" && record.status !== "compressed") continue;
    evaluated += 1;
    const fresh = freshnessOf(record.kind, record.updated_at, now);
    if (fresh < 0 || fresh >= 0.2) continue;
    const next: MemoryRecord = {
      ...record,
      status: fresh < 0.05 ? "decayed" : "compressed",
      updated_at: created_at,
    };
    replaceRecord(next);
    if (next.status === "decayed") decayed.push(next.id);
    else compressed.push(next.id);
    audit(
      `decay.${next.status}`,
      next.id,
      next.evidence.map((e) => e.id),
    );
  }

  emitTelemetry(
    "decay.run",
    "info",
    `evaluated=${evaluated} decayed=${decayed.length} compressed=${compressed.length}`,
  );
  return Object.freeze({
    id: reportId(created_at),
    created_at,
    evaluated,
    decayed_ids: Object.freeze(decayed) as readonly string[],
    compressed_ids: Object.freeze(compressed) as readonly string[],
  });
}

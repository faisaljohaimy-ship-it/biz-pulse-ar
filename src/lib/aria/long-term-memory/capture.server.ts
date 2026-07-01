/**
 * Generic capture pipeline used by every memory-kind module.
 *
 * capture → validate → link evidence → classify → privacy → store → audit.
 * Any failure aborts the pipeline; nothing is written on error.
 */

import { CaptureInputSchema, type CaptureInput } from "./contracts";
import { linkEvidence } from "./evidence-linking.server";
import { evaluatePrivacy } from "./privacy.server";
import { putRecord } from "./memory-store.server";
import { audit } from "./audit.server";
import { emitTelemetry } from "./telemetry.server";
import type { MemoryKind, MemoryRecord } from "./types";

function memoryId(kind: MemoryKind, workspace_id: string, title: string, ts: string): string {
  let h = 5381;
  const seed = `${kind}|${workspace_id}|${title}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `mem_${kind}_${(h >>> 0).toString(16)}`;
}

export function captureRecord(kind: MemoryKind, raw: Omit<CaptureInput, "kind">): MemoryRecord {
  const input = CaptureInputSchema.parse({ ...raw, kind });
  const linked = linkEvidence(input.evidence);
  const privacy = evaluatePrivacy(input.sensitivity, input.body);
  if (!privacy.allowed) {
    emitTelemetry("capture.rejected", "warn", privacy.reason);
    throw new Error(`long-term-memory: capture rejected — ${privacy.reason}`);
  }

  const now = new Date().toISOString();
  const record: MemoryRecord = {
    id: memoryId(input.kind, input.workspace_id, input.title, now),
    kind: input.kind,
    workspace_id: input.workspace_id,
    created_at: now,
    updated_at: now,
    title: input.title,
    body: input.body,
    tags: input.tags,
    evidence: linked.evidence,
    confidence: input.confidence,
    sensitivity: input.sensitivity,
    recurrence: 1 + linked.duplicates,
    business_impact: input.business_impact,
    source_quality: input.source_quality,
    last_accessed_at: now,
    access_count: 0,
    conflict_status: "none",
    conflict_partner_ids: [],
    status: "active",
  };

  const stored = putRecord(record);
  audit(`capture.${kind}`, stored.id, stored.evidence.map((e) => e.id));
  emitTelemetry("capture.ok", "info", `${kind}:${stored.id}`);
  return stored;
}

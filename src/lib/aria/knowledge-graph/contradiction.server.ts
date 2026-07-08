/**
 * Contradiction detection.
 *
 * Surfaces contradictions between edges (e.g. the same subject
 * `mitigates` and `violates` the same target) and between entities
 * that share canonical identity but disagree on attribute values.
 * Contradictions are FLAGGED — never silently reconciled.
 */

import {
  listEntities,
  listRelationships,
  replaceEntity,
  replaceRelationship,
} from "./graph-store.server";
import { audit } from "./audit.server";
import { emitTelemetry } from "./telemetry.server";
import type { ContradictionReport, EntityRecord, RelationshipRecord } from "./types";

function contradictionId(subject: string, ids: readonly string[], ts: string): string {
  let h = 5381;
  const seed = `cnd|${subject}|${ids.join(",")}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `cnd_${(h >>> 0).toString(16)}`;
}

function attributesDiverge(a: EntityRecord, b: EntityRecord): boolean {
  for (const [key, value] of Object.entries(a.attributes)) {
    if (!(key in b.attributes)) continue;
    if (b.attributes[key] !== value) return true;
  }
  return false;
}

export function detectContradictions(workspace_id: string): readonly ContradictionReport[] {
  const now = new Date().toISOString();
  const reports: ContradictionReport[] = [];

  // Entity contradictions: same canonical name + kind, divergent attributes.
  const entityGroups = new Map<string, EntityRecord[]>();
  for (const e of listEntities(workspace_id)) {
    const key = `${e.kind}|${e.canonical_name.trim().toLowerCase()}`;
    const list = entityGroups.get(key) ?? [];
    list.push(e);
    entityGroups.set(key, list);
  }
  for (const list of entityGroups.values()) {
    if (list.length < 2) continue;
    const contradictory = list.filter((a) =>
      list.some((b) => a.id !== b.id && attributesDiverge(a, b)),
    );
    if (contradictory.length < 2) continue;
    const ids = contradictory.map((e) => e.id);
    for (const e of contradictory) {
      replaceEntity({
        ...e,
        contradiction_status: "flagged",
        contradiction_partner_ids: ids.filter((id) => id !== e.id),
        updated_at: now,
      });
    }
    reports.push(
      Object.freeze({
        id: contradictionId("entity", ids, now),
        created_at: now,
        subject: "entity",
        member_ids: Object.freeze(ids) as readonly string[],
        reason: "same kind + canonical_name with divergent attribute values",
        status: "flagged",
      }),
    );
    audit("contradiction.entity", ids.join(","), []);
  }

  // Relationship contradictions: same subject mitigates + violates same target,
  // or explicit `contradicts` edges.
  const rels = listRelationships(workspace_id);
  const mitigates = rels.filter((r) => r.kind === "mitigates");
  const violates = rels.filter((r) => r.kind === "violates");
  for (const m of mitigates) {
    for (const v of violates) {
      if (m.from_id !== v.from_id || m.to_id !== v.to_id) continue;
      const ids = [m.id, v.id];
      for (const rel of [m, v]) {
        replaceRelationship({
          ...rel,
          contradiction_status: "flagged",
          contradiction_partner_ids: ids.filter((id) => id !== rel.id),
          updated_at: now,
        });
      }
      reports.push(
        Object.freeze({
          id: contradictionId("relationship", ids, now),
          created_at: now,
          subject: "relationship",
          member_ids: Object.freeze(ids) as readonly string[],
          reason: "subject both mitigates and violates the same target",
          status: "flagged",
        }),
      );
      audit("contradiction.relationship", ids.join(","), []);
    }
  }

  for (const rel of rels.filter((r) => r.kind === "contradicts")) {
    replaceRelationship({
      ...rel,
      contradiction_status: "flagged",
      contradiction_partner_ids: [rel.from_id, rel.to_id],
      updated_at: now,
    });
    reports.push(
      Object.freeze({
        id: contradictionId("relationship", [rel.id], now),
        created_at: now,
        subject: "relationship",
        member_ids: Object.freeze([rel.id]) as readonly string[],
        reason: "explicit contradicts edge",
        status: "flagged",
      }),
    );
    audit("contradiction.relationship", rel.id, []);
  }

  emitTelemetry(
    "contradiction.scan",
    reports.length === 0 ? "info" : "warn",
    `workspace=${workspace_id} flagged=${reports.length}`,
  );
  return Object.freeze(reports) as readonly ContradictionReport[];
}

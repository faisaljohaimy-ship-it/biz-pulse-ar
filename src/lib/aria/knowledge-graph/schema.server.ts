/**
 * Schema helpers.
 *
 * Applies ontology attribute rules to validated assertions. Missing
 * required attributes cause the assertion to be rejected — never
 * defaulted.
 */

import { describeEntity } from "./ontology.server";
import type { EntityKind } from "./types";

export interface SchemaCheck {
  readonly ok: boolean;
  readonly missing: readonly string[];
}

export function checkEntityAttributes(
  kind: EntityKind,
  attributes: Readonly<Record<string, unknown>>,
): SchemaCheck {
  const descriptor = describeEntity(kind);
  const missing: string[] = [];
  for (const key of descriptor.required_attributes) {
    if (key === "canonical_name") continue; // supplied separately at ingest time
    const value = attributes[key];
    if (value === undefined || value === null || value === "") missing.push(key);
  }
  return Object.freeze({
    ok: missing.length === 0,
    missing: Object.freeze(missing) as readonly string[],
  });
}

/**
 * Scaffolder — new artifacts from official templates.
 *
 * scaffold(kind, seed) clones the official template, applies overrides and
 * re-validates: a scaffold is ALWAYS a complete valid artifact or an error —
 * never a half-filled draft. Unknown kinds are refused.
 */
import { NdkError, formatIssues } from "../types";
import { ndkArtifactSchema, type NdkArtifact } from "../schemas/extended";
import { OFFICIAL_TEMPLATES, type TemplateSeed } from "../templates/templates";

export function scaffold(
  kind: string,
  seed: TemplateSeed,
  overrides: Readonly<Record<string, unknown>> = {},
): NdkArtifact {
  const factory = OFFICIAL_TEMPLATES[kind];
  if (!factory) throw new NdkError("scaffold", `no official template for kind "${kind}"`);
  const candidate = { ...factory(seed), ...overrides };
  const parsed = ndkArtifactSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new NdkError(
      "scaffold",
      `overrides broke the template: ${formatIssues(parsed.error.issues).join("; ")}`,
    );
  }
  return parsed.data;
}

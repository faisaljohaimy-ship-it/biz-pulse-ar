/**
 * NEXIOS Adaptive Shell — shared contracts (Shell Population Phase 1).
 *
 * The dynamic layer above the frozen Core. Everything here is data-driven:
 * skills, agents, tools and capabilities are declared as manifests, found by
 * runtime discovery, validated against schemas and registered dynamically.
 * The Adaptive Shell imports NOTHING from the Core — it is a pure population
 * layer with its own closed-world registries.
 */
export class AdaptiveShellError extends Error {
  constructor(
    readonly area: string,
    message: string,
  ) {
    super(`[adaptive-shell:${area}] ${message}`);
    this.name = "AdaptiveShellError";
  }
}

export type ManifestKind = "skill" | "agent" | "tool" | "capability";

export const MANIFEST_KINDS: readonly ManifestKind[] = ["skill", "agent", "tool", "capability"];

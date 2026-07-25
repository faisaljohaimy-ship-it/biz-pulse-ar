/**
 * NEXIOS Development Kit (NDK) — shared contracts (Shell Population Phase 2).
 *
 * The NDK is the official SDK for building everything that lives in the
 * Adaptive Shell: skills, agents, tools, capabilities, workflows, plugins,
 * policies, knowledge packs, connectors, prompts, memory profiles, playbooks
 * and templates. Builders produce artifacts, validators refuse anything
 * incomplete, generators derive metadata/descriptors/graphs, and the
 * compiler turns artifacts into Shell-compatible packages. No Core imports.
 */
export class NdkError extends Error {
  constructor(
    readonly area: string,
    message: string,
  ) {
    super(`[ndk:${area}] ${message}`);
    this.name = "NdkError";
  }
}

export type Clock = () => string;

/** Every kind the NDK can build. The first four are Phase-1 Shell kinds. */
export type NdkKind =
  | "skill"
  | "agent"
  | "tool"
  | "capability"
  | "workflow"
  | "plugin"
  | "policy"
  | "knowledge-pack"
  | "connector"
  | "prompt"
  | "memory-profile"
  | "playbook"
  | "template";

export const NDK_KINDS: readonly NdkKind[] = [
  "skill",
  "agent",
  "tool",
  "capability",
  "workflow",
  "plugin",
  "policy",
  "knowledge-pack",
  "connector",
  "prompt",
  "memory-profile",
  "playbook",
  "template",
];

/** How a compiled artifact is meant to run inside the Shell. */
export interface RuntimeDescriptor {
  readonly kind: NdkKind;
  readonly entry: string; // shell://<kind>/<id>
  readonly isolation: "none" | "advisory" | "sandboxed";
  readonly activation: "discovery" | "manual";
  readonly version: string;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly problems: readonly string[];
}

/** The mandatory package format every compiled artifact ships in. */
export interface NdkPackage {
  readonly manifest: Readonly<Record<string, unknown>>;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly version: string;
  readonly dependencies: readonly string[];
  readonly permissions: readonly string[];
  readonly capabilities: readonly string[];
  readonly runtimeDescriptor: RuntimeDescriptor;
  readonly documentation: string;
  readonly validationResult: ValidationResult;
}

/** Structural zod-compatible schema surface (keeps builders decoupled). */
export interface SchemaLike<T> {
  safeParse(value: unknown):
    | { success: true; data: T }
    | {
        success: false;
        error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] };
      };
}

export function formatIssues(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): readonly string[] {
  return issues.map((issue) => `${issue.path.map(String).join(".") || "$"}: ${issue.message}`);
}

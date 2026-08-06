/**
 * SADEED FINN Shell — shared types.
 *
 * The shell is an ADVISORY capability layer. It reads from the core, selects
 * the right skill/agent for a task, records telemetry, and adapts three bounded
 * parameters — but it NEVER writes to core tables and NEVER calls a tool that
 * lacks an implemented, tested connector. All types below are pure data.
 */

export type CapabilityKind = "skill" | "agent";
export type RuntimeMode = "advisory_only" | "full";
export type RequiredRole = "employee" | "operator" | "manager" | "admin";
export type AgentCategory = "compliance" | "ptw" | "operations" | "reporting" | "qa-guardian";

/** Actions that always require an explicit human confirmation gate. */
export type GatedAction =
  | "write"
  | "delete"
  | "deploy"
  | "broadcast"
  | "ptw_issue"
  | "ptw_suspend"
  | "pii_access";

export interface SkillDescriptor {
  readonly id: string;
  readonly kind: "skill";
  readonly nameAr: string;
  /** ≥ 40 chars — short descriptions wreck retrieval (preflight enforces this). */
  readonly description: string;
  /** Arabic + English selection keywords. */
  readonly triggers: readonly string[];
  readonly requiredRole: RequiredRole;
  readonly runtimeMode: RuntimeMode;
  /** The agent category that owns this skill. */
  readonly agent: AgentCategory;
  /** Actions this skill can propose that require a human gate (empty = read-only). */
  readonly gatedActions: readonly GatedAction[];
}

export interface AgentDescriptor {
  readonly id: string;
  readonly kind: "agent";
  readonly category: AgentCategory;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly mission: string;
  readonly authority: "advisory";
  /** Empty until a real connector is implemented AND tested. */
  readonly toolAllowlist: readonly string[];
  /** Skill ids this agent may use — must all exist, and be ≤ 8. */
  readonly skillAllowlist: readonly string[];
  readonly runtimeMode: RuntimeMode;
}

export type Capability = SkillDescriptor | AgentDescriptor;

export interface SelectionHit {
  readonly id: string;
  readonly kind: CapabilityKind;
  readonly score: number;
  /** Whether the shell will demand a human gate before any side effect. */
  readonly requiresHumanGate: boolean;
}

export interface SelectionResult {
  readonly task: string;
  readonly hits: readonly SelectionHit[];
  readonly confidence: number;
  /** True when confidence < threshold → ask one clarifying question. */
  readonly lowConfidence: boolean;
}

/** A single telemetry row — mirrors the shell_runs table (is_simulation=true). */
export interface ShellRun {
  readonly capabilityId: string | null;
  readonly taskHash: string;
  readonly selectedRank: number | null;
  readonly latencyMs: number | null;
  readonly outcome: "success" | "partial" | "fail";
  readonly userRole: RequiredRole | null;
  readonly region: string | null;
  readonly isSimulation: boolean;
}

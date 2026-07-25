/**
 * Shell Population — shared vocabulary (Shell Population Phase 5).
 *
 * The closed enumerations every population subsystem speaks: lifecycle,
 * health, permissions, dependency semantics, visibility, activation rules
 * and events. Generic by law — no business meaning, no enterprise data,
 * no hardcoded skills or agents. The Core stays frozen; this layer only
 * prepares the Shell to RECEIVE future content.
 */
import { AdaptiveShellError } from "../types";

export class PopulationError extends AdaptiveShellError {
  constructor(area: string, message: string) {
    super(`population:${area}`, message);
    this.name = "PopulationError";
  }
}

/* ── Section 05 · Lifecycle ─────────────────────────────────────────────── */
export const LIFECYCLE_STATES = [
  "draft",
  "registered",
  "validated",
  "approved",
  "active",
  "suspended",
  "deprecated",
  "archived",
] as const;
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

/* ── Section 06 · Health ────────────────────────────────────────────────── */
export const HEALTH_STATUSES = ["healthy", "warning", "critical", "offline", "unknown"] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

/* ── Section 07 · Dependency semantics ──────────────────────────────────── */
export const DEPENDENCY_NECESSITIES = ["required", "optional"] as const;
export type DependencyNecessity = (typeof DEPENDENCY_NECESSITIES)[number];

export const DEPENDENCY_BINDINGS = ["hard", "soft"] as const;
export type DependencyBinding = (typeof DEPENDENCY_BINDINGS)[number];

export interface DependencyDeclaration {
  readonly target: string;
  readonly necessity: DependencyNecessity;
  readonly binding: DependencyBinding;
}

/* ── Section 08 · Permission actions ────────────────────────────────────── */
export const PERMISSION_ACTIONS = [
  "execution",
  "discovery",
  "activation",
  "administration",
  "approval",
  "read",
  "write",
  "manage",
] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/* ── Execution modes & visibility ───────────────────────────────────────── */
export const EXECUTION_MODES = ["advisory", "supervised", "autonomous-gated"] as const;
export type ExecutionMode = (typeof EXECUTION_MODES)[number];

export const VISIBILITIES = ["public", "internal", "restricted"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

/* ── Activation / deactivation rule vocabulary (closed, extensible by
      amendment — unknown rules fail validation, never silently pass) ────── */
export const ACTIVATION_RULES = [
  "dependencies-active",
  "health-not-critical",
  "permissions-granted",
  "manual-approval",
] as const;
export type ActivationRule = (typeof ACTIVATION_RULES)[number];

export const DEACTIVATION_RULES = [
  "no-active-dependents",
  "manual-approval",
  "drain-in-flight-work",
] as const;
export type DeactivationRule = (typeof DEACTIVATION_RULES)[number];

/* ── Section 12 · Event model ───────────────────────────────────────────── */
export const POPULATION_EVENTS = [
  "skill-registered",
  "skill-updated",
  "capability-added",
  "capability-removed",
  "validation-failed",
  "activation-requested",
  "activation-approved",
  "activation-completed",
] as const;
export type PopulationEventName = (typeof POPULATION_EVENTS)[number];

export interface PopulationEvent {
  readonly event: PopulationEventName;
  readonly subjectId: string;
  readonly at: string;
  readonly detail: Readonly<Record<string, unknown>>;
}

/** Injectable ISO-timestamp clock — the layer never reads wall time itself. */
export type Clock = () => string;

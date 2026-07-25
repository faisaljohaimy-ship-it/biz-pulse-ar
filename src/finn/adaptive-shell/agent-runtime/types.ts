/**
 * Agent Runtime Foundation — shared vocabulary (Phase 6).
 *
 * Generic runtime infrastructure for hosting future agents. No real agents,
 * no business logic, no skills imported — this layer prepares execution and
 * receives content later. Reuses the population layer's generic primitives
 * (health, permissions, metadata) — one definition per concept.
 */
import { AdaptiveShellError } from "../types";

export class AgentRuntimeError extends AdaptiveShellError {
  constructor(area: string, message: string) {
    super(`agent-runtime:${area}`, message);
    this.name = "AgentRuntimeError";
  }
}

/* ── Section 03 · Agent lifecycle (10 states) ───────────────────────────── */
export const AGENT_LIFECYCLE_STATES = [
  "draft",
  "registered",
  "validated",
  "approved",
  "ready",
  "running",
  "paused",
  "stopped",
  "deprecated",
  "archived",
] as const;
export type AgentLifecycleState = (typeof AGENT_LIFECYCLE_STATES)[number];

/* ── Section 04 · Execution modes ───────────────────────────────────────── */
export const AGENT_EXECUTION_MODES = [
  "single",
  "sequential",
  "parallel",
  "pipeline",
  "broadcast",
  "event-driven",
  "approval-driven",
] as const;
export type AgentExecutionMode = (typeof AGENT_EXECUTION_MODES)[number];

/* ── Section 06 · Event bus vocabulary ──────────────────────────────────── */
export const AGENT_EVENTS = [
  "agent-started",
  "agent-finished",
  "agent-failed",
  "agent-paused",
  "agent-resumed",
  "execution-requested",
  "execution-approved",
  "execution-rejected",
] as const;
export type AgentEventName = (typeof AGENT_EVENTS)[number];

export interface AgentEvent {
  readonly event: AgentEventName;
  readonly subjectId: string;
  readonly at: string;
  readonly detail: Readonly<Record<string, unknown>>;
}

/* ── Injected time & identity (the runtime never reads wall time) ───────── */
export type Clock = () => string;
/** Monotonic tick source for latency measurement (injected, unit-agnostic). */
export type Monotonic = () => number;
export type IdFactory = (prefix: string) => string;

/**
 * Intelligent Orchestration Layer — shared contracts (Phase 4).
 *
 * Everything is deterministic data + injected ports. A task carries its FULL
 * contract (owner, context, priority, dependencies, capabilities, skills,
 * policies, timeout, retry strategy) and accumulates an audit trail and an
 * execution result. No hidden execution paths: the dispatcher is the only way
 * a task runs, and it always consults the policy engine first.
 */
import type { Actor } from "@/finn/shell";

export type OrchTaskState =
  | "pending"
  | "blocked"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out"
  | "denied"
  | "orphaned";

export interface RetryStrategy {
  readonly maxAttempts: number;
  readonly backoff: "none" | "linear";
  readonly baseDelayMs: number;
}

export interface TaskContext {
  readonly actor: Actor;
  readonly locale: "ar" | "en";
  readonly correlationId: string;
}

export interface OrchTask<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  /** The agent id accountable for this task. */
  readonly owner: string;
  readonly context: TaskContext;
  readonly priority: number;
  /** Task ids that must COMPLETE before this task may run. */
  readonly dependencies: readonly string[];
  /** Capabilities this task exercises — must be routable + policy-cleared. */
  readonly capabilities: readonly string[];
  readonly requiredSkills: readonly string[];
  /** Policy ids that MUST evaluate (in addition to the global set). */
  readonly policies: readonly string[];
  readonly timeoutMs: number;
  readonly retry: RetryStrategy;
  readonly input: TInput;
  /** Human approval token for gated capabilities (absent = not approved). */
  readonly approvalGranted?: boolean;
  readonly _output?: TOutput;
}

export interface TaskResult<TOutput = unknown> {
  readonly taskId: string;
  readonly state: OrchTaskState;
  readonly output?: TOutput;
  readonly error?: string;
  readonly attempts: number;
  readonly latencyMs: number;
}

export type AgentRole = "supervisor" | "worker";

export interface OrchAgent {
  readonly id: string;
  readonly role: AgentRole;
  readonly capabilities: readonly string[];
  readonly skills: readonly string[];
  readonly maxConcurrent: number;
  execute(task: OrchTask, signal?: AbortSignal): unknown | Promise<unknown>;
}

export interface PolicyDecision {
  readonly policyId: string;
  readonly allowed: boolean;
  readonly reason: string;
}

export interface OrchPolicy {
  readonly id: string;
  evaluate(task: OrchTask, env: PolicyEnvironment): PolicyDecision;
}

export interface PolicyEnvironment {
  readonly queueDepth: number;
  readonly runningCount: number;
  readonly agentFor: (capability: string) => string | undefined;
  readonly agentSkills: (agentId: string) => readonly string[];
  /** Capabilities that ALWAYS require an explicit human approval. */
  readonly gatedCapabilities: ReadonlySet<string>;
  readonly limits: { readonly maxQueueDepth: number; readonly maxRunning: number };
}

export class OrchError extends Error {
  constructor(
    readonly area: string,
    message: string,
  ) {
    super(`[orch:${area}] ${message}`);
    this.name = "OrchError";
  }
}

export type Clock = () => string;
export type Sleep = (ms: number) => Promise<void>;

export const realSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const instantSleep: Sleep = () => Promise.resolve();

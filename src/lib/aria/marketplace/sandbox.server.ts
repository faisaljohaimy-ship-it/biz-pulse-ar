/**
 * Per-agent execution sandbox — soft isolation on the Workers runtime.
 * Enforces timeout, cancellation, and result isolation. Failures in one
 * sandbox never propagate to another mission or agent.
 */
import type { AgentId } from "../orchestrator/types";

export interface SandboxLimits {
  timeoutMs: number;
  /** Advisory memory limit (bytes). Not enforced in workerd; recorded only. */
  memoryBytes?: number;
  /** Advisory CPU budget (ms). Recorded only. */
  cpuMs?: number;
}

export interface SandboxOutcome<T> {
  ok: boolean;
  value?: T;
  error?: string;
  timedOut: boolean;
  cancelled: boolean;
  duration_ms: number;
  agent_id: AgentId;
}

export async function runInSandbox<T>(
  agentId: AgentId,
  limits: SandboxLimits,
  externalSignal: AbortSignal | undefined,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<SandboxOutcome<T>> {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort("timeout"), limits.timeoutMs);
  const onAbort = () => ctrl.abort("cancelled");
  externalSignal?.addEventListener("abort", onAbort, { once: true });

  try {
    const value = await fn(ctrl.signal);
    return {
      ok: true,
      value,
      timedOut: false,
      cancelled: false,
      duration_ms: Date.now() - started,
      agent_id: agentId,
    };
  } catch (err) {
    const timedOut = ctrl.signal.aborted && String(ctrl.signal.reason) === "timeout";
    const cancelled = ctrl.signal.aborted && String(ctrl.signal.reason) === "cancelled";
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      timedOut,
      cancelled,
      duration_ms: Date.now() - started,
      agent_id: agentId,
    };
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onAbort);
  }
}

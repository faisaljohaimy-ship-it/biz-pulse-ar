/**
 * Dispatcher — resolves a Task to a registered agent, builds the run
 * context, and executes. Agents are only invoked via the Orchestrator
 * registry. No direct agent-to-agent calls anywhere.
 */
import { getAgent } from "../orchestrator/registry";
import type { AgentResult } from "../orchestrator/types";
import type { Task } from "./types";
import type { TaskExecutionContext } from "./task.interface";
import { linkTimeout } from "./timeout.server";

export async function dispatchTask(
  task: Task,
  ctx: Omit<TaskExecutionContext, "task" | "signal">,
  parentSignal: AbortSignal,
): Promise<AgentResult> {
  const startedMs = Date.now();
  const started = new Date().toISOString();
  const linked = linkTimeout(parentSignal, task.timeout);
  let onAbort: (() => void) | undefined;
  const interrupted = (): AgentResult => ({
    agent_id: task.agentId,
    ok: false,
    status: linked.timedOut() ? "timeout" : "cancelled",
    contribution: {},
    error: linked.timedOut() ? `timeout after ${task.timeout}ms` : "task cancelled",
    started_at: started,
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - startedMs,
  });
  try {
    if (linked.signal.aborted) return interrupted();
    const agent = getAgent(task.agentId);
    if (!agent) {
      return {
        agent_id: task.agentId,
        ok: false,
        status: "skipped",
        contribution: {},
        unavailable: true,
        error: "agent not registered",
        started_at: started,
        finished_at: new Date().toISOString(),
        duration_ms: 0,
      };
    }
    const aborted = new Promise<AgentResult>((resolve) => {
      onAbort = () => resolve(interrupted());
      linked.signal.addEventListener("abort", onAbort, { once: true });
    });
    // Bound the caller even when a specialist ignores AbortSignal. Its underlying
    // work cannot be force-killed here; cooperative SDK/network calls must honor
    // the supplied signal. Late success/rejection never changes the settled result.
    const running = Promise.resolve().then(() => {
      if (linked.signal.aborted) return interrupted();
      return agent.run({
        mission_id: task.missionId,
        request: ctx.request,
        memory: ctx.memory,
        prior_results: ctx.priorResults,
        signal: linked.signal,
        apiKey: ctx.apiKey,
      });
    });
    const result = await Promise.race([running, aborted]);
    return linked.signal.aborted ? interrupted() : result;
  } catch (e: unknown) {
    if (linked.signal.aborted) return interrupted();
    return {
      agent_id: task.agentId,
      ok: false,
      status: "failed",
      contribution: {},
      error: e instanceof Error ? e.message : String(e),
      started_at: started,
      finished_at: new Date().toISOString(),
      duration_ms: 0,
    };
  } finally {
    if (onAbort) linked.signal.removeEventListener("abort", onAbort);
    linked.cancel();
  }
}

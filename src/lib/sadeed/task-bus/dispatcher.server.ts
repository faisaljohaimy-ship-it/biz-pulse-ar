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
  const started = new Date().toISOString();
  const linked = linkTimeout(parentSignal, task.timeout);
  try {
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
    const result = await agent.run({
      mission_id: task.missionId,
      request: ctx.request,
      memory: ctx.memory,
      prior_results: ctx.priorResults,
      signal: linked.signal,
      apiKey: ctx.apiKey,
    });
    if (linked.timedOut()) {
      return { ...result, status: "timeout", ok: false, error: `timeout after ${task.timeout}ms` };
    }
    return result;
  } catch (e: unknown) {
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
    linked.cancel();
  }
}

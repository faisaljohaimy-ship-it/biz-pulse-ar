/**
 * TaskExecutor interface — the Dispatcher takes a Task and produces an
 * AgentResult by invoking a registered agent. Agents never call each other.
 */
import type { Task } from "./types";
import type { AgentResult } from "../orchestrator/types";
import type { ExecutiveBrainMemory } from "../executive-brain/types";
import type { MissionRequest } from "../orchestrator/types";

export interface TaskExecutionContext {
  task: Task;
  request: MissionRequest;
  priorResults: AgentResult[];
  memory: ExecutiveBrainMemory | null;
  signal: AbortSignal;
  apiKey?: string;
}

export type TaskExecutor = (ctx: TaskExecutionContext) => Promise<AgentResult>;

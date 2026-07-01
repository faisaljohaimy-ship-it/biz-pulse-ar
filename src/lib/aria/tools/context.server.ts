/**
 * Phase 9.3 — Execution context construction.
 */

import { ToolExecutionContextSchema } from "./contracts";
import type { ToolExecutionContext } from "./types";

export interface CreateContextInput {
  agent_id: string;
  org_id: string | null;
  session_id?: string | null;
  mission_id?: string | null;
  task_id?: string | null;
  trace_id?: string;
  deadline_ms_from_now?: number;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createContext(input: CreateContextInput): ToolExecutionContext {
  const now = new Date();
  const ctx: ToolExecutionContext = {
    execution_id: newId("exec"),
    agent_id: input.agent_id,
    org_id: input.org_id,
    session_id: input.session_id ?? null,
    mission_id: input.mission_id ?? null,
    task_id: input.task_id ?? null,
    trace_id: input.trace_id ?? newId("trc"),
    requested_at: now.toISOString(),
    deadline_at:
      input.deadline_ms_from_now && input.deadline_ms_from_now > 0
        ? new Date(now.getTime() + input.deadline_ms_from_now).toISOString()
        : null,
  };
  return ToolExecutionContextSchema.parse(ctx) as ToolExecutionContext;
}

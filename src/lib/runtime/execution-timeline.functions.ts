// Unified execution timeline — joins workflow_runs, workflow_step_runs,
// tool_executions, audit_logs, and enterprise_events for a single trace.
// Returns an ordered timeline grouped by phase.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type TimelinePhase =
  | "queued"
  | "running"
  | "tool"
  | "database"
  | "workflow"
  | "audit"
  | "completed"
  | "failed"
  | "rolled_back";

type JsonVal = string | number | boolean | null | { [k: string]: JsonVal } | JsonVal[];

export type TimelineEntry = {
  id: string;
  phase: TimelinePhase;
  source: string;
  title: string;
  status: string;
  at: string;
  duration_ms: number | null;
  trace_id: string | null;
  error: string | null;
  request: JsonVal;
  response: JsonVal;
  raw_kind: "workflow_run" | "step_run" | "tool_exec" | "audit_log" | "event";
};

export type ExecutionTimelineResult = {
  entries: TimelineEntry[];
  summary: { total: number; failed: number; completed: boolean; duration_ms: number | null };
};

const Input = z.object({
  runId: z.string().uuid().optional(),
  executionId: z.string().uuid().optional(),
  traceId: z.string().min(4).optional(),
});

function asJson(v: unknown): JsonVal {
  if (v === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(v)) as JsonVal;
  } catch {
    return null;
  }
}

export const getExecutionTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const entries: TimelineEntry[] = [];

    // Workflow run + steps
    if (data.runId) {
      const { data: run } = await sb
        .from("workflow_runs")
        .select(
          "id, workflow_id, status, current_step, started_at, finished_at, error, triggered_by, context_json",
        )
        .eq("id", data.runId)
        .maybeSingle();
      if (run) {
        const dur = run.finished_at
          ? new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()
          : null;
        entries.push({
          id: `wf-${run.id}`,
          phase:
            run.status === "succeeded" || run.status === "completed"
              ? "completed"
              : run.status === "failed"
                ? "failed"
                : "workflow",
          source: "workflow_engine",
          title: `Workflow run ${run.workflow_id?.slice?.(0, 8) ?? ""}`,
          status: run.status,
          at: run.started_at,
          duration_ms: dur,
          trace_id: run.id,
          error: run.error ?? null,
          request: run.context_json ?? null,
          response: null,
          raw_kind: "workflow_run",
        });
        const { data: steps } = await sb
          .from("workflow_step_runs")
          .select(
            "id, step_id, kind, status, started_at, finished_at, error, output_json, tool_execution_id",
          )
          .eq("run_id", run.id)
          .order("started_at", { ascending: true });
        for (const s of (steps ?? []) as Array<Record<string, unknown>>) {
          const start = s.started_at as string | null;
          const end = s.finished_at as string | null;
          entries.push({
            id: `step-${s.id}`,
            phase:
              s.status === "failed"
                ? "failed"
                : s.status === "succeeded"
                  ? "completed"
                  : ((s.kind as TimelinePhase) ?? "running"),
            source: `step.${s.kind ?? "step"}`,
            title: `Step: ${String(s.step_id ?? "")}`,
            status: String(s.status ?? ""),
            at: start ?? new Date().toISOString(),
            duration_ms: start && end ? new Date(end).getTime() - new Date(start).getTime() : null,
            trace_id: (s.tool_execution_id as string) ?? null,
            error: (s.error as string) ?? null,
            request: null,
            response: asJson(s.output_json),
            raw_kind: "step_run",
          });
        }
      }
    }

    // Tool execution
    if (data.executionId) {
      const { data: ex } = await sb
        .from("tool_executions")
        .select(
          "id, tool_id, status, input_json, output_json, started_at, finished_at, duration_ms, error, correlation_id",
        )
        .eq("id", data.executionId)
        .maybeSingle();
      if (ex) {
        entries.push({
          id: `tool-${ex.id}`,
          phase:
            ex.status === "succeeded" || ex.status === "completed"
              ? "completed"
              : ex.status === "failed"
                ? "failed"
                : "tool",
          source: "tool_runtime",
          title: `Tool: ${ex.tool_id}`,
          status: ex.status,
          at: ex.started_at ?? new Date().toISOString(),
          duration_ms: ex.duration_ms ?? null,
          trace_id: ex.correlation_id ?? ex.id,
          error: ex.error ?? null,
          request: asJson(ex.input_json),
          response: asJson(ex.output_json),
          raw_kind: "tool_exec",
        });
      }
    }

    // Audit log + events by correlation/trace id
    const rawTraceId = data.traceId ?? data.runId ?? data.executionId;
    // Strip PostgREST filter delimiters to prevent OR-clause injection.
    const traceId = rawTraceId ? rawTraceId.replace(/[,()."\s]/g, "") : undefined;
    if (traceId) {
      const { data: audits } = await sb
        .from("audit_logs")
        .select(
          "id, action, resource_type, resource_id, source, status, duration_ms, occurred_at, changes, correlation_id, event_id",
        )
        .or(`correlation_id.eq.${traceId},event_id.eq.${traceId},resource_id.eq.${traceId}`)
        .order("occurred_at", { ascending: true })
        .limit(50);
      for (const a of (audits ?? []) as Array<Record<string, unknown>>) {
        entries.push({
          id: `audit-${a.id}`,
          phase: "audit",
          source: String(a.source ?? "audit"),
          title: String(a.action ?? "audit"),
          status: String(a.status ?? "recorded"),
          at: String(a.occurred_at),
          duration_ms: (a.duration_ms as number) ?? null,
          trace_id: (a.correlation_id as string) ?? null,
          error: null,
          request: null,
          response: asJson(a.changes),
          raw_kind: "audit_log",
        });
      }

      const { data: evs } = await sb
        .from("enterprise_events")
        .select(
          "id, topic, source, severity, status, occurred_at, payload_json, inputs_json, outputs_json, correlation_id, duration_ms",
        )
        .or(`correlation_id.eq.${traceId},subject_id.eq.${traceId}`)
        .order("occurred_at", { ascending: true })
        .limit(50);
      for (const e of (evs ?? []) as Array<Record<string, unknown>>) {
        const topic = String(e.topic ?? "");
        const phase: TimelinePhase = topic.includes("completed")
          ? "completed"
          : topic.includes("failed") || topic.includes("timed_out")
            ? "failed"
            : topic.includes("rolled_back") || topic.includes("rollback")
              ? "rolled_back"
              : topic.startsWith("workflow")
                ? "workflow"
                : topic.startsWith("tool")
                  ? "tool"
                  : "running";
        entries.push({
          id: `ev-${e.id}`,
          phase,
          source: String(e.source ?? "event_bus"),
          title: topic,
          status: String(e.status ?? "emitted"),
          at: String(e.occurred_at),
          duration_ms: (e.duration_ms as number) ?? null,
          trace_id: (e.correlation_id as string) ?? null,
          error: null,
          request: asJson(e.inputs_json ?? e.payload_json),
          response: asJson(e.outputs_json),
          raw_kind: "event",
        });
      }
    }

    entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    const failed = entries.filter((e) => e.phase === "failed").length;
    const completed = entries.some((e) => e.phase === "completed");
    const duration =
      entries.length >= 2
        ? new Date(entries[entries.length - 1]!.at).getTime() - new Date(entries[0]!.at).getTime()
        : null;

    return {
      entries,
      summary: { total: entries.length, failed, completed, duration_ms: duration },
    };
  });

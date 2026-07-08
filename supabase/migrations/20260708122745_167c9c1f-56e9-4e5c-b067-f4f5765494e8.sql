-- Perf Hardening Batch 1: indexes for the four slowest list queries.
-- Uses CREATE INDEX IF NOT EXISTS (migration transaction, no CONCURRENTLY).

-- 1) workflow_runs: replay lookup with JSONB containment filter (7,144s total, 59k calls)
CREATE INDEX IF NOT EXISTS workflow_runs_trigger_payload_gin
  ON public.workflow_runs
  USING GIN (trigger_payload jsonb_path_ops);

CREATE INDEX IF NOT EXISTS workflow_runs_wf_trigby_started_idx
  ON public.workflow_runs (workflow_id, triggered_by, started_at DESC);

-- 2) workflow_runs: unfiltered "latest N runs" list (existing composites can't serve plain ORDER)
CREATE INDEX IF NOT EXISTS workflow_runs_started_at_desc_idx
  ON public.workflow_runs (started_at DESC);

-- 3) tool_executions: unfiltered "latest N executions" list (1.69s avg)
CREATE INDEX IF NOT EXISTS tool_executions_created_at_desc_idx
  ON public.tool_executions (created_at DESC);

-- 4) enterprise_events: unfiltered "latest N events" list (1.52s avg)
CREATE INDEX IF NOT EXISTS enterprise_events_occurred_at_desc_idx
  ON public.enterprise_events (occurred_at DESC);

-- Refresh planner statistics so the new indexes are considered immediately.
ANALYZE public.workflow_runs;
ANALYZE public.tool_executions;
ANALYZE public.enterprise_events;
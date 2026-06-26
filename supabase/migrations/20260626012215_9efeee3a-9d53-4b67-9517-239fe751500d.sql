ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_step_runs;
ALTER TABLE public.workflow_runs REPLICA IDENTITY FULL;
ALTER TABLE public.workflow_step_runs REPLICA IDENTITY FULL;
ALTER TABLE public.tool_executions REPLICA IDENTITY FULL;
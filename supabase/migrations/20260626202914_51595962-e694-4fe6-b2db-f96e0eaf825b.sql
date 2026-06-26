
-- 1. Cleanup orphan stuck workflow_step_runs (older than 30 min)
CREATE OR REPLACE FUNCTION public.runtime_cleanup_stale_executions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  steps_cleared int := 0;
  tools_cleared int := 0;
  wf_cleared int := 0;
BEGIN
  UPDATE public.workflow_step_runs
  SET status = 'failed',
      finished_at = now(),
      error = 'Cleared by runtime_cleanup_stale_executions (no heartbeat > 30m)'
  WHERE status = 'running'
    AND started_at < now() - interval '30 minutes';
  GET DIAGNOSTICS steps_cleared = ROW_COUNT;

  UPDATE public.tool_executions
  SET status = 'failed',
      finished_at = now(),
      duration_ms = EXTRACT(EPOCH FROM (now() - started_at))::int * 1000,
      error = COALESCE(error, 'Tool stuck > 10m — cleared by self-healing')
  WHERE status IN ('running','queued')
    AND COALESCE(started_at, created_at) < now() - interval '10 minutes';
  GET DIAGNOSTICS tools_cleared = ROW_COUNT;

  UPDATE public.workflow_runs
  SET status = 'failed',
      finished_at = now(),
      error = 'Workflow stuck > 90m — cleared by self-healing'
  WHERE status = 'running'
    AND started_at < now() - interval '90 minutes';
  GET DIAGNOSTICS wf_cleared = ROW_COUNT;

  RETURN jsonb_build_object(
    'steps_cleared', steps_cleared,
    'tools_cleared', tools_cleared,
    'workflows_cleared', wf_cleared,
    'at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.runtime_cleanup_stale_executions() TO service_role;

-- 2. Immediate cleanup of current stuck rows
SELECT public.runtime_cleanup_stale_executions();

-- 3. Schedule the cleanup every 6 minutes
DO $$
BEGIN
  PERFORM cron.unschedule('runtime-self-heal');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'runtime-self-heal',
  '*/6 * * * *',
  $cron$ SELECT public.runtime_cleanup_stale_executions(); $cron$
);

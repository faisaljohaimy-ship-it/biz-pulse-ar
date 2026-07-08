
-- 1. Retention sweep function
CREATE OR REPLACE FUNCTION public.runtime_retention_sweep()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d_audit int := 0;
  d_events int := 0;
  d_steps int := 0;
  d_tools int := 0;
  d_wf int := 0;
BEGIN
  DELETE FROM public.audit_logs
   WHERE occurred_at < now() - interval '14 days';
  GET DIAGNOSTICS d_audit = ROW_COUNT;

  DELETE FROM public.enterprise_events
   WHERE occurred_at < now() - interval '14 days'
     AND status IN ('processed','completed','failed','skipped');
  GET DIAGNOSTICS d_events = ROW_COUNT;

  DELETE FROM public.workflow_step_runs
   WHERE started_at < now() - interval '14 days'
     AND status IN ('completed','failed','skipped');
  GET DIAGNOSTICS d_steps = ROW_COUNT;

  DELETE FROM public.tool_executions
   WHERE COALESCE(finished_at, created_at) < now() - interval '14 days'
     AND status IN ('completed','failed','skipped');
  GET DIAGNOSTICS d_tools = ROW_COUNT;

  DELETE FROM public.workflow_runs
   WHERE COALESCE(finished_at, started_at) < now() - interval '30 days'
     AND status IN ('completed','failed','skipped');
  GET DIAGNOSTICS d_wf = ROW_COUNT;

  RETURN jsonb_build_object(
    'audit_logs', d_audit,
    'enterprise_events', d_events,
    'workflow_step_runs', d_steps,
    'tool_executions', d_tools,
    'workflow_runs', d_wf,
    'at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.runtime_retention_sweep() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.runtime_retention_sweep() TO service_role;

-- 2. Covering index to accelerate the hottest polling query (workflow_id, triggered_by, started_at DESC + status projection)
CREATE INDEX IF NOT EXISTS workflow_runs_wf_trigby_started_status_idx
  ON public.workflow_runs (workflow_id, triggered_by, started_at DESC)
  INCLUDE (status);

-- 3. Kick off initial retention immediately so the effect is visible now
SELECT public.runtime_retention_sweep();

-- 4. Schedule daily retention at 03:15 UTC (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('runtime-retention-sweep')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='runtime-retention-sweep');
    PERFORM cron.schedule(
      'runtime-retention-sweep',
      '15 3 * * *',
      $cron$ SELECT public.runtime_retention_sweep(); $cron$
    );
  END IF;
END $$;

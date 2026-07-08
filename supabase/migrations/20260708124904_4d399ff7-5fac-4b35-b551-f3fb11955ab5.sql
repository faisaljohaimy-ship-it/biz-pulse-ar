
CREATE INDEX IF NOT EXISTS workflow_step_runs_tool_execution_id_idx
  ON public.workflow_step_runs (tool_execution_id)
  WHERE tool_execution_id IS NOT NULL;

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
  n int;
BEGIN
  -- audit_logs: batched
  LOOP
    WITH victims AS (
      SELECT id FROM public.audit_logs
       WHERE occurred_at < now() - interval '3 days'
       LIMIT 5000
    )
    DELETE FROM public.audit_logs a USING victims v WHERE a.id = v.id;
    GET DIAGNOSTICS n = ROW_COUNT;
    d_audit := d_audit + n;
    EXIT WHEN n = 0 OR d_audit >= 100000;
  END LOOP;

  -- enterprise_events: batched
  LOOP
    WITH victims AS (
      SELECT id FROM public.enterprise_events
       WHERE occurred_at < now() - interval '3 days'
         AND status IN ('processed','completed','failed','skipped')
       LIMIT 5000
    )
    DELETE FROM public.enterprise_events a USING victims v WHERE a.id = v.id;
    GET DIAGNOSTICS n = ROW_COUNT;
    d_events := d_events + n;
    EXIT WHEN n = 0 OR d_events >= 100000;
  END LOOP;

  -- workflow_step_runs: batched
  LOOP
    WITH victims AS (
      SELECT id FROM public.workflow_step_runs
       WHERE started_at < now() - interval '3 days'
         AND status IN ('completed','failed','skipped')
       LIMIT 5000
    )
    DELETE FROM public.workflow_step_runs a USING victims v WHERE a.id = v.id;
    GET DIAGNOSTICS n = ROW_COUNT;
    d_steps := d_steps + n;
    EXIT WHEN n = 0 OR d_steps >= 100000;
  END LOOP;

  -- tool_executions: batched (step FK index now supports this)
  LOOP
    WITH victims AS (
      SELECT id FROM public.tool_executions
       WHERE COALESCE(finished_at, created_at) < now() - interval '3 days'
         AND status IN ('completed','failed','skipped')
       LIMIT 2000
    )
    DELETE FROM public.tool_executions a USING victims v WHERE a.id = v.id;
    GET DIAGNOSTICS n = ROW_COUNT;
    d_tools := d_tools + n;
    EXIT WHEN n = 0 OR d_tools >= 50000;
  END LOOP;

  -- workflow_runs: batched
  LOOP
    WITH victims AS (
      SELECT id FROM public.workflow_runs
       WHERE COALESCE(finished_at, started_at) < now() - interval '14 days'
         AND status IN ('completed','failed','skipped')
       LIMIT 2000
    )
    DELETE FROM public.workflow_runs a USING victims v WHERE a.id = v.id;
    GET DIAGNOSTICS n = ROW_COUNT;
    d_wf := d_wf + n;
    EXIT WHEN n = 0 OR d_wf >= 50000;
  END LOOP;

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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='runtime-retention-sweep') THEN
      PERFORM cron.unschedule('runtime-retention-sweep');
    END IF;
    PERFORM cron.schedule(
      'runtime-retention-sweep',
      '*/15 * * * *',
      $cron$ SELECT public.runtime_retention_sweep(); $cron$
    );
  END IF;
END $$;


CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.emit_daily_kpi_schedule()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  today text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  existing uuid;
BEGIN
  FOR o IN SELECT id FROM public.organizations LOOP
    SELECT id INTO existing
    FROM public.enterprise_events
    WHERE org_id = o.id
      AND topic = 'schedule.daily.kpi'
      AND (payload_json->>'date') = today
    LIMIT 1;

    IF existing IS NULL THEN
      INSERT INTO public.enterprise_events
        (topic, payload_json, source, severity, status, org_id, subject_type)
      VALUES
        ('schedule.daily.kpi',
         jsonb_build_object('date', today, 'scheduler', 'pg_cron'),
         'scheduler.pg_cron',
         'info',
         'pending',
         o.id,
         'schedule');
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_daily_kpi_schedule() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.emit_daily_kpi_schedule() FROM authenticated;
REVOKE ALL ON FUNCTION public.emit_daily_kpi_schedule() FROM anon;
GRANT EXECUTE ON FUNCTION public.emit_daily_kpi_schedule() TO service_role;

DO $$
DECLARE jid int;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'nexus_daily_kpi_emit';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule('nexus_daily_kpi_emit');
  END IF;
END $$;

SELECT cron.schedule(
  'nexus_daily_kpi_emit',
  '0 6 * * *',
  $$SELECT public.emit_daily_kpi_schedule();$$
);

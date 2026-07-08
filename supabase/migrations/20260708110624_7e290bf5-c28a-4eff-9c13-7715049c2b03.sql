
-- Revoke EXECUTE on privileged SECURITY DEFINER maintenance functions from
-- signed-in / anonymous users. These are meant to be invoked from pg_cron
-- (postgres role) or trusted server code (service_role).
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.aria_actions_log_retention()',
    'public.aria_scan_corpus_stale()',
    'public.set_microsoft_sync_secret(text)',
    'public.microsoft_sync_dispatch()',
    'public.runtime_cleanup_stale_executions()',
    'public.emit_daily_kpi_schedule()',
    'public.cleanup_email_unsubscribe_tokens()',
    'public.email_queue_dispatch()',
    'public.email_queue_wake()',
    'public.enqueue_email(text, jsonb)',
    'public.read_email_batch(text, integer, integer)',
    'public.delete_email(text, bigint)',
    'public.move_to_dlq(text, text, bigint, jsonb)'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip %', fn;
    END;
  END LOOP;
END $$;

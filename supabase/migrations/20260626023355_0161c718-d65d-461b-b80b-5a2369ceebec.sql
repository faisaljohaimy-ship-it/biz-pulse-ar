
-- Private config (single row)
CREATE TABLE IF NOT EXISTS public._microsoft_sync_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  hook_secret text,
  hook_url text NOT NULL DEFAULT 'https://project--6f092c67-70c5-400b-9a7e-8c068475864f.lovable.app/api/public/hooks/microsoft-sync',
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Lock down: no grants to anon/authenticated, only service_role
REVOKE ALL ON public._microsoft_sync_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON public._microsoft_sync_config TO service_role;
ALTER TABLE public._microsoft_sync_config ENABLE ROW LEVEL SECURITY;
-- No policies = locked from PostgREST roles.

INSERT INTO public._microsoft_sync_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- Admin-only setter (service role calls this from a server function)
CREATE OR REPLACE FUNCTION public.set_microsoft_sync_secret(_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public._microsoft_sync_config (id, hook_secret, updated_at)
  VALUES (true, _secret, now())
  ON CONFLICT (id) DO UPDATE SET hook_secret = EXCLUDED.hook_secret, updated_at = now();
END;
$fn$;
REVOKE ALL ON FUNCTION public.set_microsoft_sync_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_microsoft_sync_secret(text) TO service_role;

-- Dispatcher used by cron
CREATE OR REPLACE FUNCTION public.microsoft_sync_dispatch()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _secret text;
  _url text;
  _req_id bigint;
BEGIN
  SELECT hook_secret, hook_url INTO _secret, _url FROM public._microsoft_sync_config WHERE id = true;
  IF _secret IS NULL OR length(_secret) < 16 THEN
    RAISE NOTICE 'microsoft sync secret not configured';
    RETURN NULL;
  END IF;
  SELECT net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||_secret),
    body := '{}'::jsonb
  ) INTO _req_id;
  RETURN _req_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.microsoft_sync_dispatch() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.microsoft_sync_dispatch() TO service_role;

-- Schedule every 15 minutes
DO $sched$
BEGIN
  PERFORM cron.unschedule('microsoft-graph-sync-15min')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'microsoft-graph-sync-15min');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$sched$;

SELECT cron.schedule(
  'microsoft-graph-sync-15min',
  '*/15 * * * *',
  $cron$ SELECT public.microsoft_sync_dispatch(); $cron$
);

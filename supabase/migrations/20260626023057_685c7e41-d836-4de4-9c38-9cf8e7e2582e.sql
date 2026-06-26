
-- Add scheduling fields to integration_microsoft
ALTER TABLE public.integration_microsoft
  ADD COLUMN IF NOT EXISTS sync_outlook_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_sharepoint_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_interval_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_status text,
  ADD COLUMN IF NOT EXISTS last_sync_error text,
  ADD COLUMN IF NOT EXISTS outlook_delta_link text,
  ADD COLUMN IF NOT EXISTS sharepoint_delta_link text;

-- Sync run log
CREATE TABLE IF NOT EXISTS public.integration_microsoft_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('outlook','sharepoint','manual')),
  status text NOT NULL CHECK (status IN ('ok','error','skipped')),
  items_count integer NOT NULL DEFAULT 0,
  duration_ms integer,
  error text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.integration_microsoft_sync_log TO authenticated;
GRANT ALL ON public.integration_microsoft_sync_log TO service_role;

ALTER TABLE public.integration_microsoft_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read sync log for their org"
  ON public.integration_microsoft_sync_log FOR SELECT
  TO authenticated
  USING (org_id = current_org_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_ms_sync_log_org_started
  ON public.integration_microsoft_sync_log (org_id, started_at DESC);

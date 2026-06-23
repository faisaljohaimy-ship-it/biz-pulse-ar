
-- 1) Incidents enrichments
ALTER TABLE public.sec_incidents
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS corrective_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS escalated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_risk_score integer,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2) Work orders enrichments
ALTER TABLE public.sec_work_orders
  ADD COLUMN IF NOT EXISTS source_incident_id uuid REFERENCES public.sec_incidents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS completion_notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- 3) Permits enrichments
ALTER TABLE public.sec_permits
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- 4) Activity events
CREATE TABLE IF NOT EXISTS public.sec_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_ref text,
  event text NOT NULL,
  actor_id uuid,
  actor_name text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.sec_activity_events TO authenticated;
GRANT ALL ON public.sec_activity_events TO service_role;
ALTER TABLE public.sec_activity_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS sec_activity_events_entity_idx
  ON public.sec_activity_events (entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS sec_activity_events_occurred_idx
  ON public.sec_activity_events (occurred_at DESC);

DO $$ BEGIN
  CREATE POLICY sec_activity_events_select_auth ON public.sec_activity_events
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sec_activity_events_insert_auth ON public.sec_activity_events
    FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) Operational write policies for the security team (authenticated)
DO $$ BEGIN
  CREATE POLICY sec_incidents_select_auth ON public.sec_incidents
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY sec_incidents_insert_auth ON public.sec_incidents
    FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY sec_incidents_update_auth ON public.sec_incidents
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sec_work_orders_select_auth ON public.sec_work_orders
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY sec_work_orders_insert_auth ON public.sec_work_orders
    FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY sec_work_orders_update_auth ON public.sec_work_orders
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sec_permits_select_auth ON public.sec_permits
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY sec_permits_insert_auth ON public.sec_permits
    FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY sec_permits_update_auth ON public.sec_permits
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at triggers (idempotent)
DO $$ BEGIN
  CREATE TRIGGER sec_incidents_set_updated_at BEFORE UPDATE ON public.sec_incidents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER sec_work_orders_set_updated_at BEFORE UPDATE ON public.sec_work_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER sec_permits_set_updated_at BEFORE UPDATE ON public.sec_permits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

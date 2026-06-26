
CREATE TABLE IF NOT EXISTS public.report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT public.current_org_id(),
  name text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily','weekly')),
  hour_utc smallint NOT NULL DEFAULT 6 CHECK (hour_utc BETWEEN 0 AND 23),
  weekday smallint CHECK (weekday IS NULL OR weekday BETWEEN 0 AND 6),
  range_window text NOT NULL DEFAULT '24h' CHECK (range_window IN ('24h','7d','30d')),
  site_id text NOT NULL,
  team_id text,
  channel_id text,
  recipients text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_status text,
  last_error text,
  last_share_url text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_schedules TO authenticated;
GRANT ALL ON public.report_schedules TO service_role;

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read schedules in org"
  ON public.report_schedules FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND org_id = public.current_org_id());

CREATE POLICY "Admins insert schedules in org"
  ON public.report_schedules FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND org_id = public.current_org_id());

CREATE POLICY "Admins update schedules in org"
  ON public.report_schedules FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND org_id = public.current_org_id())
  WITH CHECK (public.has_role(auth.uid(),'admin') AND org_id = public.current_org_id());

CREATE POLICY "Admins delete schedules in org"
  ON public.report_schedules FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND org_id = public.current_org_id());

CREATE TRIGGER report_schedules_set_updated_at
  BEFORE UPDATE ON public.report_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS report_schedules_org_idx ON public.report_schedules(org_id);
CREATE INDEX IF NOT EXISTS report_schedules_due_idx ON public.report_schedules(enabled, next_run_at);

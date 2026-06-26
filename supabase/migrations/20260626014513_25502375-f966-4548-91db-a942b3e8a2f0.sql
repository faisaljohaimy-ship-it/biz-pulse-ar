
CREATE TABLE IF NOT EXISTS public.integration_microsoft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT public.current_org_id(),
  tenant_id text,
  client_id text,
  redirect_uris text[] NOT NULL DEFAULT '{}',
  default_site_id text,
  default_team_id text,
  default_channel_id text,
  notes text,
  last_tested_at timestamptz,
  last_test_status text,
  last_test_error text,
  last_test_user text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT integration_microsoft_org_unique UNIQUE (org_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_microsoft TO authenticated;
GRANT ALL ON public.integration_microsoft TO service_role;

ALTER TABLE public.integration_microsoft ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read integration_microsoft for their org"
  ON public.integration_microsoft FOR SELECT TO authenticated
  USING (org_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert integration_microsoft for their org"
  ON public.integration_microsoft FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update integration_microsoft for their org"
  ON public.integration_microsoft FOR UPDATE TO authenticated
  USING (org_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (org_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete integration_microsoft for their org"
  ON public.integration_microsoft FOR DELETE TO authenticated
  USING (org_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER integration_microsoft_set_updated_at
  BEFORE UPDATE ON public.integration_microsoft
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

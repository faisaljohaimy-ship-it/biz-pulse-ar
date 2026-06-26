
ALTER TABLE public.sec_incidents
  ADD COLUMN IF NOT EXISTS executive_review text,
  ADD COLUMN IF NOT EXISTS executive_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS executive_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS aria_auto_analyzed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachments_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.sec_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('incident','daily','weekly','monthly','custom')),
  format text NOT NULL CHECK (format IN ('pdf','xlsx','csv','json')),
  title text NOT NULL,
  related_entity_type text,
  related_entity_id uuid,
  related_entity_ref text,
  storage_path text,
  size_bytes integer,
  range_from timestamptz,
  range_to timestamptz,
  generated_by uuid,
  generated_by_name text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sec_reports_org ON public.sec_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_sec_reports_kind ON public.sec_reports(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_reports_related ON public.sec_reports(related_entity_type, related_entity_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_reports TO authenticated;
GRANT ALL ON public.sec_reports TO service_role;

ALTER TABLE public.sec_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sec_reports_select" ON public.sec_reports
  FOR SELECT TO authenticated
  USING (is_org_member(org_id, 'viewer'::org_role));

CREATE POLICY "sec_reports_insert" ON public.sec_reports
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(org_id, 'operator'::org_role));

CREATE POLICY "sec_reports_admin_write" ON public.sec_reports
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

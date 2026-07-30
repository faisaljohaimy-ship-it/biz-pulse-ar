ALTER TABLE public.hcis_compliance_status
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS hcis_compliance_status_org_id_idx
  ON public.hcis_compliance_status(org_id);

DROP POLICY IF EXISTS "hcis_compliance_tenant_isolation" ON public.hcis_compliance_status;
CREATE POLICY "hcis_compliance_tenant_isolation"
  ON public.hcis_compliance_status
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (org_id IS NULL OR public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (org_id IS NULL OR public.is_org_member(org_id, 'manager'::org_role));
-- 1) Owner-scoped write policies for attachment scan records
DROP POLICY IF EXISTS aria_attachment_scans_owner_insert ON public.aria_attachment_scans;
CREATE POLICY aria_attachment_scans_owner_insert
  ON public.aria_attachment_scans
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS aria_attachment_scans_owner_update ON public.aria_attachment_scans;
CREATE POLICY aria_attachment_scans_owner_update
  ON public.aria_attachment_scans
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) Tighten compliance status reads: no blanket USING (true)
DROP POLICY IF EXISTS hcis_compliance_read ON public.hcis_compliance_status;
CREATE POLICY hcis_compliance_read
  ON public.hcis_compliance_status
  FOR SELECT TO authenticated
  USING (org_id IS NULL OR public.is_org_member(org_id, 'viewer'::org_role));

-- 3) Public incident sink stays service-role only (defense in depth)
REVOKE ALL ON public.finn_public_incidents FROM anon, authenticated;
GRANT ALL ON public.finn_public_incidents TO service_role;
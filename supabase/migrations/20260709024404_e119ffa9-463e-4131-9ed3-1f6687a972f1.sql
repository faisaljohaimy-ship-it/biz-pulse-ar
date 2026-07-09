CREATE POLICY tenant_isolation_integration_microsoft
  ON public.integration_microsoft
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role));

CREATE POLICY tenant_isolation_ms_activity_log
  ON public.ms_activity_log
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role));

CREATE POLICY tenant_isolation_report_schedules
  ON public.report_schedules
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role));
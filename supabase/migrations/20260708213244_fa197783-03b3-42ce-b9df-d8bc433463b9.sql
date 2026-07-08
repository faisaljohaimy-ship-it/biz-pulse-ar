-- Defense-in-depth RESTRICTIVE tenant isolation on integration_microsoft_sync_log
CREATE POLICY tenant_isolation_integration_microsoft_sync_log
  ON public.integration_microsoft_sync_log
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'viewer'::org_role));

-- Defense-in-depth RESTRICTIVE tenant isolation on sap_connections
CREATE POLICY tenant_isolation_sap_connections
  ON public.sap_connections
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'manager'::org_role));

-- Add org-scope to admin policies on sec_* tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'sec_assets','sec_sites','sec_sensors','sec_cameras','sec_buildings',
    'sec_control_rooms','sec_circles','sec_patrols','sec_patrol_teams',
    'sec_permits','sec_work_orders','sec_projects','sec_cctv_alerts',
    'sec_reports','sec_sections'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_admin', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR SELECT USING (has_role(auth.uid(),'admin'::app_role) AND is_org_member(org_id,'viewer'::org_role))$p$, t || '_select_admin', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_write', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR ALL USING (has_role(auth.uid(),'admin'::app_role) AND is_org_member(org_id,'viewer'::org_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role) AND is_org_member(org_id,'operator'::org_role))$p$, t || '_admin_write', t);
  END LOOP;
END $$;

-- sec_cctv_alerts admin write uses different name pattern
DROP POLICY IF EXISTS sec_cctv_admin_write ON public.sec_cctv_alerts;
CREATE POLICY sec_cctv_admin_write ON public.sec_cctv_alerts
  FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role) AND is_org_member(org_id,'viewer'::org_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) AND is_org_member(org_id,'operator'::org_role));

-- sec_gates already has admin select scoped; ensure consistency (no admin_write policy exists)

-- Tighten aria_alert_acks restrictive WITH CHECK to operator
DROP POLICY IF EXISTS acks_tenant_isolation ON public.aria_alert_acks;
CREATE POLICY acks_tenant_isolation ON public.aria_alert_acks
  AS RESTRICTIVE
  FOR ALL
  USING (is_org_member(org_id,'viewer'::org_role))
  WITH CHECK (is_org_member(org_id,'operator'::org_role));


-- 1) sec_incidents: add org-scope to admin SELECT
DROP POLICY IF EXISTS sec_incidents_select_admin ON public.sec_incidents;
CREATE POLICY sec_incidents_select_admin ON public.sec_incidents
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'viewer'::org_role));

DROP POLICY IF EXISTS sec_incidents_admin_write ON public.sec_incidents;
CREATE POLICY sec_incidents_admin_write ON public.sec_incidents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'viewer'::org_role));

-- 2) sec_contractors: restrict PII read to operator+
DROP POLICY IF EXISTS sec_contractors_select_org_viewer ON public.sec_contractors;
CREATE POLICY sec_contractors_select_org_operator ON public.sec_contractors
  FOR SELECT TO authenticated
  USING (is_org_member(org_id, 'operator'::org_role));

-- 3) sec_vehicles: restrict driver PII read to operator+
DROP POLICY IF EXISTS sec_vehicles_select_org_viewer ON public.sec_vehicles;
CREATE POLICY sec_vehicles_select_org_operator ON public.sec_vehicles
  FOR SELECT TO authenticated
  USING (is_org_member(org_id, 'operator'::org_role));

-- 4) sec_visitors: restrict visitor PII read to operator+
DROP POLICY IF EXISTS sec_visitors_select_org_viewer ON public.sec_visitors;
CREATE POLICY sec_visitors_select_org_operator ON public.sec_visitors
  FOR SELECT TO authenticated
  USING (is_org_member(org_id, 'operator'::org_role));

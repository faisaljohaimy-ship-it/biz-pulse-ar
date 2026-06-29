
DROP POLICY IF EXISTS sec_contractors_select_admin ON public.sec_contractors;
CREATE POLICY sec_contractors_select_admin ON public.sec_contractors
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) AND public.is_org_member(org_id,'viewer'::org_role));

DROP POLICY IF EXISTS sec_gates_select_admin ON public.sec_gates;
CREATE POLICY sec_gates_select_admin ON public.sec_gates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) AND public.is_org_member(org_id,'viewer'::org_role));
DROP POLICY IF EXISTS sec_gates_select_viewer ON public.sec_gates;
CREATE POLICY sec_gates_select_viewer ON public.sec_gates
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id,'viewer'::org_role));

DROP POLICY IF EXISTS sec_vehicles_select_operator ON public.sec_vehicles;
CREATE POLICY sec_vehicles_select_operator ON public.sec_vehicles
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id,'operator'::org_role) AND created_by = auth.uid());
DROP POLICY IF EXISTS sec_vehicles_select_admin ON public.sec_vehicles;
CREATE POLICY sec_vehicles_select_admin ON public.sec_vehicles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) AND public.is_org_member(org_id,'viewer'::org_role));

DROP POLICY IF EXISTS sec_visitors_select_operator ON public.sec_visitors;
CREATE POLICY sec_visitors_select_operator ON public.sec_visitors
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id,'operator'::org_role) AND created_by = auth.uid());
DROP POLICY IF EXISTS sec_visitors_select_admin ON public.sec_visitors;
CREATE POLICY sec_visitors_select_admin ON public.sec_visitors
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) AND public.is_org_member(org_id,'viewer'::org_role));

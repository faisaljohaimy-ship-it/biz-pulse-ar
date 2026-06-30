
-- sec_contractors: add operator (own) and viewer (org) select policies
CREATE POLICY sec_contractors_select_operator ON public.sec_contractors
  FOR SELECT TO authenticated
  USING (is_org_member(org_id, 'operator'::org_role) AND created_by = auth.uid());

CREATE POLICY sec_contractors_select_viewer ON public.sec_contractors
  FOR SELECT TO authenticated
  USING (is_org_member(org_id, 'viewer'::org_role));

-- sec_vehicles: restrict DELETE to creator or admin
DROP POLICY IF EXISTS sec_vehicles_delete_operator ON public.sec_vehicles;
CREATE POLICY sec_vehicles_delete_own_or_admin ON public.sec_vehicles
  FOR DELETE TO authenticated
  USING (
    (is_org_member(org_id, 'operator'::org_role) AND created_by = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

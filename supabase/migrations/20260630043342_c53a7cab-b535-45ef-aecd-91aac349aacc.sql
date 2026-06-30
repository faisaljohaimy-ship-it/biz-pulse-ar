DROP POLICY IF EXISTS sec_vehicles_insert_operator ON public.sec_vehicles;
CREATE POLICY sec_vehicles_insert_operator ON public.sec_vehicles
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(org_id, 'operator'::org_role) AND created_by = auth.uid());
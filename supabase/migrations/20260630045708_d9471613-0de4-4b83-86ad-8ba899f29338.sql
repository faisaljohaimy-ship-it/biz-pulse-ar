
DROP POLICY IF EXISTS sec_contractors_delete_operator ON public.sec_contractors;
CREATE POLICY sec_contractors_delete_own_or_admin
  ON public.sec_contractors FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS sec_vehicles_update_operator ON public.sec_vehicles;
CREATE POLICY sec_vehicles_update_own_or_admin
  ON public.sec_vehicles FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

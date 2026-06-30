DROP POLICY IF EXISTS sec_contractors_update_operator ON public.sec_contractors;

CREATE POLICY sec_contractors_update_own_or_admin
  ON public.sec_contractors
  FOR UPDATE
  TO authenticated
  USING (
    (public.is_org_member(org_id, 'operator'::org_role) AND created_by = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    (public.is_org_member(org_id, 'operator'::org_role) AND created_by = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
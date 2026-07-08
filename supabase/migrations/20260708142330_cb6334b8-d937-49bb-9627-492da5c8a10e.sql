-- FIX 1: cost_budgets — add RESTRICTIVE tenant isolation as second layer
CREATE POLICY tenant_isolation_cost_budgets
  ON public.cost_budgets
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.is_org_member(org_id, 'viewer'))
  WITH CHECK (public.is_org_member(org_id, 'operator'));

-- FIX 2: sec_visitors_delete_operator — bake org-membership check into the policy itself
DROP POLICY IF EXISTS sec_visitors_delete_operator ON public.sec_visitors;

CREATE POLICY sec_visitors_delete_operator
  ON public.sec_visitors
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND public.is_org_member(org_id, 'operator')
  );
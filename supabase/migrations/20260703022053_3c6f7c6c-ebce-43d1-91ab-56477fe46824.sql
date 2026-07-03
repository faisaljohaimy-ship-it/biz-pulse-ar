DROP POLICY IF EXISTS "Org members view budgets" ON public.cost_budgets;
CREATE POLICY "Org managers view budgets" ON public.cost_budgets
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'manager'));
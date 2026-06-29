-- Allow operators to read visitor records within their org (they create/update them)
CREATE POLICY "sec_visitors_select_operator"
  ON public.sec_visitors FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id, 'operator'::org_role));

-- Allow operators to read vehicle records within their org (they manage them)
CREATE POLICY "sec_vehicles_select_operator"
  ON public.sec_vehicles FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id, 'operator'::org_role));

-- Admin-only write policies for cost_budgets
CREATE POLICY "cost_budgets_admin_insert"
  ON public.cost_budgets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'admin'::org_role));

CREATE POLICY "cost_budgets_admin_update"
  ON public.cost_budgets FOR UPDATE
  TO authenticated
  USING (public.is_org_member(org_id, 'admin'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'admin'::org_role));

CREATE POLICY "cost_budgets_admin_delete"
  ON public.cost_budgets FOR DELETE
  TO authenticated
  USING (public.is_org_member(org_id, 'admin'::org_role));
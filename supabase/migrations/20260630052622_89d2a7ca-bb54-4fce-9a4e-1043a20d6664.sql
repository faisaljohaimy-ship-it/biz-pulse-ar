REVOKE ALL ON public.user_roles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS admin_roles_insert_non_admin ON public.user_roles;
DROP POLICY IF EXISTS admin_roles_update_non_admin ON public.user_roles;
DROP POLICY IF EXISTS admin_roles_delete_non_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_no_client_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_no_client_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_no_client_delete ON public.user_roles;

CREATE POLICY user_roles_no_client_insert
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY user_roles_no_client_update
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY user_roles_no_client_delete
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS sec_incidents_select_member ON public.sec_incidents;
CREATE POLICY sec_incidents_select_member
  ON public.sec_incidents
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role));

DROP POLICY IF EXISTS sec_contractors_insert_operator ON public.sec_contractors;
CREATE POLICY sec_contractors_insert_operator
  ON public.sec_contractors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(org_id, 'operator'::org_role)
    AND created_by = auth.uid()
  );
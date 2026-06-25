
-- 1. user_roles: prevent admins from granting/modifying admin role via PostgREST
DROP POLICY IF EXISTS admin_roles_all ON public.user_roles;

CREATE POLICY admin_roles_insert_non_admin ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND role <> 'admin'::app_role);

CREATE POLICY admin_roles_update_non_admin ON public.user_roles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND role <> 'admin'::app_role)
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND role <> 'admin'::app_role);

CREATE POLICY admin_roles_delete_non_admin ON public.user_roles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND role <> 'admin'::app_role);

-- 2. aria_knowledge: restrict read to admins
DROP POLICY IF EXISTS knowledge_authenticated_read ON public.aria_knowledge;

CREATE POLICY knowledge_admin_read ON public.aria_knowledge
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. enterprise_events: revoke client write privileges (writes done via service_role only)
REVOKE INSERT, UPDATE, DELETE ON public.enterprise_events FROM authenticated, anon;

-- 4. tool_executions: revoke client write privileges (writes done via service_role only)
REVOKE INSERT, UPDATE, DELETE ON public.tool_executions FROM authenticated, anon;

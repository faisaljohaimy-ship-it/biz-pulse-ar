-- Harden audit/orchestration tables: revoke client write privileges so writes are only possible via service_role.
-- RLS already blocks writes (no write policies), this makes the guarantee explicit at the GRANT layer.

REVOKE INSERT, UPDATE, DELETE ON public.agent_runs FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.enterprise_events FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.tool_executions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.workflow_runs FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.workflow_step_runs FROM authenticated, anon;

-- Ensure service_role retains full access for server-side writes
GRANT ALL ON public.agent_runs TO service_role;
GRANT ALL ON public.enterprise_events TO service_role;
GRANT ALL ON public.tool_executions TO service_role;
GRANT ALL ON public.workflow_runs TO service_role;
GRANT ALL ON public.workflow_step_runs TO service_role;

-- user_roles: tighten INSERT/UPDATE to forbid creating/modifying admin rows from client paths.
-- Admin role grants must go through service_role only to prevent admin self-promotion.
DROP POLICY IF EXISTS admin_roles_insert_non_admin ON public.user_roles;
DROP POLICY IF EXISTS admin_roles_update_non_admin ON public.user_roles;
DROP POLICY IF EXISTS admin_roles_delete_non_admin ON public.user_roles;

CREATE POLICY admin_roles_insert_non_admin
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND role <> 'admin'::app_role);

CREATE POLICY admin_roles_update_non_admin
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND role <> 'admin'::app_role)
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND role <> 'admin'::app_role);

CREATE POLICY admin_roles_delete_non_admin
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND role <> 'admin'::app_role);
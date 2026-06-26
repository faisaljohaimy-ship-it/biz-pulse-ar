
-- 1. sec_contractors / sec_gates / sec_vehicles / sec_visitors:
-- Replace FOR ALL operator policies with write-only policies so SELECT is admin-only.
DROP POLICY IF EXISTS sec_contractors_write_operator ON public.sec_contractors;
CREATE POLICY sec_contractors_insert_operator ON public.sec_contractors FOR INSERT TO authenticated WITH CHECK (is_org_member(org_id, 'operator'::org_role));
CREATE POLICY sec_contractors_update_operator ON public.sec_contractors FOR UPDATE TO authenticated USING (is_org_member(org_id, 'operator'::org_role)) WITH CHECK (is_org_member(org_id, 'operator'::org_role));
CREATE POLICY sec_contractors_delete_operator ON public.sec_contractors FOR DELETE TO authenticated USING (is_org_member(org_id, 'operator'::org_role));

DROP POLICY IF EXISTS sec_gates_write_operator ON public.sec_gates;
CREATE POLICY sec_gates_insert_operator ON public.sec_gates FOR INSERT TO authenticated WITH CHECK (is_org_member(org_id, 'operator'::org_role));
CREATE POLICY sec_gates_update_operator ON public.sec_gates FOR UPDATE TO authenticated USING (is_org_member(org_id, 'operator'::org_role)) WITH CHECK (is_org_member(org_id, 'operator'::org_role));
CREATE POLICY sec_gates_delete_operator ON public.sec_gates FOR DELETE TO authenticated USING (is_org_member(org_id, 'operator'::org_role));

DROP POLICY IF EXISTS sec_vehicles_write_operator ON public.sec_vehicles;
CREATE POLICY sec_vehicles_insert_operator ON public.sec_vehicles FOR INSERT TO authenticated WITH CHECK (is_org_member(org_id, 'operator'::org_role));
CREATE POLICY sec_vehicles_update_operator ON public.sec_vehicles FOR UPDATE TO authenticated USING (is_org_member(org_id, 'operator'::org_role)) WITH CHECK (is_org_member(org_id, 'operator'::org_role));
CREATE POLICY sec_vehicles_delete_operator ON public.sec_vehicles FOR DELETE TO authenticated USING (is_org_member(org_id, 'operator'::org_role));

DROP POLICY IF EXISTS sec_visitors_write_operator ON public.sec_visitors;
CREATE POLICY sec_visitors_insert_operator ON public.sec_visitors FOR INSERT TO authenticated WITH CHECK (is_org_member(org_id, 'operator'::org_role));
CREATE POLICY sec_visitors_update_operator ON public.sec_visitors FOR UPDATE TO authenticated USING (is_org_member(org_id, 'operator'::org_role)) WITH CHECK (is_org_member(org_id, 'operator'::org_role));
CREATE POLICY sec_visitors_delete_operator ON public.sec_visitors FOR DELETE TO authenticated USING (is_org_member(org_id, 'operator'::org_role));

-- 2. sec_reports: admin-only SELECT
DROP POLICY IF EXISTS sec_reports_select ON public.sec_reports;
CREATE POLICY sec_reports_select_admin ON public.sec_reports FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. user_roles: remove client-side admin role-management. Only service_role may mutate.
DROP POLICY IF EXISTS admin_roles_insert_non_admin ON public.user_roles;
DROP POLICY IF EXISTS admin_roles_update_non_admin ON public.user_roles;
DROP POLICY IF EXISTS admin_roles_delete_non_admin ON public.user_roles;

-- 4. tool_executions: add admin-only write policies (service_role still bypasses RLS).
CREATE POLICY tool_exec_admin_insert ON public.tool_executions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY tool_exec_admin_update ON public.tool_executions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY tool_exec_admin_delete ON public.tool_executions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Pin search_path on email queue SECURITY DEFINER functions.
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 6. Revoke EXECUTE from anon/authenticated/public on internal SECURITY DEFINER functions.
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_microsoft_sync_secret(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.microsoft_sync_dispatch() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_microsoft_sync_secret(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.microsoft_sync_dispatch() TO service_role;

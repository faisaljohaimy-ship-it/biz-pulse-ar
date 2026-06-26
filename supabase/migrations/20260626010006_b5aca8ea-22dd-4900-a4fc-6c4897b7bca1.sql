
-- ============ sec_* admin-only reads ============
DROP POLICY IF EXISTS sec_vehicles_select_member ON public.sec_vehicles;
CREATE POLICY sec_vehicles_select_admin ON public.sec_vehicles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS sec_visitors_select_member ON public.sec_visitors;
CREATE POLICY sec_visitors_select_admin ON public.sec_visitors
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS sec_contractors_select_member ON public.sec_contractors;
CREATE POLICY sec_contractors_select_admin ON public.sec_contractors
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS sec_gates_select_member ON public.sec_gates;
CREATE POLICY sec_gates_select_admin ON public.sec_gates
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ leads: allow anon submissions through restrictive isolation ============
DROP POLICY IF EXISTS tenant_isolation_leads ON public.leads;
CREATE POLICY tenant_isolation_leads ON public.leads
  AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (auth.role() = 'anon' OR is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (auth.role() = 'anon' OR is_org_member(org_id, 'operator'::org_role));

-- ============ user_roles: prevent self-modification by admins ============
DROP POLICY IF EXISTS admin_roles_insert_non_admin ON public.user_roles;
CREATE POLICY admin_roles_insert_non_admin ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'admin'::app_role
    AND user_id <> auth.uid()
  );

DROP POLICY IF EXISTS admin_roles_update_non_admin ON public.user_roles;
CREATE POLICY admin_roles_update_non_admin ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'admin'::app_role
    AND user_id <> auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'admin'::app_role
    AND user_id <> auth.uid()
  );

DROP POLICY IF EXISTS admin_roles_delete_non_admin ON public.user_roles;
CREATE POLICY admin_roles_delete_non_admin ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'admin'::app_role
    AND user_id <> auth.uid()
  );

-- ============ Email queue helpers: pin search_path & restrict EXECUTE ============
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;

-- handle_new_org_member is a trigger function; revoke direct EXECUTE from clients.
REVOKE EXECUTE ON FUNCTION public.handle_new_org_member() FROM PUBLIC, anon, authenticated;

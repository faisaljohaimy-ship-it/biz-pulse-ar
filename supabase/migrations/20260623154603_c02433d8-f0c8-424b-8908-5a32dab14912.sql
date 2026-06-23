
-- Restrict overly-permissive policies on security operations tables to admins only.

-- sec_activity_events: drop open auth policies, keep admin-only access
DROP POLICY IF EXISTS sec_activity_events_select_auth ON public.sec_activity_events;
DROP POLICY IF EXISTS sec_activity_events_insert_auth ON public.sec_activity_events;
CREATE POLICY sec_activity_events_select_admin ON public.sec_activity_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY sec_activity_events_insert_admin ON public.sec_activity_events
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- sec_incidents: drop open auth policies (admin-only policies already exist)
DROP POLICY IF EXISTS sec_incidents_select_auth ON public.sec_incidents;
DROP POLICY IF EXISTS sec_incidents_insert_auth ON public.sec_incidents;
DROP POLICY IF EXISTS sec_incidents_update_auth ON public.sec_incidents;

-- sec_permits: drop open auth policies
DROP POLICY IF EXISTS sec_permits_select_auth ON public.sec_permits;
DROP POLICY IF EXISTS sec_permits_insert_auth ON public.sec_permits;
DROP POLICY IF EXISTS sec_permits_update_auth ON public.sec_permits;

-- sec_work_orders: drop open auth policies
DROP POLICY IF EXISTS sec_work_orders_select_auth ON public.sec_work_orders;
DROP POLICY IF EXISTS sec_work_orders_insert_auth ON public.sec_work_orders;
DROP POLICY IF EXISTS sec_work_orders_update_auth ON public.sec_work_orders;

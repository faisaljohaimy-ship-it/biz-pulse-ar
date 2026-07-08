
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'client_incidents','client_personnel','client_profile','client_sites','client_work_orders',
    'hajj_sites','hajj_stations','hajj_tasks','hajj_kpi_snapshots',
    'sim_risks','sim_history','sim_departments','sim_employees','sim_buses','sim_meetings',
    'sim_near_misses','sim_notifications','sim_inspections','sim_corrective_actions','sim_daily_ops',
    'support_requests','urgent_tasks','aria_improvement_proposals'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_isolation_'||t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_org_member(org_id, ''viewer''::org_role)) WITH CHECK (public.is_org_member(org_id, ''operator''::org_role))',
      'tenant_isolation_'||t, t
    );
  END LOOP;
END $$;

-- Grant table privileges and add permissive INSERT policy for enterprise_events
GRANT SELECT, INSERT ON public.enterprise_events TO authenticated;
GRANT ALL ON public.enterprise_events TO service_role;

-- Add a permissive INSERT policy. The existing RESTRICTIVE policy
-- (tenant_isolation_enterprise_events) still enforces org-membership with
-- operator role on WITH CHECK; permissive policies must also allow the row.
DROP POLICY IF EXISTS events_org_insert ON public.enterprise_events;
CREATE POLICY events_org_insert ON public.enterprise_events
  FOR INSERT TO authenticated
  WITH CHECK (org_id IS NULL OR is_org_member(org_id, 'operator'::org_role));

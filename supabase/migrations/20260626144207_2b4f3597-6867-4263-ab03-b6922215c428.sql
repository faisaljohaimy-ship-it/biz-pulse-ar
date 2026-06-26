
-- agent_definitions: allow all org members to read; keep admin-only writes
DROP POLICY IF EXISTS agents_def_admin_select ON public.agent_definitions;
CREATE POLICY agents_def_org_select ON public.agent_definitions
  FOR SELECT TO authenticated
  USING (is_org_member(org_id, 'viewer'::org_role));

-- agent_runs: allow all org members to view runs in their org
DROP POLICY IF EXISTS agent_runs_admin_select ON public.agent_runs;
CREATE POLICY agent_runs_org_select ON public.agent_runs
  FOR SELECT TO authenticated
  USING (is_org_member(org_id, 'viewer'::org_role));

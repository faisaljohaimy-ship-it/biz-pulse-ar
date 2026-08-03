-- 1) org_invitations: never expose the raw token through the Data API
REVOKE SELECT ON public.org_invitations FROM authenticated;
REVOKE SELECT ON public.org_invitations FROM anon;
GRANT SELECT (id, org_id, email, role, invited_by, expires_at, accepted_at, created_at)
  ON public.org_invitations TO authenticated;

-- 2) Combine org scoping directly into admin PERMISSIVE policies

-- finn_knowledge
DROP POLICY IF EXISTS knowledge_admin_read ON public.finn_knowledge;
CREATE POLICY knowledge_admin_read ON public.finn_knowledge FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'viewer'::org_role));
DROP POLICY IF EXISTS knowledge_admin_write ON public.finn_knowledge;
CREATE POLICY knowledge_admin_write ON public.finn_knowledge FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role));

-- evolution_log
DROP POLICY IF EXISTS "evolution_log admin delete" ON public.evolution_log;
CREATE POLICY "evolution_log admin delete" ON public.evolution_log FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role));
DROP POLICY IF EXISTS "evolution_log admin update" ON public.evolution_log;
CREATE POLICY "evolution_log admin update" ON public.evolution_log FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role));
DROP POLICY IF EXISTS "evolution_log admin write" ON public.evolution_log;
CREATE POLICY "evolution_log admin write" ON public.evolution_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role));

-- evolution_proposals
DROP POLICY IF EXISTS "evolution_proposals admin delete" ON public.evolution_proposals;
CREATE POLICY "evolution_proposals admin delete" ON public.evolution_proposals FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role));
DROP POLICY IF EXISTS "evolution_proposals admin update" ON public.evolution_proposals;
CREATE POLICY "evolution_proposals admin update" ON public.evolution_proposals FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role));
DROP POLICY IF EXISTS "evolution_proposals admin write" ON public.evolution_proposals;
CREATE POLICY "evolution_proposals admin write" ON public.evolution_proposals FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role));

-- intelligence_agents
DROP POLICY IF EXISTS "intelligence_agents admin delete" ON public.intelligence_agents;
CREATE POLICY "intelligence_agents admin delete" ON public.intelligence_agents FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'manager'::org_role));
DROP POLICY IF EXISTS "intelligence_agents admin update" ON public.intelligence_agents;
CREATE POLICY "intelligence_agents admin update" ON public.intelligence_agents FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'manager'::org_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'manager'::org_role));
DROP POLICY IF EXISTS "intelligence_agents admin write" ON public.intelligence_agents;
CREATE POLICY "intelligence_agents admin write" ON public.intelligence_agents FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'manager'::org_role));

-- tool_executions
DROP POLICY IF EXISTS tool_exec_admin_select ON public.tool_executions;
CREATE POLICY tool_exec_admin_select ON public.tool_executions FOR SELECT TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'viewer'::org_role))
    OR (actor_id = auth.uid() AND is_org_member(org_id, 'viewer'::org_role))
  );
DROP POLICY IF EXISTS tool_exec_admin_insert ON public.tool_executions;
CREATE POLICY tool_exec_admin_insert ON public.tool_executions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role));
DROP POLICY IF EXISTS tool_exec_admin_update ON public.tool_executions;
CREATE POLICY tool_exec_admin_update ON public.tool_executions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role));
DROP POLICY IF EXISTS tool_exec_admin_delete ON public.tool_executions;
CREATE POLICY tool_exec_admin_delete ON public.tool_executions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role));

-- tool_registry
DROP POLICY IF EXISTS tool_registry_admin_select ON public.tool_registry;
CREATE POLICY tool_registry_admin_select ON public.tool_registry FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'viewer'::org_role));
DROP POLICY IF EXISTS tool_registry_admin_write ON public.tool_registry;
CREATE POLICY tool_registry_admin_write ON public.tool_registry FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role));

-- workflows
DROP POLICY IF EXISTS workflows_admin_select ON public.workflows;
CREATE POLICY workflows_admin_select ON public.workflows FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'viewer'::org_role));
DROP POLICY IF EXISTS workflows_admin_write ON public.workflows;
CREATE POLICY workflows_admin_write ON public.workflows FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role));
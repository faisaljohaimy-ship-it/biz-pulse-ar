
-- Add org_id + tenant isolation RESTRICTIVE policies to evolution/intelligence tables
ALTER TABLE public.evolution_log ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.evolution_proposals ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.intelligence_agents ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX IF NOT EXISTS idx_evolution_log_org_id ON public.evolution_log(org_id);
CREATE INDEX IF NOT EXISTS idx_evolution_proposals_org_id ON public.evolution_proposals(org_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_agents_org_id ON public.intelligence_agents(org_id);

DROP POLICY IF EXISTS tenant_isolation_evolution_log ON public.evolution_log;
CREATE POLICY tenant_isolation_evolution_log ON public.evolution_log
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'viewer'))
  WITH CHECK (public.is_org_member(org_id, 'operator'));

DROP POLICY IF EXISTS tenant_isolation_evolution_proposals ON public.evolution_proposals;
CREATE POLICY tenant_isolation_evolution_proposals ON public.evolution_proposals
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'viewer'))
  WITH CHECK (public.is_org_member(org_id, 'operator'));

DROP POLICY IF EXISTS tenant_isolation_intelligence_agents ON public.intelligence_agents;
CREATE POLICY tenant_isolation_intelligence_agents ON public.intelligence_agents
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'viewer'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));


-- ============================================================
-- WAVE 1: Multi-Tenancy Foundation
-- ============================================================
-- Creates organizations, memberships, invitations.
-- Adds org_id to every operational table.
-- Backfills all existing rows to a default organization.
-- Adds RESTRICTIVE tenant-isolation policies that compose with
-- all existing user/role policies (existing checks preserved).
-- ============================================================

-- 1) Org tables --------------------------------------------------
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'manager', 'operator', 'viewer');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'enterprise',
  status text NOT NULL DEFAULT 'active',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL DEFAULT 'operator',
  invited_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
CREATE INDEX idx_org_members_user ON public.org_members(user_id);
CREATE INDEX idx_org_members_org ON public.org_members(org_id);
GRANT SELECT ON public.org_members TO authenticated;
GRANT ALL ON public.org_members TO service_role;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.org_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.org_role NOT NULL DEFAULT 'operator',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_invites_org ON public.org_invitations(org_id);
CREATE INDEX idx_org_invites_email ON public.org_invitations(lower(email));
GRANT SELECT ON public.org_invitations TO authenticated;
GRANT ALL ON public.org_invitations TO service_role;
ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

-- 2) Helper functions -------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid, _min_role public.org_role DEFAULT 'viewer')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = _org
      AND m.user_id = auth.uid()
      AND CASE _min_role
        WHEN 'viewer'  THEN m.role IN ('viewer','operator','manager','admin','owner')
        WHEN 'operator'THEN m.role IN ('operator','manager','admin','owner')
        WHEN 'manager' THEN m.role IN ('manager','admin','owner')
        WHEN 'admin'   THEN m.role IN ('admin','owner')
        WHEN 'owner'   THEN m.role = 'owner'
      END
  );
$$;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::jsonb #>> '{app_metadata,current_org}','')::uuid,
    (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() ORDER BY joined_at LIMIT 1)
  );
$$;

-- 3) RLS for org tables -----------------------------------------
CREATE POLICY "members read their orgs" ON public.organizations
  FOR SELECT TO authenticated USING (public.is_org_member(id, 'viewer'));
CREATE POLICY "owners update org" ON public.organizations
  FOR UPDATE TO authenticated USING (public.is_org_member(id, 'owner'));

CREATE POLICY "members see own memberships" ON public.org_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(org_id, 'admin'));
CREATE POLICY "admins manage memberships" ON public.org_members
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'admin'))
  WITH CHECK (public.is_org_member(org_id, 'admin'));

CREATE POLICY "admins see invites" ON public.org_invitations
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'admin'));
CREATE POLICY "admins manage invites" ON public.org_invitations
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'admin'))
  WITH CHECK (public.is_org_member(org_id, 'admin'));

-- 4) Seed default organization + memberships --------------------
INSERT INTO public.organizations (id, name, slug, plan, status, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Western Region Industrial Security',
  'wris',
  'enterprise',
  'active',
  jsonb_build_object('region','western','country','SA','timezone','Asia/Riyadh')
);

-- Add every existing auth user as 'admin' of the default org
INSERT INTO public.org_members (org_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', u.id, 'admin'
FROM auth.users u
ON CONFLICT (org_id, user_id) DO NOTHING;

-- 5) Add org_id to all operational tables + backfill + index ----
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'sec_activity_events','sec_assets','sec_buildings','sec_cameras','sec_cctv_alerts',
    'sec_circles','sec_contractors','sec_control_rooms','sec_gates','sec_incidents',
    'sec_patrol_teams','sec_patrols','sec_permits','sec_projects','sec_sections',
    'sec_sensors','sec_sites','sec_visitors','sec_work_orders',
    'aria_documents','aria_memory','aria_reports','aria_decisions',
    'agent_runs','workflow_runs','workflow_step_runs','tool_executions',
    'enterprise_events','audit_logs','intelligence_alerts','intelligence_events',
    'executive_briefings','briefing_actions','briefing_risks','briefing_opportunities',
    'pulse_kpis','pulse_crises','pulse_execution','pulse_memory',
    'business_outcomes','outcome_metrics','governance_policies','governance_systems',
    'transformation_milestones','transformation_programs','tasks','leads',
    'agent_definitions','tool_registry','workflows','knowledge_docs','aria_knowledge'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS org_id uuid', t);
    EXECUTE format('UPDATE public.%I SET org_id = %L WHERE org_id IS NULL', t, '00000000-0000-0000-0000-000000000001');
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET DEFAULT %L', t, '00000000-0000-0000-0000-000000000001');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(org_id)', 'idx_'||t||'_org', t);
    -- FK to organizations
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE',
        t, 'fk_'||t||'_org');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    -- Restrictive tenant-isolation policy (ANDs with all existing policies)
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_org_member(org_id, ''viewer'')) WITH CHECK (public.is_org_member(org_id, ''operator''))',
      'tenant_isolation_'||t, t
    );
  END LOOP;
END $$;

-- 6) aria_document_chunks inherits org_id from parent document --
ALTER TABLE public.aria_document_chunks ADD COLUMN IF NOT EXISTS org_id uuid;
UPDATE public.aria_document_chunks c
   SET org_id = d.org_id
  FROM public.aria_documents d
 WHERE c.document_id = d.id AND c.org_id IS NULL;
UPDATE public.aria_document_chunks SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
ALTER TABLE public.aria_document_chunks ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.aria_document_chunks ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS idx_aria_document_chunks_org ON public.aria_document_chunks(org_id);
ALTER TABLE public.aria_document_chunks
  ADD CONSTRAINT fk_aria_document_chunks_org FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE POLICY tenant_isolation_aria_document_chunks ON public.aria_document_chunks
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'viewer'))
  WITH CHECK (public.is_org_member(org_id, 'operator'));

-- 7) Updated-at trigger for new tables --------------------------
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Auto-add new auth users to default org as 'operator' -------
CREATE OR REPLACE FUNCTION public.handle_new_org_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES ('00000000-0000-0000-0000-000000000001', NEW.id, 'operator')
  ON CONFLICT (org_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
-- Augment existing handle_new_user trigger chain
DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_org_member();

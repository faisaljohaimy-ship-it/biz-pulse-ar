-- ═══════════════════════════════════════════════════════════════════════════
-- NEXIOS — HCIS module + Digital PTW tables (production catch-up) + anon reads
-- Idempotent: safe to run more than once. Matches the repo migration
-- 20260718071054 exactly, plus guest (anon) SELECT policies at the end.
-- After running this: press the two seed buttons in /admin again
-- («بذر HCIS + التصاريح» ثم «تشغيل بذر المحاكاة»), then open /hcis.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) HCIS compliance (org-scoped module tables) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.hcis_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  clause_no TEXT NOT NULL,
  category TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  mandatory_level TEXT NOT NULL DEFAULT 'mandatory' CHECK (mandatory_level IN ('mandatory','recommended','conditional')),
  verification_frequency TEXT NOT NULL DEFAULT 'annual' CHECK (verification_frequency IN ('monthly','quarterly','semiannual','annual')),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hcis_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  requirement_id UUID NOT NULL REFERENCES public.hcis_requirements(id) ON DELETE CASCADE,
  region TEXT NOT NULL CHECK (region IN ('central','western','eastern','southern')),
  status TEXT NOT NULL DEFAULT 'partial' CHECK (status IN ('compliant','partial','non_compliant','not_applicable')),
  evidence TEXT, notes TEXT, last_verified_at TIMESTAMPTZ, assessor TEXT,
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hcis_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  requirement_id UUID REFERENCES public.hcis_requirements(id) ON DELETE SET NULL,
  region TEXT NOT NULL CHECK (region IN ('central','western','eastern','southern')),
  title_ar TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  cap_plan TEXT, owner TEXT, target_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','overdue')),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hcis_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('central','western','eastern','southern')),
  title_ar TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  result TEXT CHECK (result IN ('passed','passed_with_notes','failed')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','executed','cancelled')),
  report TEXT,
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['hcis_requirements','hcis_assessments','hcis_findings','hcis_inspections'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_read" ON public.%1$s$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s_read" ON public.%1$s FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'))$p$, t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_write" ON public.%1$s$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s_write" ON public.%1$s FOR ALL TO authenticated USING (public.is_org_member(org_id, 'manager')) WITH CHECK (public.is_org_member(org_id, 'manager'))$p$, t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS hcis_assessments_req_idx ON public.hcis_assessments(requirement_id);
CREATE INDEX IF NOT EXISTS hcis_assessments_region_idx ON public.hcis_assessments(org_id, region);
CREATE INDEX IF NOT EXISTS hcis_findings_region_idx ON public.hcis_findings(org_id, region, status);
CREATE INDEX IF NOT EXISTS hcis_inspections_region_idx ON public.hcis_inspections(org_id, region, scheduled_at);

-- ── 2) Digital Permit-to-Work ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.permit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL, key TEXT NOT NULL,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'FileText', color TEXT NOT NULL DEFAULT '#22D3EE',
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, key)
);

CREATE TABLE IF NOT EXISTS public.permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL, ref TEXT NOT NULL,
  type_id UUID REFERENCES public.permit_types(id) ON DELETE SET NULL,
  type_key TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('central','western','eastern','southern')),
  location TEXT NOT NULL, description TEXT, contractor TEXT,
  worker_count INTEGER NOT NULL DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
  precautions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','active','expired','cancelled','suspended')),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, ref)
);

CREATE TABLE IF NOT EXISTS public.permit_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  permit_id UUID NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('supervisor','safety','security')),
  approver_id UUID, approver_name TEXT,
  decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','approved','rejected')),
  reason TEXT, decided_at TIMESTAMPTZ,
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (permit_id, step_order)
);

CREATE TABLE IF NOT EXISTS public.permit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  permit_id UUID NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID, actor_name TEXT, detail TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['permit_types','permits','permit_approvals'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_read" ON public.%1$s$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s_read" ON public.%1$s FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'))$p$, t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_write" ON public.%1$s$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s_write" ON public.%1$s FOR ALL TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'))$p$, t);
  END LOOP;
END $$;

GRANT SELECT, INSERT ON public.permit_events TO authenticated;
GRANT ALL ON public.permit_events TO service_role;
ALTER TABLE public.permit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permit_events_read" ON public.permit_events;
CREATE POLICY "permit_events_read" ON public.permit_events FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
DROP POLICY IF EXISTS "permit_events_insert" ON public.permit_events;
CREATE POLICY "permit_events_insert" ON public.permit_events FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, 'operator'));

-- updated_at trigger (guarded: skipped cleanly if the helper fn is absent)
DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_permits_updated ON public.permits;
  CREATE TRIGGER trg_permits_updated BEFORE UPDATE ON public.permits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN undefined_function THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS permits_region_status_idx ON public.permits(org_id, region, status);
CREATE INDEX IF NOT EXISTS permits_ends_idx ON public.permits(org_id, ends_at);
CREATE INDEX IF NOT EXISTS permit_approvals_permit_idx ON public.permit_approvals(permit_id, step_order);
CREATE INDEX IF NOT EXISTS permit_events_permit_idx ON public.permit_events(permit_id, occurred_at);

-- ── 3) Guest (anon) read policies — the open-showcase reads ────────────────
DO $$ BEGIN
  CREATE POLICY hcis_requirements_anon ON public.hcis_requirements FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY hcis_assessments_anon ON public.hcis_assessments FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY hcis_findings_anon ON public.hcis_findings FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY hcis_inspections_anon ON public.hcis_inspections FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY permits_anon ON public.permits FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY permit_types_anon ON public.permit_types FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  GRANT SELECT ON public.hcis_requirements, public.hcis_assessments, public.hcis_findings,
    public.hcis_inspections, public.permits, public.permit_types TO anon;
END $$;

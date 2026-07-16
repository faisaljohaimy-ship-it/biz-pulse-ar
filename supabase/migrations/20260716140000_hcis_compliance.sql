-- ============================================================================
-- MODULE — HCIS Compliance (الامتثال للهيئة العليا للأمن الصناعي)
--
-- Four org-scoped tables with explicit RLS. Reads for any org member; writes
-- for manager/admin. Every simulated row carries is_simulation=true AND a
-- metadata.sim_seed tag so the deterministic seeder can re-run idempotently.
-- Regions are the four canonical ids from src/lib/regions.ts (single source of
-- geography): central | western | eastern | southern.
-- ============================================================================

-- 1) hcis_requirements — the compliance clauses (professional generic wording;
--    NOT verbatim from any official document).
CREATE TABLE IF NOT EXISTS public.hcis_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  clause_no TEXT NOT NULL,
  category TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  mandatory_level TEXT NOT NULL DEFAULT 'mandatory'
    CHECK (mandatory_level IN ('mandatory', 'recommended', 'conditional')),
  verification_frequency TEXT NOT NULL DEFAULT 'annual'
    CHECK (verification_frequency IN ('monthly', 'quarterly', 'semiannual', 'annual')),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) hcis_assessments — status of each clause per region.
CREATE TABLE IF NOT EXISTS public.hcis_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  requirement_id UUID NOT NULL REFERENCES public.hcis_requirements(id) ON DELETE CASCADE,
  region TEXT NOT NULL CHECK (region IN ('central', 'western', 'eastern', 'southern')),
  status TEXT NOT NULL DEFAULT 'partial'
    CHECK (status IN ('compliant', 'partial', 'non_compliant', 'not_applicable')),
  evidence TEXT,
  notes TEXT,
  last_verified_at TIMESTAMPTZ,
  assessor TEXT,
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) hcis_findings — gaps + corrective action plans (CAP).
CREATE TABLE IF NOT EXISTS public.hcis_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  requirement_id UUID REFERENCES public.hcis_requirements(id) ON DELETE SET NULL,
  region TEXT NOT NULL CHECK (region IN ('central', 'western', 'eastern', 'southern')),
  title_ar TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  cap_plan TEXT,
  owner TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'overdue')),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) hcis_inspections — scheduled / executed inspection visits.
CREATE TABLE IF NOT EXISTS public.hcis_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('central', 'western', 'eastern', 'southern')),
  title_ar TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  result TEXT CHECK (result IN ('passed', 'passed_with_notes', 'failed')),
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'executed', 'cancelled')),
  report TEXT,
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants + RLS ---------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hcis_requirements', 'hcis_assessments', 'hcis_findings', 'hcis_inspections'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Read: any member of the owning org.
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_read" ON public.%1$s$p$, t);
    EXECUTE format(
      $p$CREATE POLICY "%1$s_read" ON public.%1$s FOR SELECT TO authenticated
         USING (public.is_org_member(org_id, 'viewer'))$p$, t);

    -- Write (insert/update/delete): manager or above of the owning org.
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_write" ON public.%1$s$p$, t);
    EXECUTE format(
      $p$CREATE POLICY "%1$s_write" ON public.%1$s FOR ALL TO authenticated
         USING (public.is_org_member(org_id, 'manager'))
         WITH CHECK (public.is_org_member(org_id, 'manager'))$p$, t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS hcis_assessments_req_idx ON public.hcis_assessments(requirement_id);
CREATE INDEX IF NOT EXISTS hcis_assessments_region_idx ON public.hcis_assessments(org_id, region);
CREATE INDEX IF NOT EXISTS hcis_findings_region_idx ON public.hcis_findings(org_id, region, status);
CREATE INDEX IF NOT EXISTS hcis_inspections_region_idx ON public.hcis_inspections(org_id, region, scheduled_at);

-- ============================================================================
-- MODULE — Digital Permit-to-Work (تصاريح العمل الرقمية · PTW)
--
-- Four org-scoped tables with explicit RLS. Reads for any org member; writes
-- for operator+ ; the sensitive approval + emergency-suspend paths add a
-- platform admin/manager gate in the application layer. permit_events is an
-- append-only tamper-evident ledger (no update/delete policy). Simulated rows
-- carry is_simulation=true + metadata.sim_seed. Regions = the four ids from
-- src/lib/regions.ts.
-- ============================================================================

-- 1) permit_types — reference data (icon + colour per type).
CREATE TABLE IF NOT EXISTS public.permit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  key TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'FileText',
  color TEXT NOT NULL DEFAULT '#22D3EE',
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, key)
);

-- 2) permits — the permit record.
CREATE TABLE IF NOT EXISTS public.permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  ref TEXT NOT NULL,
  type_id UUID REFERENCES public.permit_types(id) ON DELETE SET NULL,
  type_key TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('central', 'western', 'eastern', 'southern')),
  location TEXT NOT NULL,
  description TEXT,
  contractor TEXT,
  worker_count INTEGER NOT NULL DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  precautions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'active', 'expired', 'cancelled', 'suspended')),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, ref)
);

-- 3) permit_approvals — ordered approval chain (supervisor → safety → security).
CREATE TABLE IF NOT EXISTS public.permit_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  permit_id UUID NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('supervisor', 'safety', 'security')),
  approver_id UUID,
  approver_name TEXT,
  decision TEXT NOT NULL DEFAULT 'pending'
    CHECK (decision IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  decided_at TIMESTAMPTZ,
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (permit_id, step_order)
);

-- 4) permit_events — append-only tamper-evident ledger.
CREATE TABLE IF NOT EXISTS public.permit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  permit_id UUID NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  detail TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Grants + RLS (read: member; write: operator+) ------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['permit_types', 'permits', 'permit_approvals'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_read" ON public.%1$s$p$, t);
    EXECUTE format(
      $p$CREATE POLICY "%1$s_read" ON public.%1$s FOR SELECT TO authenticated
         USING (public.is_org_member(org_id, 'viewer'))$p$, t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_write" ON public.%1$s$p$, t);
    EXECUTE format(
      $p$CREATE POLICY "%1$s_write" ON public.%1$s FOR ALL TO authenticated
         USING (public.is_org_member(org_id, 'operator'))
         WITH CHECK (public.is_org_member(org_id, 'operator'))$p$, t);
  END LOOP;
END $$;

-- permit_events: append-only. Members read; members insert; NO update/delete.
GRANT SELECT, INSERT ON public.permit_events TO authenticated;
GRANT ALL ON public.permit_events TO service_role;
ALTER TABLE public.permit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permit_events_read" ON public.permit_events;
CREATE POLICY "permit_events_read" ON public.permit_events FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'viewer'));
DROP POLICY IF EXISTS "permit_events_insert" ON public.permit_events;
CREATE POLICY "permit_events_insert" ON public.permit_events FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'operator'));

CREATE TRIGGER trg_permits_updated BEFORE UPDATE ON public.permits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS permits_region_status_idx ON public.permits(org_id, region, status);
CREATE INDEX IF NOT EXISTS permits_ends_idx ON public.permits(org_id, ends_at);
CREATE INDEX IF NOT EXISTS permit_approvals_permit_idx ON public.permit_approvals(permit_id, step_order);
CREATE INDEX IF NOT EXISTS permit_events_permit_idx ON public.permit_events(permit_id, occurred_at);

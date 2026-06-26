
-- ============ sec_vehicles ============
CREATE TABLE public.sec_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  plate text NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'car',
  company text,
  driver_name text NOT NULL,
  driver_phone text,
  driver_id_number text,
  contractor_id uuid REFERENCES public.sec_contractors(id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.sec_sites(id) ON DELETE SET NULL,
  gate_id uuid REFERENCES public.sec_gates(id) ON DELETE SET NULL,
  permit_no text,
  permit_expires_at timestamptz,
  status text NOT NULL DEFAULT 'expected'
    CHECK (status IN ('expected','inside','left','denied','blacklisted')),
  check_in_at timestamptz,
  check_out_at timestamptz,
  notes text,
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sec_vehicles_org ON public.sec_vehicles(org_id);
CREATE INDEX idx_sec_vehicles_status ON public.sec_vehicles(status);
CREATE INDEX idx_sec_vehicles_plate ON public.sec_vehicles(plate);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_vehicles TO authenticated;
GRANT ALL ON public.sec_vehicles TO service_role;

ALTER TABLE public.sec_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_sec_vehicles" ON public.sec_vehicles
  AS RESTRICTIVE TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'operator'::org_role));

CREATE POLICY "sec_vehicles_select_member" ON public.sec_vehicles
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role));

CREATE POLICY "sec_vehicles_write_operator" ON public.sec_vehicles
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'operator'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'operator'::org_role));

CREATE TRIGGER trg_sec_vehicles_updated
  BEFORE UPDATE ON public.sec_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ sec_visitors extensions ============
ALTER TABLE public.sec_visitors
  ADD COLUMN IF NOT EXISTS vehicle_plate text,
  ADD COLUMN IF NOT EXISTS expected_at timestamptz,
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS qr_token text,
  ADD COLUMN IF NOT EXISTS gate_id uuid REFERENCES public.sec_gates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Replace overly restrictive admin-only policies with member/operator policies
DROP POLICY IF EXISTS "sec_visitors_admin_write" ON public.sec_visitors;
DROP POLICY IF EXISTS "sec_visitors_select_admin" ON public.sec_visitors;

CREATE POLICY "sec_visitors_select_member" ON public.sec_visitors
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role));

CREATE POLICY "sec_visitors_write_operator" ON public.sec_visitors
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'operator'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'operator'::org_role));

-- ============ sec_contractors extensions ============
ALTER TABLE public.sec_contractors
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS permit_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS insurance_expiry timestamptz,
  ADD COLUMN IF NOT EXISTS allowed_site_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by uuid;

DROP POLICY IF EXISTS "sec_contractors_admin_write" ON public.sec_contractors;
DROP POLICY IF EXISTS "sec_contractors_select_admin" ON public.sec_contractors;

CREATE POLICY "sec_contractors_select_member" ON public.sec_contractors
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role));

CREATE POLICY "sec_contractors_write_operator" ON public.sec_contractors
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'operator'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'operator'::org_role));

-- ============ sec_gates: allow members to read & operators to write ============
DROP POLICY IF EXISTS "sec_gates_admin_write" ON public.sec_gates;
DROP POLICY IF EXISTS "sec_gates_select_admin" ON public.sec_gates;

CREATE POLICY "sec_gates_select_member" ON public.sec_gates
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role));

CREATE POLICY "sec_gates_write_operator" ON public.sec_gates
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'operator'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'operator'::org_role));

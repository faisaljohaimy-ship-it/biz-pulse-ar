-- ============================================================
-- 1) Leads: remove anon carve-out from RLS
-- ============================================================
DROP POLICY IF EXISTS tenant_isolation_leads ON public.leads;

CREATE POLICY tenant_isolation_leads
  ON public.leads
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'operator'::org_role));

-- Revoke any lingering anon privileges on leads (server uses service role).
REVOKE ALL ON public.leads FROM anon;

-- ============================================================
-- 2) Replace literal default org with caller-aware default
--    on every affected table (66 tables).
-- ============================================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'org_id'
      AND column_default = '''00000000-0000-0000-0000-000000000001''::uuid'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN org_id SET DEFAULT COALESCE(public.current_org_id(), ''00000000-0000-0000-0000-000000000001''::uuid)',
      r.table_schema, r.table_name
    );
  END LOOP;
END $$;

-- =============================================================================
-- 002_sec_kb_rls.sql — Tenant isolation for SEC/PTW knowledge base
-- STAGING — NOT applied. Uses RESTRICTIVE policies so tenant isolation cannot
-- be bypassed by a permissive policy added later.
-- =============================================================================

-- GRANTs first (public schema has no default privileges on Supabase).
GRANT SELECT ON public.sec_kb_documents TO authenticated;
GRANT SELECT ON public.sec_kb_chunks    TO authenticated;
GRANT ALL    ON public.sec_kb_documents TO service_role;
GRANT ALL    ON public.sec_kb_chunks    TO service_role;
-- Deliberate: NO grant to anon. SEC/PTW is never public.

ALTER TABLE public.sec_kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sec_kb_chunks    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sec_kb_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sec_kb_chunks    FORCE ROW LEVEL SECURITY;

-- =========================
-- sec_kb_documents policies
-- =========================

-- RESTRICTIVE tenant fence — ALL rows must satisfy this in ALL commands.
CREATE POLICY sec_kb_documents_tenant_fence
  ON public.sec_kb_documents
  AS RESTRICTIVE
  TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- Permissive read: any org member.
CREATE POLICY sec_kb_documents_read_members
  ON public.sec_kb_documents
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role));

-- Permissive write: org admins only.
CREATE POLICY sec_kb_documents_write_admins
  ON public.sec_kb_documents
  FOR ALL
  TO authenticated
  USING (public.is_org_member(org_id, 'admin'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'admin'::org_role));

-- =========================
-- sec_kb_chunks policies
-- =========================

CREATE POLICY sec_kb_chunks_tenant_fence
  ON public.sec_kb_chunks
  AS RESTRICTIVE
  TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY sec_kb_chunks_read_members
  ON public.sec_kb_chunks
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role));

CREATE POLICY sec_kb_chunks_write_admins
  ON public.sec_kb_chunks
  FOR ALL
  TO authenticated
  USING (public.is_org_member(org_id, 'admin'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'admin'::org_role));

-- =============================================================================
-- VERIFY:
--   SELECT polname, polpermissive FROM pg_policy
--   WHERE polrelid IN ('public.sec_kb_documents'::regclass,
--                      'public.sec_kb_chunks'::regclass)
--   ORDER BY polrelid, polname;
--   -- expect at least one RESTRICTIVE (polpermissive=false) per table
--
--   SELECT relforcerowsecurity FROM pg_class
--    WHERE oid IN ('public.sec_kb_documents'::regclass,
--                  'public.sec_kb_chunks'::regclass);
--   -- expect both true
--
-- ROLLBACK:
--   DROP POLICY IF EXISTS sec_kb_chunks_write_admins    ON public.sec_kb_chunks;
--   DROP POLICY IF EXISTS sec_kb_chunks_read_members    ON public.sec_kb_chunks;
--   DROP POLICY IF EXISTS sec_kb_chunks_tenant_fence   ON public.sec_kb_chunks;
--   DROP POLICY IF EXISTS sec_kb_documents_write_admins ON public.sec_kb_documents;
--   DROP POLICY IF EXISTS sec_kb_documents_read_members ON public.sec_kb_documents;
--   DROP POLICY IF EXISTS sec_kb_documents_tenant_fence ON public.sec_kb_documents;
--   ALTER TABLE public.sec_kb_chunks    NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.sec_kb_documents NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.sec_kb_chunks    DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.sec_kb_documents DISABLE ROW LEVEL SECURITY;
--   REVOKE ALL ON public.sec_kb_chunks    FROM authenticated, service_role;
--   REVOKE ALL ON public.sec_kb_documents FROM authenticated, service_role;
-- =============================================================================

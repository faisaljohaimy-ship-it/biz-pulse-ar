
-- Wave 3: Database hardening
-- 1) Revoke EXECUTE on SECURITY DEFINER helpers from anon. These are only
--    referenced from authenticated-context queries / RLS evaluation and
--    should never run for unauthenticated callers.
REVOKE EXECUTE ON FUNCTION public.current_org_id() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, org_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, org_role) TO authenticated, service_role;

-- 2) `_microsoft_sync_config` has RLS enabled but no policy. That already
--    blocks all reads/writes for anon + authenticated (good), but the
--    linter flags the missing policy. Add an explicit deny policy so the
--    intent is documented and surfaces in policy listings.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = '_microsoft_sync_config'
              AND relnamespace = 'public'::regnamespace)
     AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid =
                     'public._microsoft_sync_config'::regclass) THEN
    EXECUTE 'CREATE POLICY "_microsoft_sync_config_deny_all" ON public._microsoft_sync_config FOR ALL TO public USING (false) WITH CHECK (false)';
  END IF;
END $$;

COMMENT ON TABLE public._microsoft_sync_config IS
  'Private singleton. Accessed only via SECURITY DEFINER functions (set_microsoft_sync_secret, microsoft_sync_dispatch). RLS deny-all is intentional.';

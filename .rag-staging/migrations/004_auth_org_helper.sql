-- =============================================================================
-- 004_auth_org_helper.sql — Thin alias over the existing current_org_id()
-- STAGING — NOT applied.
--
-- NOTE: public.current_org_id() ALREADY EXISTS in this project with the exact
-- hybrid resolution we want (JWT app_metadata.current_org → fallback to
-- unambiguous single-org membership → NULL on ambiguity). This migration only
-- registers a stable alias auth_org_id() for readability inside the hybrid
-- search function. If the operator prefers, delete this file and reference
-- current_org_id() directly in 005.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auth_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_org_id();
$$;

REVOKE ALL ON FUNCTION public.auth_org_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_org_id() TO authenticated, service_role;

COMMENT ON FUNCTION public.auth_org_id() IS
  'Alias over current_org_id() — org derived from JWT claim or unambiguous membership. Client never passes org_id.';

-- =============================================================================
-- VERIFY:
--   SELECT public.auth_org_id();  -- run inside an authenticated context
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.auth_org_id();
-- =============================================================================

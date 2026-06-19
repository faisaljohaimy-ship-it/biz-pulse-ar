-- Tighten SECURITY DEFINER function execution privileges.
-- handle_new_user runs only as a trigger (table owner context); no role needs direct EXECUTE.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- has_role is invoked inside RLS policies as the calling role; authenticated MUST keep EXECUTE.
-- Lock down anon and PUBLIC to prevent unauthenticated probing.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- update_updated_at_column is a trigger helper; no direct EXECUTE needed.
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
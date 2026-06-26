
REVOKE EXECUTE ON FUNCTION public.runtime_cleanup_stale_executions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.runtime_cleanup_stale_executions() TO service_role;

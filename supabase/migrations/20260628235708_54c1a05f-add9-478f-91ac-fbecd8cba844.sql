
-- Explicit no-op policy so authenticated users see zero rows (service_role bypasses RLS)
CREATE POLICY "Deny all to authenticated" ON public.rate_limit_buckets FOR SELECT TO authenticated USING (false);

-- Revoke EXECUTE on rate limiter from public roles — only service_role should call it
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

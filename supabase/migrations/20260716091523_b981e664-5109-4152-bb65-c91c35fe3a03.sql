REVOKE ALL ON FUNCTION public.purge_aria_outbound_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_aria_outbound_retention() TO service_role;
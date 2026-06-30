DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
REVOKE INSERT, UPDATE, DELETE ON public.leads FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.leads FROM authenticated;
GRANT ALL ON public.leads TO service_role;
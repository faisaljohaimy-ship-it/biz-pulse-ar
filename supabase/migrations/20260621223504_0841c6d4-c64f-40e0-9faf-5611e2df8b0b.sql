
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sec_assets','sec_cctv_alerts','sec_contractors','sec_incidents','sec_patrols','sec_permits','sec_sites','sec_visitors']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_auth', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))$f$, t || '_select_admin', t);
  END LOOP;
END $$;

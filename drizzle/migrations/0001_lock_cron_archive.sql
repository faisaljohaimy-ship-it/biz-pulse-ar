REVOKE ALL ON public.cron_job_run_details_archive FROM anon, authenticated;
GRANT SELECT ON public.cron_job_run_details_archive TO authenticated;
GRANT ALL ON public.cron_job_run_details_archive TO service_role;
ALTER TABLE public.cron_job_run_details_archive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read cron archive" ON public.cron_job_run_details_archive;
CREATE POLICY "Admins read cron archive" ON public.cron_job_run_details_archive
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
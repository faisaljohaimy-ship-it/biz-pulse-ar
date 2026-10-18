CREATE TABLE IF NOT EXISTS public.cron_job_run_details_archive AS SELECT * FROM cron.job_run_details WHERE start_time < now() - interval '7 days';
GRANT SELECT ON public.cron_job_run_details_archive TO authenticated;
GRANT ALL ON public.cron_job_run_details_archive TO service_role;
COMMENT ON TABLE public.cron_job_run_details_archive IS 'DEPRECATED: one-time archive of cron.job_run_details older than 7 days, taken 2026-10-18 before purge; export and drop after owner verification.';
DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days';
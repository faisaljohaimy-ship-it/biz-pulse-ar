-- Explicit non-destructive stop: the same FNN job owns reporting AND follow-ups.
-- Unscheduling it stops BOTH. Private task/report evidence and activation_at stay
-- intact; this does not resolve warnings, erase history, or reactivate old workers.
-- To resume, use the reviewed fnn_operational_report_enable.sql guard/schedule;
-- the upgraded tick then reconciles from the original activation watermark.
do $stop$
begin
  if exists(select 1 from cron.job where jobname='sadeed-fnn-operational-report') then
    perform cron.unschedule('sadeed-fnn-operational-report');
  end if;
end;
$stop$;
select public.sadeed_fnn_automation_status();
select public.sadeed_fnn_automation_tasks();

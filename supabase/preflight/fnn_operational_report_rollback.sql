-- Non-destructive stop. Retains the last verified snapshot and evidence.
do $stop$
begin
  if exists(select 1 from cron.job where jobname='sadeed-fnn-operational-report') then
    perform cron.unschedule('sadeed-fnn-operational-report');
  end if;
end;
$stop$;
select public.sadeed_fnn_automation_status();

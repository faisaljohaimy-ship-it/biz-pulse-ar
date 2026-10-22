-- Non-destructive stop: retain health evidence, business rows, and RPCs for
-- inspection. Re-enable only by rerunning the reviewed enable proposal.
do $stop$
begin
  if exists(select 1 from cron.job where jobname = 'sadeed-operational-watchdog') then
    perform cron.unschedule('sadeed-operational-watchdog');
  end if;
end;
$stop$;
select public.sadeed_runtime_status();

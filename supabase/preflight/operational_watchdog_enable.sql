-- Fail closed outside the independently restored destination ledger.
do $destination_guard$
begin
  if to_regclass('sadeed_migration_control.batches') is null then
    raise exception 'Destination migration ledger required';
  end if;
  if (select count(*) from sadeed_migration_control.batches) <> 198
    or not exists (select 1 from sadeed_migration_control.batches
      where batch_id='public.user_roles:0000:owner-only' and restored_rows=1) then
    raise exception 'Verified destination ledger and owner-only role replacement required';
  end if;
end;
$destination_guard$;

-- Destination only. Apply AFTER install + rollback check + QA clearance.
-- No HTTP worker, external secret, browser, model, or application login required.
-- Timeouts are command-level: setting statement_timeout inside a function alone
-- would not reliably bound the outer RPC statement.
select cron.schedule(
  'sadeed-operational-watchdog', '*/5 * * * *',
  $job$set statement_timeout = '15s'; set lock_timeout = '1s'; select public.sadeed_runtime_tick();$job$
);

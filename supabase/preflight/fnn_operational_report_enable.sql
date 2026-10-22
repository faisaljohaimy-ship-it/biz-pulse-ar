-- Destination only, after QA/install/TEMP-only regression. Exact job is upserted.
-- Five minutes per owner-authorized implementation plan, independent of browsers.
do $destination_guard$
begin
  if to_regclass('sadeed_migration_control.batches') is null then
    raise exception 'Destination migration ledger required';
  end if;
  if (select count(*) from sadeed_migration_control.batches) <> 198
    or not exists(select 1 from sadeed_migration_control.batches
      where batch_id='public.user_roles:0000:owner-only' and restored_rows=1)
    or (select count(*) from public.user_roles where role='admin') <> 1
    or not exists(select 1 from public.user_roles where role='admin'
      and user_id='0e48b528-26f5-4529-a1bf-aa644bbd3525'::uuid)
    or (select count(*) from public.org_members where role='admin'
      and org_id='00000000-0000-0000-0000-000000000001'::uuid) <> 1
    or not exists(select 1 from public.org_members where role='admin'
      and org_id='00000000-0000-0000-0000-000000000001'::uuid
      and user_id='0e48b528-26f5-4529-a1bf-aa644bbd3525'::uuid)
    or to_regprocedure('sadeed_ops.fnn_operational_report_tick()') is null then
    raise exception 'Verified destination ledger, sole owner administrator, and installed reporting required';
  end if;
end;
$destination_guard$;
select cron.schedule(
  'sadeed-fnn-operational-report','*/5 * * * *',
  $job$set statement_timeout='15s'; set lock_timeout='1s'; select sadeed_ops.fnn_operational_report_tick();$job$
);

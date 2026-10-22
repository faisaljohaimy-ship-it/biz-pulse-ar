-- Destination-only proposal. Installs readonly operational snapshot reporting;
-- scheduling is separate. Does not enable legacy definitions/tools/workflows,
-- execute events, call models/networks, expose identities, or alter business rows.
do $destination_guard$
begin
  if to_regclass('sadeed_migration_control.batches') is null then
    raise exception 'Destination migration ledger required';
  end if;
  if (select count(*) from sadeed_migration_control.batches) <> 198
    or not exists (select 1 from sadeed_migration_control.batches
      where batch_id='public.user_roles:0000:owner-only' and restored_rows=1)
    or (select count(*) from public.user_roles where role='admin') <> 1
    or not exists (select 1 from public.user_roles
      where role='admin' and user_id='0e48b528-26f5-4529-a1bf-aa644bbd3525'::uuid)
    or (select count(*) from public.org_members where role='admin'
      and org_id='00000000-0000-0000-0000-000000000001'::uuid) <> 1
    or not exists (select 1 from public.org_members where role='admin'
      and org_id='00000000-0000-0000-0000-000000000001'::uuid
      and user_id='0e48b528-26f5-4529-a1bf-aa644bbd3525'::uuid)
    or to_regprocedure('sadeed_ops.watchdog_status()') is null then
    raise exception 'Verified destination ledger, sole owner administrator, and watchdog required';
  end if;
end;
$destination_guard$;

create schema if not exists sadeed_ops;
grant usage on schema sadeed_ops to service_role;
create table if not exists sadeed_ops.fnn_automation_state (
  singleton boolean primary key default true check(singleton),
  last_attempt_at timestamptz,
  last_completed_at timestamptz,
  last_success_at timestamptz,
  last_error_code text,
  completed_cycles bigint not null default 0,
  report jsonb
);
alter table sadeed_ops.fnn_automation_state enable row level security;
revoke all on sadeed_ops.fnn_automation_state from public, anon, authenticated, service_role;
insert into sadeed_ops.fnn_automation_state(singleton) values(true) on conflict do nothing;

create or replace function sadeed_ops.fnn_operational_report_tick()
returns jsonb language plpgsql security definer
set search_path = pg_catalog
set lock_timeout = '1s'
as $fnn_tick$
declare
  v_started timestamptz := clock_timestamp();
  v_pending integer;
  v_running integer;
  v_watchdog jsonb;
  v_report jsonb;
  v_error text;
  v_rows integer;
begin
  if not pg_try_advisory_xact_lock(1935762533, 20261023) then
    return jsonb_build_object('status','skipped','reason','already_running');
  end if;
  begin
    -- Reporting stops if the explicitly approved owner/tenant boundary changes.
    if (select count(*) from public.user_roles where role='admin') <> 1
      or not exists(select 1 from public.user_roles where role='admin'
        and user_id='0e48b528-26f5-4529-a1bf-aa644bbd3525'::uuid)
      or (select count(*) from public.org_members where role='admin'
        and org_id='00000000-0000-0000-0000-000000000001'::uuid) <> 1
      or not exists(select 1 from public.org_members where role='admin'
        and org_id='00000000-0000-0000-0000-000000000001'::uuid
        and user_id='0e48b528-26f5-4529-a1bf-aa644bbd3525'::uuid) then
      raise exception using errcode='28000',message='Approved owner boundary unavailable';
    end if;
    update sadeed_ops.fnn_automation_state set last_attempt_at=v_started where singleton;
    get diagnostics v_rows=row_count;
    if v_rows <> 1 then
      raise exception using errcode='P0001',message='Reporting state unavailable';
    end if;
    v_watchdog := sadeed_ops.watchdog_status();
    if v_watchdog is null or jsonb_typeof(v_watchdog) <> 'object'
      or coalesce(v_watchdog->>'state','') not in ('disabled','initializing','healthy','stale','error') then
      raise exception using errcode='P0001', message='Watchdog evidence unavailable';
    end if;
    select count(*)::integer into v_pending from (
      select 1 from public.enterprise_events
      where org_id='00000000-0000-0000-0000-000000000001'::uuid
        and status='pending' limit 1001
    ) q;
    select count(*)::integer into v_running from (
      select 1 from public.workflow_runs
      where org_id='00000000-0000-0000-0000-000000000001'::uuid
        and status='running' limit 1001
    ) q;
    v_report := jsonb_build_object(
      'observed_at',v_started,
      'watchdog_state',v_watchdog->>'state',
      'pending_events',least(v_pending,1000),
      'pending_events_capped',v_pending>1000,
      'running_workflows',least(v_running,1000),
      'running_workflows_capped',v_running>1000,
      'sample_limit',1000
    );
    update sadeed_ops.fnn_automation_state set
      last_completed_at=clock_timestamp(), last_success_at=clock_timestamp(),
      last_error_code=null, completed_cycles=completed_cycles+1,
      report=v_report where singleton;
    get diagnostics v_rows=row_count;
    if v_rows <> 1 then
      raise exception using errcode='P0001',message='Reporting completion unavailable';
    end if;
    return jsonb_build_object('status','ok','report',v_report);
  exception when query_canceled or others then
    -- Retain the last verified snapshot with its original observed_at. Never
    -- turn an unavailable query into zero or an old snapshot into a fresh one.
    get stacked diagnostics v_error=returned_sqlstate;
    update sadeed_ops.fnn_automation_state set
      last_attempt_at=v_started,last_completed_at=clock_timestamp(), last_error_code=v_error,
      completed_cycles=completed_cycles+1 where singleton;
    return jsonb_build_object('status','error','error_code',v_error);
  end;
end;
$fnn_tick$;
-- Only the scheduled database job/operator may execute a reporting tick.
revoke all on function sadeed_ops.fnn_operational_report_tick()
  from public, anon, authenticated, service_role;

create or replace function sadeed_ops.fnn_automation_status()
returns jsonb language sql stable security definer
set search_path = pg_catalog
as $fnn_status$
  select jsonb_build_object(
    'enabled',exists(select 1 from cron.job
      where jobname='sadeed-fnn-operational-report' and active),
    'schedule',(select schedule from cron.job
      where jobname='sadeed-fnn-operational-report' limit 1),
    'state',case
      when not exists(select 1 from cron.job
        where jobname='sadeed-fnn-operational-report' and active) then 'disabled'
      when s.last_attempt_at is null then 'initializing'
      when s.last_error_code is not null then 'error'
      when s.last_success_at is null or s.last_success_at < now()-interval '15 minutes' then 'stale'
      else 'healthy' end,
    'last_attempt_at',s.last_attempt_at,
    'last_completed_at',s.last_completed_at,
    'last_success_at',s.last_success_at,
    'last_error_code',s.last_error_code,
    'completed_cycles',s.completed_cycles,
    'report',s.report
  ) from sadeed_ops.fnn_automation_state s where s.singleton;
$fnn_status$;
revoke all on function sadeed_ops.fnn_automation_status() from public, anon, authenticated;
grant execute on function sadeed_ops.fnn_automation_status() to service_role;

-- The application server must independently verify the live system owner.
-- SECURITY INVOKER is intentional; no public/client role may call this RPC.
create or replace function public.sadeed_fnn_automation_status()
returns jsonb language sql stable security invoker set search_path=pg_catalog
as $fnn_wrapper$ select sadeed_ops.fnn_automation_status(); $fnn_wrapper$;
revoke all on function public.sadeed_fnn_automation_status() from public, anon, authenticated;
grant execute on function public.sadeed_fnn_automation_status() to service_role;

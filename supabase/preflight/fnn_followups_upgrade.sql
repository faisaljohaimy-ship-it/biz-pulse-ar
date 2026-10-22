-- Destination-only bounded FNN follow-ups upgrade. Review/apply transactionally.
-- Extends the existing five-minute job; does NOT create/activate another worker.
-- No business writes, event dispatch, model/network calls, messages, or PII.
set local lock_timeout='1s';
set local statement_timeout='15s';
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
    or to_regprocedure('sadeed_ops.watchdog_status()') is null
    or to_regclass('sadeed_ops.fnn_automation_state') is null
    or (select count(*) from sadeed_ops.fnn_automation_state where singleton) <> 1 then
    raise exception 'Verified destination ledger, sole owner administrator, and watchdog required';
  end if;
end;
$destination_guard$;

-- Hold the same transaction lock as the existing scheduled reporter during upgrade.
select pg_advisory_xact_lock(1935762533,20261023);
alter table sadeed_ops.fnn_automation_state add column if not exists activation_at timestamptz;
alter table sadeed_ops.fnn_automation_state add column if not exists task_reconciled_at timestamptz;
-- Once-only watermark. Reapplying the upgrade must never reset this timestamp.
update sadeed_ops.fnn_automation_state set activation_at=clock_timestamp() where activation_at is null;
alter table sadeed_ops.fnn_automation_state alter column activation_at set not null;
alter table sadeed_ops.fnn_automation_state alter column activation_at set default clock_timestamp();
create table if not exists sadeed_ops.fnn_automation_tasks (
  code text primary key check(code in ('watchdog_unhealthy','new_event_backlog')),
  status text not null check(status in ('open','resolved')),
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  last_evaluated_at timestamptz not null,
  resolved_at timestamptz,
  reopen_count bigint not null default 0 check(reopen_count>=0),
  resolution_count bigint not null default 0 check(resolution_count>=0),
  evidence jsonb not null check(jsonb_typeof(evidence)='object'),
  check(first_seen_at<=last_seen_at and last_seen_at<=last_evaluated_at),
  check((status='open' and resolved_at is null) or (status='resolved' and resolved_at is not null))
);
alter table sadeed_ops.fnn_automation_tasks enable row level security;
revoke all on sadeed_ops.fnn_automation_tasks from public,anon,authenticated,service_role;

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
  v_activation timestamptz;
  v_backlog integer;
  v_watchdog_success timestamptz;
  v_watchdog_state text;
  v_code text;
  v_positive boolean;
  v_existing integer;
  v_evidence jsonb;
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
    update sadeed_ops.fnn_automation_state set last_attempt_at=v_started where singleton
      returning activation_at into v_activation;
    get diagnostics v_rows=row_count;
    if v_rows <> 1 or v_activation is null or v_activation > v_started then
      raise exception using errcode='P0001',message='Reporting activation state unavailable';
    end if;
    v_watchdog := sadeed_ops.watchdog_status();
    if v_watchdog is null or jsonb_typeof(v_watchdog) <> 'object'
      or coalesce(v_watchdog->>'state','') not in ('disabled','initializing','healthy','stale','error') then
      raise exception using errcode='P0001', message='Watchdog evidence unavailable';
    end if;
    v_watchdog_state := v_watchdog->>'state';
    -- Only an explicitly healthy, fresh, well-formed success may resolve a warning.
    -- Valid nonhealthy states open a warning even before their first success.
    if v_watchdog_state='healthy' then
      if jsonb_typeof(v_watchdog->'last_success_at') is distinct from 'string'
        or (v_watchdog->>'last_success_at') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' then
        raise exception using errcode='P0001',message='Healthy watchdog timestamp unavailable';
      end if;
      v_watchdog_success := (v_watchdog->>'last_success_at')::timestamptz;
      if not isfinite(v_watchdog_success) or v_watchdog_success < v_started-interval '15 minutes'
        or v_watchdog_success > v_started+interval '60 seconds' then
        raise exception using errcode='P0001',message='Healthy watchdog evidence is not fresh';
      end if;
    end if;
    select count(*)::integer into v_backlog from (
      select 1 from public.enterprise_events
      where org_id='00000000-0000-0000-0000-000000000001'::uuid and status='pending'
        and occurred_at >= v_activation and occurred_at <= v_started-interval '15 minutes'
      limit 1001
    ) q;
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
    v_evidence := jsonb_build_object('watchdog_state',v_watchdog_state,
      'pending_events_aged',least(v_backlog,1000),'pending_events_aged_capped',v_backlog>1000,
      'sample_limit',1000);
    -- Two fixed private follow-ups only. Never dispatch the imported event queue.
    foreach v_code in array array['watchdog_unhealthy','new_event_backlog'] loop
      v_positive := case v_code when 'watchdog_unhealthy' then v_watchdog_state <> 'healthy'
        else v_backlog > 0 end;
      select count(*)::integer into v_existing from sadeed_ops.fnn_automation_tasks where code=v_code;
      if v_positive then
        insert into sadeed_ops.fnn_automation_tasks(code,status,first_seen_at,last_seen_at,last_evaluated_at,evidence)
        values(v_code,'open',v_started,v_started,v_started,v_evidence)
        on conflict(code) do update set status='open',last_seen_at=v_started,last_evaluated_at=v_started,
          resolved_at=null,evidence=v_evidence,
          reopen_count=sadeed_ops.fnn_automation_tasks.reopen_count+
            case when sadeed_ops.fnn_automation_tasks.status='resolved' then 1 else 0 end;
        get diagnostics v_rows=row_count;
        if v_rows <> 1 then raise exception using errcode='P0001',message='Follow-up admission unavailable'; end if;
      else
        -- A negative first observation does not invent a resolved task.
        update sadeed_ops.fnn_automation_tasks set status='resolved',last_evaluated_at=v_started,
          resolved_at=case when status='open' then v_started else resolved_at end,
          resolution_count=resolution_count+case when status='open' then 1 else 0 end,
          evidence=v_evidence where code=v_code;
        get diagnostics v_rows=row_count;
        if v_rows <> v_existing then raise exception using errcode='P0001',message='Follow-up resolution unavailable'; end if;
      end if;
    end loop;
    update sadeed_ops.fnn_automation_state set
      last_completed_at=clock_timestamp(), last_success_at=clock_timestamp(),
      last_error_code=null, completed_cycles=completed_cycles+1,
      report=v_report,task_reconciled_at=v_started where singleton;
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

revoke all on function sadeed_ops.fnn_operational_report_tick() from public,anon,authenticated,service_role;
create or replace function sadeed_ops.fnn_automation_tasks_status()
returns jsonb language sql stable security definer set search_path=pg_catalog
as $fnn_tasks$
  select jsonb_build_object('activation_at',s.activation_at,'observed_at',s.task_reconciled_at,
    'state',sadeed_ops.fnn_automation_status()->>'state',
    'tasks',coalesce((select jsonb_agg(jsonb_build_object('code',t.code,'status',t.status,
      'first_seen_at',t.first_seen_at,'last_seen_at',t.last_seen_at,'last_evaluated_at',t.last_evaluated_at,
      'resolved_at',t.resolved_at,'reopen_count',t.reopen_count,'resolution_count',t.resolution_count,
      'evidence',t.evidence) order by t.code) from sadeed_ops.fnn_automation_tasks t),'[]'::jsonb))
  from sadeed_ops.fnn_automation_state s where s.singleton;
$fnn_tasks$;
revoke all on function sadeed_ops.fnn_automation_tasks_status() from public,anon,authenticated;
grant execute on function sadeed_ops.fnn_automation_tasks_status() to service_role;
create or replace function public.sadeed_fnn_automation_tasks()
returns jsonb language sql stable security invoker set search_path=pg_catalog
as $fnn_tasks_wrapper$ select sadeed_ops.fnn_automation_tasks_status(); $fnn_tasks_wrapper$;
revoke all on function public.sadeed_fnn_automation_tasks() from public,anon,authenticated;
grant execute on function public.sadeed_fnn_automation_tasks() to service_role;

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

-- Reviewed deployment proposal, NOT a generated/applied migration.
-- Target: the independent destination database only. Never run on the source.
-- This file installs the watchdog but DOES NOT schedule or activate it.
-- Apply transactionally, then run operational_watchdog_check.sql before enabling.
-- No external requests, model calls, event dispatch, deletion, or synthetic success.

create schema if not exists sadeed_ops;
revoke all on schema sadeed_ops from public, anon, authenticated, service_role;
grant usage on schema sadeed_ops to service_role;

create table if not exists sadeed_ops.watchdog_state (
  singleton boolean primary key default true check (singleton),
  last_attempt_at timestamptz,
  last_completed_at timestamptz,
  last_success_at timestamptz,
  last_error_code text,
  metrics jsonb not null default '{}'::jsonb,
  completed_cycles bigint not null default 0
);
alter table sadeed_ops.watchdog_state enable row level security;
revoke all on sadeed_ops.watchdog_state from public, anon, authenticated, service_role;
insert into sadeed_ops.watchdog_state(singleton) values (true) on conflict do nothing;

create or replace function sadeed_ops.watchdog_tick()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
set lock_timeout = '1s'
as $watchdog$
declare
  v_started timestamptz := clock_timestamp();
  v_agents integer := 0;
  v_tools integer := 0;
  v_workflows integer := 0;
  v_pending integer := 0;
  v_running integer := 0;
  v_metrics jsonb;
  v_error text;
begin
  -- One worker per database. A second worker returns without touching the state.
  if not pg_try_advisory_xact_lock(1935762533, 20261022) then
    return jsonb_build_object('status', 'skipped', 'reason', 'already_running',
      'agents_timed_out', 0, 'tools_timed_out', 0, 'workflows_timed_out', 0);
  end if;

  update sadeed_ops.watchdog_state set last_attempt_at = v_started where singleton;
  begin
    -- Each write batch is bounded; SKIP LOCKED never waits for an executor's row.
    -- The elapsed durations are genuine expiry, not proof of completed work.
    with stale as (
      select id from public.agent_runs
      where org_id = '00000000-0000-0000-0000-000000000001'::uuid
        and status = 'running' and started_at < v_started - interval '90 minutes'
      order by started_at, id limit 20 for update skip locked
    ), changed as (
      update public.agent_runs r set status = 'failed', finished_at = v_started,
        error = 'Watchdog: no completion within the 90-minute run limit',
        summary = 'Expired by the scheduled operational watchdog; no success inferred.'
      from stale s where r.id = s.id and r.status = 'running' returning r.id
    ) select count(*)::integer into v_agents from changed;

    with stale as (
      select id from public.tool_executions
      where org_id = '00000000-0000-0000-0000-000000000001'::uuid
        and status = 'running' and started_at < v_started - interval '5 minutes'
      order by started_at, id limit 20 for update skip locked
    ), changed as (
      update public.tool_executions r set status = 'failed', finished_at = v_started,
        error = 'Watchdog: no completion within the 5-minute tool limit',
        duration_ms = least(2147483647::numeric,
          greatest(0, extract(epoch from (v_started - r.started_at)) * 1000))::integer
      from stale s where r.id = s.id and r.status = 'running' returning r.id
    ) select count(*)::integer into v_tools from changed;

    -- Never auto-advance a workflow or mark it succeeded. A fresh step, or an
    -- approval/waiting state, protects genuine long-running work from expiry.
    with stale as (
      select r.id from public.workflow_runs r
      where r.org_id = '00000000-0000-0000-0000-000000000001'::uuid
        and r.status = 'running' and r.started_at < v_started - interval '90 minutes'
        and not exists (
          select 1 from public.workflow_step_runs s where s.run_id = r.id
            and (s.status in ('waiting', 'waiting_approval', 'pending_approval')
              or (s.kind = 'approval' and s.status = 'running')
              or (s.status = 'running' and s.started_at >= v_started - interval '30 minutes'))
        )
      order by r.started_at, r.id limit 20 for update of r skip locked
    ), changed as (
      update public.workflow_runs r set status = 'failed', finished_at = v_started,
        error = 'Watchdog: expired workflow without a recent running step'
      from stale s where r.id = s.id and r.status = 'running' returning r.id
    ) select count(*)::integer into v_workflows from changed;

    -- Operational queue indicators are capped, not fabricated exact totals.
    select count(*)::integer into v_pending from (
      select 1 from public.enterprise_events where org_id = '00000000-0000-0000-0000-000000000001'::uuid
        and status = 'pending' limit 1001
    ) q;
    select count(*)::integer into v_running from (
      select 1 from public.workflow_runs where org_id = '00000000-0000-0000-0000-000000000001'::uuid
        and status = 'running' limit 1001
    ) q;
    v_metrics := jsonb_build_object(
      'agents_timed_out', v_agents, 'tools_timed_out', v_tools,
      'workflows_timed_out', v_workflows,
      'pending_events', least(v_pending, 1000), 'pending_events_capped', v_pending > 1000,
      'running_workflows', least(v_running, 1000), 'running_workflows_capped', v_running > 1000,
      'duration_ms', greatest(0, floor(extract(epoch from (clock_timestamp() - v_started)) * 1000)));
    update sadeed_ops.watchdog_state set last_completed_at = clock_timestamp(),
      last_success_at = clock_timestamp(), last_error_code = null,
      metrics = v_metrics, completed_cycles = completed_cycles + 1 where singleton;
    return v_metrics || jsonb_build_object('status', 'ok', 'at', v_started);
  exception when query_canceled or others then
    -- The inner block rolls back ALL business writes on failure. Store only an
    -- SQLSTATE, never row contents, identities, request headers, or raw errors.
    get stacked diagnostics v_error = returned_sqlstate;
    update sadeed_ops.watchdog_state set last_completed_at = clock_timestamp(),
      last_error_code = v_error, metrics = '{}'::jsonb,
      completed_cycles = completed_cycles + 1 where singleton;
    return jsonb_build_object('status', 'error', 'error_code', v_error,
      'agents_timed_out', 0, 'tools_timed_out', 0, 'workflows_timed_out', 0);
  end;
end;
$watchdog$;
revoke all on function sadeed_ops.watchdog_tick() from public, anon, authenticated;
grant execute on function sadeed_ops.watchdog_tick() to service_role;

create or replace function sadeed_ops.watchdog_status()
returns jsonb
language sql stable
security definer
set search_path = pg_catalog
as $status$
  select jsonb_build_object(
    'enabled', exists(select 1 from cron.job where jobname = 'sadeed-operational-watchdog' and active),
    'schedule', (select schedule from cron.job where jobname = 'sadeed-operational-watchdog' limit 1),
    'last_status', case when s.last_attempt_at is null then 'not_run'
      when s.last_error_code is not null then 'error' else 'ok' end,
    'last_error', s.last_error_code,
    'state', case
      when not exists(select 1 from cron.job where jobname = 'sadeed-operational-watchdog' and active)
        then 'disabled'
      when s.last_attempt_at is null then 'initializing'
      when s.last_error_code is not null then 'error'
      when s.last_success_at is null or s.last_success_at < now() - interval '15 minutes' then 'stale'
      else 'healthy' end,
    'last_attempt_at', s.last_attempt_at, 'last_completed_at', s.last_completed_at,
    'last_success_at', s.last_success_at, 'last_error_code', s.last_error_code,
    'metrics', s.metrics, 'completed_cycles', s.completed_cycles
  ) from sadeed_ops.watchdog_state s where s.singleton;
$status$;
revoke all on function sadeed_ops.watchdog_status() from public, anon, authenticated;
grant execute on function sadeed_ops.watchdog_status() to service_role;

-- Only the trusted application server may use these PostgREST RPC wrappers.
-- It MUST independently check the live owner's identity before forwarding status
-- or a manual tick. No anon/authenticated grant and no user-controlled org input.
create or replace function public.sadeed_runtime_tick()
returns jsonb language sql security invoker set search_path = pg_catalog
as $wrapper$ select sadeed_ops.watchdog_tick(); $wrapper$;
revoke all on function public.sadeed_runtime_tick() from public, anon, authenticated;
grant execute on function public.sadeed_runtime_tick() to service_role;

create or replace function public.sadeed_runtime_status()
returns jsonb language sql stable security invoker set search_path = pg_catalog
as $wrapper$ select sadeed_ops.watchdog_status(); $wrapper$;
revoke all on function public.sadeed_runtime_status() from public, anon, authenticated;
grant execute on function public.sadeed_runtime_status() to service_role;

-- Scheduling is a separate, deliberately reviewed step; use the exact command
-- in operational_watchdog_enable.sql only after the rollback regression passes.

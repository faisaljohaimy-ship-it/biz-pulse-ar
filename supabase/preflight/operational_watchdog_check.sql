-- Isolated fixtures only. Use scripts/build-watchdog-regression.py to prepend
-- temporary LIKE tables and the mechanically mapped production function body.
-- No real business rows, public functions, roles, or cron jobs are changed.
insert into pg_temp.watchdog_state(singleton) values(true);
insert into pg_temp.agent_runs(id,agent_id,org_id,status,started_at)
select md5('cap-'||i)::uuid,'fixture','00000000-0000-0000-0000-000000000001','running','2000-01-01' from generate_series(1,21) i;
insert into pg_temp.agent_runs(id,agent_id,org_id,status,started_at) values
 ('60000000-0000-4000-8000-000000000001','fixture','00000000-0000-0000-0000-000000000001','running',now()),
 ('60000000-0000-4000-8000-000000000002','fixture','60000000-0000-4000-8000-000000000099','running','2000-01-01');
insert into pg_temp.tool_executions(id,tool_id,org_id,status,started_at) values
 ('60000000-0000-4000-8000-000000000003','fixture','00000000-0000-0000-0000-000000000001','running','2000-01-01'),
 ('60000000-0000-4000-8000-000000000004','fixture','00000000-0000-0000-0000-000000000001','running',now()),
 ('60000000-0000-4000-8000-000000000005','fixture','00000000-0000-0000-0000-000000000001','pending_approval','2000-01-01');
insert into pg_temp.workflow_runs(id,workflow_id,org_id,status,started_at,current_step)
select ('60000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,
 '60000000-0000-4000-8000-000000000100',
 case when i=16 then '60000000-0000-4000-8000-000000000099' else '00000000-0000-0000-0000-000000000001' end::uuid,
 case when i=13 then 'waiting_approval' else 'running' end,
 case when i=12 then now() else '2000-01-01'::timestamptz end,'fixture-step'
from generate_series(11,16) i;
insert into pg_temp.workflow_step_runs(run_id,org_id,step_id,kind,status,started_at) values
 ('60000000-0000-4000-8000-000000000014','00000000-0000-0000-0000-000000000001','fresh','tool','running',now()),
 ('60000000-0000-4000-8000-000000000015','00000000-0000-0000-0000-000000000001','approval','approval','waiting','2000-01-01');
insert into pg_temp.enterprise_events(topic,source,status,org_id) values
 ('fixture','fixture','pending','00000000-0000-0000-0000-000000000001'),
 ('fixture','fixture','pending','60000000-0000-4000-8000-000000000099');
do $checks$
declare result jsonb;
begin
 result:=pg_temp.watchdog_tick();
 if result->>'status'<>'ok' or (result->>'agents_timed_out')::int<>20
 or (result->>'tools_timed_out')::int<>1 or (result->>'workflows_timed_out')::int<>1
 or (result->>'pending_events')::int<>1 then raise exception 'bounded expiry/scope failed: %',result; end if;
 if exists(select 1 from pg_temp.workflow_runs where id<>'60000000-0000-4000-8000-000000000011' and status not in ('running','waiting_approval'))
 or (select status from pg_temp.agent_runs where id='60000000-0000-4000-8000-000000000001')<>'running'
 or (select status from pg_temp.agent_runs where id='60000000-0000-4000-8000-000000000002')<>'running'
 or (select status from pg_temp.tool_executions where id='60000000-0000-4000-8000-000000000005')<>'pending_approval'
 or exists(select 1 from pg_temp.workflow_runs where current_step<>'fixture-step') then raise exception 'fresh/foreign/waiting or real-step protection failed'; end if;
 result:=pg_temp.watchdog_tick();
 if (result->>'agents_timed_out')::int<>1 or (result->>'tools_timed_out')::int<>0
 or (result->>'workflows_timed_out')::int<>0 then raise exception 'second bounded batch failed'; end if;
 result:=pg_temp.watchdog_tick();
 if (result->>'agents_timed_out')::int<>0 then raise exception 'repeat expired same rows'; end if;
end;
$checks$;
-- Inject a failure in TEMP tables only; earlier changes in the same tick roll back.
update pg_temp.agent_runs set status='running',finished_at=null where id=md5('cap-1')::uuid;
update pg_temp.tool_executions set status='running',finished_at=null where id='60000000-0000-4000-8000-000000000003';
create function pg_temp.inject_failure() returns trigger language plpgsql as $f$
begin raise exception using errcode='P0001',message='isolated failure'; end;$f$;
create trigger isolated_failure before update on pg_temp.tool_executions for each row execute function pg_temp.inject_failure();
do $atomic$
declare result jsonb;
begin
 result:=pg_temp.watchdog_tick();
 if result->>'status'<>'error' or result->>'error_code'<>'P0001'
 or (select status from pg_temp.agent_runs where id=md5('cap-1')::uuid)<>'running'
 or (select last_error_code from pg_temp.watchdog_state)<>'P0001' then raise exception 'atomic failure boundary failed'; end if;
end;$atomic$;
drop trigger isolated_failure on pg_temp.tool_executions;
do $recovery$
declare result jsonb;
begin
 result:=pg_temp.watchdog_tick();
 if result->>'status'<>'ok' or (select last_error_code from pg_temp.watchdog_state) is not null then raise exception 'recovery failed'; end if;
end;$recovery$;
select 'isolated watchdog regression passed' result;

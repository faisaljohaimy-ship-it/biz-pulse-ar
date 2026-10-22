-- TEMP-only regression.
insert into pg_temp.user_roles values('0e48b528-26f5-4529-a1bf-aa644bbd3525','admin');
insert into pg_temp.org_members values('00000000-0000-0000-0000-000000000001','0e48b528-26f5-4529-a1bf-aa644bbd3525','admin');
insert into pg_temp.fnn_automation_state(singleton) values(true);
insert into pg_temp.watchdog_fixture values('{"state":"healthy"}');
insert into pg_temp.cron_job values('sadeed-fnn-operational-report','*/5 * * * *',true);
do $initial$
declare outcome jsonb;
begin
  if pg_temp.fnn_automation_status()->>'state' is distinct from 'initializing' then raise exception 'false startup'; end if;
  outcome:=pg_temp.fnn_operational_report_tick();
  if outcome->>'status' is distinct from 'ok' then raise exception 'zero tick failed: %',outcome; end if;
  if pg_temp.fnn_automation_status()#>>'{report,pending_events}' is distinct from '0' then raise exception 'zero snapshot failed'; end if;
end;
$initial$;
insert into pg_temp.enterprise_events select '00000000-0000-0000-0000-000000000001','pending' from generate_series(1,1002);
insert into pg_temp.enterprise_events select '10000000-0000-0000-0000-000000000001','pending' from generate_series(1,7);
insert into pg_temp.workflow_runs select '00000000-0000-0000-0000-000000000001','running' from generate_series(1,1003);
insert into pg_temp.workflow_runs select '10000000-0000-0000-0000-000000000001','running' from generate_series(1,9);
do $cap$
declare r jsonb; outcome jsonb;
begin
  outcome:=pg_temp.fnn_operational_report_tick();
  if outcome->>'status' is distinct from 'ok' then raise exception 'snapshot tick failed: %',outcome; end if;
  r:=outcome->'report';
  if r->>'pending_events' is distinct from '1000' or r->>'pending_events_capped' is distinct from 'true'
    or r->>'running_workflows' is distinct from '1000' or r->>'running_workflows_capped' is distinct from 'true'
    or r->>'sample_limit' is distinct from '1000'
    or (select count(*) from pg_temp.enterprise_events where status='pending')<>1009
    or (select count(*) from pg_temp.workflow_runs where status='running')<>1012 then raise exception 'cap/readonly failed'; end if;
end;
$cap$;
update pg_temp.enterprise_events set status='processed' where org_id='00000000-0000-0000-0000-000000000001';
update pg_temp.workflow_runs set status='succeeded' where org_id='00000000-0000-0000-0000-000000000001';
update pg_temp.watchdog_fixture set value='{"state":"stale"}';
do $tenant$
declare r jsonb; outcome jsonb;
begin
  outcome:=pg_temp.fnn_operational_report_tick();
  if outcome->>'status' is distinct from 'ok' then raise exception 'snapshot tick failed: %',outcome; end if;
  r:=outcome->'report';
  if r->>'pending_events' is distinct from '0' or r->>'running_workflows' is distinct from '0'
    or r->>'pending_events_capped' is distinct from 'false' or r->>'running_workflows_capped' is distinct from 'false'
    or r->>'watchdog_state' is distinct from 'stale' then raise exception 'tenant/terminal/watchdog failed'; end if;
end;
$tenant$;
-- Dependency failure.
update pg_temp.watchdog_fixture set value='{"state":"invented"}';
do $error$
declare r jsonb; previous jsonb; success_at timestamptz; cycles bigint;
begin
  select report,last_success_at,completed_cycles into previous,success_at,cycles from pg_temp.fnn_automation_state;
  r:=pg_temp.fnn_operational_report_tick();
  if r->>'status' is distinct from 'error' or r->>'error_code' is distinct from 'P0001'
    or (select report from pg_temp.fnn_automation_state) is distinct from previous
    or (select last_success_at from pg_temp.fnn_automation_state) is distinct from success_at
    or (select completed_cycles from pg_temp.fnn_automation_state)<>cycles+1
    or pg_temp.fnn_automation_status()->>'state' is distinct from 'error' then raise exception 'error evidence failed'; end if;
end;
$error$;
update pg_temp.watchdog_fixture set value='{"state":"healthy"}';
delete from pg_temp.user_roles;
do $owner$
begin
  if pg_temp.fnn_operational_report_tick()->>'error_code' is distinct from '28000' then raise exception 'missing owner did not stop reporting'; end if;
end;
$owner$;
insert into pg_temp.user_roles values('0e48b528-26f5-4529-a1bf-aa644bbd3525','admin');
-- Lost acknowledgement.
create function pg_temp.drop_report_write() returns trigger language plpgsql as $trigger$
begin if new.report is distinct from old.report then return null; end if; return new; end;
$trigger$;
create trigger drop_report_write before update on pg_temp.fnn_automation_state for each row execute function pg_temp.drop_report_write();
do $lost_ack$
begin
  if pg_temp.fnn_operational_report_tick()->>'error_code' is distinct from 'P0001' then raise exception 'missing completion acknowledged'; end if;
end;
$lost_ack$;
drop trigger drop_report_write on pg_temp.fnn_automation_state;
do $recover$
declare outcome jsonb;
begin
  outcome:=pg_temp.fnn_operational_report_tick();
  if outcome->>'status' is distinct from 'ok' then raise exception 'recovery tick failed: %',outcome; end if;
  if pg_temp.fnn_automation_status()->>'last_error_code' is not null then raise exception 'recovery status failed'; end if;
  if has_function_privilege('anon','pg_temp.fnn_automation_status()','execute')
    or has_function_privilege('authenticated','pg_temp.fnn_automation_status()','execute')
    or has_function_privilege('service_role','pg_temp.fnn_operational_report_tick()','execute')
    or not has_function_privilege('service_role','pg_temp.fnn_automation_status()','execute')
    or has_table_privilege('service_role','pg_temp.fnn_automation_state','select') then raise exception 'ACL boundary failed'; end if;
end;
$recover$;
delete from pg_temp.fnn_automation_state;
do $missing_state$
begin
  if pg_temp.fnn_operational_report_tick()->>'status' is distinct from 'error' then raise exception 'missing singleton reported success'; end if;
end;
$missing_state$;
select 'FNN TEMP-only regression passed: cap/tenant/readonly/error/owner/persistence/recovery/access' as result;

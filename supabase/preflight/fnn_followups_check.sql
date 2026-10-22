-- TEMP-only fixtures: immutable watermark, no historical replay, fixed task lifecycle.
insert into pg_temp.user_roles values('0e48b528-26f5-4529-a1bf-aa644bbd3525','admin');
insert into pg_temp.org_members values('00000000-0000-0000-0000-000000000001','0e48b528-26f5-4529-a1bf-aa644bbd3525','admin');
insert into pg_temp.fnn_automation_state(singleton,activation_at) values(true,clock_timestamp()-interval '2 hours');
create function pg_temp.ok() returns void language plpgsql as $a$
declare r jsonb;
begin r:=pg_temp.fnn_operational_report_tick(); if r->>'status' is distinct from 'ok' then raise exception 'tick: %',r; end if; end;
$a$;
create function pg_temp.snapshot() returns jsonb language sql stable as $s$
select jsonb_build_object('report',report,'at',task_reconciled_at,'tasks',(select jsonb_agg(to_jsonb(t) order by code) from pg_temp.fnn_automation_tasks t)) from pg_temp.fnn_automation_state;
$s$;
create function pg_temp.assert_tasks(s text,reopens int,resolutions int) returns void language plpgsql as $a$
begin
if (select count(*) from pg_temp.fnn_automation_tasks)<>2 or exists(select 1 from pg_temp.fnn_automation_tasks where status<>s or reopen_count<>reopens or resolution_count<>resolutions or last_evaluated_at<>(select task_reconciled_at from pg_temp.fnn_automation_state) or first_seen_at<(select activation_at from pg_temp.fnn_automation_state)) then raise exception 'lifecycle'; end if;
end;
$a$;
insert into pg_temp.watchdog_fixture values(jsonb_build_object('state','healthy','last_success_at',clock_timestamp()));
insert into pg_temp.enterprise_events select '00000000-0000-0000-0000-000000000001','pending',activation_at-interval '1 second' from pg_temp.fnn_automation_state cross join generate_series(1,2);
insert into pg_temp.enterprise_events values('10000000-0000-0000-0000-000000000001','pending',clock_timestamp()-interval '30 minutes'),('00000000-0000-0000-0000-000000000001','pending',clock_timestamp()-interval '10 minutes'),('00000000-0000-0000-0000-000000000001','pending',clock_timestamp()+interval '1 hour');
select pg_temp.ok();
do $a$
declare old timestamptz;
begin
if (select count(*) from pg_temp.fnn_automation_tasks)<>0 then raise exception 'historical/foreign/recent replay'; end if;
select activation_at into old from pg_temp.fnn_automation_state;
update pg_temp.fnn_automation_state set activation_at=clock_timestamp() where activation_at is null;
if (select activation_at from pg_temp.fnn_automation_state) is distinct from old then raise exception 'watermark reset'; end if;
end;
$a$;
insert into pg_temp.enterprise_events select '00000000-0000-0000-0000-000000000001','pending',activation_at+interval '1 minute' from pg_temp.fnn_automation_state cross join generate_series(1,1001);
update pg_temp.watchdog_fixture set value='{"state":"disabled"}';
select pg_temp.ok(); select pg_temp.assert_tasks('open',0,0);
create temporary table firsts as select code,first_seen_at from pg_temp.fnn_automation_tasks;
do $a$
declare s text;
begin
foreach s in array array['initializing','stale','error','disabled'] loop
update pg_temp.watchdog_fixture set value=jsonb_build_object('state',s);
perform pg_temp.ok();
end loop;
if exists(select 1 from pg_temp.fnn_automation_tasks t join pg_temp.firsts f using(code) where t.first_seen_at<>f.first_seen_at or t.evidence->>'pending_events_aged' is distinct from '1000' or t.evidence->>'pending_events_aged_capped' is distinct from 'true') then raise exception 'first/cap'; end if;
end;
$a$;
update pg_temp.watchdog_fixture set value=jsonb_build_object('state','healthy','last_success_at',clock_timestamp());
update pg_temp.enterprise_events set status='processed' where org_id='00000000-0000-0000-0000-000000000001' and occurred_at>=(select activation_at from pg_temp.fnn_automation_state) and occurred_at<clock_timestamp()-interval '15 minutes';
select pg_temp.ok(); select pg_temp.assert_tasks('resolved',0,1);
do $a$
declare prior jsonb;
begin
select jsonb_agg(jsonb_build_array(code,last_seen_at,resolved_at,resolution_count) order by code) into prior from pg_temp.fnn_automation_tasks;
perform pg_temp.ok();
if (select jsonb_agg(jsonb_build_array(code,last_seen_at,resolved_at,resolution_count) order by code) from pg_temp.fnn_automation_tasks) is distinct from prior then raise exception 'resolution repeated'; end if;
end;
$a$;
update pg_temp.watchdog_fixture set value='{"state":"disabled"}';
insert into pg_temp.enterprise_events values('00000000-0000-0000-0000-000000000001','pending',clock_timestamp()-interval '20 minutes');
select pg_temp.ok(); select pg_temp.assert_tasks('open',1,1);
do $a$
declare prior jsonb; bad text; result jsonb;
begin
prior:=pg_temp.snapshot();
foreach bad in array array[null,'bad',(to_jsonb(clock_timestamp()-interval '16 minutes')#>>'{}'),(to_jsonb(clock_timestamp()+interval '2 minutes')#>>'{}')] loop
update pg_temp.watchdog_fixture set value=jsonb_build_object('state','healthy','last_success_at',bad);
result:=pg_temp.fnn_operational_report_tick();
if result->>'status' is distinct from 'error' or pg_temp.snapshot() is distinct from prior then raise exception 'invalid healthy cleared tasks'; end if;
end loop;
end;
$a$;
-- Suppress the final state save: both task transitions and report must roll back.
create function pg_temp.drop_save() returns trigger language plpgsql as $t$
begin if new.report is distinct from old.report then return null; end if; return new; end;
$t$;
create trigger drop_save before update on pg_temp.fnn_automation_state for each row execute function pg_temp.drop_save();
update pg_temp.watchdog_fixture set value=jsonb_build_object('state','healthy','last_success_at',clock_timestamp());
update pg_temp.enterprise_events set status='processed' where occurred_at>=(select activation_at from pg_temp.fnn_automation_state);
do $a$
declare prior jsonb; r jsonb;
begin
prior:=pg_temp.snapshot();r:=pg_temp.fnn_operational_report_tick();
if r->>'status' is distinct from 'error' or pg_temp.snapshot() is distinct from prior then raise exception 'partial reconciliation'; end if;
end;
$a$;
drop trigger drop_save on pg_temp.fnn_automation_state;
select pg_temp.ok(); select pg_temp.assert_tasks('resolved',1,2);
do $a$
begin
if (select count(*) from pg_temp.fnn_automation_tasks)>2 or pg_temp.fnn_automation_tasks_status()->>'observed_at' is null then raise exception 'task contract'; end if;
if exists(select 1 from pg_temp.fnn_automation_tasks t join pg_temp.firsts f using(code) where t.first_seen_at<>f.first_seen_at) then raise exception 'first seen mutated'; end if;
end;
$a$;
create function pg_temp.drop_task() returns trigger language plpgsql as $t$ begin return null; end; $t$;
create trigger drop_task before insert or update on pg_temp.fnn_automation_tasks for each row when(new.code='new_event_backlog') execute function pg_temp.drop_task();
update pg_temp.watchdog_fixture set value='{"state":"disabled"}';
insert into pg_temp.enterprise_events values('00000000-0000-0000-0000-000000000001','pending',clock_timestamp()-interval '20 minutes');
do $a$
declare prior jsonb; r jsonb;
begin prior:=pg_temp.snapshot();r:=pg_temp.fnn_operational_report_tick();
if r->>'status' is distinct from 'error' or pg_temp.snapshot() is distinct from prior then raise exception 'partial task save'; end if;
end;
$a$;
drop trigger drop_task on pg_temp.fnn_automation_tasks;
select pg_temp.ok(); select pg_temp.assert_tasks('open',2,2);
select 'FNN follow-ups TEMP regression passed' result;

#!/usr/bin/env python3
"""Emit rollback-only TEMP fixtures around the exact reviewed FNN function bodies.
Only namespaces are mechanically mapped. The watchdog dependency is stubbed;
report/tick/status predicates and persistence handling remain unchanged.
"""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
source = (root/'supabase/preflight/fnn_operational_report_install.sql').read_text()
def declaration(pattern):
    match = re.search(pattern, source, re.S)
    if not match:
        raise ValueError('Reviewed SQL declaration missing')
    return match.group(0)
def isolated(sql):
    for table in ['enterprise_events','workflow_runs','user_roles','org_members']:
        sql = sql.replace('public.'+table,'pg_temp.'+table)
    sql = sql.replace('cron.job','pg_temp.cron_job').replace('sadeed_ops.','pg_temp.')
    assert not any(name in sql for name in ['public.','sadeed_ops.','cron.job'])
    return sql
print("begin; set local statement_timeout='5s'; set local lock_timeout='1s';")
print('create temporary table enterprise_events(org_id uuid,status text);')
print('create temporary table workflow_runs(org_id uuid,status text);')
print('create temporary table user_roles(user_id uuid,role text);')
print('create temporary table org_members(org_id uuid,user_id uuid,role text);')
print('create temporary table cron_job(jobname text,schedule text,active boolean);')
print('create temporary table watchdog_fixture(value jsonb);')
print("create function pg_temp.watchdog_status() returns jsonb language sql as 'select value from pg_temp.watchdog_fixture';")
state=declaration(r'create table if not exists sadeed_ops\.fnn_automation_state \(.*?\n\);')
print(state.replace('create table if not exists sadeed_ops.','create temporary table '))
for name,tag in [('fnn_operational_report_tick','fnn_tick'),('fnn_automation_status','fnn_status')]:
    print(isolated(declaration(r'create or replace function sadeed_ops\.'+name+r'\(\).*?\$'+tag+r'\$;')))
print('revoke all on pg_temp.fnn_automation_state from public,anon,authenticated,service_role;')
print('revoke all on function pg_temp.fnn_operational_report_tick() from public,anon,authenticated,service_role;')
print('revoke all on function pg_temp.fnn_automation_status() from public,anon,authenticated;')
print('grant execute on function pg_temp.fnn_automation_status() to service_role;')
print((root/'supabase/preflight/fnn_operational_report_check.sql').read_text())
print('rollback;')

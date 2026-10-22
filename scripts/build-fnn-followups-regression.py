#!/usr/bin/env python3
"""Emit <=16KiB TEMP-only rollback regression of exact FNN follow-up bodies.
Namespaces/comments alone are transformed. Existing watchdog/status dependencies
are stubbed; no persistent relations, roles, cron changes, or real rows are used.
"""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
base=(root/'supabase/preflight/fnn_operational_report_install.sql').read_text()
upgrade=(root/'supabase/preflight/fnn_followups_upgrade.sql').read_text()
def get(source,pattern):
    m=re.search(pattern,source,re.S)
    if not m: raise ValueError('Reviewed SQL declaration missing')
    return m.group(0)
def isolated(sql):
    for table in ['enterprise_events','workflow_runs','user_roles','org_members']:
        sql=sql.replace('public.'+table,'pg_temp.'+table)
    sql=sql.replace('sadeed_ops.','pg_temp.')
    sql=re.sub(r'^\s*--.*\n','',sql,flags=re.M)
    assert not any(x in sql for x in ['public.','sadeed_ops.','cron.job'])
    return "\n".join(line.strip() for line in sql.splitlines() if line.strip())
parts=["begin; set local statement_timeout='5s'; set local lock_timeout='1s';",
'create temporary table enterprise_events(org_id uuid,status text,occurred_at timestamptz);',
'create temporary table workflow_runs(org_id uuid,status text);',
'create temporary table user_roles(user_id uuid,role text);',
'create temporary table org_members(org_id uuid,user_id uuid,role text);',
'create temporary table watchdog_fixture(value jsonb);',
"create function pg_temp.watchdog_status() returns jsonb language sql as 'select value from pg_temp.watchdog_fixture';"]
state=get(base,r'create table if not exists sadeed_ops\.fnn_automation_state \(.*?\n\);')
parts.append(state.replace('create table if not exists sadeed_ops.','create temporary table '))
parts.append('alter table pg_temp.fnn_automation_state add column activation_at timestamptz, add column task_reconciled_at timestamptz;')
tasks=get(upgrade,r'create table if not exists sadeed_ops\.fnn_automation_tasks \(.*?\n\);')
parts.append(tasks.replace('create table if not exists sadeed_ops.','create temporary table '))
parts.append("create function pg_temp.fnn_automation_status() returns jsonb language sql stable as 'select jsonb_build_object(''state'',case when last_error_code is not null then ''error'' else ''healthy'' end) from pg_temp.fnn_automation_state where singleton';")
for name,tag in [('fnn_operational_report_tick','fnn_tick'),('fnn_automation_tasks_status','fnn_tasks')]:
    parts.append(isolated(get(upgrade,r'create or replace function sadeed_ops\.'+name+r'\(\).*?\$'+tag+r'\$;')))
parts.append(isolated((root/'supabase/preflight/fnn_followups_check.sql').read_text()))
parts.append('rollback;')
output='\n'.join(parts)
if len(output.encode())>16384: raise ValueError(f'TEMP regression exceeds 16KiB: {len(output.encode())}')
print(output)

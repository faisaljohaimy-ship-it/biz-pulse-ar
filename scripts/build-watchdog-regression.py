#!/usr/bin/env python3
"""Emit a TEMP-only watchdog regression; run the output in one SQL request.
Mechanically maps the reviewed function's relation names, without reproducing
or weakening its predicates. No credentials, real rows, roles or cron changes.
"""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
install=(root/'supabase/preflight/operational_watchdog_install.sql').read_text()
tick=re.search(r'create or replace function sadeed_ops\.watchdog_tick\(\).*?\$watchdog\$;',install,re.S).group(0)
state=re.search(r'create table if not exists sadeed_ops\.watchdog_state \(.*?\n\);',install,re.S).group(0)
tables=['agent_runs','tool_executions','workflow_runs','workflow_step_runs','enterprise_events']
for table in tables:tick=tick.replace('public.'+table,'pg_temp.'+table)
tick=tick.replace('sadeed_ops.','pg_temp.')
assert 'public.' not in tick and 'sadeed_ops.' not in tick
print("begin; set local statement_timeout='15s'; set local lock_timeout='1s';")
for table in tables:print(f'create temporary table {table} (like public.{table} including defaults including constraints);')
print(state.replace('create table if not exists sadeed_ops.','create temporary table '))
print(tick)
print((root/'supabase/preflight/operational_watchdog_check.sql').read_text())
print('rollback;')

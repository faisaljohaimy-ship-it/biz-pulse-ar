-- ============================================================================
-- Integration hub fuel — 24h of reference sync-log activity so the unified
-- integration center computes LIVE counters/sparklines from real rows
-- (one source for cards AND header totals; constitution art. 6).
-- Idempotent: every row carries a unique sim_key in details and is guarded
-- by NOT EXISTS. Requires an existing organization; no-ops cleanly if none.
-- ============================================================================

-- Open showcase read for the log tables (anon + authenticated).
do $$
declare t text;
begin
  foreach t in array array['integration_microsoft_sync_log','sap_sync_log','integration_microsoft'] loop
    begin
      execute format('grant select on public.%I to anon, authenticated', t);
      execute format('drop policy if exists "%s_select_showcase" on public.%I', t, t);
      execute format(
        'create policy "%s_select_showcase" on public.%I for select to anon, authenticated using (true)',
        t, t
      );
    exception when undefined_table then null;
    end;
  end loop;
end $$;

-- Microsoft sync log: hourly outlook/sharepoint activity for the last 24h.
insert into public.integration_microsoft_sync_log
  (org_id, kind, status, items_count, duration_ms, details, started_at)
select o.id,
       case when h % 3 = 0 then 'sharepoint' else 'outlook' end,
       case when h = 7 then 'error' else 'ok' end,
       8 + (h * 7) % 34,
       900 + (h * 131) % 1800,
       jsonb_build_object('is_simulation', true, 'sim_key', 'ms-24h-' || h),
       now() - (h || ' hours')::interval
from (select id from public.organizations order by created_at limit 1) o
cross join generate_series(0, 23) as h
where not exists (
  select 1 from public.integration_microsoft_sync_log l
  where l.details->>'sim_key' = 'ms-24h-' || h
);

-- SAP sync log: work-order/material pulls across the same 24h window.
insert into public.sap_sync_log
  (org_id, entity, method, path, status, duration_ms, items_count, details, created_at)
select o.id,
       case when h % 2 = 0 then 'work_orders' else 'materials' end,
       'GET',
       case when h % 2 = 0 then '/workorders' else '/materials' end,
       case when h = 15 then 502 else 200 end,
       420 + (h * 97) % 1400,
       12 + (h * 11) % 48,
       jsonb_build_object('is_simulation', true, 'sim_key', 'sap-24h-' || h),
       now() - (h || ' hours')::interval
from (select id from public.organizations order by created_at limit 1) o
cross join generate_series(0, 23) as h
where not exists (
  select 1 from public.sap_sync_log l
  where l.details->>'sim_key' = 'sap-24h-' || h
);

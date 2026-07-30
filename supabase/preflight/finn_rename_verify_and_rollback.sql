-- ============================================================================
-- ARIA → FINN table rename — VERIFY and ROLLBACK for the state that is
-- ACTUALLY LIVE. Read-only by default; the rollback section is commented out.
--
-- WHY THIS FILE REPLACED TWO STAGED MIGRATIONS
-- 20260730140000_finn_rename_tables.sql and 20260730150000_finn_drop_compat_views.sql
-- were written and tested against a database where nothing had been renamed
-- yet. Before they were ever applied, the Lovable pipeline applied its own
-- rename (migrations 20260730205704 + 20260730205748) and regenerated
-- src/integrations/supabase/types.ts from the result. Keeping the staged pair
-- would have been actively harmful, for two reasons:
--
--   1. They rename POLICIES, INDEXES and CONSTRAINTS. The applied pipeline did
--      not. The regenerated types therefore name `aria_*_fkey` — correctly,
--      because that is what the database says. Renaming those objects now
--      would desynchronise the types from the schema in the one direction that
--      is invisible to `tsc`.
--   2. They create 22 `aria_*` compatibility views. Nothing needs them: no
--      deployed client references an `aria_*` TABLE name any more. An unused
--      view is a second surface to keep isolated, for no benefit.
--
-- The way back still has to be written down, so it lives here — matching what
-- was really applied, not what was once planned. A rollback script that
-- describes a state that never existed is worse than none: it will be run in
-- an incident and it will not work.
--
-- ── WHAT IS LIVE NOW ────────────────────────────────────────────────────────
-- 18 tables renamed to finn_*:
--   actions_log · adaptive_preferences · alert_acks · alerts · decisions
--   document_chunks · documents · evolution_cycles · improvement_proposals
--   incidents · interactions · knowledge · learned_patterns · memory
--   outbound_message_events · outbound_messages · public_incidents · reports
--
-- 4 tables deliberately still aria_*:
--   aria_attachment_scans · aria_conversations · aria_learning_log
--   aria_preferences
--   No application code queries them (verified: zero `from()`/`rpc()` call
--   sites), and the staged read-side capture job reads aria_conversations and
--   aria_learning_log by name. Renaming them would break that job and fix
--   nothing, so both sides agree on the old name. This is a CONSISTENT state,
--   not an unfinished one.
--
-- 5 functions still aria_*: aria_match_documents · aria_match_knowledge
--   aria_match_memory · aria_actions_log_retention · aria_scan_corpus_stale
--   Called as RPC by name from the client, which still uses the old name.
--
-- 6 constraints still aria_*: *_org_id_fkey / *_alert_id_fkey /
--   *_document_id_fkey / *_message_id_fkey. RENAME does not move constraints,
--   and the generated types name them as the database has them. Consistent.
-- ============================================================================

-- ── VERIFY — run this to confirm the live schema matches the description above.
-- Every row should read OK. Anything else is drift.
with expect_finn(n) as (
  select unnest(array[
    'finn_actions_log','finn_adaptive_preferences','finn_alert_acks','finn_alerts',
    'finn_decisions','finn_document_chunks','finn_documents','finn_evolution_cycles',
    'finn_improvement_proposals','finn_incidents','finn_interactions','finn_knowledge',
    'finn_learned_patterns','finn_memory','finn_outbound_message_events',
    'finn_outbound_messages','finn_public_incidents','finn_reports'])
), expect_aria(n) as (
  select unnest(array[
    'aria_attachment_scans','aria_conversations','aria_learning_log','aria_preferences'])
)
select 'finn_ tables present' as check,
       case when count(*) = 18 then 'OK' else 'DRIFT: ' || count(*) || '/18' end as result
from expect_finn e
join information_schema.tables t
  on t.table_schema = 'public' and t.table_name = e.n and t.table_type = 'BASE TABLE'
union all
select 'aria_ tables intentionally kept',
       case when count(*) = 4 then 'OK' else 'DRIFT: ' || count(*) || '/4' end
from expect_aria e
join information_schema.tables t
  on t.table_schema = 'public' and t.table_name = e.n and t.table_type = 'BASE TABLE'
union all
select 'RLS enabled on every finn_ table',
       case when bool_and(c.relrowsecurity) then 'OK' else 'DRIFT: RLS OFF somewhere' end
from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
where ns.nspname = 'public' and c.relkind = 'r' and c.relname like 'finn\_%'
union all
select 'RPC functions still aria_ (client calls them)',
       case when count(*) = 5 then 'OK' else 'DRIFT: ' || count(*) || '/5' end
from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
where ns.nspname = 'public' and p.proname in ('aria_match_documents','aria_match_knowledge',
  'aria_match_memory','aria_actions_log_retention','aria_scan_corpus_stale')
union all
select 'no leftover finn_ compatibility VIEWS',
       case when count(*) = 0 then 'OK' else 'DRIFT: ' || count(*) || ' view(s)' end
from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
where ns.nspname = 'public' and c.relkind = 'v' and c.relname like 'finn\_%';


-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK — undoes migrations 20260730205704 + 20260730205748 exactly.
-- Renames the 18 tables back to aria_*. Touches no policy, index or constraint,
-- because the applied migrations did not touch them either — a rollback that
-- undoes more than was done is not a rollback.
--
-- AFTER RUNNING THIS you MUST also revert the application to a build that
-- queries aria_* (git revert of the layer-② commit), or regenerate types.
-- The database and the deployed bundle have to move together in both
-- directions; that is the whole lesson of this rename.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- begin;
-- do $rb$
-- declare n text;
-- begin
--   foreach n in array array[
--     'documents','knowledge','reports','outbound_messages','memory',
--     'public_incidents','document_chunks','decisions','interactions',
--     'improvement_proposals','incidents','evolution_cycles','actions_log',
--     'learned_patterns','alerts','adaptive_preferences','alert_acks',
--     'outbound_message_events'
--   ] loop
--     if to_regclass('public.finn_' || n) is not null
--        and to_regclass('public.aria_' || n) is null then
--       execute format('alter table public.finn_%1$I rename to aria_%1$I', n);
--       raise notice 'rolled back finn_% → aria_%', n, n;
--     end if;
--   end loop;
-- end $rb$;
-- commit;

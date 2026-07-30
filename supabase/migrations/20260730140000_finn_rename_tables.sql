-- ============================================================================
-- LAYER ③ — ARIA → FINN in the database. STAGED. NOT APPLIED.
--
-- ⚠ ORDER OF OPERATIONS — GETTING THIS WRONG IS THE OUTAGE
--   ① apply THIS migration        → finn_* are the tables, aria_* are views;
--                                   old and new code both work
--   ② deploy the layer-② build    → the app queries finn_* directly
--   ③ apply the drop-views file   → aria_* disappears for good
-- The layer-② code has ALREADY shipped to the repo and names finn_*. So until
-- ① runs, main must not be deployed: the code would query a table that does not
-- exist. Doing ③ before ② is the mirror-image outage.
--
-- WHY ALL 22 TABLES AND NOT ONLY aria_knowledge
-- The brief named aria_knowledge. But layer ② renamed every table reference in
-- the application, so renaming one table would leave 21 broken. A migration
-- that fixes the named example and breaks the rest is not a smaller change, it
-- is a worse one. aria_knowledge is listed first below and carries the detailed
-- commentary; the other 21 travel with it.
--
-- WHY RENAME AND NOT DROP+CREATE
-- These tables hold live rows: conversations, knowledge, memory, decisions,
-- outbound messages and their approval ledger. `alter table … rename to` moves
-- the SAME heap — data, indexes, constraints, RLS policies and grants all stay
-- attached. Zero rows copied, zero rows lost, no window where the data is gone.
--
-- WHY THE COMPATIBILITY VIEW IS security_invoker = true
-- The view must NOT become a privilege escalation around the table's own RLS.
-- With security_invoker = true the caller's rights and the caller's RLS
-- policies decide, exactly as they did before the rename. With the default
-- (false) the view would run as its owner and every tenant would read every
-- other tenant's rows through it. Step 4 asserts the flag is actually set
-- rather than trusting that it was written correctly.
--
-- CAVEAT LEARNED IN THIS REPO: security_invoker = true is right ONLY while the
-- base table still grants `select` to the querying role. A previous migration
-- revoked `select` on a base table and every security_invoker view over it went
-- dark for the members it existed to serve. Nothing here revokes anything —
-- but if a later migration does, this flag has to be revisited, not assumed.
--
-- Idempotent throughout: every step tests the current state first, so a second
-- run changes nothing.
-- ============================================================================

set local search_path = public;

-- ── STEP 0 — snapshot the row counts BEFORE anything moves ──────────────────
-- Step 4 compares against this. Without a real before-picture, "the counts
-- match" is a statement about one number compared to itself.
create temporary table _finn_rename_before (tbl text primary key, n bigint)
  on commit drop;

do $$
declare t text; c bigint;
begin
  foreach t in array array[
    'aria_knowledge',
    'aria_actions_log', 'aria_adaptive_preferences', 'aria_alert_acks', 'aria_alerts',
    'aria_attachment_scans', 'aria_conversations', 'aria_decisions',
    'aria_document_chunks', 'aria_documents', 'aria_evolution_cycles',
    'aria_improvement_proposals', 'aria_incidents', 'aria_interactions',
    'aria_learned_patterns', 'aria_learning_log', 'aria_memory',
    'aria_outbound_message_events', 'aria_outbound_messages', 'aria_preferences',
    'aria_public_incidents', 'aria_reports'
  ] loop
    -- Resolve the relation under EITHER name, and do not restrict to BASE
    -- TABLE. There are three states this migration can start in and the
    -- snapshot has to have subjects in all of them, otherwise step 4 iterates
    -- over nothing and reports success without examining a single relation —
    -- the vacuous pass this repo has been bitten by before:
    --   · first run              → aria_x is a TABLE
    --   · re-run after the rename→ aria_x is a VIEW
    --   · re-run after the views were dropped → only finn_x exists
    -- `count(*)` reads the same rows through a table or through its view.
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      execute format('select count(*) from public.%I', t) into c;
      insert into _finn_rename_before values (t, c) on conflict (tbl) do nothing;
    elsif exists (select 1 from information_schema.tables
                  where table_schema = 'public'
                    and table_name = 'finn_' || substring(t from 6)
                    and table_type = 'BASE TABLE') then
      execute format('select count(*) from public.%I', 'finn_' || substring(t from 6)) into c;
      insert into _finn_rename_before values (t, c) on conflict (tbl) do nothing;
    end if;
  end loop;
end $$;

-- ── STEP 1 — rename the tables ──────────────────────────────────────────────
-- aria_knowledge is the one the brief named: the live corpus FINN retrieves
-- from. Its rows, its pgvector index, its RESTRICTIVE org-isolation policies and
-- its grants all move with the heap; nothing is rebuilt and nothing is copied.
--
-- The table_type guard is NOT decoration. `alter table if exists` also matches
-- a VIEW — so on a second run it would find the compatibility view created in
-- step 2 and try to rename IT onto the table that already exists, aborting the
-- whole migration with `relation "finn_knowledge" already exists`. A re-run has
-- to be a no-op, and `if exists` alone does not deliver that here.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'aria_knowledge'
               and table_type = 'BASE TABLE')
     and not exists (select 1 from information_schema.tables
                     where table_schema = 'public' and table_name = 'finn_knowledge') then
    alter table public.aria_knowledge rename to finn_knowledge;
  end if;
end $$;

do $$
declare t text; new_name text;
begin
  foreach t in array array[
    'aria_actions_log', 'aria_adaptive_preferences', 'aria_alert_acks', 'aria_alerts',
    'aria_attachment_scans', 'aria_conversations', 'aria_decisions',
    'aria_document_chunks', 'aria_documents', 'aria_evolution_cycles',
    'aria_improvement_proposals', 'aria_incidents', 'aria_interactions',
    'aria_learned_patterns', 'aria_learning_log', 'aria_memory',
    'aria_outbound_message_events', 'aria_outbound_messages', 'aria_preferences',
    'aria_public_incidents', 'aria_reports'
  ] loop
    new_name := 'finn_' || substring(t from 6);
    -- Rename only a real TABLE. Guarding on table_type stops a re-run from
    -- trying to rename the compatibility VIEW created in step 2.
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t and table_type = 'BASE TABLE')
       and not exists (select 1 from information_schema.tables
                       where table_schema = 'public' and table_name = new_name) then
      execute format('alter table public.%I rename to %I', t, new_name);
    end if;
  end loop;
end $$;

-- ── STEP 2 — compatibility views under the OLD names ────────────────────────
-- These keep a not-yet-redeployed client working. They are dropped in a
-- SEPARATE migration, never this one: dropping them here would delete the
-- safety net in the same transaction that creates the need for it.
do $$
declare t text; new_name text;
begin
  foreach t in array array[
    'aria_knowledge',
    'aria_actions_log', 'aria_adaptive_preferences', 'aria_alert_acks', 'aria_alerts',
    'aria_attachment_scans', 'aria_conversations', 'aria_decisions',
    'aria_document_chunks', 'aria_documents', 'aria_evolution_cycles',
    'aria_improvement_proposals', 'aria_incidents', 'aria_interactions',
    'aria_learned_patterns', 'aria_learning_log', 'aria_memory',
    'aria_outbound_message_events', 'aria_outbound_messages', 'aria_preferences',
    'aria_public_incidents', 'aria_reports'
  ] loop
    new_name := 'finn_' || substring(t from 6);
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = new_name and table_type = 'BASE TABLE')
       and not exists (select 1 from information_schema.tables
                       where table_schema = 'public' and table_name = t) then
      execute format(
        'create view public.%I with (security_invoker = true) as select * from public.%I',
        t, new_name);
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format('grant all on public.%I to service_role', t);
      -- anon reads only where the base table already granted it; the view must
      -- not widen the surface, only mirror it.
      if exists (select 1 from information_schema.role_table_grants
                 where table_schema='public' and table_name=new_name
                   and grantee='anon' and privilege_type='SELECT') then
        execute format('grant select on public.%I to anon', t);
      end if;
    end if;
  end loop;
end $$;

-- ── STEP 3 — rename the dependent objects ───────────────────────────────────
-- `alter table … rename` moves the heap but leaves every POLICY, INDEX and
-- CONSTRAINT carrying its old name. Left alone they would keep saying "aria"
-- forever and, worse, the generated TypeScript types name foreign keys
-- explicitly (`aria_actions_log_org_id_fkey`) — layer ② already renamed those
-- strings, so the database has to follow or PostgREST embedding breaks.
do $$
declare r record; new_name text;
begin
  -- policies
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and policyname like 'aria\_%'
  loop
    new_name := 'finn_' || substring(r.policyname from 6);
    execute format('alter policy %I on public.%I rename to %I',
                   r.policyname, r.tablename, new_name);
  end loop;

  -- constraints (primary keys, foreign keys, unique, check)
  for r in
    select con.conname, rel.relname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public' and con.conname like 'aria\_%'
      and rel.relname like 'finn\_%'          -- only the tables we just moved
  loop
    new_name := 'finn_' || substring(r.conname from 6);
    execute format('alter table public.%I rename constraint %I to %I',
                   r.relname, r.conname, new_name);
  end loop;

  -- indexes that are NOT constraint-backed (constraint renames carry their own)
  for r in
    select cls.relname as idxname
    from pg_class cls
    join pg_namespace ns on ns.oid = cls.relnamespace
    join pg_index idx on idx.indexrelid = cls.oid
    join pg_class tbl on tbl.oid = idx.indrelid
    where ns.nspname = 'public' and cls.relkind = 'i'
      and cls.relname like 'aria\_%' and tbl.relname like 'finn\_%'
      and not exists (select 1 from pg_constraint c where c.conindid = cls.oid)
  loop
    new_name := 'finn_' || substring(r.idxname from 6);
    execute format('alter index public.%I rename to %I', r.idxname, new_name);
  end loop;
end $$;

-- ── STEP 4 — VERIFICATION. Fails the migration rather than reporting a lie ───
-- Written as assertions, not as a SELECT a human is trusted to read: a
-- verification query whose output nobody checks verifies nothing.
do $$
declare
  bad text;
  n_before bigint;
  n_after  bigint;
  r record;
begin
  -- (a) every new table exists as a real table
  select string_agg(t, ', ') into bad
  from (select 'finn_' || substring(tbl from 6) as t from _finn_rename_before) s
  where not exists (select 1 from information_schema.tables
                    where table_schema='public' and table_name=s.t and table_type='BASE TABLE');
  if bad is not null then raise exception 'VERIFY(a) missing renamed table(s): %', bad; end if;

  -- (b) RLS is still enabled on every renamed table.
  -- RLS travels with the heap, so this is checking that nothing recreated a
  -- table underneath us — the failure mode where "the table exists" is true and
  -- "the table is protected" is not.
  select string_agg(c.relname, ', ') into bad
  from _finn_rename_before b
  join pg_class c on c.relname = 'finn_' || substring(b.tbl from 6)
  join pg_namespace ns on ns.oid = c.relnamespace and ns.nspname = 'public'
  where not c.relrowsecurity;
  if bad is not null then raise exception 'VERIFY(b) RLS disabled on: %', bad; end if;

  -- (c) row counts identical to the pre-rename snapshot
  for r in select tbl, n from _finn_rename_before loop
    n_before := r.n;
    execute format('select count(*) from public.%I', 'finn_' || substring(r.tbl from 6))
      into n_after;
    if n_before is distinct from n_after then
      raise exception 'VERIFY(c) row count changed for %: % → %', r.tbl, n_before, n_after;
    end if;
  end loop;

  -- (d) every compatibility view exists AND is security_invoker.
  -- Checking reloptions directly: this is the difference between a view that
  -- inherits the caller's RLS and one that hands every tenant the owner's
  -- rights over all the others' rows.
  select string_agg(v.tbl, ', ') into bad
  from _finn_rename_before v
  join pg_class c on c.relname = v.tbl
  join pg_namespace ns on ns.oid = c.relnamespace and ns.nspname = 'public'
  where c.relkind = 'v'
    and not coalesce('security_invoker=true' = any(c.reloptions), false);
  if bad is not null then raise exception 'VERIFY(d) view not security_invoker: %', bad; end if;

  select string_agg(v.tbl, ', ') into bad
  from _finn_rename_before v
  where not exists (select 1 from pg_class c
                    join pg_namespace ns on ns.oid = c.relnamespace and ns.nspname='public'
                    where c.relname = v.tbl and c.relkind = 'v');
  if bad is not null then raise exception 'VERIFY(d) missing compat view: %', bad; end if;

  -- (e) the view returns exactly what the table returns
  for r in select tbl from _finn_rename_before loop
    execute format('select count(*) from public.%I', r.tbl) into n_after;
    execute format('select count(*) from public.%I', 'finn_' || substring(r.tbl from 6))
      into n_before;
    if n_before is distinct from n_after then
      raise exception 'VERIFY(e) view % disagrees with table: % vs %', r.tbl, n_after, n_before;
    end if;
  end loop;

  -- (f) no dependent object still carries the old name
  select string_agg(policyname, ', ') into bad
  from pg_policies where schemaname='public' and policyname like 'aria\_%';
  if bad is not null then raise exception 'VERIFY(f) policies still named aria_*: %', bad; end if;

  raise notice 'VERIFY OK — % relations checked: renamed, RLS intact, counts identical, views security_invoker',
    (select count(*) from _finn_rename_before);
end $$;

comment on schema public is
  'ARIA→FINN rename applied: finn_* are the tables; aria_* are temporary security_invoker compatibility views, dropped once no deployed client references them.';

-- ── The five FUNCTIONS carrying the old name — DELIBERATELY NOT RENAMED ─────
-- aria_match_documents / aria_match_knowledge / aria_match_memory are invoked
-- as Supabase RPC BY NAME from the client; aria_actions_log_retention and
-- aria_scan_corpus_stale are called by scheduled jobs. Renaming a function does
-- not move its callers, and layer ② deliberately left every one of these call
-- sites on the old name so the two sides stay in agreement. They move in the
-- migration that ships their client change, where each signature is written out
-- by hand and reviewed — these are overloaded, table-returning vector helpers
-- whose argument lists changed across migrations, and generating forwarders for
-- them dynamically is exactly where a silent wrong answer would hide.
--   public.aria_match_documents · public.aria_match_knowledge
--   public.aria_match_memory    · public.aria_actions_log_retention
--   public.aria_scan_corpus_stale

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK — restores the original names completely.
-- Run as one transaction. Safe at any point AFTER this migration and BEFORE
-- the drop-views migration; after the views are dropped, delete the
-- `drop view` loop below (there is nothing to drop) and the rest still applies.
-- Not executed here — it lives in the file so the way back is written down
-- before it is needed, not improvised during an incident.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- begin;
-- set local search_path = public;
--
-- -- 1. drop the compatibility views so the old names are free again
-- do $rb$
-- declare t text;
-- begin
--   foreach t in array array[
--     'aria_knowledge','aria_actions_log','aria_adaptive_preferences','aria_alert_acks',
--     'aria_alerts','aria_attachment_scans','aria_conversations','aria_decisions',
--     'aria_document_chunks','aria_documents','aria_evolution_cycles',
--     'aria_improvement_proposals','aria_incidents','aria_interactions',
--     'aria_learned_patterns','aria_learning_log','aria_memory',
--     'aria_outbound_message_events','aria_outbound_messages','aria_preferences',
--     'aria_public_incidents','aria_reports'
--   ] loop
--     if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
--                where n.nspname='public' and c.relname=t and c.relkind='v') then
--       execute format('drop view public.%I', t);
--     end if;
--   end loop;
-- end $rb$;
--
-- -- 2. rename the dependent objects back
-- do $rb$
-- declare r record;
-- begin
--   for r in select schemaname, tablename, policyname from pg_policies
--            where schemaname='public' and policyname like 'finn\_%' loop
--     execute format('alter policy %I on public.%I rename to %I',
--                    r.policyname, r.tablename, 'aria_' || substring(r.policyname from 6));
--   end loop;
--   for r in select con.conname, rel.relname from pg_constraint con
--            join pg_class rel on rel.oid=con.conrelid
--            join pg_namespace ns on ns.oid=rel.relnamespace
--            where ns.nspname='public' and con.conname like 'finn\_%'
--              and rel.relname like 'finn\_%' loop
--     execute format('alter table public.%I rename constraint %I to %I',
--                    r.relname, r.conname, 'aria_' || substring(r.conname from 6));
--   end loop;
--   for r in select cls.relname as idxname from pg_class cls
--            join pg_namespace ns on ns.oid=cls.relnamespace
--            join pg_index idx on idx.indexrelid=cls.oid
--            join pg_class tbl on tbl.oid=idx.indrelid
--            where ns.nspname='public' and cls.relkind='i'
--              and cls.relname like 'finn\_%' and tbl.relname like 'finn\_%'
--              and not exists (select 1 from pg_constraint c where c.conindid=cls.oid) loop
--     execute format('alter index public.%I rename to %I',
--                    r.idxname, 'aria_' || substring(r.idxname from 6));
--   end loop;
-- end $rb$;
--
-- -- 3. rename the tables back
-- do $rb$
-- declare t text;
-- begin
--   foreach t in array array[
--     'finn_knowledge','finn_actions_log','finn_adaptive_preferences','finn_alert_acks',
--     'finn_alerts','finn_attachment_scans','finn_conversations','finn_decisions',
--     'finn_document_chunks','finn_documents','finn_evolution_cycles',
--     'finn_improvement_proposals','finn_incidents','finn_interactions',
--     'finn_learned_patterns','finn_learning_log','finn_memory',
--     'finn_outbound_message_events','finn_outbound_messages','finn_preferences',
--     'finn_public_incidents','finn_reports'
--   ] loop
--     if exists (select 1 from information_schema.tables
--                where table_schema='public' and table_name=t and table_type='BASE TABLE') then
--       execute format('alter table public.%I rename to %I', t, 'aria_' || substring(t from 6));
--     end if;
--   end loop;
-- end $rb$;
--
-- commit;

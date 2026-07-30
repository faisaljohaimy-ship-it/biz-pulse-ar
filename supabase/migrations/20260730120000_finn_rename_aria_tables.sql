-- ============================================================================
-- ARIA → FINN — table rename. STAGED, NOT APPLIED.
--
-- Owner decision (2026-07-30): remove the ARIA name from the whole system,
-- database included. This file does that WITHOUT losing a single row and
-- WITHOUT a window where the running app is broken.
--
-- WHY RENAME AND NOT DROP
-- These 22 tables hold live data: conversations, knowledge, memory, decisions,
-- outbound messages and their approval ledger. `drop` would destroy it.
-- `alter table … rename to` moves the SAME heap — data, indexes, constraints,
-- RLS policies and grants all travel with it. Zero rows copied, zero lost.
--
-- WHY THE COMPATIBILITY VIEWS
-- A deployed frontend/server keeps querying `aria_*` until its own code ships.
-- Renaming alone would break every one of those queries the instant this runs.
-- Each old name therefore survives as an updatable view onto the new table, so
-- old and new code both work during the transition. The views are dropped in a
-- LATER migration, only after the application no longer references aria_*.
--
-- ORDER OF OPERATIONS FOR THE OPERATOR
--   ① apply this migration            → both names work
--   ② deploy the app that uses finn_* → old names go unused
--   ③ apply the drop-views migration  → aria_* disappears for good
-- Doing ③ before ② is what would cause an outage.
--
-- Idempotent: every step checks the current state, so re-running is a no-op.
-- ============================================================================

set local search_path = public;

do $$
declare
  t text;
  new_name text;
  -- The 22 live TABLES. Verified against `create table` statements in the
  -- migration history — an earlier draft of this list wrongly included
  -- aria_actions_log_retention, which is a FUNCTION; renaming it as a table
  -- would have been a silent no-op that left the function behind.
  names text[] := array[
    'aria_actions_log', 'aria_adaptive_preferences', 'aria_alert_acks', 'aria_alerts',
    'aria_attachment_scans', 'aria_conversations', 'aria_decisions',
    'aria_document_chunks', 'aria_documents', 'aria_evolution_cycles',
    'aria_improvement_proposals', 'aria_incidents', 'aria_interactions', 'aria_knowledge',
    'aria_learned_patterns', 'aria_learning_log', 'aria_memory',
    'aria_outbound_message_events', 'aria_outbound_messages', 'aria_preferences',
    'aria_public_incidents', 'aria_reports'
  ];
begin
  foreach t in array names loop
    new_name := 'finn_' || substring(t from 6);   -- aria_x → finn_x

    -- Rename only if the old table is still a TABLE (not already a view we made).
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t and table_type = 'BASE TABLE'
    ) and not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = new_name
    ) then
      execute format('alter table public.%I rename to %I', t, new_name);
      raise notice 'renamed % → %', t, new_name;
    end if;

    -- Compatibility view under the OLD name, so code that has not shipped yet
    -- keeps working. `security_invoker = true`: the view must NOT become a
    -- privilege escalation around the table's own RLS — the caller's rights
    -- decide, exactly as they did before the rename.
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = new_name and table_type = 'BASE TABLE'
    ) and not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format(
        'create view public.%I with (security_invoker = true) as select * from public.%I', t, new_name);
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format('grant all on public.%I to service_role', t);
      raise notice 'compat view % → %', t, new_name;
    end if;
  end loop;
end $$;

comment on schema public is
  'ARIA→FINN rename in progress: finn_* are the real tables; aria_* are temporary compatibility views, dropped once no deployed code references them.';

-- ── The five FUNCTIONS carrying the old name — DELIBERATELY NOT RENAMED HERE
--
-- aria_match_documents / aria_match_knowledge / aria_match_memory are called
-- as Supabase RPC **by name from the client**, and aria_actions_log_retention
-- / aria_scan_corpus_stale are called by scheduled jobs. Renaming a function
-- does not move its callers.
--
-- An earlier draft of this file renamed them and claimed in a comment that a
-- forwarder was left behind. It was not — the code only renamed. That would
-- have broken every RPC call the instant it ran, with a comment saying the
-- opposite. The honest options were: write correct forwarders, or defer.
--
-- Deferred, because a correct forwarder must reproduce each function's exact
-- signature AND its result shape (these are overloaded, table-returning vector
-- helpers whose argument lists changed across migrations). Generating that
-- dynamically is where a silent wrong answer hides. They are renamed in the
-- same migration that ships the client change, where both sides move together
-- and the signature is written out by hand and reviewed.
--
-- Functions still named aria_* after this migration:
--   public.aria_match_documents  · public.aria_match_knowledge
--   public.aria_match_memory     · public.aria_actions_log_retention
--   public.aria_scan_corpus_stale

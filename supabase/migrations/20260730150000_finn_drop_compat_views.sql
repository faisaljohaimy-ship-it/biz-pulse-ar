-- ============================================================================
-- LAYER ③ (final step) — remove the aria_* compatibility views. STAGED.
--
-- ⚠ DO NOT APPLY THIS UNTIL BOTH ARE TRUE:
--   · 20260730140000_finn_rename_tables.sql has been applied, AND
--   · the layer-② build is DEPLOYED and no running client queries aria_*
--
-- This file is deliberately separate from the rename. Putting the drop in the
-- same migration would remove the safety net in the same transaction that
-- creates the need for it: the rename exists precisely so old and new code can
-- both work during the deploy window, and a drop in the same file collapses
-- that window to zero.
--
-- HOW TO KNOW IT IS SAFE
-- The views are the only thing serving aria_* now. Before running this, confirm
-- there is no traffic left on the old names — e.g. no `aria_*` in the PostgREST
-- request log for a full deploy cycle, and no `aria-*` API path still being hit
-- (those redirect via src/lib/finn/compat/legacy-route.ts, whose removal is the
-- matching front-end step). If in doubt, wait: keeping a view costs nothing,
-- dropping it early costs an outage.
--
-- REVERSIBLE: re-running 20260730140000 recreates every view, because its
-- step 2 creates any compatibility view whose base table exists and whose old
-- name is free. That is the way back — there is no data to restore, since a
-- view holds none.
-- ============================================================================

set local search_path = public;

do $$
declare t text; base text;
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
    base := 'finn_' || substring(t from 6);

    -- ORDER MATTERS. Ask "is there anything to drop?" BEFORE "is the base
    -- table there?". An earlier draft asked them the other way round and
    -- aborted the whole migration on the first name that simply does not exist
    -- in this database — a table never created here, or an environment that
    -- carries a subset. Nothing to drop is not an error; it is the goal state.
    if not exists (select 1 from information_schema.tables
                   where table_schema = 'public' and table_name = t) then
      continue;                                    -- already gone: nothing to do
    end if;

    -- Old name still exists as a real TABLE ⇒ the rename was rolled back.
    -- Stop loudly. `drop view` would fail on its own, but an explicit refusal
    -- says WHY, and says it before any earlier view in this loop is lost.
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t
                 and table_type = 'BASE TABLE') then
      raise exception '% is a TABLE, not a view — the rename was rolled back; do not run this file', t;
    end if;

    -- A view with no base table behind it is a broken half-applied state.
    -- Dropping it would turn something recoverable into a missing relation.
    if not exists (select 1 from information_schema.tables
                   where table_schema = 'public' and table_name = base
                     and table_type = 'BASE TABLE') then
      raise exception 'refusing to drop view % — base table % does not exist', t, base;
    end if;

    execute format('drop view public.%I', t);
    raise notice 'dropped compatibility view %', t;
  end loop;
end $$;

comment on schema public is
  'ARIA→FINN rename complete: finn_* are the only names; the aria_* compatibility views have been removed.';

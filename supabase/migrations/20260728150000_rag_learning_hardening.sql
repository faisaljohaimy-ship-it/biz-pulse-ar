-- ============================================================================
-- RAG LAYER (7) — closing phase ④: structural barrier + tuning + gap report
-- STAGED, NOT APPLIED.
--
-- Migration 6 made promotion earn-only (trigger). This one makes the barrier
-- STRUCTURAL: an answer path cannot read unverified text even if it tries,
-- because the privilege to read it is revoked — not merely filtered.
--
--   • rag_candidates base table: SELECT revoked from `authenticated`.
--     Only service_role (server-side review tooling) keeps it.
--   • rag_verified_candidates  : the ONLY answer surface (verified = true).
--   • rag_candidate_stats      : counts ONLY — no question, no answer text —
--     so unverified content is still counted, analysed and reported without
--     any path being able to read the text itself.
--
-- That satisfies both halves of the doctrine at once: unverified content is
-- visible AS A NUMBER and invisible AS CONTENT.
-- Idempotent; adds only.
-- ============================================================================

set local search_path = public, extensions;

-- ── Structural barrier ────────────────────────────────────────────────────
-- The member-facing read policy from migration 6 is withdrawn: members read
-- the verified view, never the raw table.
drop policy if exists rag_candidates_member_read on public.rag_candidates;

-- Admins may still read raw rows (they are the approval authority).
drop policy if exists rag_candidates_admin_read on public.rag_candidates;
create policy rag_candidates_admin_read on public.rag_candidates
  for select to authenticated
  using (public.is_org_member(org_id, 'admin'));

-- Privilege, not just policy: no plain member SELECT on the base table.
revoke select on public.rag_candidates from authenticated;
grant  insert on public.rag_candidates to authenticated;
grant  update on public.rag_candidates to authenticated;  -- gated by the trigger
grant  all    on public.rag_candidates to service_role;

-- Counts only. No question, no answer — nothing quotable leaks through here.
--
-- DEFINER for the same reason as rag_verified_candidates: the revoke two
-- lines above would otherwise deny members their own counters. The
-- is_org_member predicate is what preserves isolation once owner rights
-- bypass RLS — removing it would expose every tenant's counts to everyone.
create or replace view public.rag_candidate_stats
with (security_invoker = false) as
  select
    org_id,
    count(*)::int                                             as candidates,
    count(*) filter (where verified)::int                      as verified,
    -- REJECTED: it made a grounding claim and the claim failed.
    count(*) filter (where not verified and citation_chunk_id is not null)::int
                                                               as rejected,
    -- AWAITING A SOURCE: model output with no citation at all.
    count(*) filter (where not verified and citation_chunk_id is null)::int
                                                               as awaiting_source,
    count(*) filter (where verified_reason = 'grounded_citation')::int
                                                               as by_grounded_citation,
    count(*) filter (where verified_reason = 'admin_approved')::int
                                                               as by_admin_approved,
    max(created_at)                                            as last_candidate_at
  from public.rag_candidates
  -- LOAD-BEARING. Owner rights bypass RLS on the base table, so this WHERE is
  -- the only thing standing between a member and every other tenant's
  -- counters. It is filtered BEFORE the aggregate, so a foreign org produces
  -- no group at all rather than a zeroed one.
  where public.is_org_member(org_id, 'viewer')
  group by org_id;

grant select on public.rag_candidate_stats to authenticated, service_role;

comment on view public.rag_candidate_stats is
  'Live counters (candidate · verified · rejected · awaiting-source). Aggregates ONLY — unverified text is counted here but never readable from any answer path.';

-- ── Gap report: insufficient_evidence questions, ordered by frequency ─────

create or replace view public.rag_gaps_report
with (security_invoker = true) as
  select
    org_id,
    query,
    hit_count,
    last_seen_at,
    created_at,
    (resolved_at is null) as is_open
  from public.rag_gaps
  order by (resolved_at is null) desc, hit_count desc, last_seen_at desc;

grant select on public.rag_gaps_report to authenticated, service_role;

comment on view public.rag_gaps_report is
  'Open knowledge gaps ranked by how often they recurred — the ingestion backlog, refreshed on every read.';

-- ── RRF weight tuning from feedback (READ-ONLY by construction) ───────────
--
-- STABLE + SECURITY INVOKER + a body containing no INSERT/UPDATE/DELETE: this
-- function can only READ rag_feedback and RETURN numbers. It cannot write to
-- rag_chunks, rag_documents or rag_candidates — i.e. it can never touch a
-- verified corpus. Bounds mirror src/lib/rag/tuning.ts exactly.

create or replace function public.rag_tune_rrf_weights()
returns table (w_vector numeric, w_fts numeric, w_trgm numeric,
               sample_size int, kept_baseline boolean)
language sql
stable
security invoker
set search_path = public
as $$
  with sample as (
    select matched_paths, helpful
    from public.rag_feedback
    where created_at > now() - interval '90 days'
  ),
  agg as (
    select
      count(*)::int as n,
      coalesce(avg(matched_paths) filter (where helpful), 1)::numeric as mean_paths
    from sample
  ),
  calc as (
    select
      n,
      -- corroboration normalised over the 1..3 path range, clamped to [0,1]
      least(1, greatest(0, (mean_paths - 1) / 2)) as corroboration
    from agg
  )
  select
    -- every weight clamped to the [0.25, 2.0] safety band
    least(2.0, greatest(0.25, 1.0))::numeric                                   as w_vector,
    case when n < 30 then 1.0
         else least(2.0, greatest(0.25, 1.0 + (1 - corroboration) * 0.4)) end::numeric as w_fts,
    case when n < 30 then 0.5
         else least(2.0, greatest(0.25, 0.5 + (1 - corroboration) * 0.2)) end::numeric as w_trgm,
    n                                                                          as sample_size,
    (n < 30)                                                                   as kept_baseline
  from calc;
$$;

revoke all on function public.rag_tune_rrf_weights() from public, anon;
grant execute on function public.rag_tune_rrf_weights() to authenticated, service_role;

comment on function public.rag_tune_rrf_weights() is
  'Proposes RRF weights from rag_feedback. STABLE + read-only: tunes retrieval parameters only, never writes to any corpus and never touches a model.';

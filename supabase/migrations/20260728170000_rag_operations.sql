-- ============================================================================
-- RAG LAYER (9) — phase ⑤: CONTINUOUS OPERATION
-- STAGED, NOT APPLIED.
--
-- Four things, and nothing else:
--   ① a staleness signal, so re-embedding can be driven by CHANGED HASHES
--      rather than by re-embedding everything on a timer;
--   ② a retrieval log, so latency and the insufficient-evidence rate are
--      MEASURED rather than asserted;
--   ③ an evaluation ledger, so hit@5 and citation accuracy have exactly one
--      place to live and exactly one provenance;
--   ④ a health function and an auto-enable gate that read ①–③.
--
-- THE HONESTY RULE IS ENFORCED IN SQL, NOT IN PROSE.
--
-- Every metric here returns NULL when it has not been measured. There are no
-- default scores, no zero-filled averages, no "assume baseline". A system
-- that has never run must be indistinguishable from one that has run and
-- scored nothing — and rag_should_enable() must refuse in both cases. That is
-- why the gate's first blocker is 'not_measured' and why it is derived from
-- the absence of an eval row rather than from a score of zero.
--
-- Idempotent; adds only.
-- ============================================================================

set local search_path = public, extensions;

-- ── ① Staleness: which chunks need re-embedding ──────────────────────────
-- rag_chunks already carries content_hash (generated). What it lacked was the
-- hash the CURRENT embedding was actually computed from. Without that, "re-
-- embed changed hashes" is unimplementable — you can detect that content
-- changed but not that the vector is behind it. Additive columns, nullable,
-- so every existing row simply reads as "never embedded", which is true.

alter table public.rag_chunks add column if not exists embedded_hash text;
alter table public.rag_chunks add column if not exists embedded_at   timestamptz;

comment on column public.rag_chunks.embedded_hash is
  'content_hash at the moment the current embedding was produced. embedded_hash <> content_hash means the vector is stale.';

create index if not exists rag_chunks_stale_idx
  on public.rag_chunks (org_id)
  where embedding is null or embedded_hash is distinct from content_hash;

create or replace view public.rag_reembed_queue
with (security_invoker = true) as
  select
    c.id,
    c.org_id,
    c.document_id,
    c.chunk_index,
    c.content_hash,
    c.embedded_hash,
    c.embedding_model,
    case
      when c.embedding is null                              then 'never_embedded'
      when c.embedded_hash is null                          then 'unknown_provenance'
      when c.embedded_hash is distinct from c.content_hash  then 'content_changed'
    end as reason
  from public.rag_chunks c
  where c.embedding is null
     or c.embedded_hash is null
     or c.embedded_hash is distinct from c.content_hash;

grant select on public.rag_reembed_queue to authenticated, service_role;

comment on view public.rag_reembed_queue is
  'Chunks whose vector is missing or behind their content. The re-embed job drains this; an empty queue is the only proof the corpus is current.';

-- ── ② Retrieval log — latency and insufficient-evidence, measured ────────
-- Written by the retrieval surface (our own dark rag-retrieve function), NOT
-- by the FINN/Gemini path, which is untouched. Stores the query and the
-- metrics; never an answer.

create table if not exists public.rag_retrieval_log (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null default public.current_org_id()
                          references public.organizations(id) on delete cascade,
  query                 text not null,
  latency_ms            int  not null check (latency_ms >= 0),
  results_count         int  not null check (results_count >= 0),
  -- The retrieval's own verdict: did it find corroborated evidence at all?
  insufficient_evidence boolean not null,
  -- 1..3 — how many of the hybrid paths agreed on the top result.
  top_matched_paths     int check (top_matched_paths is null or top_matched_paths between 1 and 3),
  created_at            timestamptz not null default now()
);

create index if not exists rag_retrieval_log_org_time_idx
  on public.rag_retrieval_log (org_id, created_at desc);

alter table public.rag_retrieval_log enable row level security;

drop policy if exists rag_retrieval_log_member_read on public.rag_retrieval_log;
create policy rag_retrieval_log_member_read on public.rag_retrieval_log
  for select to authenticated using (public.is_org_member(org_id, 'viewer'));

drop policy if exists rag_retrieval_log_member_write on public.rag_retrieval_log;
create policy rag_retrieval_log_member_write on public.rag_retrieval_log
  for insert to authenticated with check (public.is_org_member(org_id, 'viewer'));

grant select, insert on public.rag_retrieval_log to authenticated;
grant all on public.rag_retrieval_log to service_role;

comment on table public.rag_retrieval_log is
  'Per-retrieval metrics: latency, result count, insufficient-evidence verdict. Queries and numbers only — no answer text is ever stored here.';

-- ── ③ Evaluation ledger — the ONLY source of hit@5 / citation accuracy ───
-- One row per shadow-measurement run. measured_questions is the count of
-- questions ACTUALLY scored against a live corpus; it is not the size of the
-- golden set, and the difference is the whole point: an unapplied database
-- produces runs with measured_questions = 0 and NULL scores.

create table if not exists public.rag_eval_runs (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null default public.current_org_id()
                       references public.organizations(id) on delete cascade,
  run_at             timestamptz not null default now(),
  -- How the run was produced. 'shadow' = the scheduled read-side job.
  run_kind           text not null default 'shadow'
                       check (run_kind in ('shadow', 'manual', 'ci')),
  -- Anchors available vs anchors actually scored. Never conflate the two.
  anchors_available  int not null check (anchors_available >= 0),
  measured_questions int not null check (measured_questions >= 0),
  -- NULL until measured. NOT zero — zero is a score, NULL is an absence.
  hit_at_5           numeric check (hit_at_5 is null or (hit_at_5 between 0 and 1)),
  citation_accuracy  numeric check (citation_accuracy is null or (citation_accuracy between 0 and 1)),
  -- False whenever the corpus behind the measurement is unverified/simulated.
  corpus_verified    boolean not null default false,
  notes              text,
  constraint rag_eval_measured_le_available
    check (measured_questions <= anchors_available),
  -- A run cannot claim a score it did not measure.
  constraint rag_eval_scores_require_measurement
    check (measured_questions > 0 or (hit_at_5 is null and citation_accuracy is null))
);

create index if not exists rag_eval_runs_org_time_idx
  on public.rag_eval_runs (org_id, run_at desc);

alter table public.rag_eval_runs enable row level security;

drop policy if exists rag_eval_runs_member_read on public.rag_eval_runs;
create policy rag_eval_runs_member_read on public.rag_eval_runs
  for select to authenticated using (public.is_org_member(org_id, 'viewer'));

-- Members READ results; only the scheduled job writes them. A hand-inserted
-- passing score is exactly the failure mode the auto-enable gate must not have.
revoke insert, update, delete on public.rag_eval_runs from authenticated, anon;
grant select on public.rag_eval_runs to authenticated;
grant all on public.rag_eval_runs to service_role;

comment on table public.rag_eval_runs is
  'Shadow-measurement ledger. hit_at_5 / citation_accuracy are NULL until actually measured; a CHECK forbids a score without measured_questions > 0. Written by the scheduled job only.';

-- ── ④a Health — every field NULL-when-unmeasured ─────────────────────────

-- SCOPE, stated precisely because the wrong reading is easy: this aggregates
-- over every org the caller can see, NOT one "current" org. For a user in a
-- single organisation — the normal case — the two are identical. For a user
-- in several, the numbers are a union across them. There is no org parameter
-- by design: RLS on rag_retrieval_log / rag_gaps / rag_chunks and the
-- is_org_member predicate inside rag_candidate_stats decide what is visible,
-- so the function cannot be pointed at a tenant the caller does not belong to.
create or replace function public.rag_health(_days int default 7)
returns table (
  window_days             int,
  retrieval_p50_ms        int,
  retrieval_p95_ms        int,
  retrievals              int,
  insufficient_rate       numeric,
  gaps_open               int,
  gaps_resolved           int,
  gap_coverage            numeric,
  chunks_total            int,
  chunks_stale            int,
  chunks_added            int,
  candidates_total        int,
  candidates_verified     int,
  last_eval_at            timestamptz,
  measured_questions      int,
  hit_at_5                numeric,
  citation_accuracy       numeric,
  corpus_verified         boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with w as (select now() - make_interval(days => greatest(coalesce(_days, 7), 1)) as since,
                    greatest(coalesce(_days, 7), 1) as d),
  r as (
    select
      count(*)::int as n,
      percentile_cont(0.5) within group (order by latency_ms) as p50,
      percentile_cont(0.95) within group (order by latency_ms) as p95,
      avg(case when insufficient_evidence then 1 else 0 end)::numeric as rate
    from public.rag_retrieval_log, w
    where created_at >= w.since
  ),
  g as (
    select
      count(*) filter (where resolved_at is null)::int as open,
      count(*) filter (where resolved_at is not null)::int as resolved
    from public.rag_gaps
  ),
  c as (
    select
      count(*)::int as total,
      count(*) filter (where embedding is null
                          or embedded_hash is distinct from content_hash)::int as stale,
      count(*) filter (where created_at >= (select since from w))::int as added
    from public.rag_chunks
  ),
  cand as (
    -- Through the STATS view, never the base table: migration 7 revoked plain
    -- SELECT on rag_candidates, and health must not be the one caller that
    -- needs the privilege back.
    select coalesce(sum(candidates), 0)::int as total,
           coalesce(sum(verified), 0)::int   as verified
    from public.rag_candidate_stats
  ),
  e as (
    select run_at, measured_questions, hit_at_5, citation_accuracy, corpus_verified
    from public.rag_eval_runs
    order by run_at desc
    limit 1
  )
  select
    (select d from w),
    -- NULL, not 0, when nothing was retrieved in the window.
    case when r.n = 0 then null else round(r.p50)::int end,
    case when r.n = 0 then null else round(r.p95)::int end,
    r.n,
    case when r.n = 0 then null else round(r.rate, 4) end,
    g.open,
    g.resolved,
    case when (g.open + g.resolved) = 0 then null
         else round(g.resolved::numeric / (g.open + g.resolved), 4) end,
    c.total, c.stale, c.added,
    cand.total, cand.verified,
    e.run_at, e.measured_questions, e.hit_at_5, e.citation_accuracy,
    coalesce(e.corpus_verified, false)
  -- e is the only CTE that may be empty (never evaluated) — LEFT JOIN keeps
  -- the health row alive with NULL scores instead of returning nothing.
  from r cross join g cross join c cross join cand left join e on true;
$$;

grant execute on function public.rag_health(int) to authenticated, service_role;

comment on function public.rag_health(int) is
  'Operational health across EVERY org the caller belongs to (RLS/is_org_member scoped, not single-org). Unmeasured fields return NULL — never a placeholder score.';

-- ── ④b The auto-enable gate ──────────────────────────────────────────────
-- Mirrors src/lib/rag/tuning.ts decideAutoEnable() exactly. Both must refuse
-- an unmeasured system, and the SQL side is authoritative because the flag
-- flip is a server action.

-- Same scope caveat as rag_health(): `e` is the most recent eval row visible
-- to the caller across all their orgs. The gate is a global flag decision,
-- not a per-tenant one, so this is intended — but it means a multi-org
-- operator's newest run is the one that speaks.
create or replace function public.rag_should_enable()
returns table (enable boolean, blockers text[])
language sql
stable
security invoker
set search_path = public
as $$
  with e as (
    select measured_questions, hit_at_5, citation_accuracy, corpus_verified
    from public.rag_eval_runs
    order by run_at desc
    limit 1
  ), b as (
    -- No run at all ⇒ exactly ONE blocker, 'not_measured'. Deliberately not
    -- 'not_measured' plus the threshold failures: NULL scores would trip
    -- those too, and the resulting blocker set diverged from the TypeScript
    -- mirror in src/lib/rag/tuning.ts. A gate whose two implementations
    -- disagree about WHY it refused is a gate nobody can reason about, so
    -- the absence of a measurement is reported as one fact, once.
    select case when not exists (select 1 from e) then array['not_measured']
    else array_remove(array[
      case when not (select corpus_verified from e) then 'corpus_not_verified' end,
      case when (select measured_questions from e) < 30
           then 'measured_questions_below_30' end,
      case when (select hit_at_5 from e) is null
            or (select hit_at_5 from e) < 0.85
           then 'hit_at_5_below_threshold' end,
      case when (select citation_accuracy from e) is null
            or (select citation_accuracy from e) < 0.95
           then 'citation_accuracy_below_threshold' end
    ], null) end as blockers
  )
  select cardinality(b.blockers) = 0, b.blockers from b;
$$;

grant execute on function public.rag_should_enable() to authenticated, service_role;

comment on function public.rag_should_enable() is
  'The rag_enabled gate: true only when a real measurement over >= 30 questions on a verified corpus clears BOTH thresholds. An unmeasured system is blocked by ''not_measured''.';

-- ── Schedules ─────────────────────────────────────────────────────────────
-- Guarded exactly as migration 8: a missing pg_cron must not fail the
-- migration, and every job here is READ-ONLY or writes only to its own ledger.

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Weight proposal: recomputed hourly, READ and RETURNED, never applied
    -- automatically. Applying tuned weights is an operator action.
    begin perform cron.unschedule('rag-tune-weights'); exception when others then null; end;
    perform cron.schedule('rag-tune-weights', '7 * * * *',
      $cron$ select * from public.rag_tune_rrf_weights(); $cron$);

    -- Gap report refresh: the report is a view, so "refresh" means keeping
    -- the planner's stats honest on a table the capture job appends to.
    begin perform cron.unschedule('rag-gaps-analyze'); exception when others then null; end;
    perform cron.schedule('rag-gaps-analyze', '17 * * * *',
      $cron$ analyze public.rag_gaps; $cron$);

    -- Staleness sweep: keeps the re-embed queue's partial index accurate.
    begin perform cron.unschedule('rag-chunks-analyze'); exception when others then null; end;
    perform cron.schedule('rag-chunks-analyze', '27 */6 * * *',
      $cron$ analyze public.rag_chunks; $cron$);
  end if;
end $$;

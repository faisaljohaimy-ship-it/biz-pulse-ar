-- ============================================================================
-- RAG LAYER (5) — rag_hybrid_search + ingest idempotency guards
--
-- STAGED, NOT APPLIED. The one retrieval entrypoint: three ranked paths fused
-- by Reciprocal Rank Fusion inside Postgres, under the CALLER's RLS.
--
-- ISOLATION (the point of the design):
--   • SECURITY INVOKER — every subquery runs as the calling user, so the RLS
--     policies on rag_chunks / rag_documents (is_org_member(org_id,'viewer'))
--     decide visibility. The function takes NO org parameter AT ALL: org
--     identity is derived from the JWT by RLS, and a client cannot name an
--     org even maliciously — there is nothing to pass.
--   • EXECUTE granted to authenticated + service_role only, never anon.
--
-- FUSION (approved inputs): RRF with k = 60 (Cormack et al. canonical; rank-
-- based, immune to the incomparable score scales of cosine distance,
-- ts_rank_cd and word_similarity — the rejected alternative was min-max score
-- normalization, brittle per-query). Weights: vector 1.0 · FTS 1.0 · trgm 0.5
-- (lexical directive text is as authoritative as semantics in a regulated
-- corpus; trgm is a typo-recovery net, not independent evidence — half weight).
--
-- PATHS:
--   1. vector : HNSW cosine over embedding (skipped gracefully when the
--      caller could not embed the query — the other two paths still serve).
--   2. FTS    : websearch_to_tsquery('simple', nx_ar_normalize(q)) over tsv.
--      websearch AND-semantics is DELIBERATE: this is the precision path — a
--      multi-word query matches only chunks holding every term; recall for
--      partial/variant phrasing is recovered by the trgm and vector paths
--      (measured: strict_word_similarity 0.72 on a one-term-off variant).
--   3. trgm   : strict_word_similarity of the normalized query INSIDE
--      content_norm (operator <<%, backed by the trgm GIN index). Plain
--      similarity() was REJECTED: chunk length dominates its denominator, so
--      a short query vs a 1600-char chunk scores near zero; word-similarity
--      measures the best matching window — the actual typo-tolerance case.
--
-- CANDIDATE POOL: per path, 4 × match_count bounded to [24, 96]. RRF needs
-- overlapping candidate sets to corroborate; 4× suffices for k ≤ 24 while
-- bounding the trgm/FTS rank cost. Rejected: unbounded pools (latency on
-- large orgs), 1× pools (starves the fusion of overlap).
--
-- Returns chunks + citation fields ONLY — no generation. matched_paths lets
-- the edge layer apply the evidence-sufficiency bar (≥ 2 paths).
-- Idempotent; adds only.
-- ============================================================================

set local search_path = public, extensions;

-- Ingest idempotency guards: a document's natural identity within an org.
-- The edge ingest does select→branch by content hash; these unique partial
-- indexes make the race window fail LOUDLY (duplicate insert error) instead
-- of silently duplicating a document.
create unique index if not exists rag_documents_org_code_uq
  on public.rag_documents (org_id, doc_type, code)
  where code is not null;

create unique index if not exists rag_documents_org_source_title_uq
  on public.rag_documents (org_id, source, title)
  where code is null;

create or replace function public.rag_hybrid_search(
  _query text,
  _query_embedding extensions.vector(1536) default null,
  _match_count int default 8
)
returns table (
  chunk_id uuid,
  document_id uuid,
  doc_code text,
  doc_title text,
  doc_source text,
  chunk_index int,
  content text,
  is_simulation boolean,
  rrf_score numeric,
  matched_paths int,
  vec_rank int,
  fts_rank int,
  trgm_rank int
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with params as (
    select public.nx_ar_normalize(coalesce(_query, '')) as qnorm,
           least(greatest(coalesce(_match_count, 8), 1), 24) as k_final,
           least(greatest(coalesce(_match_count, 8) * 4, 24), 96) as pool
  ),
  vec as (
    select s.id, row_number() over (order by s.dist) as r
    from (
      select c.id, c.embedding <=> _query_embedding as dist
      from public.rag_chunks c
      where _query_embedding is not null
        and c.embedding is not null
      order by c.embedding <=> _query_embedding
      limit (select pool from params)
    ) s
  ),
  fts as (
    select s.id, row_number() over (order by s.rank desc) as r
    from (
      select c.id,
             ts_rank_cd(c.tsv, websearch_to_tsquery('simple', p.qnorm)) as rank
      from public.rag_chunks c, params p
      where p.qnorm <> ''
        and c.tsv @@ websearch_to_tsquery('simple', p.qnorm)
      order by rank desc
      limit (select pool from params)
    ) s
  ),
  trgm as (
    select s.id, row_number() over (order by s.sim desc) as r
    from (
      select c.id,
             extensions.strict_word_similarity(p.qnorm, c.content_norm) as sim
      from public.rag_chunks c, params p
      where p.qnorm <> ''
        and p.qnorm <<% c.content_norm
      order by sim desc
      limit (select pool from params)
    ) s
  ),
  united as (
    select id, r, 1.0::numeric as w, 'vec' as src from vec
    union all
    select id, r, 1.0::numeric, 'fts' from fts
    union all
    select id, r, 0.5::numeric, 'trgm' from trgm
  ),
  fused as (
    select id,
           sum(w / (60 + r))::numeric as score,
           count(*)::int as paths,
           min(r) filter (where src = 'vec')::int as vr,
           min(r) filter (where src = 'fts')::int as fr,
           min(r) filter (where src = 'trgm')::int as tr
    from united
    group by id
  )
  select c.id,
         c.document_id,
         d.code,
         d.title,
         d.source,
         c.chunk_index,
         c.content,
         c.is_simulation,
         f.score,
         f.paths,
         f.vr,
         f.fr,
         f.tr
  from fused f
  join public.rag_chunks c on c.id = f.id
  join public.rag_documents d on d.id = c.document_id
  order by f.score desc, c.chunk_index
  limit (select k_final from params);
$$;

revoke all on function public.rag_hybrid_search(text, extensions.vector, int) from public, anon;
grant execute on function public.rag_hybrid_search(text, extensions.vector, int)
  to authenticated, service_role;

comment on function public.rag_hybrid_search(text, extensions.vector, int)
  is 'Hybrid RAG retrieval: HNSW cosine + Arabic FTS (simple over nx_ar_normalize) + strict_word_similarity, fused by RRF (k=60, weights 1/1/0.5). SECURITY INVOKER — org isolation via RLS from the caller''s JWT; no org parameter exists. Returns chunks + citation fields only.';

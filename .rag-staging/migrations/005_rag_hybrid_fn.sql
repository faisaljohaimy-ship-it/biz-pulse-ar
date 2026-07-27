-- =============================================================================
-- 005_rag_hybrid_fn.sql — Hybrid retrieval with RRF (vector + FTS + trgm)
-- STAGING — NOT applied.
--
-- Design decisions (documented in .lovable/plan.md, section ③):
--   • RRF constant k = 60           (Cormack et al.)
--   • Channel weights: vec 0.5, fts 0.3, trgm 0.2
--   • Per-channel top-N = 40 (=> 120 pre-fusion candidates)
--   • org_id filter applied inside the function; caller cannot bypass
--   • Returns { chunk_id, doc_code, section_path, content, score, per-channel ranks }
--   • Evidence gating (threshold τ, min citations) is enforced by the Edge fn,
--     not here — this function returns ranked candidates only.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sec_kb_hybrid_search(
  _query_embedding vector(1536),
  _query_text      text,
  _limit           int DEFAULT 10
)
RETURNS TABLE (
  chunk_id       uuid,
  document_id    uuid,
  doc_code       text,
  section_path   text,
  content        text,
  vec_rank       int,
  fts_rank       int,
  trgm_rank      int,
  rrf_score      double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
    q AS (
      SELECT
        public.normalize_ar(_query_text) AS q_norm,
        public.auth_org_id()             AS org
    ),
    -- Vector channel: top-40 by cosine distance.
    vec AS (
      SELECT c.id AS chunk_id,
             ROW_NUMBER() OVER (ORDER BY c.embedding <=> _query_embedding) AS rnk
      FROM public.sec_kb_chunks c, q
      WHERE c.embedding IS NOT NULL
        AND c.org_id = q.org
      ORDER BY c.embedding <=> _query_embedding
      LIMIT 40
    ),
    -- FTS channel: top-40 by ts_rank_cd on normalized text.
    fts AS (
      SELECT c.id AS chunk_id,
             ROW_NUMBER() OVER (
               ORDER BY ts_rank_cd(to_tsvector('simple', c.content_norm),
                                   plainto_tsquery('simple', q.q_norm)) DESC
             ) AS rnk
      FROM public.sec_kb_chunks c, q
      WHERE c.org_id = q.org
        AND to_tsvector('simple', c.content_norm)
              @@ plainto_tsquery('simple', q.q_norm)
      LIMIT 40
    ),
    -- Trigram channel: top-40 by similarity (catches SEC-\d\d and short codes).
    trg AS (
      SELECT c.id AS chunk_id,
             ROW_NUMBER() OVER (
               ORDER BY similarity(c.content_norm, q.q_norm) DESC
             ) AS rnk
      FROM public.sec_kb_chunks c, q
      WHERE c.org_id = q.org
        AND c.content_norm % q.q_norm
      LIMIT 40
    ),
    -- RRF fusion.
    fused AS (
      SELECT
        u.chunk_id,
        MIN(vec.rnk)  AS vec_rank,
        MIN(fts.rnk)  AS fts_rank,
        MIN(trg.rnk)  AS trgm_rank,
        COALESCE(0.5 / (60 + MIN(vec.rnk)), 0) +
        COALESCE(0.3 / (60 + MIN(fts.rnk)), 0) +
        COALESCE(0.2 / (60 + MIN(trg.rnk)), 0) AS rrf_score
      FROM (
        SELECT chunk_id FROM vec
        UNION SELECT chunk_id FROM fts
        UNION SELECT chunk_id FROM trg
      ) u
      LEFT JOIN vec ON vec.chunk_id = u.chunk_id
      LEFT JOIN fts ON fts.chunk_id = u.chunk_id
      LEFT JOIN trg ON trg.chunk_id = u.chunk_id
      GROUP BY u.chunk_id
    )
  SELECT
    c.id, c.document_id, c.doc_code, c.section_path, c.content,
    f.vec_rank, f.fts_rank, f.trgm_rank, f.rrf_score
  FROM fused f
  JOIN public.sec_kb_chunks c ON c.id = f.chunk_id
  -- Defense in depth: even though channels already filter, re-check here.
  WHERE c.org_id = public.auth_org_id()
  ORDER BY f.rrf_score DESC
  LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.sec_kb_hybrid_search(vector, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sec_kb_hybrid_search(vector, text, int)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.sec_kb_hybrid_search(vector, text, int) IS
  'Hybrid RAG retrieval: vector + Arabic FTS + trigram, fused via RRF. org_id from auth_org_id() — client cannot bypass.';

-- =============================================================================
-- VERIFY:
--   EXPLAIN (ANALYZE, BUFFERS)
--   SELECT * FROM public.sec_kb_hybrid_search(
--     ARRAY(SELECT 0.0::real FROM generate_series(1,1536))::vector,
--     'اشتراطات الحماية المحيطية',
--     10
--   );
--   -- expect Index Scan using sec_kb_chunks_embedding_hnsw (or Bitmap Or)
--   --        + Bitmap Index Scan on sec_kb_chunks_tsv_gin
--   --        + Bitmap Index Scan on sec_kb_chunks_trgm_gin
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.sec_kb_hybrid_search(vector, text, int);
-- =============================================================================

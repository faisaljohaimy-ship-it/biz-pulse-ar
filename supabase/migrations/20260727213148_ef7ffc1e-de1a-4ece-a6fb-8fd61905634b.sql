-- =====================================================================
-- WS-4: FORCE Row Level Security on all RAG tables
-- =====================================================================
ALTER TABLE public.sec_knowledge_articles    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sec_knowledge_categories  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sec_knowledge_links       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.aria_knowledge            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.aria_documents            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.aria_document_chunks      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.aria_memory               FORCE ROW LEVEL SECURITY;

-- =====================================================================
-- WS-3: Arabic-aware hybrid search foundation
-- =====================================================================

-- --- Generated searchable Arabic text on sec_knowledge_articles ------
-- Concatenates every meaningful Arabic text field and folds it via
-- normalize_ar() so index lookups and query terms share the same shape.
ALTER TABLE public.sec_knowledge_articles
  ADD COLUMN IF NOT EXISTS search_text_ar text
  GENERATED ALWAYS AS (
    public.normalize_ar(
      COALESCE(title_ar, '')             || ' ' ||
      COALESCE(summary_ar, '')           || ' ' ||
      COALESCE(description_ar, '')       || ' ' ||
      COALESCE(scope_ar, '')             || ' ' ||
      COALESCE(purpose_ar, '')           || ' ' ||
      COALESCE(responsibilities_ar, '')  || ' ' ||
      COALESCE(procedure_ar, '')         || ' ' ||
      COALESCE(requirements_ar, '')      || ' ' ||
      COALESCE(body_ar, '')
    )
  ) STORED;

-- Trigram index for fuzzy Arabic matching (typo/diacritic tolerance).
CREATE INDEX IF NOT EXISTS sec_kb_articles_search_ar_trgm_idx
  ON public.sec_knowledge_articles
  USING gin (search_text_ar gin_trgm_ops);

-- FTS index (simple config — Arabic normalization handled upstream).
CREATE INDEX IF NOT EXISTS sec_kb_articles_search_ar_fts_idx
  ON public.sec_knowledge_articles
  USING gin (to_tsvector('simple', search_text_ar));

-- --- Hybrid search: dense + FTS + trigram, fused with RRF ------------
CREATE OR REPLACE FUNCTION public.sec_kb_hybrid_search(
  _query_text  text,
  _query_vec   vector(1536),
  _org_id      uuid          DEFAULT NULL,
  _category    text          DEFAULT NULL,
  _limit       int           DEFAULT 8
)
RETURNS TABLE (
  id             uuid,
  doc_code       text,
  title_ar       text,
  title_en       text,
  summary_ar     text,
  summary_en     text,
  category_code  text,
  risk_level     text,
  priority       text,
  dense_score    numeric,
  fts_score      numeric,
  trgm_score     numeric,
  rrf_score      numeric
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $fn$
  WITH q AS (
    SELECT
      public.normalize_ar(COALESCE(_query_text, '')) AS q_norm,
      _query_vec                                     AS q_vec,
      GREATEST(_limit * 4, 32)                       AS pool
  ),
  base AS (
    SELECT a.id,
           a.doc_code, a.title_ar, a.title_en, a.summary_ar, a.summary_en,
           a.risk_level, a.priority,
           a.embedding, a.search_text_ar,
           c.code AS category_code
    FROM public.sec_knowledge_articles a
    LEFT JOIN public.sec_knowledge_categories c ON c.id = a.category_id
    WHERE a.status = 'published'
      AND (a.org_id IS NULL OR _org_id IS NULL OR a.org_id = _org_id)
      AND (_category IS NULL OR c.code = _category)
  ),
  dense AS (
    SELECT b.id,
           (1 - (b.embedding <=> (SELECT q_vec FROM q)))::numeric AS score,
           row_number() OVER (
             ORDER BY b.embedding <=> (SELECT q_vec FROM q) ASC
           ) AS rnk
    FROM base b
    WHERE b.embedding IS NOT NULL
    ORDER BY b.embedding <=> (SELECT q_vec FROM q) ASC
    LIMIT (SELECT pool FROM q)
  ),
  fts AS (
    SELECT b.id,
           ts_rank_cd(
             to_tsvector('simple', b.search_text_ar),
             plainto_tsquery('simple', (SELECT q_norm FROM q))
           )::numeric AS score,
           row_number() OVER (
             ORDER BY ts_rank_cd(
               to_tsvector('simple', b.search_text_ar),
               plainto_tsquery('simple', (SELECT q_norm FROM q))
             ) DESC
           ) AS rnk
    FROM base b
    WHERE to_tsvector('simple', b.search_text_ar)
          @@ plainto_tsquery('simple', (SELECT q_norm FROM q))
    LIMIT (SELECT pool FROM q)
  ),
  trgm AS (
    SELECT b.id,
           similarity(b.search_text_ar, (SELECT q_norm FROM q))::numeric AS score,
           row_number() OVER (
             ORDER BY similarity(b.search_text_ar, (SELECT q_norm FROM q)) DESC
           ) AS rnk
    FROM base b
    WHERE b.search_text_ar % (SELECT q_norm FROM q)
    LIMIT (SELECT pool FROM q)
  ),
  fused AS (
    SELECT id,
           SUM(1.0 / (60 + rnk))::numeric AS rrf,
           MAX(dense_s) AS dense_score,
           MAX(fts_s)   AS fts_score,
           MAX(trgm_s)  AS trgm_score
    FROM (
      SELECT id, rnk, score AS dense_s, NULL::numeric AS fts_s, NULL::numeric AS trgm_s FROM dense
      UNION ALL
      SELECT id, rnk, NULL::numeric,        score,            NULL::numeric        FROM fts
      UNION ALL
      SELECT id, rnk, NULL::numeric,        NULL::numeric,    score                FROM trgm
    ) u
    GROUP BY id
  )
  SELECT b.id, b.doc_code, b.title_ar, b.title_en, b.summary_ar, b.summary_en,
         b.category_code, b.risk_level, b.priority,
         COALESCE(f.dense_score, 0)::numeric,
         COALESCE(f.fts_score,   0)::numeric,
         COALESCE(f.trgm_score,  0)::numeric,
         f.rrf::numeric
  FROM fused f
  JOIN base b ON b.id = f.id
  ORDER BY f.rrf DESC
  LIMIT _limit;
$fn$;

COMMENT ON FUNCTION public.sec_kb_hybrid_search(text, vector, uuid, text, int) IS
  'Article 31 (RAG): hybrid retrieval fusing dense + FTS + trigram via Reciprocal Rank Fusion (k=60). Tenant-scoped by _org_id.';

REVOKE ALL ON FUNCTION public.sec_kb_hybrid_search(text, vector, uuid, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sec_kb_hybrid_search(text, vector, uuid, text, int) TO authenticated, service_role;
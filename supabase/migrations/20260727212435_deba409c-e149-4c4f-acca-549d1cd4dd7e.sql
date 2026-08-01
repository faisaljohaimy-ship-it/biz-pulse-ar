-- =====================================================================
-- WS-1 + WS-2: RAG Foundation (additive-only, zero data loss)
-- =====================================================================

-- --- Extensions ------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- --- Arabic normalization function -----------------------------------
CREATE OR REPLACE FUNCTION public.normalize_ar(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, extensions
AS $$
  SELECT
    lower(
      regexp_replace(
        translate(
          COALESCE(_input, ''),
          -- fold: alef variants→ا | teh marbuta→ه | alef maksura→ي | tatweel removed
          'أإآٱٲٳﺃﺇﺁةﺓﺔىﯨﯩـ',
          'اااااااااههيييي'
        ),
        -- strip Arabic diacritics (tashkeel) U+064B..U+0652 + shadda/sukun/etc.
        '[\u064B-\u0652\u0670\u0640]', '', 'g'
      )
    )
$$;

COMMENT ON FUNCTION public.normalize_ar(text) IS
  'Article 31 (RAG): folds alef/teh-marbuta/alef-maksura and strips tashkeel for Arabic search parity.';

-- --- Shadow embedding columns (Gemini Embedding 2, 1536 dims) --------
-- aria_knowledge
ALTER TABLE public.aria_knowledge
  ADD COLUMN IF NOT EXISTS embedding_v2   vector(1536),
  ADD COLUMN IF NOT EXISTS model_version  text,
  ADD COLUMN IF NOT EXISTS embedded_at    timestamptz;

-- aria_document_chunks
ALTER TABLE public.aria_document_chunks
  ADD COLUMN IF NOT EXISTS embedding_v2   vector(1536),
  ADD COLUMN IF NOT EXISTS model_version  text,
  ADD COLUMN IF NOT EXISTS embedded_at    timestamptz;

-- aria_memory
ALTER TABLE public.aria_memory
  ADD COLUMN IF NOT EXISTS embedding_v2   vector(1536),
  ADD COLUMN IF NOT EXISTS model_version  text,
  ADD COLUMN IF NOT EXISTS embedded_at    timestamptz;

-- sec_knowledge_articles (already vector(1536), only add provenance)
ALTER TABLE public.sec_knowledge_articles
  ADD COLUMN IF NOT EXISTS model_version  text,
  ADD COLUMN IF NOT EXISTS embedded_at    timestamptz;

-- --- RAG query log (WS-8 foundation) ---------------------------------
CREATE TABLE IF NOT EXISTS public.rag_query_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid,
  user_id         uuid,
  query_text      text NOT NULL,
  query_norm      text,
  hits_count      integer NOT NULL DEFAULT 0,
  max_similarity  numeric,
  gate_result     text NOT NULL DEFAULT 'pending',
    -- allowed: pending | passed | below_threshold | no_citations | injection_blocked | rate_limited | error
  latency_ms      integer,
  model_version   text,
  route           text,
  correlation_id  uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.rag_query_log TO authenticated;
GRANT ALL ON public.rag_query_log TO service_role;

ALTER TABLE public.rag_query_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_query_log FORCE  ROW LEVEL SECURITY;

-- Owner-read policy (users see only their own queries)
DROP POLICY IF EXISTS rag_query_log_owner_read ON public.rag_query_log;
CREATE POLICY rag_query_log_owner_read
  ON public.rag_query_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role writes (server functions insert with the service role via .server client)
DROP POLICY IF EXISTS rag_query_log_service_write ON public.rag_query_log;
CREATE POLICY rag_query_log_service_write
  ON public.rag_query_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Restrictive tenant isolation (matches Article 32)
DROP POLICY IF EXISTS rag_query_log_tenant_isolation ON public.rag_query_log;
CREATE POLICY rag_query_log_tenant_isolation
  ON public.rag_query_log
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (org_id IS NULL OR org_id = public.current_org_id())
  WITH CHECK (org_id IS NULL OR org_id = public.current_org_id());

CREATE INDEX IF NOT EXISTS rag_query_log_user_created_idx
  ON public.rag_query_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS rag_query_log_gate_result_idx
  ON public.rag_query_log (gate_result, created_at DESC);

CREATE INDEX IF NOT EXISTS rag_query_log_org_created_idx
  ON public.rag_query_log (org_id, created_at DESC);

COMMENT ON TABLE public.rag_query_log IS
  'Article 31/32: audit trail for every RAG retrieval — recall, gate rejects, latency, tenant isolation.';

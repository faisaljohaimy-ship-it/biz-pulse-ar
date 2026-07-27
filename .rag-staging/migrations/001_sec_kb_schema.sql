-- =============================================================================
-- 001_sec_kb_schema.sql — SEC/PTW Knowledge Base schema for RAG
-- STAGING — NOT applied. Move to supabase/migrations/ only with explicit
-- approval. Assumes 002_sec_kb_rls.sql applies immediately after.
-- =============================================================================

-- Extensions required. pg_trgm / unaccent may need superuser on Supabase;
-- confirm with the operator before applying this file.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Parent document — one row per SEC-XX or PTW file.
CREATE TABLE public.sec_kb_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  doc_code     text NOT NULL,               -- e.g. 'SEC-01', 'PTW-HOT-WORK'
  title_ar     text NOT NULL,
  title_en     text,
  source_uri   text,                        -- original storage path / URL
  version      text NOT NULL DEFAULT 'v1',
  language     text NOT NULL DEFAULT 'ar',
  content_hash text NOT NULL,               -- sha256 of full normalized body
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, doc_code, version)
);

CREATE INDEX idx_sec_kb_documents_org ON public.sec_kb_documents(org_id);
CREATE INDEX idx_sec_kb_documents_code ON public.sec_kb_documents(doc_code);

-- Chunk table — one row per retrievable passage.
-- embedding vector(1536) matches Gemini embedding output + fits HNSW (≤2000).
CREATE TABLE public.sec_kb_chunks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid NOT NULL REFERENCES public.sec_kb_documents(id) ON DELETE CASCADE,
  org_id          uuid NOT NULL,            -- denormalized for RLS + fast filter
  doc_code        text NOT NULL,            -- denormalized for trgm ranking
  chunk_index     int  NOT NULL,
  section_path    text,                     -- e.g. '3.2.1' or 'ملحق أ'
  content         text NOT NULL,            -- original Arabic passage
  content_norm    text NOT NULL,            -- normalize_ar(content)
  chunk_hash      text NOT NULL,            -- sha256(content_norm)
  token_count     int,
  embedding       vector(1536),             -- L2-normalized after any MRL truncate
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_hash)
);

CREATE INDEX idx_sec_kb_chunks_org ON public.sec_kb_chunks(org_id);
CREATE INDEX idx_sec_kb_chunks_doc ON public.sec_kb_chunks(document_id);
CREATE INDEX idx_sec_kb_chunks_code ON public.sec_kb_chunks(doc_code);

-- Vector index — HNSW cosine on 1536 dims (within the 2000 limit; no halfvec cast needed).
CREATE INDEX sec_kb_chunks_embedding_hnsw
  ON public.sec_kb_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- FTS index — Arabic-aware via 'simple' config over normalized text.
-- ('simple' is portable across Supabase; the normalize_ar step in 003 handles
-- alef/teh/tashkeel folding so we don't depend on a shipped 'arabic' dict.)
CREATE INDEX sec_kb_chunks_tsv_gin
  ON public.sec_kb_chunks
  USING gin (to_tsvector('simple', content_norm));

-- Trigram index — for exact-code and short-token matches (SEC-\d\d, PTW codes).
CREATE INDEX sec_kb_chunks_trgm_gin
  ON public.sec_kb_chunks
  USING gin (content_norm gin_trgm_ops);

-- Updated_at trigger (reuses project's helper).
CREATE TRIGGER trg_sec_kb_documents_updated_at
  BEFORE UPDATE ON public.sec_kb_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- VERIFY:
--   SELECT extname FROM pg_extension WHERE extname IN ('vector','pg_trgm','unaccent');
--   SELECT pg_get_indexdef(i.oid) FROM pg_class i WHERE relname = 'sec_kb_chunks_embedding_hnsw';
--   -- expect vector_cosine_ops with dimensionality 1536
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_sec_kb_documents_updated_at ON public.sec_kb_documents;
--   DROP TABLE IF EXISTS public.sec_kb_chunks;
--   DROP TABLE IF EXISTS public.sec_kb_documents;
-- =============================================================================

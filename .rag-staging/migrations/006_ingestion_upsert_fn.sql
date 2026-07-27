-- =============================================================================
-- 006_ingestion_upsert_fn.sql — Idempotent chunk upsert
-- STAGING — NOT applied.
--
-- Contract:
--   • Caller (Edge Function running as service_role or org admin) supplies:
--       document_id, org_id, chunk_index, section_path, content, embedding
--   • Function computes content_norm + chunk_hash and upserts on
--     (document_id, chunk_hash). Same content twice = single row.
--   • If embedding was truncated via Matryoshka, caller MUST L2-renormalize
--     BEFORE calling. Function checks ||embedding||₂ ∈ [0.999, 1.001] and
--     raises otherwise — defense against un-normalized inserts.
--   • org_id must match the parent document's org_id — mismatch raises.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sec_kb_upsert_chunk(
  _document_id  uuid,
  _org_id       uuid,
  _chunk_index  int,
  _section_path text,
  _content      text,
  _embedding    vector(1536),
  _token_count  int  DEFAULT NULL,
  _metadata     jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm       text;
  _hash       text;
  _doc_org    uuid;
  _doc_code   text;
  _norm_len   double precision;
  _chunk_id   uuid;
BEGIN
  -- Parent org fence.
  SELECT org_id, doc_code INTO _doc_org, _doc_code
  FROM public.sec_kb_documents
  WHERE id = _document_id;

  IF _doc_org IS NULL THEN
    RAISE EXCEPTION 'sec_kb_upsert_chunk: unknown document_id %', _document_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF _doc_org <> _org_id THEN
    RAISE EXCEPTION 'sec_kb_upsert_chunk: org_id mismatch (doc=% caller=%)',
      _doc_org, _org_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- L2 norm check (embedding must be unit-length; caller renormalizes after MRL).
  SELECT sqrt(sum((v)::double precision * (v)::double precision))
    INTO _norm_len
  FROM unnest(_embedding::real[]) AS v;

  IF _norm_len < 0.999 OR _norm_len > 1.001 THEN
    RAISE EXCEPTION 'sec_kb_upsert_chunk: embedding not L2-normalized (||x||=%.6f)',
      _norm_len
      USING ERRCODE = 'check_violation';
  END IF;

  _norm := public.normalize_ar(_content);
  _hash := encode(digest(_norm, 'sha256'), 'hex');

  INSERT INTO public.sec_kb_chunks (
    document_id, org_id, doc_code, chunk_index, section_path,
    content, content_norm, chunk_hash, token_count, embedding, metadata
  )
  VALUES (
    _document_id, _org_id, _doc_code, _chunk_index, _section_path,
    _content, _norm, _hash, _token_count, _embedding, _metadata
  )
  ON CONFLICT (document_id, chunk_hash) DO UPDATE
    SET chunk_index  = EXCLUDED.chunk_index,
        section_path = EXCLUDED.section_path,
        embedding    = EXCLUDED.embedding,
        token_count  = EXCLUDED.token_count,
        metadata     = EXCLUDED.metadata
  RETURNING id INTO _chunk_id;

  RETURN _chunk_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sec_kb_upsert_chunk(uuid, uuid, int, text, text, vector, int, jsonb) FROM PUBLIC;
-- Only service_role (Edge fn) may write. Admin writes go via that Edge fn.
GRANT EXECUTE ON FUNCTION public.sec_kb_upsert_chunk(uuid, uuid, int, text, text, vector, int, jsonb)
  TO service_role;

COMMENT ON FUNCTION public.sec_kb_upsert_chunk IS
  'Idempotent chunk upsert. Enforces org fence + L2 unit-length embedding. service_role only (called from Edge Function).';

-- =============================================================================
-- VERIFY:
--   -- Insert same chunk twice; row count must remain 1.
--   -- (Requires seed sec_kb_documents row; see .rag-staging/eval/README.md)
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.sec_kb_upsert_chunk(uuid, uuid, int, text, text, vector, int, jsonb);
-- =============================================================================

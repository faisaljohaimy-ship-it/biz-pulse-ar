-- ============================================================================
-- RAG LAYER (1/4) — extensions
--
-- STAGED, NOT APPLIED. Enables the three extensions the RAG layer needs, all
-- into Supabase's `extensions` schema (where `vector` was already relocated by
-- 20260708133930). Idempotent; no data touched.
--   • vector   — pgvector ANN (already present on this project; kept for a
--                clean-clone install order).
--   • pg_trgm  — trigram fuzzy / typo-tolerant matching (third hybrid signal).
--   • pgcrypto — digest() for the per-chunk sha256 content hash.
-- ============================================================================

create extension if not exists vector   with schema extensions;
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists pgcrypto with schema extensions;

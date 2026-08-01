-- ============================================================================
-- RAG LAYER (4/4) — rag_chunks (segments + embedding + hybrid indexes)
--
-- STAGED, NOT APPLIED. One row per retrievable segment. Carries the three
-- provenance fields the brief mandates on EVERY chunk — embedding_model,
-- embedding_dim, content_hash — plus the two derived text forms that power
-- hybrid retrieval, both generated from the ONE normalizer:
--   • content_norm : nx_ar_normalize(content)                → pg_trgm fuzzy
--   • tsv          : to_tsvector('simple', nx_ar_normalize)  → Arabic FTS
--   • content_hash : sha256(content) hex                     → integrity + dedup
--
-- Isolation: org_id is denormalized here (so RLS + the HNSW scan never pay a
-- per-row join to rag_documents), and a COMPOSITE FK (document_id, org_id) →
-- rag_documents(id, org_id) makes it IMPOSSIBLE for a chunk's org to differ
-- from its document's. Same is_org_member() read/write gates as documents.
--
-- Embedding: FIXED vector(1536) — APPROVED dimension. Reason: pgvector's HNSW
--   index supports the `vector` type up to 2000 dimensions; 1536 ≤ 2000, so a
--   plain `vector` (NOT halfvec) is used. The project already runs an applied
--   vector(1536)+HNSW index (sec_knowledge_articles, 20260629), proving this
--   dimension works here. embedding_dim + its CHECK keep column and metadata
--   from drifting.
--
--   [VECTOR-SPACE CONTRACT — read before ingesting] The canonical embedder is
--   Gemini Embedding 2 with output_dimensionality=1536. The API returns the
--   requested reduced representation already normalized. Never truncate a
--   3072-dimensional response locally, and never compare vectors produced by
--   another model/version; a model change requires a complete re-embed.
-- Similarity: cosine (vector_cosine_ops, `<=>`) — text embeddings are direction-
--   semantic; matches the existing sec_knowledge_articles choice.
-- Index: HNSW (m=16, ef_construction=64) — better than IVFFlat for a corpus
--   that grows incrementally (IVFFlat needs a trained `lists` and degrades).
-- Idempotent; adds only.
-- ============================================================================

set local search_path = public, extensions;

create table if not exists public.rag_chunks (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default public.current_org_id(),
  document_id     uuid not null,
  chunk_index     int  not null check (chunk_index >= 0),
  content         text not null,

  -- derived, all IMMUTABLE-backed so they are STORED generated columns:
  content_norm    text     generated always as (public.nx_ar_normalize(content)) stored,
  tsv             tsvector generated always as (to_tsvector('simple', public.nx_ar_normalize(content))) stored,
  content_hash    text     generated always as (encode(extensions.digest(content, 'sha256'), 'hex')) stored,

  token_count     int  check (token_count is null or token_count > 0),

  -- provenance (brief: every chunk carries model + dims + hash).
  -- Generated directly at 1536 dimensions by the canonical Gemini endpoint.
  embedding       extensions.vector(1536),
  embedding_model text not null default 'gemini-embedding-2',
  embedding_dim   int  not null default 1536 check (embedding_dim = 1536),

  is_simulation   boolean not null default false,
  created_at      timestamptz not null default now(),

  -- org isolation cannot drift from the parent document:
  foreign key (document_id, org_id)
    references public.rag_documents (id, org_id) on delete cascade,
  unique (document_id, chunk_index)
);

create index if not exists rag_chunks_org_idx on public.rag_chunks (org_id);
create index if not exists rag_chunks_doc_idx on public.rag_chunks (document_id);

-- 1) vector ANN — cosine, HNSW:
create index if not exists rag_chunks_embedding_hnsw on public.rag_chunks
  using hnsw (embedding extensions.vector_cosine_ops) with (m = 16, ef_construction = 64);
-- 2) Arabic FTS — GIN over the normalized tsvector:
create index if not exists rag_chunks_tsv_gin on public.rag_chunks using gin (tsv);
-- 3) fuzzy / typo-tolerant — GIN trigram over the normalized text:
create index if not exists rag_chunks_trgm_gin on public.rag_chunks
  using gin (content_norm extensions.gin_trgm_ops);

alter table public.rag_chunks enable row level security;

drop policy if exists rag_chunks_member_read on public.rag_chunks;
create policy rag_chunks_member_read on public.rag_chunks
  for select to authenticated
  using (public.is_org_member(org_id, 'viewer'));

drop policy if exists rag_chunks_admin_write on public.rag_chunks;
create policy rag_chunks_admin_write on public.rag_chunks
  for all to authenticated
  using (public.is_org_member(org_id, 'admin'))
  with check (public.is_org_member(org_id, 'admin'));

grant select on public.rag_chunks to authenticated;
grant all    on public.rag_chunks to service_role;
-- NOTE: no anon grant — authenticated + org-isolated only.

-- Hybrid retrieval (vector + FTS + pg_trgm merged by Reciprocal Rank Fusion,
-- k=60; weights vector 1.0 / fts 1.0 / trgm 0.5) is a SEARCH FUNCTION and is
-- deliberately NOT created here — it belongs to the backend/Edge session. This
-- migration only lays the three indexes that make that fusion possible.

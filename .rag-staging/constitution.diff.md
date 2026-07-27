# Constitution — proposed additions (DO NOT MERGE)

Target file: `docs/NEXIOS_ENGINEERING_CONSTITUTION.md`
(the memory index Core lists it as the authoritative constitution).
These two new articles are the RAG contract; they do not modify or
weaken any existing article.

---

## Article 31 — RAG Retrieval Protocol

The Retrieval-Augmented Generation layer serves regulated Arabic content
(HCIS SEC-01..SEC-19 and PTW families). It is bound by the following
non-negotiables:

1. **Embedding space** — `vector(1536)` with cosine distance. HNSW index
   (m=16, ef_construction=64). Never exceed the 2000-dim HNSW ceiling.
2. **Matryoshka discipline** — any truncation of a longer embedding to
   1536 dims MUST be followed by L2 renormalization. `sec_kb_upsert_chunk`
   rejects vectors with ‖x‖₂ ∉ [0.999, 1.001].
3. **Fusion** — Reciprocal Rank Fusion, constant k=60, weights
   0.5 (vector) / 0.3 (Arabic FTS) / 0.2 (pg_trgm). Per-channel top-N=40.
   Deviations require an amendment to this article, not a hotfix.
4. **Arabic normalization** — `normalize_ar()` folds alef family, teh
   marbuta, alef maksura, tashkeel, tatweel, and BiDi marks. It is
   IMMUTABLE and used identically on ingestion, generated columns, and
   query text. Any change to it invalidates the entire index and MUST
   trigger a full re-embed.
5. **Evidence gate** — `insufficient_evidence` is a **successful** output,
   not an error. FINN MUST NOT compose an answer when
   `top_score < 0.35` OR `citation_count < 2`. Gate values are the
   article's default; a project may tighten them, never loosen.
6. **Citations** — every answer composed on top of RAG output MUST
   surface citations as `{doc_code, section_path, offset, score}`.
   Citation-free RAG answers are a constitutional violation.
7. **Idempotent ingestion** — chunks upsert on `(document_id, chunk_hash)`
   where `chunk_hash = sha256(normalize_ar(content))`. Re-ingesting the
   same file MUST NOT duplicate rows.
8. **Streaming** — RAG endpoints return full JSON. No token streaming
   from retrieval; streaming remains an answer-layer concern.

## Article 32 — Multi-Tenant Isolation (Cross-Cutting Invariant)

Applies to every table that carries `org_id`, including but not limited
to SEC/PTW knowledge bases, incidents, permits, work orders, visitors,
contractors, assets, sites.

1. **Source of truth** — the caller's `org_id` is resolved by
   `public.current_org_id()` (aliased as `public.auth_org_id()`), which
   reads `request.jwt.claims -> app_metadata.current_org` and falls back
   to an unambiguous single-org membership. **The client never passes
   `org_id` as a function argument.** Any function that accepts a caller-
   supplied `org_id` is a violation.
2. **RESTRICTIVE fence** — every `org_id`-bearing table MUST enable RLS,
   FORCE RLS, and carry at least one RESTRICTIVE policy tying every row
   in every command to `org_id = auth_org_id()`. Permissive read/write
   policies layer on top; they can never widen the fence.
3. **Service role** — `SUPABASE_SERVICE_ROLE_KEY` never leaves an Edge
   Function. Client bundles, browser code, and route loaders MUST NOT
   reference it. Admin-scoped work loads the admin client lazily inside
   the handler and only after verifying the caller's role via `has_role`.
4. **Write role** — writes to knowledge and regulated data require
   `is_org_member(org, 'admin'::org_role)`. Reads require `viewer`.
5. **Verification** — `.rag-staging/tools/isolation_probe.sql` (27
   checks) MUST return zero ✗ before any migration that touches an
   org-scoped table is approved for production.

Violations of Article 32 are treated as security incidents, not bugs.

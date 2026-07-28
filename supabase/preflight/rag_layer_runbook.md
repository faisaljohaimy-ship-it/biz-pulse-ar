# RAG layer — apply runbook (STAGED · not yet applied)

Project: **`khytdwgyrnztqabhfgbb`** (the owner-declared active project — NOT the
stale `jhutlofapjfjjeajawie` in `config.toml`).

**Approved decisions**
- Embedding dimension: **`vector(1536)`** (plain `vector`, not `halfvec`).
- Write role: **`admin`** via `is_org_member(org_id, 'admin')` — matches `aria_knowledge`.
- **Do NOT auto-apply.** The operator takes a backup, then applies manually.

**pgvector / halfvec check (do this first, on the live project)**
Run file 1's verification query (below) and read `vector.extversion`. HNSW on the
`vector` type supports **≤ 2000 dimensions**; 1536 ≤ 2000, so plain `vector` is
correct and **halfvec is not required**. The project already runs an applied
`vector(1536)` + HNSW index (`sec_knowledge_articles`, migration `20260629`), so
this is proven for this database. If — for any reason — your pgvector build
refuses `vector(1536)` + HNSW and demands `halfvec`, **STOP** and report it; do
not improvise a change.

---

## MRL → L2 re-normalization rule (ingestion contract)

The production embedder (**Gemini `gemini-embedding-001`**) returns a **3072-dim
Matryoshka (MRL)** vector. To store 1536 you **truncate to the first 1536
components** — but a truncated MRL vector is **no longer unit-length**, so cosine
distance (`<=>`) over it is wrong. Ingestion (later session) MUST therefore
re-normalize every truncated vector to unit L2 norm before writing:

```
v1536 = v[0:1536]
n     = sqrt(sum(x*x for x in v1536))          # L2 norm
store = v1536 if n == 0 else [x / n for x in v1536]   # unit vector (guard n==0)
```

The `rag_chunks_embedding_hnsw` (cosine) index **assumes every stored embedding
is already L2-normalized**. This is enforced by the ingestion path, not by DDL.
(Same rule is documented in the header of `20260728093300_rag_chunks.sql`.)

---

## Apply order — 4 files, in sequence, each with ONE verification query

Apply with `supabase db push` (or paste each file in the SQL editor) **in this
exact order**. After each file, run its check and confirm the expected result.

### 1) `20260728093000_rag_extensions.sql`
```sql
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('vector','pg_trgm','pgcrypto') ORDER BY extname;
```
**Expect:** 3 rows. Confirm `vector.extversion` ≥ `0.5.0` (HNSW support). If it is
present but you see any hint that 1536 needs `halfvec` → STOP (see check above).

### 2) `20260728093100_rag_ar_normalize.sql`
```sql
SELECT public.nx_ar_normalize('السَّلامةِ') AS a,   -- tashkeel + ta marbuta
       public.nx_ar_normalize('ســلامة')   AS b,   -- tatweel
       public.nx_ar_normalize('SEC-18')     AS c;   -- latin lower
```
**Expect:** `a = السلامه`, `b = سلامه`, `c = sec-18`.

### 3) `20260728093200_rag_documents.sql`
```sql
SELECT relrowsecurity AS rls_on,
       (SELECT count(*) FROM pg_policies
         WHERE schemaname='public' AND tablename='rag_documents') AS policies
FROM pg_class WHERE oid = 'public.rag_documents'::regclass;
```
**Expect:** `rls_on = t`, `policies = 2` (member read + admin write).

### 4) `20260728093300_rag_chunks.sql`
```sql
SELECT format_type(atttypid, atttypmod) AS embedding_type,
       (SELECT count(*) FROM pg_indexes
         WHERE schemaname='public' AND tablename='rag_chunks'
           AND indexname IN ('rag_chunks_embedding_hnsw',
                             'rag_chunks_tsv_gin','rag_chunks_trgm_gin')) AS hybrid_indexes
FROM pg_attribute
WHERE attrelid='public.rag_chunks'::regclass AND attname='embedding';
```
**Expect:** `embedding_type = vector(1536)` (or `extensions.vector(1536)`),
`hybrid_indexes = 3` (HNSW + FTS GIN + trgm GIN).

---

## Rollback — reverse order (4 → 3 → 2 → 1)

Run these in REVERSE of apply order (a chunk's FK + the normalizer-backed
generated columns depend on the earlier objects).

### undo 4) rag_chunks
```sql
DROP TABLE IF EXISTS public.rag_chunks;   -- drops its 3 indexes, 2 policies, FK, generated cols
```

### undo 3) rag_documents
```sql
DROP TABLE IF EXISTS public.rag_documents;   -- run AFTER rag_chunks; drops policies + updated_at trigger
```

### undo 2) nx_ar_normalize
```sql
DROP FUNCTION IF EXISTS public.nx_ar_normalize(text);   -- run AFTER rag_chunks (its generated cols used it)
```

### undo 1) extensions
```sql
DROP EXTENSION IF EXISTS pg_trgm;   -- safe once rag_chunks_trgm_gin is gone; errors (safely) if still depended on
-- pgcrypto: LEAVE installed — it may be shared by other objects.
-- vector:   NEVER drop — it is shared with aria_knowledge / sec_knowledge_articles.
```

> `DROP EXTENSION` without `CASCADE` refuses when another object still depends on
> it — that refusal is the guardrail; do not add `CASCADE` to force it.

---

# Session 2 — hybrid search + Edge Functions (STAGED · not deployed)

## 5) `20260728110000_rag_hybrid_search.sql` (apply AFTER files 1–4)
```sql
SELECT p.prosecdef AS is_definer,          -- expect f (SECURITY INVOKER)
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p WHERE p.proname = 'rag_hybrid_search';
```
**Expect:** one row, `is_definer = f`, and `args` contains NO org parameter —
`(_query text, _query_embedding vector, _match_count integer)` only. That is the
isolation proof at the DB layer: there is nothing org-shaped to pass.

**Rollback 5:**
```sql
DROP FUNCTION IF EXISTS public.rag_hybrid_search(text, extensions.vector, int);
DROP INDEX IF EXISTS public.rag_documents_org_code_uq;
DROP INDEX IF EXISTS public.rag_documents_org_source_title_uq;
```

## Edge Functions (deploy ONLY after approval)
```bash
# secrets first (values from your vault — never from the repo):
supabase secrets set GEMINI_API_KEY=*** --project-ref khytdwgyrnztqabhfgbb
# deploy:
supabase functions deploy rag-retrieve --project-ref khytdwgyrnztqabhfgbb
supabase functions deploy rag-ingest   --project-ref khytdwgyrnztqabhfgbb
```
Neither function ever uses `service_role` — both forward the CALLER's JWT so
RLS enforces org isolation (read: viewer، write: admin — مطابق aria_knowledge).

**Verification (positive):**
```bash
curl -sX POST "https://khytdwgyrnztqabhfgbb.supabase.co/functions/v1/rag-retrieve" \
  -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" \
  -d '{"query":"ما نطاق SEC-18؟"}'
# expect: {"results":[…],"insufficient_evidence":…,"degraded":null}
```
**Verification (NEGATIVE — org from body must be refused):**
```bash
curl -sX POST ".../functions/v1/rag-retrieve" \
  -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" \
  -d '{"query":"x","org_id":"00000000-0000-0000-0000-00000000bbbb"}'
# expect: HTTP 400 {"error":"org_id_forbidden", …}
```
**Rollback (edge):** `supabase functions delete rag-retrieve --project-ref …`
(وكذلك `rag-ingest`)؛ حذف الدالة لا يمسّ البيانات.

---

# Session 3 — wiring + evaluation + flag (STAGED · dark by default)

## Feature flag (NOT_GLOBAL)
The `/rag-search` surface renders ONLY when the environment sets
`VITE_RAG_RETRIEVAL_ENABLED=true` (Vercel → Environment Variables, per
environment). Default everywhere: **OFF** — merging/deploying the code alone
changes nothing user-visible.

**Verify (flag off):** open `/rag-search` → "الميزة غير مفعّلة في هذه البيئة".
**Verify (flag on + guest):** sign-in gate state — never an Unauthorized error.
**Rollback:** unset the env var (instant, no deploy), or revert the phase-③
commit — no DB objects are involved in this phase.

## Live golden-set evaluation (operator-run, after functions deploy)
```bash
VITE_SUPABASE_URL=https://khytdwgyrnztqabhfgbb.supabase.co \
RAG_EVAL_JWT=<real user session JWT of an org with the corpus ingested> \
npx vitest run src/test/rag-live-eval.test.ts
```
Prints the scorecard (hit@1 · hit@5 · MRR · coverage · insufficient-rate ·
misses) over the 22 golden queries (19 real SEC titles + 3 PTW). Without the
env vars the suite SKIPS — the skip itself is the honest not-run record.
Initial calibration floor: coverage ≥ 0.7 [افتراض — يُشدَّد بعد أول ابتلاع].

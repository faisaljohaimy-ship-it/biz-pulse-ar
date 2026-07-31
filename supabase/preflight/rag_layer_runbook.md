# RAG layer — apply runbook (STAGED · not yet applied)

Project: **`jhutlofapjfjjeajawie`** (owner-declared, and now the value in
`config.toml` — the two agree since 2026-07-30; before that config.toml
carried a stale ref, which is why several files still explain the mismatch).

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
supabase secrets set GEMINI_API_KEY=*** --project-ref jhutlofapjfjjeajawie
# deploy:
supabase functions deploy rag-retrieve --project-ref jhutlofapjfjjeajawie
supabase functions deploy rag-ingest   --project-ref jhutlofapjfjjeajawie
```
Neither function ever uses `service_role` — both forward the CALLER's JWT so
RLS enforces org isolation (read: viewer، write: admin — مطابق aria_knowledge).

**Verification (positive):**
```bash
curl -sX POST "https://jhutlofapjfjjeajawie.supabase.co/functions/v1/rag-retrieve" \
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

## Live evaluation (operator-run) — NOT RUNNABLE YET

**حالة مؤكَّدة: القاعدة غير مطبَّقة.** لم يُنفَّذ أي migration على
`jhutlofapjfjjeajawie`؛ لا `rag_documents` ولا `rag_chunks` ولا
`rag_hybrid_search`، والدالتان غير منشورتين. **لم يُشغَّل أي استرجاع، ولا
يوجد أي رقم recall أو دقة استشهاد — أي رقم يُذكر سيكون مُختلقًا.**

الشروط الأربعة لتشغيله: (1) تطبيق migrations 1–5، (2) نشر الدالتين،
(3) ابتلاع المحتوى للمؤسسة الهدف، (4) توفير المتغيّرين أدناه.

```bash
VITE_SUPABASE_URL=https://jhutlofapjfjjeajawie.supabase.co \
RAG_EVAL_JWT=<JWT جلسة مستخدم حقيقي في مؤسسة مبتلَع محتواها> \
npx vitest run src/test/rag-live-eval.test.ts
```

**المرساة المستخدمة:** أسماء التوجيهات الـ21 من بذرة `hcis_directives`
حرفيًا (SEC-01..19 + SEC-RC + SAF-GEN) — **صفر سؤال مؤلَّف**. البذرة لا
تحتوي أي حقل أسئلة، فمجموعة من 30 سؤالًا غير ممكنة بلا تأليف (🛑 عائق
موثّق في تقرير الجلسة).

الاختبار **لا يفرض أي عتبة جودة** — يجمع النتائج ويطبع بطاقة القياس فقط.
تحديد عتبة المعايرة قرارك بعد أول قياس حقيقي؛ افتراض عتبة الآن اختلاق.

---

## Phase ④ closing — read-side capture (migration 8)

`20260728160000_rag_capture_readside.sql` — **staged, not applied.**

Capture reads the EXISTING conversation tables after the fact; it is not a
hook on the answer path. The constitutional guarantee «لا استدعاء التقاط
داخل مسار طلب المستخدم» is a privilege, not a convention:

```sql
revoke all on function public.rag_capture_readside(int) from public, anon, authenticated;
grant execute on function public.rag_capture_readside(int) to service_role;
```

Sources and what each contributes:

| المصدر | يُقرأ | يُنتج |
|---|---|---|
| `aria_learning_log` (unresolved) | السؤال + وقت التسجيل | صفوف في `rag_gaps` |
| `aria_conversations` (غير محاكاة) | عدّ الطلب وحدّ المسح | **صفر** صفوف فجوات |

The second row is a deliberate refusal, not an omission: a conversation
title is evidence a question was ASKED, not that it went UNANSWERED, and
minting titles into the failure ledger would inflate every coverage figure
computed from it.

**Org resolution fails closed.** A user in two orgs (or none) is SKIPPED and
counted in `skipped_no_org` — never filed under a guessed tenant.

**Run the harness (real Postgres, no production access):**

```bash
psql -v ON_ERROR_STOP=1 \
  -v normalize_file=supabase/migrations/20260728093100_rag_ar_normalize.sql \
  -v documents_file=supabase/migrations/20260728093200_rag_documents.sql \
  -v loop_file=supabase/migrations/20260728140000_rag_learning_loop.sql \
  -v hardening_file=supabase/migrations/20260728150000_rag_learning_hardening.sql \
  -v capture_file=supabase/migrations/20260728160000_rag_capture_readside.sql \
  -f supabase/preflight/rag_capture_check.sql
```

Checks I–VIII, all executed: capture denied to `authenticated`/`anon`;
resolved questions excluded; ambiguous org skipped and filed nowhere;
**`rag_chunks`/`rag_documents`/`rag_candidates` UNCHANGED** (negative test);
two spellings merged into one gap; a second run scans zero rows; conversations
scanned with zero gaps minted; simulation rows excluded.

## Phase ⑤ — continuous operation (migration 9)

`20260728170000_rag_operations.sql` — **staged, not applied.**

Adds `embedded_hash`/`embedded_at` to `rag_chunks` (the staleness signal the
re-embed queue needs — content_hash alone tells you the text changed, not that
the vector is behind it), `rag_retrieval_log`, `rag_eval_runs`, `rag_health()`
and `rag_should_enable()`, plus three guarded `pg_cron` schedules.

**The honesty rule is in SQL, not prose.** Every unmeasured metric returns
`NULL`; a CHECK constraint (`rag_eval_scores_require_measurement`) forbids a
row that claims a score with `measured_questions = 0`; and members cannot
INSERT into `rag_eval_runs` at all, so the auto-enable gate cannot be hand-fed
a passing row.

```bash
psql -v ON_ERROR_STOP=1 \
  -v normalize_file=supabase/migrations/20260728093100_rag_ar_normalize.sql \
  -v documents_file=supabase/migrations/20260728093200_rag_documents.sql \
  -v loop_file=supabase/migrations/20260728140000_rag_learning_loop.sql \
  -v hardening_file=supabase/migrations/20260728150000_rag_learning_hardening.sql \
  -v operations_file=supabase/migrations/20260728170000_rag_operations.sql \
  -f supabase/preflight/rag_operations_check.sql
```

Checks I–IX, all executed.

### حالة القياس اليوم

**لم يُشغَّل — القاعدة غير مطبَّقة.** `rag_eval_runs` فارغ، فـ
`rag_should_enable()` يعيد `{not_measured}` و`rag_enabled` تبقى مطفأة.
لا يوجد رقم recall ولا دقة استشهاد.

**عائق قائم على العتبة:** المرساة 21 بندًا من البذرة، والعتبة 30 سؤالًا
مقيسًا. حتى لو طُبِّقت القاعدة وابتُلع المحتوى اليوم، **الحد الأقصى الممكن
21 < 30** — فالبوابة تبقى مغلقة بنيويًا حتى ينمو المتن المبذور نفسه إلى
30 مرساة فأكثر. لا يُسدّ هذا الفارق بتأليف تسعة أسئلة.

## §2/§3 — deployment governance

Pure decision logic in `src/lib/rag/deployment.ts`; nothing there deploys.
`EMERGENCY_RESERVE = 2` is enforced by `checkBudget()` refusing `routine`
work once only the reserve remains. `evaluatePostDeployHealth()` returns
`inconclusive` — never `healthy` — for an unrun check. `decideRollback()`
judges artifact health FIRST, so a broken deploy can never be mistaken for a
quality regression and papered over with a flag flip.

# NEXIOS RAG — حزمة التجهيز الكاملة (بدون تطبيق)

**الالتزام الحاكم:** لا أطبّق migration، لا أنشر دالة، لا أعدّل مسار Gemini، لا `db push`، لا PR على main، لا streaming، لا MCP جديد، لا أسرار في الكود. كل ما يلي **ملفات مسوّدة للمراجعة** تحت `.rag-staging/` — لا تُنقل إلى `supabase/migrations/` ولا تُنشر إلا بأمرك.

---

## ① مخطط التدفق (نصّي)

```text
[UI/عربي RTL]
   │  (سؤال المستخدم)
   ▼
[Edge Function: rag_query]  ← JWT يحمل org_id
   │
   ├── normalize_ar(query)   (ألف/تاء/تشكيل/تطويل)
   ├── embed(query, 1536)    (Gemini يبقى؛ لا لمس)
   │
   ├── متوازي:
   │     ├─ vector search: sec_kb chunks (HNSW cosine, MRL→1536 + L2)
   │     ├─ FTS عربي:     to_tsvector('arabic', text)
   │     └─ pg_trgm:      similarity على العناوين/الرموز
   │
   ├── RRF fusion (k=60، أوزان 0.5/0.3/0.2)
   ├── org_id filter (RESTRICTIVE RLS — مفروض قاعديًا)
   ├── rerank top-N (اختياري لاحقًا؛ مُعطَّل في ③)
   │
   ├── evidence_gate:
   │     - إن score_top < τ أو citations < 2 →
   │         return { status: "insufficient_evidence", candidates }
   │     - وإلا → return { citations[], passages[] }
   │
   ▼
[FINN Answer Composer]  (خلف flag: RAG_HYBRID=off افتراضيًا)
   │  يضمّن الاستشهادات {doc_code, section, offset, score}
   ▼
[Output Gateway = NOT_GLOBAL]  (لا تغيير)
   ▼
[UI عربي مع بطاقات استشهاد قابلة للنقر]

[Ingestion — منفصل، لا يمس الاستعلام]
  ملف SEC/PTW → tika/parser → chunk(≈900 tok, overlap 120)
    → normalize_ar → hash(sha256) → upsert idempotent
    → embed batch (1536) → INSERT ON CONFLICT (doc_code, chunk_hash)
```

---

## ② جدول الملفات المُجهَّزة

| الملف (مسوّدة)                                                | ماذا يفعل                                                                                                                                                                                         | المخاطرة المعالَجة                     | استعلام التحقّق                                                                                                                                 | استعلام التراجع                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `.rag-staging/migrations/001_sec_kb_schema.sql`               | جداول `sec_kb_documents`, `sec_kb_chunks(embedding vector(1536))`, فهرس HNSW cosine، أعمدة `org_id`, `doc_code`, `chunk_hash`, `content_tsv` (arabic)                                             | تسرّب مؤسسات، حد HNSW 2000، رموز عربية | `SELECT pg_get_indexdef(i.oid) FROM pg_class i WHERE relname='sec_kb_chunks_embedding_hnsw';` — يجب أن يظهر `vector_cosine_ops` بأبعاد 1536     | `DROP TABLE sec_kb_chunks; DROP TABLE sec_kb_documents;`                 |
| `.rag-staging/migrations/002_sec_kb_rls.sql`                  | RLS + **RESTRICTIVE** policy لعزل `org_id = auth_org_id()`، GRANT لـ authenticated فقط، حرمان anon                                                                                                | 27 فحص عزل غير مطبّق، تسرّب متبادل     | `SELECT polname, polpermissive FROM pg_policy WHERE polrelid='public.sec_kb_chunks'::regclass;` — يجب وجود صف واحد على الأقل `permissive=false` | `ALTER TABLE sec_kb_chunks DISABLE ROW LEVEL SECURITY; DROP POLICY ...;` |
| `.rag-staging/migrations/003_ar_normalize_fn.sql`             | `normalize_ar(text) → text` IMMUTABLE (ألف/تاء/تشكيل/تطويل) + `content_tsv GENERATED` باستخدامها                                                                                                  | استرجاع ضعيف للرموز العربية            | `SELECT normalize_ar('الإسْتِراتِيْجِيَّة');` = `الاستراتيجيه`                                                                                  | `DROP FUNCTION normalize_ar(text) CASCADE;`                              |
| `.rag-staging/migrations/004_auth_org_helper.sql`             | `auth_org_id() SECURITY DEFINER` يستخرج `org_id` من JWT (`current_setting('request.jwt.claims')`) — **العميل لا يمرّره**                                                                          | تجاوز العزل من طرف العميل              | `SELECT auth_org_id();` من داخل سياق JWT اختباري                                                                                                | `DROP FUNCTION auth_org_id();`                                           |
| `.rag-staging/migrations/005_rag_hybrid_fn.sql`               | `sec_kb_hybrid_search(q_embedding, q_text, k)` — يدمج vector + FTS + trgm بـ **RRF (k=60)** بأوزان 0.5/0.3/0.2، ويُطبّق `auth_org_id()` داخليًا                                                   | تسرّب، دقة استرجاع                     | `EXPLAIN ANALYZE SELECT * FROM sec_kb_hybrid_search(...)` — يجب أن يستخدم HNSW + GIN(tsv) + GIN(trgm)                                           | `DROP FUNCTION sec_kb_hybrid_search(...);`                               |
| `.rag-staging/migrations/006_ingestion_upsert_fn.sql`         | `sec_kb_upsert_chunk(...)` — idempotent عبر `(doc_code, chunk_hash)`، يُعيد تطبيع L2 بعد أي MRL truncate                                                                                          | ازدواج، تلوث embeddings                | إدخال نفس القطعة مرتين ثم `SELECT count(*) FROM sec_kb_chunks WHERE doc_code='SEC-01';` = 1                                                     | `DROP FUNCTION sec_kb_upsert_chunk(...);`                                |
| `.rag-staging/functions/rag_query/index.ts` (مسوّدة — لا نشر) | Edge Function مصادَقة: يستدعي embed → `sec_kb_hybrid_search` → evidence gate → إرجاع citations. `service_role` **لا يغادر الدالة**                                                                | تسريب مفاتيح، تسرّب مؤسسات             | `curl -H "Authorization: Bearer <jwt-org-A>"` لا يرى وثائق org-B                                                                                | حذف الملف من `.rag-staging/`                                             |
| `.rag-staging/tools/isolation_probe.sql`                      | 27 فحص عزل معلن سابقًا (لكل جدول SEC/PTW × 3 عمليات)                                                                                                                                              | العزل غير مُتحقَّق منه                 | تشغيل السكربت يُخرج جدول ✓/✗ لكل فحص                                                                                                            | لا شيء (قراءة فقط)                                                       |
| `.rag-staging/eval/gold_set_ar.jsonl`                         | 40 سؤال ذهبي عربي عبر SEC-01..SEC-19 + PTW مع إجابات مرجعية                                                                                                                                       | لا مقياس دقة                           | تشغيل `eval_runner` (لم يُشغَّل)                                                                                                                | حذف الملف                                                                |
| `.rag-staging/constitution.diff.md`                           | تعديل الدستور: إضافة **المادة 31 — بروتوكول RAG** (RRF، عتبات، `insufficient_evidence` مخرَج ناجح، عزل RESTRICTIVE، MRL+L2، عربي مطبَّع) + **المادة 32 — عزل المؤسسات كثابت** (org_id من JWT فقط) | انحراف مستقبلي عن العقيدة              | مراجعة بشرية                                                                                                                                    | Revert الملف                                                             |
| `.rag-staging/system.diff.md`                                 | flag `RAG_HYBRID` (off افتراضيًا) في `src/config/feature-flags.ts`، نقطة استدعاء داخل FINN خلف الـflag، لا تعديل لمسار Gemini                                                                     | كسر FINN الحالية                       | grep يؤكد أن مسار Gemini غير مُلمَس                                                                                                             | Revert الملف                                                             |

---

## ③ الافتراضات والعوائق

**افتراضات صريحة:**

- **[افتراض]** أن `pgvector ≥ 0.7` متاح على Supabase الحالي (مطلوب لـ HNSW cosine على 1536).
- **[افتراض]** أن `pg_trgm` و `unaccent` قابلان للتفعيل (مطلوب `CREATE EXTENSION` — سأُدرجه في migration للمراجعة، لا للتطبيق).
- **[افتراض]** أن JWT يحمل claim `org_id` بالفعل في نظام المصادقة الحالي. إن لم يكن، `auth_org_id()` يحتاج مصدرًا بديلًا (جدول `org_members` عبر `auth.uid()`). سأُجهّز كلا المسارين.
- **[افتراض]** أن `sec_knowledge_articles` القائم لا يُستبدل بل يُكمَّل بجدول chunks منفصل حتى لا نكسر أي استعلام حالي.
- **[افتراض]** حجم القطعة 900 توكن / تداخل 120 (توازن بين استرجاع دقيق وسياق كافٍ للفقرات التنظيمية العربية الطويلة). **البديل المرفوض:** 512/64 — يُقطّع الجمل التنظيمية ويُضعف الاستشهاد.
- **[افتراض]** أوزان RRF: vector 0.5، FTS 0.3، trgm 0.2 (VECTOR يقود دلاليًا، FTS يمسك المصطلحات الحرفية، trgm للرموز SEC-\d\d). **البديل المرفوض:** أوزان متساوية — يُضعف الدلالة على النصوص العربية القصيرة.
- **[افتراض]** k=60 في RRF (المعيار الأدبي — Cormack et al.). **البديل المرفوض:** k=10 — يُضخّم ضجيج المرتبات الدنيا.
- **[افتراض]** τ (عتبة الأدلة) = score_top ≥ 0.35 وعدد استشهادات ≥ 2. **البديل المرفوض:** ≥ 1 — يسمح بهلوسة استشهاد وحيد.
- **[افتراض]** N مرشحين قبل RRF = 40 لكل قناة (120 إجمالًا قبل الدمج). **البديل المرفوض:** 10 — يفوّت مقاطع صحيحة ذات ترتيب متوسط في قناة واحدة.

**عوائق يجب حسمها قبل التطبيق:**

- 🛑 **مصدر `org_id` غير مؤكد.** يجب أن تُخبرني هل يظهر في `auth.jwt() ->> 'org_id'` أم يجب اشتقاقه من `org_members` عبر `auth.uid()`. القرار يغيّر `auth_org_id()`.
- 🛑 **صلاحية تفعيل EXTENSIONs.** `pg_trgm`, `unaccent` قد يتطلبان صلاحية superuser على Supabase؛ لن أُدرج `CREATE EXTENSION` بدون تأكيدك.
- 🛑 **حجم مجموعة الذهب.** 40 سؤالًا كافية لبوابة أولية، لكن التقييم الإنتاجي يحتاج ≥ 200. سأُجهّز 40 كأساس + قالب تمديد.

---

## ④ المخرج الحرفي للاختبارات

**لم يُشغَّل** أي اختبار. الملفات مسوّدة تحت `.rag-staging/` ولن تُنفَّذ. الاختبارات المُجهَّزة:

1. **اختبار العزل (27 فحص):** `psql -f .rag-staging/tools/isolation_probe.sql` — **لم يُشغَّل**.
2. **اختبار التطبيع العربي:** `SELECT normalize_ar(...)` × 12 حالة — **لم يُشغَّل**.
3. **اختبار Idempotency:** إدخال نفس القطعة مرتين والتحقق من `count=1` — **لم يُشغَّل**.
4. **اختبار الاسترجاع الهجين على مجموعة ذهبية:** Recall@10, MRR@10, nDCG@10 — **لم يُشغَّل**.
5. **اختبار `insufficient_evidence`:** سؤال خارج المجال يجب أن يعيد `status: "insufficient_evidence"` — **لم يُشغَّل**.

كل اختبار له سطر تشغيل موثّق في `.rag-staging/eval/README.md` — لن يُنفَّذ إلا بأمرك.

---

## ⑤ المراجعة الذاتية مقابل الممنوعات والثوابت

| البند                                        | الحالة                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| ✕ تطبيق migration                            | ✅ لم يُطبَّق — كل SQL تحت `.rag-staging/migrations/` وليس `supabase/migrations/` |
| ✕ نشر دالة                                   | ✅ لم تُنشر — Edge function تحت `.rag-staging/functions/`                         |
| ✕ db push                                    | ✅ لم يُشغَّل                                                                     |
| ✕ تعديل مسار Gemini                          | ✅ صفر تعديلات على أي ملف يخدم Gemini حاليًا                                      |
| ✕ PR / دمج                                   | ✅ لا PR — كل شيء محلي في `.rag-staging/`                                         |
| ✕ streaming                                  | ✅ Edge fn يعيد JSON كاملًا فقط                                                   |
| ✕ MCP جديد                                   | ✅ لا                                                                             |
| ✕ tool descriptor_only مفعَّل                | ✅ لا                                                                             |
| ✕ secret في الكود                            | ✅ يُقرأ من env داخل Edge fn فقط                                                  |
| ✕ أكثر من commit                             | ✅ لا commits أصلًا حتى تعتمد                                                     |
| ✓ vector(1536)                               | ✅ مثبَّت في المخطط                                                               |
| ✓ HNSW ≤ 2000 dim                            | ✅ 1536 داخل الحد                                                                 |
| ✓ إعادة تطبيع L2 بعد MRL                     | ✅ داخل `sec_kb_upsert_chunk`                                                     |
| ✓ دور الكتابة = `is_org_member(org,'admin')` | ✅ في policies الكتابة                                                            |
| ✓ `org_id` من JWT فقط                        | ✅ عبر `auth_org_id()` — لا يقبل معامل من العميل                                  |
| ✓ `service_role` داخل Edge fn فقط            | ✅ لا يُصدَّر                                                                     |
| ✓ RRF + FTS عربي + pg_trgm                   | ✅ في `sec_kb_hybrid_search`                                                      |
| ✓ التطبيع العربي (ألف/تاء/تشكيل/تطويل)       | ✅ في `normalize_ar`                                                              |
| ✓ upsert idempotent بـ content hash          | ✅ `(doc_code, chunk_hash)` unique                                                |
| ✓ `insufficient_evidence` مخرَج ناجح         | ✅ status صريح، ليس 4xx                                                           |

**نتيجة المراجعة: مطابقة كاملة للثوابت والممنوعات.**

---

## ⑥ ما ينتظر اعتمادك قبل لمس Supabase

1. **حسم العائقَين المعماريَّين:**
   - مصدر `org_id` (JWT claim أم `org_members` عبر `auth.uid()`)؟
   - هل أُدرج `CREATE EXTENSION pg_trgm, unaccent` في migration أم تُفعّلها يدويًا؟
2. **مراجعة `.rag-staging/constitution.diff.md`** — إضافة المادتين 31 و 32.
3. **مراجعة `.rag-staging/migrations/*.sql`** الستة بندًا بندًا.
4. **مراجعة `.rag-staging/functions/rag_query/index.ts`.**
5. **الإذن الصريح** لأحد المسارات التالية (منفصلة، كلٌّ باعتماد مستقل):
   - (أ) تشغيل `isolation_probe.sql` (قراءة فقط — آمن).
   - (ب) نقل migrations 001–004 إلى `supabase/migrations/` وتطبيقها (مخطط + RLS + تطبيع + org helper).
   - (ج) نقل migrations 005–006 (الدالة الهجينة + upsert).
   - (د) نشر Edge function `rag_query`.
   - (هـ) تفعيل flag `RAG_HYBRID=on` لمؤسسة اختبارية واحدة فقط.

**توقّف. لا أقترح خطوة تالية. أنتظر اعتمادك على البنود أعلاه.**

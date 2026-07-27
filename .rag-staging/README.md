# NEXIOS RAG — Staging Area (DO NOT DEPLOY)

كل الملفات هنا **مسوّدات للمراجعة البشرية فقط**. لا شيء منها مُطبَّق على
القاعدة، ولا منشور كـEdge Function، ولا مرتبط بمسار FINN الحالي.

## القيود الحاكمة
- Gemini يخدم الإنتاج الآن ويبقى — صفر تعديلات على مساره.
- Output gateway = NOT_GLOBAL.
- `service_role` لا يغادر Edge Function.
- `org_id` يُشتق من JWT/عضوية داخل القاعدة — العميل لا يمرّره.
- vector(1536) + HNSW cosine (≤2000 dim). L2 renormalize بعد أي MRL truncate.
- upsert idempotent عبر `(doc_code, chunk_hash)`.
- `insufficient_evidence` مخرَج ناجح، ليس فشلًا.

## الاعتمادات المطلوبة قبل أي تنفيذ
1. تفعيل `pg_trgm` + `unaccent` على Supabase (قد يتطلب صلاحية superuser).
2. تأكيد استمرار استخدام `public.current_org_id()` كمصدر عزل — **مُثبَّت أنه موجود**.
3. الإذن الصريح لنقل ملف migration محدد من `.rag-staging/migrations/`
   إلى `supabase/migrations/`.
4. الإذن الصريح لنشر `rag_query` كEdge Function.
5. الإذن الصريح لتفعيل flag `RAG_HYBRID`.

## بنية المجلد
```
.rag-staging/
├── migrations/
│   ├── 001_sec_kb_schema.sql        (extensions + tables + HNSW + tsv)
│   ├── 002_sec_kb_rls.sql           (RESTRICTIVE org isolation + GRANTs)
│   ├── 003_ar_normalize_fn.sql      (normalize_ar IMMUTABLE)
│   ├── 004_auth_org_helper.sql      (thin wrapper on current_org_id)
│   ├── 005_rag_hybrid_fn.sql        (RRF hybrid search)
│   └── 006_ingestion_upsert_fn.sql  (idempotent chunk upsert)
├── functions/rag_query/
│   └── index.ts                     (Edge fn — NOT deployed)
├── tools/
│   └── isolation_probe.sql          (27 isolation checks — read-only)
├── eval/
│   ├── gold_set_ar.jsonl            (40 Arabic gold questions)
│   └── README.md                    (how to run — do not run yet)
├── constitution.diff.md             (Articles 31 + 32 proposal)
└── system.diff.md                   (RAG_HYBRID flag proposal)
```

## عمود التحقّق والتراجع
كل migration يحمل في ذيله كتلتَي `-- VERIFY:` و `-- ROLLBACK:` بتعليقات
SQL — انسخها يدويًا عند الحاجة.

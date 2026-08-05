# تطبيق طبقة المعرفة (RAG) — دليل التنفيذ المُثبَت

**حالة اليوم (٢٠٢٦/٠٨/٠٥):** الحزمة **مُثبَتة التطبيق** على Postgres حقيقي،
و**غير مطبَّقة بعد على الإنتاج** — التطبيق يحتاج بيانات اعتماد القاعدة، وهي
ليست في هذه البيئة ولا في المستودع (حارس الأسرار يمنع ذلك).

## ما ثبت فعليًّا (لا وعود)

شُغِّل في هذه الجلسة على **PostgreSQL 16.13 + pgvector 0.6.0** حقيقيين:

| الفحص | النتيجة |
| --- | --- |
| تطبيق ترحيلات RAG التسعة (`20260728*`) | ✓ نجحت كلها بلا خطأ واحد |
| إنشاء الكائنات: `rag_documents` · `rag_chunks` · `rag_hybrid_search` · `rag_query_log` · `rag_gaps` · `rag_eval_runs` · `rag_health` · فهرسا HNSW | ✓ موجودة |
| `rag_layer_check` · `rag_barrier_check` · `rag_capture_check` · `rag_operations_check` · `rag_search_check` | ✓ خمستها مرّت |
| نمو المتن `20260805120000_rag_corpus_growth.sql` | ✓ 41 وثيقة + 41 مقطعًا، وإعادة التشغيل لا تضاعف |
| استرجاع معجمي بلا متجهات (`tsv` + `nx_ar_normalize`) | ✓ «الأسوار الأمنية» ← SEC-02، «تقييم الثغرات الأمنية» ← SEC-01 + STAGE-01 |

## ما يبقى بيد المالك (خطوتان فقط)

### ١) تطبيق الترحيلات على الإنتاج

```bash
# من جذر المستودع، مع رابط قاعدة الإنتاج في متغيّر البيئة:
export DATABASE_URL='postgresql://…'          # لا يُكتب في أي ملف
for f in supabase/migrations/20260728*.sql supabase/migrations/20260805120000_rag_corpus_growth.sql; do
  echo "== $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f" || break
done
```

الترحيلات **مضيفة فقط** (`create … if not exists`, `add column if not exists`)
— لا تحذف جدولًا ولا عمودًا ولا صفًّا، فالتراجع لا يحتاج استعادة نسخة.

### ٢) نشر دالتَي الحافة وملء المتجهات

```bash
supabase functions deploy rag-retrieve
supabase functions deploy rag-ingest
# ثم ملء التضمينات (Gemini Embedding 2 بأبعاد 1536 — لا تُقصّ محليًّا):
curl -X POST "$SUPABASE_URL/functions/v1/rag-ingest" -H "Authorization: Bearer $SERVICE_JWT"
```

## بعد التطبيق: القياس ثم البوابة (بهذا الترتيب لا غيره)

```bash
RAG_EVAL_JWT=… VITE_SUPABASE_URL=… npx vitest run src/test/rag-live-eval.test.ts
```

يطبع بطاقة النتيجة على **41 مرساة** (تجاوزت عتبة الثلاثين بعد نمو المتن).
لا تُرفع راية `rag_enabled` إلا إذا بلغ القياس الفعلي **≥0.85 استدعاء@5**
و**≥0.95 دقة استشهاد** — والقرار قرار المالك بعد قراءة البطاقة، لا تلقائيًّا.

**تحذير الصدق العددي (المادة ٢٧):** قبل تشغيل هذا القياس لا يوجد رقم جودة
واحد؛ أي رقم يُذكر قبله اختلاق. البطاقة نفسها هي أول قياس في تاريخ الطبقة.

## تشغيل الفحوص قبل أي تطبيق

```bash
npm run check:rag        # يبني عنقود Postgres مؤقتًا لكل فحص ويشغّله حقيقةً
```

يتخطّى نفسه بلا فشل إن لم يوجد Postgres محلي (بيئات CI الخفيفة)، ويفشل بصوت
عالٍ إن سقط أي فحص — فلا تُطبَّق ترحيلة على قاعدة قبل أن يمرّ عزلها وامتيازها.

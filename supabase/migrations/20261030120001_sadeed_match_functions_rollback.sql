-- ═══════════════════════════════════════════════════════════════════════════
-- تراجع: O4 — دوالّ المطابقة الموسومة بالمؤسسة والفهرس الفريد — مرافق لـ
-- `20261030120000_sadeed_match_functions.sql`.
--
-- يُسقط **ما أنشأه ذلك الترحيل وحده**: الدوالّ الثلاث `sadeed_match_*` والفهرس
-- الفريد `finn_document_chunks_doc_chunk_uq` (اسمٌ خاصّ بذلك الترحيل، فلا خطر
-- أن يكون فهرسًا قديمًا).
--
-- **لا يمسّ** `aria_match_*` (تبقى كما هي — هي طريق الرجوع)، ولا الفهرس غير
-- الفريد القديم، ولا أي صفّ أو جدول أو سياسة. لا حذف بيانات.
--
-- **تنبيه تشغيلي:** إسقاط الفهرس الفريد يُعطّل upsert الاستيعاب مجدّدًا
-- (`onConflict: "document_id,chunk_index"`) كما كان قبل الترحيل — فإن كان
-- التراجع من عطلٍ في الدوالّ وحدها فأبقِ الفهرس بحذف سطره من هذا الملف. وبعد
-- التراجع يجب إرجاع الشيفرة إلى بناءٍ ينادي `aria_match_*` (`git revert` لـ
-- commit التحويل): الواجهة والقاعدة تتحرّكان معًا في الاتجاهين.
--
-- هذا الملف **لا يُطبَّق مع السلسلة الأمامية**: `tests/integration/apply-migrations.sh`
-- يستثني `*_rollback.sql`، ومن يطبّق المجلّد كاملًا بـ`db push` سيُسقط الدوالّ
-- فور إنشائها — يُطبَّق الترحيل الأمامي وحده.
--
-- idempotent: يعمل ولو شُغِّل مرّتين أو على قاعدةٍ لم يُطبَّق عليها الأصل.
-- ═══════════════════════════════════════════════════════════════════════════

-- يلزم لحلّ النوع `vector` في توقيع الدالّة (حتى مع IF EXISTS).
set local search_path = public, extensions;

drop function if exists public.sadeed_match_documents(uuid, vector, int);
drop function if exists public.sadeed_match_knowledge(uuid, vector, text[], int);
drop function if exists public.sadeed_match_memory(uuid, vector, text, int);

drop index if exists public.finn_document_chunks_doc_chunk_uq;

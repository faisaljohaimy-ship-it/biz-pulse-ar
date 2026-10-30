-- ═══════════════════════════════════════════════════════════════════════════
-- O4 (W11، الخطوة ٥) — دوالّ المطابقة الدلالية الموسومة بالمؤسسة فوق `finn_*`
-- + الفهرس الفريد الذي يحتاجه upsert الاستيعاب.
--
-- **لم يُطبَّق على أي قاعدة.** تطبيقه على الإنتاج بإذن المالك الصريح (قرار
-- ٢٠٢٦/١٠/١٣ «الكود مباشر والقاعدة بإذن») وبعد فحص ما قبل التطبيق:
-- `supabase/preflight/sadeed_match_check.sql` (يُشغَّل بـ`npm run check:sadeed-match`).
-- الترتيب: دفع ← ترحيل ← تحقّق تحت الدور ← Publish. لا Publish قبل الترحيل:
-- الذراع المتّجهية تنادي هذه الدوالّ باسمها، وبلا ترحيل يعود لها `PGRST202`.
--
-- ## لماذا
--
-- `aria_match_*` (الدوالّ الثلاث القائمة) معطوبة أو ناقصة على الإنتاج (مقيس
-- ٢٠٢٦/١٠/١٢ و٢٠٢٦/١٠/٣٠): `aria_match_knowledge` و`aria_match_memory` تقرآن
-- جدولين غير موجودين (`aria_knowledge` / `aria_memory`) وبلا امتياز تنفيذ لـ
-- `authenticated`؛ و`aria_match_documents` رُقّعت خارج المستودع وتشترط
-- `_user_id = auth.uid()` ولا تعرف المؤسسة. فكل مستند مرفوع وكل ذاكرة ومعرفة
-- خارج أي إجابة. هذه الدوالّ الجديدة بدائل بأسماء `sadeed_` (الجداول المقروءة
-- تبقى `finn_*`)، **و`aria_match_*` تُترك كما هي للتراجع — لا drop ولا تعديل**.
--
-- ## نموذج العزل (طبقتان معًا، لا إحداهما)
--
-- كل دالّة `SECURITY INVOKER`: تنفَّذ بصلاحية المستدعي فتحكم سياسات RLS
-- القائمة (`tenant_isolation` المقيِّدة بـ`is_org_member` على الجداول الأربعة،
-- و`knowledge_admin_read` للمعرفة) **من يقرأ**. والمسند الصريح داخل الدالّة
-- يحكم **أيّ مؤسسة وأيّ صفوف**: مستدعٍ عضو في مؤسستين لا تخلط له الدالّة
-- مؤسستيه (RLS وحدها لا تعرف أيّهما يقصد)، ومستدعٍ لا يملك المستند لا يقرأه
-- ولو أتاحته سياسة أوسع (مشرف مؤسسة يرى مستندات غيره بالسياسة، لا بهذه الدالّة).
-- القرارات المحافِظة المعتمدة (الأسئلة المفتوحة في التدقيق ⑦⑧):
--   · المستندات تبقى **نطاق مستخدم** (`user_id = auth.uid()`) كما هي اليوم.
--   · الذاكرة **شخصية** (`user_id = auth.uid()`).
--   · المعرفة **نطاق مؤسسة** (`org_id = _org_id`).
-- ومن لا JWT له (`service_role`: `auth.uid()` فارغ) يقرأ من المستندات والذاكرة
-- **صفرًا** بالبناء (المقارنة بفارغ لا تتحقّق أبدًا) — فشلٌ مغلق لا قراءة واسعة؛
-- وللمعرفة يقرأ مؤسسةً واحدة هي التي سمّاها.
--
-- ## ما فيه
--
--  ١. حارس التكرار ثم فهرس فريد `(document_id, chunk_index)` على
--     `finn_document_chunks`: upsert الاستيعاب
--     (`src/routes/api/public/hooks/sadeed-docs-ingest.ts`، `onConflict:
--     "document_id,chunk_index"`) يتطلّب قيدًا فريدًا، والمقيس على الإنتاج فهرس
--     غير فريد وحده (٠ زوجًا مكررًا ٢٠٢٦/١٠/٣٠). وجود تكرار يوقف الترحيل
--     برسالة صريحة لا بخطأ غامض.
--  ٢. `sadeed_match_documents(_org_id, _query, _limit)`
--  ٣. `sadeed_match_knowledge(_org_id, _query, _tags, _limit)`
--  ٤. `sadeed_match_memory(_org_id, _query, _scope, _limit)`
--  كلٌّ: التشابه = ‎1 − مسافة الكوساين‎، الترتيب بالمسافة ثم LIMIT (مقصوص في
--  [0، 50])، و`REVOKE ALL` عن PUBLIC وanon و`GRANT EXECUTE` لـauthenticated
--  وservice_role وحدهما. **اختلاف عمدي عن `aria_match_knowledge`:** `_tags`
--  فارغة (`{}`) تعني «بلا تصفية» كالفارغة NULL (كانت `&&` تعيد صفرًا لها).
--
-- ## ما لا يفعله (قرار موثّق لا إغفال)
--
-- **لا فهارس معجمية** (GIN على `tsvector` أو trigram): الجدولان 18 صفًّا
-- (`finn_document_chunks`) و46 (`finn_knowledge`) على الإنتاج ٢٠٢٦/١٠/٣٠؛ على هذا
-- الحجم يختار المخطِّط المسح التسلسلي ولا يستعمل الفهرس، فلا كسب سرعة قابل
-- للقياس، وفهرسٌ بلا كسب كلفةُ كتابةٍ وصيانة. المقيس (٢٠٢٦/١٠/٣٠، Postgres 16
-- خدش، صفوف اصطناعية بالعددين نفسيهما لا صفوف الإنتاج، GIN على
-- `to_tsvector('simple', content)`): 46 صفًّا ⇐ `Seq Scan` قبل الفهرس وبعده
-- (0.259 ثم 0.246 مللي ثانية)؛ 18 صفًّا ⇐ `Seq Scan` بعد الفهرس (0.072 مللي ثانية).
-- والاسترجاع المعجمي اليوم في TypeScript (`lexical-arms.server.ts`) لا في SQL
-- فلا مستهلك لهذه الفهارس.
-- تُعاد المسألة حين ينمو الجدولان وتُقاس `EXPLAIN ANALYZE` قبل/بعد (المادة ٢٧:
-- لا رقم مختلَق). ولا فهرس متّجهي جديد: الفهارس الموجودة تبقى. ومعروف في
-- ivfflat/hnsw أن تصفية المؤسسة/المستخدم بعد مسح الفهرس قد تعيد أقلّ من
-- `_limit` حين تنمو الجداول؛ لم يُقَس هذا هنا (الحجم الحالي 18 و46 و207 صفًّا)
-- ويُقاس حين ينمو المتن.
--
-- ## الشكل التقني
--
-- · `set search_path = public, extensions` على الدالّة (pgvector في `extensions`
--   على الإنتاج) — وعلى الجلسة هنا كي يُحلّ النوع `vector` عند الإنشاء.
-- · `(select auth.uid())` لا `auth.uid()` مجرّدة: تُقيَّم مرة واحدة لا لكل صف.
-- · idempotent: `create or replace` و`if not exists`. إضافة فقط.
-- · التراجع: `20261030120001_sadeed_match_functions_rollback.sql` (ملف تراجع
--   لا يُطبَّق مع السلسلة الأمامية — `apply-migrations.sh` يستثني `*_rollback.sql`).
-- ═══════════════════════════════════════════════════════════════════════════

set local search_path = public, extensions;

-- ── ١) حارس التكرار ثم الفهرس الفريد ────────────────────────────────────────
-- الحارس قبل أي إنشاء: فشله يترك الترحيل كما كان حتى لو شُغّل خارج معاملة.
do $guard$
declare
  dup_pairs bigint;
begin
  -- الفهرس قائم (إعادة تشغيل): لا حاجة للفحص، والترحيل idempotent.
  if to_regclass('public.finn_document_chunks_doc_chunk_uq') is not null then
    return;
  end if;
  select count(*) into dup_pairs
  from (
    select 1
    from public.finn_document_chunks
    group by document_id, chunk_index
    having count(*) > 1
  ) d;
  if dup_pairs > 0 then
    raise exception
      'sadeed_match_functions: duplicate (document_id, chunk_index) pairs in finn_document_chunks: % pair(s). يوجد % زوجًا مكررًا (document_id, chunk_index) في finn_document_chunks فلا يمكن إنشاء الفهرس الفريد. لم يُنشأ شيء. عالج التكرار يدويًّا (احتفظ بصفّ واحد لكل زوج) ثم أعد التشغيل.',
      dup_pairs, dup_pairs
      using errcode = 'unique_violation',
            hint = 'select document_id, chunk_index, count(*) from public.finn_document_chunks group by 1, 2 having count(*) > 1;';
  end if;
end
$guard$;

create unique index if not exists finn_document_chunks_doc_chunk_uq
  on public.finn_document_chunks (document_id, chunk_index);

comment on index public.finn_document_chunks_doc_chunk_uq is
  'O4: يمكّن upsert الاستيعاب (onConflict document_id,chunk_index). الفهرس غير الفريد القديم على العمودين نفسيهما يبقى (إضافة فقط).';

-- ── ٢) المستندات: نطاق مستخدم داخل مؤسسة، جاهزة فقط ─────────────────────────
create or replace function public.sadeed_match_documents(
  _org_id uuid,
  _query vector(768),
  _limit int default 8
)
returns table (
  chunk_id uuid,
  document_id uuid,
  title text,
  content text,
  similarity numeric
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select c.id,
         c.document_id,
         d.title,
         c.content,
         (1 - (c.embedding <=> _query))::numeric
  from public.finn_document_chunks c
  join public.finn_documents d on d.id = c.document_id
  where c.org_id = _org_id
    and d.org_id = _org_id
    and c.user_id = (select auth.uid())
    and d.user_id = (select auth.uid())
    and d.status = 'ready'
    and c.embedding is not null
  order by c.embedding <=> _query
  limit least(greatest(coalesce(_limit, 8), 0), 50);
$$;

-- ── ٣) المعرفة: نطاق مؤسسة، وصفوف ذات متّجه فقط ─────────────────────────────
create or replace function public.sadeed_match_knowledge(
  _org_id uuid,
  _query vector(768),
  _tags text[] default null,
  _limit int default 6
)
returns table (
  id uuid,
  title text,
  source text,
  content text,
  tags text[],
  similarity numeric
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select k.id,
         k.title,
         k.source,
         k.content,
         k.tags,
         (1 - (k.embedding <=> _query))::numeric
  from public.finn_knowledge k
  where k.org_id = _org_id
    and k.embedding is not null
    and (_tags is null or cardinality(_tags) = 0 or k.tags && _tags)
  order by k.embedding <=> _query
  limit least(greatest(coalesce(_limit, 6), 0), 50);
$$;

-- ── ٤) الذاكرة: شخصية داخل مؤسسة ────────────────────────────────────────────
create or replace function public.sadeed_match_memory(
  _org_id uuid,
  _query vector(768),
  _scope text default null,
  _limit int default 6
)
returns table (
  id uuid,
  scope text,
  key text,
  content text,
  importance numeric,
  similarity numeric
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select m.id,
         m.scope,
         m.key,
         m.content,
         m.importance::numeric,
         (1 - (m.embedding <=> _query))::numeric
  from public.finn_memory m
  where m.org_id = _org_id
    and m.user_id = (select auth.uid())
    and m.embedding is not null
    and (_scope is null or m.scope = _scope)
  order by m.embedding <=> _query
  limit least(greatest(coalesce(_limit, 6), 0), 50);
$$;

-- ── ٥) الامتيازات: المصادَق وservice_role وحدهما — لا PUBLIC ولا anon ───────
-- `anon` يُسحب صراحةً: امتيازات Supabase الافتراضية تمنحه EXECUTE على كل دالّة
-- جديدة في `public`، و`REVOKE ... FROM PUBLIC` وحده لا يمسّ منحًا صريحًا.
revoke all on function public.sadeed_match_documents(uuid, vector, int) from public, anon;
revoke all on function public.sadeed_match_knowledge(uuid, vector, text[], int) from public, anon;
revoke all on function public.sadeed_match_memory(uuid, vector, text, int) from public, anon;

grant execute on function public.sadeed_match_documents(uuid, vector, int) to authenticated, service_role;
grant execute on function public.sadeed_match_knowledge(uuid, vector, text[], int) to authenticated, service_role;
grant execute on function public.sadeed_match_memory(uuid, vector, text, int) to authenticated, service_role;

comment on function public.sadeed_match_documents(uuid, vector, int) is
  'O4: مقاطع مستندات المستدعي الجاهزة داخل المؤسسة المسمّاة، بالكوساين. INVOKER: RLS تحكم من يقرأ والمسند يحكم أي مؤسسة وصفوف من.';
comment on function public.sadeed_match_knowledge(uuid, vector, text[], int) is
  'O4: معرفة المؤسسة المسمّاة بالكوساين؛ _tags فارغة أو NULL بلا تصفية. INVOKER: knowledge_admin_read تحكم من يقرأ.';
comment on function public.sadeed_match_memory(uuid, vector, text, int) is
  'O4: ذاكرة المستدعي الشخصية داخل المؤسسة المسمّاة بالكوساين. INVOKER.';

-- ════════════════════════════════════════════════════════════════════════
-- فحص حيّ: هل تشير أداةٌ مفعَّلة إلى كائنٍ غير موجود؟
-- ════════════════════════════════════════════════════════════════════════
--
-- يُشغَّل على القاعدة الحيّة (قراءة محضة، لا يكتب شيئًا).
--
-- والدرس الذي وُلد منه هذا الملفّ: **الحكم على قاعدةٍ حيّة لا يُستنبط من
-- الترحيلات.** دالّة `rag_record_gap_for_org` موجودة في الإنتاج بينما
-- جدولها `rag_gaps` غائب — لأن `create or replace function` ينجح في
-- PostgreSQL بلا تحليلِ متنِ `plpgsql`. فقراءة الترحيلات تقول «مطبَّق»
-- والقاعدة تقول غير ذلك. القياس عليها، لا عليها استنتاجًا.
--
--   psql "$DATABASE_URL" -f supabase/preflight/rag_tool_dependency_check.sql
-- ════════════════════════════════════════════════════════════════════════

\echo '── ① الأدوات وتوابعها المعلَنة ─────────────────────────────────────'
select
  id,
  enabled,
  metadata->>'missing_dependency' as declared_dependency,
  case
    when metadata->>'missing_dependency' is null then 'لا تابع معلَن'
    when to_regclass(metadata->>'missing_dependency') is null then 'غائب'
    else 'حاضر'
  end as dependency_state,
  metadata->>'disabled_reason' as disabled_reason
from public.tool_registry
where id like 'rag.%'
order by id;

\echo ''
\echo '── ② كائنات طبقة RAG في هذه القاعدة ────────────────────────────────'
select obj as object,
       case when to_regclass(obj) is null then '✗ غائب' else '✓ حاضر' end as state
from unnest(array[
  'public.rag_candidates',
  'public.rag_gaps',
  'public.rag_query_log',
  'public.rag_chunks',
  'public.rag_documents'
]) as obj;

\echo ''
\echo '── ③ الدوالّ — وجودُها لا يعني صلاحيتها ────────────────────────────'
-- الدالّة تُنشأ ولو غاب جدولها؛ العمود الثاني هو ما يُعتدّ به.
select p.proname as function_name,
       case when to_regclass('public.rag_gaps') is null
            then '⚠ موجودة وتُخفق عند النداء (rag_gaps غائب)'
            else '✓ موجودة وتابعها حاضر' end as callable_state
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'rag_record_gap_for_org';

\echo ''
\echo '── ④ الحكم ─────────────────────────────────────────────────────────'
-- التابع يُشتقّ من المخطّط و`writes`، لا من مفتاحٍ يكتبه الحارس نفسه:
-- عدُّ الصفوف الموسومة وحدها دائرةٌ تشهد لنفسها، وتمرّ خضراء على أداةٍ
-- خارج الخريطة مهما كان تابعها.
with dep as (
  select id, enabled,
         coalesce(
           metadata->>'missing_dependency',
           case when metadata->>'writes' is not null
                then 'public.' || (metadata->>'writes') end
         ) as obj
    from public.tool_registry
)
select
  count(*) filter (where enabled and obj is not null and to_regclass(obj) is null)
    as enabled_with_missing_dependency,
  coalesce(string_agg(id, ', ') filter (
    where enabled and obj is not null and to_regclass(obj) is null), '—') as offenders,
  case when count(*) filter (
    where enabled and obj is not null and to_regclass(obj) is null) = 0
    then '✓ لا أداةٌ مفعَّلة بتابعٍ غائب'
    else '✗ خرقٌ قائم — راجع ①' end as verdict
from dep;
